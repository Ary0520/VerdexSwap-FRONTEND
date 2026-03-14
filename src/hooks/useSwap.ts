import { useState } from 'react';
import { Contract } from 'ethers';
import { useWalletStore } from '../store/walletStore';
import { CONTRACTS, TOKEN_LIST } from '../contracts/addresses';
import RouterABI from '../contracts/abis/Router.json';
import FactoryABI from '../contracts/abis/Factory.json';
import PairABI from '../contracts/abis/Pair.json';
import ERC20ABI from '../contracts/abis/ERC20.json';
import { parseTokenAmount } from '../utils/formatters';
import { calculateMinimumReceived, calculateDeadline } from '../utils/calculations';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface QuoteResult {
  amountOut: bigint;
  path: string[];           // e.g. [USDC, WETH] or [WBTC, USDC, WETH]
  priceImpact: number;      // e.g. 1.23 (percent)
  insufficientLiquidity: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const ZERO = '0x0000000000000000000000000000000000000000';

async function pairExists(factory: Contract, a: string, b: string): Promise<boolean> {
  try {
    const addr = await factory.getPair(a, b);
    return addr !== ZERO;
  } catch {
    return false;
  }
}

/**
 * Calculates price impact across a full path.
 * For each hop: mid-price = reserveOut / reserveIn (no fee).
 * Overall mid-price output = amountIn * product(mid-prices).
 * Impact = (midOutput - actualOutput) / midOutput * 100.
 */
async function calcPriceImpact(
  factory: Contract,
  signer: any,
  path: string[],
  amountInWei: bigint,
  actualAmountOut: bigint
): Promise<number> {
  try {
    let midOutput = amountInWei; // start with integer, accumulate
    // We work in float after scaling to avoid bigint division precision loss
    let midOutputFloat = Number(amountInWei);

    for (let i = 0; i < path.length - 1; i++) {
      const pairAddr = await factory.getPair(path[i], path[i + 1]);
      if (pairAddr === ZERO) return 0;
      const pair = new Contract(pairAddr, PairABI, signer);
      const [r0, r1] = await pair.getReserves();
      const token0: string = await pair.token0();

      let reserveIn: bigint;
      let reserveOut: bigint;
      if (token0.toLowerCase() === path[i].toLowerCase()) {
        reserveIn = BigInt(r0.toString());
        reserveOut = BigInt(r1.toString());
      } else {
        reserveIn = BigInt(r1.toString());
        reserveOut = BigInt(r0.toString());
      }

      // mid-price ratio for this hop (floating point is fine for % display)
      if (reserveIn === 0n) return 0;
      midOutputFloat = midOutputFloat * (Number(reserveOut) / Number(reserveIn));
    }

    if (midOutputFloat === 0) return 0;
    const actualFloat = Number(actualAmountOut);
    const impact = ((midOutputFloat - actualFloat) / midOutputFloat) * 100;
    return Math.max(0, impact);
  } catch (err) {
    console.warn('Price impact calc error:', err);
    return 0;
  }
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export const useSwap = () => {
  const { signer, address } = useWalletStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Finds the best route (direct or 1 intermediate hop) and returns
   * the output amount, path, and real price impact.
   */
  const getQuote = async (
    amountIn: string,
    tokenInAddress: string,
    tokenOutAddress: string,
    tokenInDecimals: number
  ): Promise<QuoteResult | null> => {
    if (!signer) return null;

    try {
      const router = new Contract(CONTRACTS.ROUTER, RouterABI, signer);
      const factory = new Contract(CONTRACTS.FACTORY, FactoryABI, signer);
      const amountInWei = parseTokenAmount(amountIn, tokenInDecimals);
      if (amountInWei === 0n) return null;

      // ── 1. Try direct path ────────────────────────────────────────────
      const directExists = await pairExists(factory, tokenInAddress, tokenOutAddress);
      if (directExists) {
        try {
          const directPath = [tokenInAddress, tokenOutAddress];
          const amounts: bigint[] = await router.getAmountsOut(amountInWei, directPath);
          const amountOut = amounts[amounts.length - 1];
          const priceImpact = await calcPriceImpact(factory, signer, directPath, amountInWei, amountOut);
          return { amountOut, path: directPath, priceImpact, insufficientLiquidity: false };
        } catch {
          // Direct pair exists but might have 0 liquidity, fall through to multi-hop
        }
      }

      // ── 2. Try 1-hop routes via all known intermediates ───────────────
      const intermediates = TOKEN_LIST
        .map(t => t.address)
        .filter(a => a.toLowerCase() !== tokenInAddress.toLowerCase() && a.toLowerCase() !== tokenOutAddress.toLowerCase());

      let bestResult: QuoteResult | null = null;

      for (const mid of intermediates) {
        const hop1Exists = await pairExists(factory, tokenInAddress, mid);
        const hop2Exists = await pairExists(factory, mid, tokenOutAddress);
        if (!hop1Exists || !hop2Exists) continue;

        try {
          const multiPath = [tokenInAddress, mid, tokenOutAddress];
          const amounts: bigint[] = await router.getAmountsOut(amountInWei, multiPath);
          const amountOut = amounts[amounts.length - 1];

          if (!bestResult || amountOut > bestResult.amountOut) {
            const priceImpact = await calcPriceImpact(factory, signer, multiPath, amountInWei, amountOut);
            bestResult = { amountOut, path: multiPath, priceImpact, insufficientLiquidity: false };
          }
        } catch {
          continue;
        }
      }

      if (bestResult) return bestResult;

      // ── 3. No route found ─────────────────────────────────────────────
      return { amountOut: 0n, path: [], priceImpact: 0, insufficientLiquidity: true };
    } catch (err) {
      console.error('Quote error:', err);
      return null;
    }
  };

  // Legacy wrapper kept for backward compat (AddLiquidity uses it)
  const getAmountsOut = async (
    amountIn: string,
    tokenInAddress: string,
    tokenOutAddress: string,
    tokenInDecimals: number
  ): Promise<bigint | null> => {
    const result = await getQuote(amountIn, tokenInAddress, tokenOutAddress, tokenInDecimals);
    return result?.amountOut ?? null;
  };

  const approveToken = async (
    tokenAddress: string,
    amount: bigint
  ): Promise<boolean> => {
    if (!signer) return false;
    try {
      const token = new Contract(tokenAddress, ERC20ABI, signer);
      // Check existing allowance first to skip unnecessary tx
      const allowance: bigint = await token.allowance(address, CONTRACTS.ROUTER);
      if (allowance >= amount) return true;

      const feeData = await signer.provider.getFeeData();
      const tx = await token.approve(CONTRACTS.ROUTER, amount, {
        maxFeePerGas: feeData.maxFeePerGas ? (feeData.maxFeePerGas * 150n) / 100n : undefined,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? (feeData.maxPriorityFeePerGas * 150n) / 100n : undefined,
      });
      await tx.wait();
      return true;
    } catch (err) {
      console.error('Error approving token:', err);
      return false;
    }
  };

  const executeSwap = async (
    amountIn: string,
    path: string[],             // full route path, including any intermediates
    tokenInDecimals: number,
    slippage: number,
    deadlineMinutes: number,
    expectedAmountOut: bigint,
  ): Promise<{ success: boolean; txHash?: string }> => {
    if (!signer || !address) {
      setError('Wallet not connected');
      return { success: false };
    }
    if (path.length < 2) {
      setError('No valid route found');
      return { success: false };
    }

    setIsLoading(true);
    setError(null);

    try {
      const router = new Contract(CONTRACTS.ROUTER, RouterABI, signer);
      const amountInWei = parseTokenAmount(amountIn, tokenInDecimals);
      const amountOutMin = calculateMinimumReceived(expectedAmountOut, slippage);
      const deadline = calculateDeadline(deadlineMinutes);

      // Approve the input token
      const approved = await approveToken(path[0], amountInWei);
      if (!approved) throw new Error('Token approval failed');

      const feeData = await signer.provider.getFeeData();
      const tx = await router.swapExactTokensForTokens(
        amountInWei,
        amountOutMin,
        path,
        address,
        deadline,
        {
          maxFeePerGas: feeData.maxFeePerGas ? (feeData.maxFeePerGas * 150n) / 100n : undefined,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? (feeData.maxPriorityFeePerGas * 150n) / 100n : undefined,
        }
      );

      await tx.wait();
      setIsLoading(false);
      return { success: true, txHash: tx.hash };
    } catch (err: any) {
      console.error('Swap error:', err);
      let msg = err.message || 'Swap failed';
      if (msg.includes('user rejected')) msg = 'Transaction rejected in MetaMask.';
      if (msg.includes('insufficient funds')) msg = 'Insufficient ETH for gas.';
      if (msg.includes('SlippageExceeded') || msg.includes('INSUFFICIENT_OUTPUT')) msg = 'Slippage exceeded. Try increasing slippage tolerance.';
      setError(msg);
      setIsLoading(false);
      return { success: false };
    }
  };

  return {
    getQuote,
    getAmountsOut,   // kept for backward compat
    executeSwap,
    isLoading,
    error,
  };
};
