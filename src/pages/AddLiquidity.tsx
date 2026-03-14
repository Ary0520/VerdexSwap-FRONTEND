import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TokenSelector } from '../components/swap/TokenSelector';
import { Button } from '../components/common/Button';
import { TOKEN_LIST } from '../contracts/addresses';
import { useLiquidity } from '../hooks/useLiquidity';
import { useTokenBalance } from '../hooks/useTokenBalance';
import { useWalletStore } from '../store/walletStore';
import { useNotificationStore } from '../store/notificationStore';
import { formatTokenAmount } from '../utils/formatters';
import { DEFAULT_SLIPPAGE, DEFAULT_DEADLINE } from '../utils/constants';

export const AddLiquidity: React.FC = () => {
  const navigate = useNavigate();
  const { isConnected } = useWalletStore();
  const { addNotification } = useNotificationStore();
  const [tokenA, setTokenA] = useState(TOKEN_LIST[1]); // USDC
  const [tokenB, setTokenB] = useState(TOKEN_LIST[0]); // WETH
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [poolShare, setPoolShare] = useState('0.00');

  const { addLiquidity, getReserves, getPairAddress, isLoading, error } = useLiquidity();
  const { balance: balanceA } = useTokenBalance(tokenA?.address, tokenA?.decimals);
  const { balance: balanceB } = useTokenBalance(tokenB?.address, tokenB?.decimals);

  useEffect(() => {
    const calculateAmountB = async () => {
      if (!amountA || !tokenA || !tokenB) {
        setAmountB('');
        return;
      }

      const pairAddress = await getPairAddress(tokenA.address, tokenB.address);
      if (!pairAddress) {
        // New pair, user can set any ratio
        return;
      }

      const reserves = await getReserves(pairAddress);
      if (!reserves) return;

      // Calculate proportional amount
      const amountAWei = BigInt(Math.floor(parseFloat(amountA) * 10 ** tokenA.decimals));
      const amountBWei = (amountAWei * reserves.reserve1) / reserves.reserve0;
      const amountBFormatted = formatTokenAmount(amountBWei, tokenB.decimals);
      
      setAmountB(amountBFormatted);
    };

    const debounce = setTimeout(calculateAmountB, 500);
    return () => clearTimeout(debounce);
  }, [amountA, tokenA, tokenB]);

  const handleAddLiquidity = async () => {
    if (!amountA || !amountB || !tokenA || !tokenB) return;

    const { success, txHash } = await addLiquidity(
      tokenA.address,
      tokenB.address,
      amountA,
      amountB,
      tokenA.decimals,
      tokenB.decimals,
      DEFAULT_SLIPPAGE,
      DEFAULT_DEADLINE
    );

    if (success) {
      addNotification({
        type: 'success',
        title: 'Liquidity Added',
        message: `Added ${amountA} ${tokenA.symbol} and ${amountB} ${tokenB.symbol}`,
        txHash,
      });
      navigate('/liquidity');
    }
  };

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

          <div className="bg-darker-green/80 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <h2 className="text-white text-2xl font-semibold mb-6">Add Liquidity</h2>

            {/* Token A */}
            <div className="bg-white/5 rounded-xl p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400 text-sm">Token A</span>
                <span className="text-gray-400 text-sm">
                  Balance: {formatTokenAmount(balanceA, tokenA.decimals)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={amountA}
                  onChange={(e) => setAmountA(e.target.value)}
                  placeholder="0.0"
                  className="flex-1 bg-transparent text-white text-2xl outline-none"
                />
                <TokenSelector
                  selectedToken={tokenA}
                  onSelect={setTokenA}
                  excludeToken={tokenB?.address}
                />
              </div>
            </div>

            <div className="flex justify-center -my-2 relative z-10">
              <div className="bg-darker-green border border-white/10 rounded-full p-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </div>

            {/* Token B */}
            <div className="bg-white/5 rounded-xl p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400 text-sm">Token B</span>
                <span className="text-gray-400 text-sm">
                  Balance: {formatTokenAmount(balanceB, tokenB.decimals)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={amountB}
                  onChange={(e) => setAmountB(e.target.value)}
                  placeholder="0.0"
                  className="flex-1 bg-transparent text-white text-2xl outline-none"
                />
                <TokenSelector
                  selectedToken={tokenB}
                  onSelect={setTokenB}
                  excludeToken={tokenA?.address}
                />
              </div>
            </div>

            {/* Info */}
            {amountA && amountB && (
              <div className="bg-white/5 rounded-xl p-4 mb-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Pool Share</span>
                  <span className="text-white">{poolShare}%</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Rate</span>
                  <span className="text-white">
                    1 {tokenA.symbol} = {amountB && amountA ? (parseFloat(amountB) / parseFloat(amountA)).toFixed(6) : '0'} {tokenB.symbol}
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <Button
              onClick={handleAddLiquidity}
              className="w-full"
              disabled={!isConnected || !amountA || !amountB || isLoading}
            >
              {!isConnected ? 'Connect Wallet' : isLoading ? 'Adding...' : 'Add Liquidity'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
