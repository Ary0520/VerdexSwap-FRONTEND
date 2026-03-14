import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Contract, formatUnits } from 'ethers';
import { Button } from '../components/common/Button';
import { formatAmount } from '../utils/formatters';
import { useWalletStore } from '../store/walletStore';
import { usePairs } from '../hooks/useSubgraph';
import { useTokenBalance } from '../hooks/useTokenBalance';
import { TOKEN_LIST } from '../contracts/addresses';
import PairABI from '../contracts/abis/Pair.json';

const PositionCard: React.FC<{ pair: any }> = ({ pair }) => {
  const navigate = useNavigate();
  const { isConnected, signer } = useWalletStore();
  
  const [reserves, setReserves] = useState<{ reserve0: bigint; reserve1: bigint } | null>(null);
  const [totalSupply, setTotalSupply] = useState<bigint>(0n);
  const [hasFetched, setHasFetched] = useState(false);

  const { balance: lpBalance, isLoading: isBalanceLoading } = useTokenBalance(pair.id, 18);

  useEffect(() => {
    let active = true;
    const fetchPairData = async () => {
      if (!signer || hasFetched) return;
      try {
        const pairContract = new Contract(pair.id, PairABI, signer);
        const [res, supply] = await Promise.all([
          pairContract.getReserves(),
          pairContract.totalSupply()
        ]);
        if (!active) return;
        setReserves({ reserve0: res._reserve0, reserve1: res._reserve1 });
        setTotalSupply(supply);
        setHasFetched(true);
      } catch (err) {
        console.error('Error fetching pair data:', err);
      }
    };
    
    // Only fetch reserves and supply if they hold balance to avoid spam
    if (lpBalance > 0n) {
      fetchPairData();
    }
    
    return () => { active = false; };
  }, [signer, pair.id, lpBalance, hasFetched]);

  if (lpBalance === 0n) return null; // Hide if no balance

  const currentShareRaw = totalSupply > 0n 
    ? (Number(formatUnits(lpBalance, 18)) / Number(formatUnits(totalSupply, 18))) * 100 
    : 0;
  const currentShare = currentShareRaw > 0 && currentShareRaw < 0.01 ? '<0.01' : currentShareRaw.toFixed(2);

  let amount0 = 0n;
  let amount1 = 0n;
  if (lpBalance > 0n && totalSupply > 0n && reserves) {
    amount0 = (lpBalance * reserves.reserve0) / totalSupply;
    amount1 = (lpBalance * reserves.reserve1) / totalSupply;
  }

  let formattedAmount0 = "0.00";
  let formattedAmount1 = "0.00";
  try {
    // Look up correct decimals from TOKEN_LIST by address — handles WBTC (8), USDC (18 testnet), etc.
    const tokenInfo0 = TOKEN_LIST.find(t => t.address.toLowerCase() === pair.token0.id.toLowerCase());
    const tokenInfo1 = TOKEN_LIST.find(t => t.address.toLowerCase() === pair.token1.id.toLowerCase());
    const d0 = tokenInfo0?.decimals ?? 18;
    const d1 = tokenInfo1?.decimals ?? 18;
    formattedAmount0 = formatAmount(Number(formatUnits(amount0, d0)));
    formattedAmount1 = formatAmount(Number(formatUnits(amount1, d1)));
  } catch {}

  return (
    <div className="bg-darker-green/80 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-white text-xl font-semibold mb-2">
            {pair.token0.symbol} / {pair.token1.symbol}
          </h3>
          <div className="space-y-1 text-sm">
            <div className="text-gray-400">
              LP Tokens: <span className="text-white">{formatAmount(Number(formatUnits(lpBalance, 18)))}</span>
            </div>
            <div className="text-gray-400">
              Pool Share: <span className="text-white">{currentShare}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/5 rounded-xl p-4 mb-4">
        <div className="text-gray-400 text-sm mb-2">Underlying Assets</div>
        <div className="space-y-1">
          <div className="flex justify-between text-white">
            <span>{pair.token0.symbol}</span>
            <span>{formattedAmount0}</span>
          </div>
          <div className="flex justify-between text-white">
            <span>{pair.token1.symbol}</span>
            <span>{formattedAmount1}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          variant="secondary"
          onClick={() => navigate('/liquidity/add')}
          className="flex-1"
        >
          Add Liquidity
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate('/liquidity/remove')}
          className="flex-1"
        >
          Remove Liquidity
        </Button>
      </div>
    </div>
  );
}

export const Liquidity: React.FC = () => {
  const navigate = useNavigate();
  const { isConnected } = useWalletStore();
  const { data: pairsData, loading } = usePairs();
  const pairs = pairsData?.pairs ?? [];

  return (
    <div className="min-h-screen bg-gradient-dark pt-24 pb-12">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-white text-3xl font-bold">Your Liquidity</h1>
            <Button onClick={() => navigate('/liquidity/add')}>
              Add Liquidity
            </Button>
          </div>

          {!isConnected ? (
            <div className="bg-darker-green/80 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center">
              <p className="text-gray-400 mb-4">Connect your wallet to view your liquidity positions</p>
            </div>
          ) : loading ? (
            <div className="bg-darker-green/80 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center">
              <div className="inline-block w-8 h-8 border-2 border-[#BFFF0B] border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-gray-400">Loading your positions...</p>
            </div>
          ) : pairs.length === 0 ? (
            <div className="bg-darker-green/80 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center">
              <p className="text-gray-400 mb-4">No liquidity positions found</p>
              <Button onClick={() => navigate('/liquidity/add')}>
                Add Liquidity
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {pairs.map((pair: any) => (
                <PositionCard key={pair.id} pair={pair} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
