import { useState, useEffect, useCallback } from 'react';
import { Contract } from 'ethers';
import { useWalletStore } from '../store/walletStore';
import ERC20ABI from '../contracts/abis/ERC20.json';

export const useTokenBalance = (tokenAddress: string | null | undefined, decimals: number) => {
  const { address, signer } = useWalletStore();
  const [balance, setBalance] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!address || !signer || !tokenAddress) {
      setBalance(0n);
      return;
    }

    setIsLoading(true);
    try {
      const token = new Contract(tokenAddress, ERC20ABI, signer);
      const bal: bigint = await token.balanceOf(address);
      setBalance(bal);
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalance(0n);
    } finally {
      setIsLoading(false);
    }
  }, [address, signer, tokenAddress]);

  // Fetch on mount / when deps change
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Auto-refresh every 15 seconds so balance stays current after swaps
  useEffect(() => {
    if (!address || !signer || !tokenAddress) return;

    const interval = setInterval(fetchBalance, 15_000);
    return () => clearInterval(interval);
  }, [fetchBalance, address, signer, tokenAddress]);

  return { balance, isLoading, refetch: fetchBalance };
};
