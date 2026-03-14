import { useState } from 'react';
import { Contract, MaxUint256 } from 'ethers';
import { useWalletStore } from '../store/walletStore';
import { CONTRACTS } from '../contracts/addresses';
import RouterABI from '../contracts/abis/Router.json';
import FactoryABI from '../contracts/abis/Factory.json';
import PairABI from '../contracts/abis/Pair.json';
import ERC20ABI from '../contracts/abis/ERC20.json';
import { parseTokenAmount } from '../utils/formatters';
import { calculateDeadline } from '../utils/calculations';

export const useLiquidity = () => {
  const { signer, address } = useWalletStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPairAddress = async (
    tokenA: string,
    tokenB: string
  ): Promise<string | null> => {
    if (!signer) return null;

    try {
      const factory = new Contract(CONTRACTS.FACTORY, FactoryABI, signer);
      const pairAddress = await factory.getPair(tokenA, tokenB);

      if (pairAddress === '0x0000000000000000000000000000000000000000') {
        return null;
      }

      return pairAddress;
    } catch (err) {
      console.error('Error getting pair:', err);
      return null;
    }
  };

  const getReserves = async (
    pairAddress: string
  ): Promise<{ reserve0: bigint; reserve1: bigint } | null> => {
    if (!signer) return null;

    try {
      const pair = new Contract(pairAddress, PairABI, signer);
      const reserves = await pair.getReserves();

      return {
        reserve0: reserves._reserve0,
        reserve1: reserves._reserve1,
      };
    } catch (err) {
      console.error('Error getting reserves:', err);
      return null;
    }
  };

  /**
   * Ensure the router has sufficient allowance for a token.
   * Uses MaxUint256 to avoid repeat approvals.
   */
  const ensureApproval = async (
    tokenAddress: string,
    requiredAmount: bigint
  ): Promise<boolean> => {
    if (!signer || !address) return false;

    try {
      const token = new Contract(tokenAddress, ERC20ABI, signer);
      const currentAllowance: bigint = await token.allowance(address, CONTRACTS.ROUTER);

      if (currentAllowance >= requiredAmount) {
        return true;
      }

      const feeData = await signer.provider.getFeeData();
      const tx = await token.approve(CONTRACTS.ROUTER, MaxUint256, {
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

  /**
   * Ensure the router has sufficient allowance for an LP (pair) token.
   * LP tokens use exact liquidity amount, not MaxUint256.
   */
  const ensureLPApproval = async (
    lpTokenAddress: string,
    requiredAmount: bigint
  ): Promise<boolean> => {
    if (!signer || !address) return false;

    try {
      const lpToken = new Contract(lpTokenAddress, ERC20ABI, signer);
      const currentAllowance: bigint = await lpToken.allowance(address, CONTRACTS.ROUTER);

      if (currentAllowance >= requiredAmount) {
        return true;
      }

      const feeData = await signer.provider.getFeeData();
      const tx = await lpToken.approve(CONTRACTS.ROUTER, MaxUint256, {
        maxFeePerGas: feeData.maxFeePerGas ? (feeData.maxFeePerGas * 150n) / 100n : undefined,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? (feeData.maxPriorityFeePerGas * 150n) / 100n : undefined,
      });
      await tx.wait();
      return true;
    } catch (err) {
      console.error('Error approving LP token:', err);
      return false;
    }
  };

  const addLiquidity = async (
    tokenA: string,
    tokenB: string,
    amountA: string,
    amountB: string,
    decimalsA: number,
    decimalsB: number,
    slippage: number,
    deadlineMinutes: number
  ): Promise<{ success: boolean; txHash?: string }> => {
    if (!signer || !address) {
      setError('Wallet not connected');
      return { success: false };
    }

    setIsLoading(true);
    setError(null);

    try {
      const router = new Contract(CONTRACTS.ROUTER, RouterABI, signer);
      const amountAWei = parseTokenAmount(amountA, decimalsA);
      const amountBWei = parseTokenAmount(amountB, decimalsB);

      // Calculate minimum amounts with slippage
      const slippageBps = BigInt(Math.floor(slippage * 100));
      const amountAMin = (amountAWei * (10000n - slippageBps)) / 10000n;
      const amountBMin = (amountBWei * (10000n - slippageBps)) / 10000n;
      const deadline = calculateDeadline(deadlineMinutes);

      // Ensure both tokens are approved
      const [approvedA, approvedB] = await Promise.all([
        ensureApproval(tokenA, amountAWei),
        ensureApproval(tokenB, amountBWei),
      ]);

      if (!approvedA || !approvedB) {
        throw new Error('Token approval failed');
      }

      const feeData = await signer.provider.getFeeData();
      const tx = await router.addLiquidity(
        tokenA,
        tokenB,
        amountAWei,
        amountBWei,
        amountAMin,
        amountBMin,
        address,
        deadline,
        {
          gasLimit: 600_000n,
          maxFeePerGas: feeData.maxFeePerGas ? (feeData.maxFeePerGas * 150n) / 100n : undefined,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? (feeData.maxPriorityFeePerGas * 150n) / 100n : undefined,
        }
      );

      const receipt = await tx.wait();
      if (!receipt || receipt.status === 0) {
        throw new Error('Add liquidity transaction reverted. Check token balances.');
      }

      setIsLoading(false);
      return { success: true, txHash: tx.hash };
    } catch (err: any) {
      console.error('Add liquidity error:', err);

      let message = err.message || 'Failed to add liquidity';
      if (message.includes('user rejected')) message = 'Transaction rejected in MetaMask.';
      if (message.includes('insufficient funds')) message = 'Insufficient ETH for gas fees.';

      setError(message);
      setIsLoading(false);
      return { success: false };
    }
  };

  const removeLiquidity = async (
    tokenA: string,
    tokenB: string,
    liquidityWei: bigint,
    amountAMin: bigint,
    amountBMin: bigint,
    deadlineMinutes: number
  ): Promise<{ success: boolean; txHash?: string }> => {
    if (!signer || !address) {
      setError('Wallet not connected');
      return { success: false };
    }

    setIsLoading(true);
    setError(null);

    try {
      const router = new Contract(CONTRACTS.ROUTER, RouterABI, signer);

      // Get pair address and LP token contract
      const pairAddress = await getPairAddress(tokenA, tokenB);
      if (!pairAddress) {
        throw new Error('Pair does not exist');
      }

      // Approve LP tokens
      const approved = await ensureLPApproval(pairAddress, liquidityWei);
      if (!approved) {
        throw new Error('LP token approval failed');
      }

      const deadline = calculateDeadline(deadlineMinutes);

      // Use 0 for amountMin — the UI should pass actual minimums in production
      // but 0 is acceptable for a testnet DEX
      const feeData = await signer.provider.getFeeData();
      const tx = await router.removeLiquidity(
        tokenA,
        tokenB,
        liquidityWei,
        amountAMin,
        amountBMin,
        address,
        deadline,
        {
          gasLimit: 600_000n,
          maxFeePerGas: feeData.maxFeePerGas ? (feeData.maxFeePerGas * 150n) / 100n : undefined,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? (feeData.maxPriorityFeePerGas * 150n) / 100n : undefined,
        }
      );

      const receipt = await tx.wait();
      if (!receipt || receipt.status === 0) {
        throw new Error('Remove liquidity transaction reverted.');
      }

      setIsLoading(false);
      return { success: true, txHash: tx.hash };
    } catch (err: any) {
      console.error('Remove liquidity error:', err);

      let message = err.message || 'Failed to remove liquidity';
      if (message.includes('user rejected')) message = 'Transaction rejected in MetaMask.';
      if (message.includes('insufficient funds')) message = 'Insufficient ETH for gas fees.';

      setError(message);
      setIsLoading(false);
      return { success: false };
    }
  };

  return {
    getPairAddress,
    getReserves,
    addLiquidity,
    removeLiquidity,
    isLoading,
    error,
  };
};
