import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Contract, formatUnits, parseUnits } from 'ethers';
import { TokenSelector } from '../components/swap/TokenSelector';
import { Button } from '../components/common/Button';
import { TOKEN_LIST } from '../contracts/addresses';
import { useLiquidity } from '../hooks/useLiquidity';
import { useWalletStore } from '../store/walletStore';
import { useNotificationStore } from '../store/notificationStore';
import { useTokenBalance } from '../hooks/useTokenBalance';
import { DEFAULT_DEADLINE } from '../utils/constants';
import { formatAmount } from '../utils/formatters';
import PairABI from '../contracts/abis/Pair.json';

export const RemoveLiquidity: React.FC = () => {
  const navigate = useNavigate();
  const { isConnected, signer } = useWalletStore();
  const { addNotification } = useNotificationStore();
  const [tokenA, setTokenA] = useState(TOKEN_LIST[1]); // USDC
  const [tokenB, setTokenB] = useState(TOKEN_LIST[0]); // WETH
  const [lpAmount, setLpAmount] = useState('');
  const [percentage, setPercentage] = useState(0);
  const [slippage, setSlippage] = useState(0.5);
  const [showSettings, setShowSettings] = useState(false);

  const [pairAddress, setPairAddress] = useState<string | null>(null);
  const [reserves, setReserves] = useState<{ rA: bigint; rB: bigint } | null>(null);
  const [totalSupply, setTotalSupply] = useState<bigint>(0n);

  const { balance: lpBalance } = useTokenBalance(pairAddress, 18);
  const { getPairAddress, removeLiquidity, isLoading, error } = useLiquidity();

  useEffect(() => {
    let active = true;
    const fetchPairData = async () => {
      if (!tokenA || !tokenB || !signer) {
        setPairAddress(null);
        setReserves(null);
        setTotalSupply(0n);
        return;
      }
      try {
        const pAddr = await getPairAddress(tokenA.address, tokenB.address);
        if (!active) return;
        setPairAddress(pAddr);

        if (pAddr) {
          const pair = new Contract(pAddr, PairABI, signer);
          const [res, supply, t0] = await Promise.all([
            pair.getReserves(),
            pair.totalSupply(),
            pair.token0(),
          ]);
          if (!active) return;

          setTotalSupply(supply);
          if (t0.toLowerCase() === tokenA.address.toLowerCase()) {
            setReserves({ rA: res._reserve0, rB: res._reserve1 });
          } else {
            setReserves({ rA: res._reserve1, rB: res._reserve0 });
          }
        } else {
          setReserves(null);
          setTotalSupply(0n);
        }
      } catch (err) {
        console.error('Error fetching pair data:', err);
      }
    };
    fetchPairData();
    return () => {
      active = false;
    };
  }, [tokenA, tokenB, signer]);

  let burnWei = 0n;
  try {
    burnWei = lpAmount ? parseUnits(lpAmount, 18) : 0n;
  } catch {}

  let receiveA = 0n;
  let receiveB = 0n;

  if (burnWei > 0n && totalSupply > 0n && reserves) {
    receiveA = (burnWei * reserves.rA) / totalSupply;
    receiveB = (burnWei * reserves.rB) / totalSupply;
  }

  const currentShareRaw = totalSupply > 0n && lpBalance > 0n 
    ? (Number(formatUnits(lpBalance, 18)) / Number(formatUnits(totalSupply, 18))) * 100 
    : 0;
  const currentShare = currentShareRaw > 0 && currentShareRaw < 0.01 ? '<0.01' : currentShareRaw.toFixed(2);

  const handlePercentageClick = (pct: number) => {
    setPercentage(pct);
    if (lpBalance > 0n) {
      const bWei = (lpBalance * BigInt(pct)) / 100n;
      setLpAmount(formatUnits(bWei, 18));
    }
  };

  const handleLpAmountChange = (val: string) => {
    setLpAmount(val);
    setPercentage(0); // Clear visual percent blocks when typing
  };

  const handleRemoveLiquidity = async () => {
    if (!lpAmount || !tokenA || !tokenB || burnWei === 0n) return;

    const slippageBps = BigInt(Math.floor(slippage * 100));
    const amountAMin = (receiveA * (10000n - slippageBps)) / 10000n;
    const amountBMin = (receiveB * (10000n - slippageBps)) / 10000n;

    const { success, txHash } = await removeLiquidity(
      tokenA.address,
      tokenB.address,
      burnWei,
      amountAMin,
      amountBMin,
      DEFAULT_DEADLINE
    );

    if (success) {
      addNotification({
        type: 'success',
        title: 'Liquidity Removed',
        message: `Removed ${lpAmount} LP tokens of ${tokenA.symbol}-${tokenB.symbol}`,
        txHash,
      });
      navigate('/liquidity');
    }
  };

  const percentageOptions = [25, 50, 75, 100];

  return (
    <div className="min-h-screen bg-gradient-dark pt-24 pb-12">
      <div className="container mx-auto px-6">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => navigate('/liquidity')}
            className="text-gray-400 hover:text-white mb-4 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <div className="bg-darker-green/80 backdrop-blur-sm border border-white/10 rounded-2xl p-6 relative">
            
            {/* Header w/ Settings Gear */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-2xl font-semibold">Remove Liquidity</h2>
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className="text-gray-400 hover:text-white transition-colors"
                title="Slippage Settings"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>

            {showSettings && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
                <div className="text-gray-400 text-sm mb-2">Slippage Tolerance (%)</div>
                <div className="flex gap-2">
                  {[0.1, 0.5, 1.0].map((val) => (
                    <button
                      key={val}
                      onClick={() => setSlippage(val)}
                      className={`px-3 py-1 rounded-lg text-sm transition-colors ${slippage === val ? 'bg-[#BFFF0B] text-black font-semibold' : 'bg-white/5 text-white hover:bg-white/10'}`}
                    >
                      {val}%
                    </button>
                  ))}
                  <div className="relative flex-1">
                    <input
                      type="number"
                      value={slippage}
                      onChange={(e) => setSlippage(parseFloat(e.target.value) || 0)}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-1 text-sm text-right text-white focus:outline-none focus:border-[#BFFF0B]/50"
                      placeholder="Custom"
                    />
                    <span className="absolute right-3 top-1 text-white/50 text-sm">%</span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white/5 rounded-xl p-4 mb-4">
              <div className="text-gray-400 text-sm mb-3">Select Pair</div>
              <div className="flex items-center gap-3 justify-center">
                <TokenSelector selectedToken={tokenA} onSelect={setTokenA} excludeToken={tokenB?.address} />
                <span className="text-gray-400">/</span>
                <TokenSelector selectedToken={tokenB} onSelect={setTokenB} excludeToken={tokenA?.address} />
              </div>
            </div>

            {/* User LP Info and Amount Input */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm font-medium text-white">Your LP Token Balance</div>
                <div className="text-sm text-[#BFFF0B] font-mono">{formatAmount(Number(formatUnits(lpBalance, 18)))} LP</div>
              </div>

              <div className="mb-4">
                <div className="flex gap-2 mb-4">
                  {percentageOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() => handlePercentageClick(option)}
                      className={`flex-1 py-1.5 text-sm rounded-lg transition-colors ${percentage === option ? 'bg-[#BFFF0B] text-black font-medium' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    >
                      {option}%
                    </button>
                  ))}
                </div>
                
                <div className="bg-black/50 border border-white/5 rounded-xl p-3 flex justify-between items-center">
                  <input
                    type="number"
                    value={lpAmount}
                    onChange={(e) => handleLpAmountChange(e.target.value)}
                    placeholder="0.0"
                    className="w-full bg-transparent text-white text-2xl outline-none"
                  />
                  <button onClick={() => handlePercentageClick(100)} className="text-[#BFFF0B] text-sm uppercase tracking-wider font-semibold hover:text-white transition-colors ml-2">
                    Max
                  </button>
                </div>
              </div>

              <div className="flex justify-between text-xs text-gray-400">
                <span>Current Pool Share</span>
                <span>{currentShare}%</span>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-4 mb-4">
              <div className="text-gray-400 text-sm mb-3">You Receive</div>
              <div className="space-y-3">
                <div className="flex justify-between text-white font-medium text-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#BFFF0B] to-emerald-500 flex items-center justify-center text-black text-[10px] font-bold">
                      {tokenA.symbol.slice(0, 1)}
                    </div>
                    <span>{tokenA.symbol}</span>
                  </div>
                  <span>~{formatAmount(Number(formatUnits(receiveA, tokenA.decimals)))}</span>
                </div>
                <div className="flex justify-between text-white font-medium text-lg">
                  <div className="flex items-center gap-2">
                     <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold">
                      {tokenB.symbol.slice(0, 1)}
                    </div>
                    <span>{tokenB.symbol}</span>
                  </div>
                  <span>~{formatAmount(Number(formatUnits(receiveB, tokenB.decimals)))}</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <Button
              onClick={handleRemoveLiquidity}
              className="w-full"
              disabled={!isConnected || !lpAmount || burnWei === 0n || isLoading || burnWei > lpBalance}
            >
              {!isConnected 
                ? 'Connect Wallet' 
                : burnWei > lpBalance 
                  ? 'Insufficient LP Balance'
                  : isLoading 
                    ? 'Removing...' 
                    : 'Remove Liquidity'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
