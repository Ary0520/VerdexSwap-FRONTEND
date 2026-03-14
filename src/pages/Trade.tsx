import React, { useState, useEffect } from 'react';
import { TokenSelector } from '../components/swap/TokenSelector';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { TOKEN_LIST } from '../contracts/addresses';
import { useSwap, QuoteResult } from '../hooks/useSwap';
import { useTokenBalance } from '../hooks/useTokenBalance';
import { useWalletStore } from '../store/walletStore';
import { useNotificationStore } from '../store/notificationStore';
import { formatTokenAmount, formatAmount, formatPercentage } from '../utils/formatters';
import { DEFAULT_SLIPPAGE, DEFAULT_DEADLINE, SLIPPAGE_OPTIONS } from '../utils/constants';
import { parseUnits } from 'ethers';

// ─── Price impact severity helper ──────────────────────────────────────────

const impactColor = (impact: number) => {
  if (impact < 1) return 'text-green-400';
  if (impact < 3) return 'text-yellow-400';
  if (impact < 5) return 'text-orange-400';
  return 'text-red-500';
};

const impactLabel = (impact: number) => {
  if (impact < 1) return null;                    // low, no warning needed
  if (impact < 3) return 'Medium price impact';
  if (impact < 5) return 'High price impact';
  return '⚠️ Very high price impact — consider a smaller trade';
};

// ─── Route display helper ───────────────────────────────────────────────────

const RouteDisplay: React.FC<{ path: string[] }> = ({ path }) => {
  const symbols = path.map(addr => {
    const token = TOKEN_LIST.find(t => t.address.toLowerCase() === addr.toLowerCase());
    return token?.symbol ?? addr.slice(0, 6);
  });
  return (
    <span className="text-white">
      {symbols.join(' → ')}
    </span>
  );
};

// ─── Component ─────────────────────────────────────────────────────────────

export const Trade: React.FC = () => {
  const { isConnected } = useWalletStore();
  const { addNotification } = useNotificationStore();
  const [tokenIn, setTokenIn] = useState(TOKEN_LIST[1]); // USDC
  const [tokenOut, setTokenOut] = useState(TOKEN_LIST[0]); // WETH
  const [amountIn, setAmountIn] = useState('');
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [slippage, setSlippage] = useState(DEFAULT_SLIPPAGE);
  const [deadline, setDeadline] = useState(DEFAULT_DEADLINE);
  const [showSettings, setShowSettings] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [customSlippage, setCustomSlippage] = useState('');

  const { getQuote, executeSwap, isLoading, error } = useSwap();
  const { balance: balanceIn } = useTokenBalance(tokenIn?.address, tokenIn?.decimals);

  // Fetch quote with 500ms debounce
  useEffect(() => {
    setQuote(null);
    if (!amountIn || !tokenIn || !tokenOut) return;

    setQuoteLoading(true);
    const timer = setTimeout(async () => {
      const result = await getQuote(amountIn, tokenIn.address, tokenOut.address, tokenIn.decimals);
      setQuote(result);
      setQuoteLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [amountIn, tokenIn, tokenOut]);

  const handleSwap = async () => {
    if (!amountIn || !tokenIn || !tokenOut || !quote || quote.insufficientLiquidity) return;

    const { success, txHash } = await executeSwap(
      amountIn,
      quote.path,
      tokenIn.decimals,
      slippage,
      deadline,
      quote.amountOut,
    );

    if (success) {
      setShowPreview(false);
      setAmountIn('');
      setQuote(null);
      addNotification({
        type: 'success',
        title: 'Swap Successful',
        message: `Swapped ${amountIn} ${tokenIn.symbol} for ${tokenOut.symbol}`,
        txHash,
      });
    }
  };

  const switchTokens = () => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn('');
    setQuote(null);
  };

  const minimumReceived = quote?.amountOut
    ? (quote.amountOut * BigInt(Math.floor((100 - slippage) * 100))) / 10000n
    : 0n;

  // Balance check
  let insufficientBalance = false;
  try {
    if (amountIn && balanceIn !== undefined && tokenIn) {
      insufficientBalance = parseUnits(amountIn, tokenIn.decimals) > balanceIn;
    }
  } catch {}

  const swapDisabled = !isConnected || !amountIn || !tokenIn || !tokenOut
    || isLoading || quoteLoading || insufficientBalance
    || quote?.insufficientLiquidity === true || (quote !== null && quote.amountOut === 0n);

  // Button label
  const getButtonLabel = () => {
    if (!isConnected) return 'Connect Wallet';
    if (!amountIn) return 'Enter an amount';
    if (quoteLoading) return 'Fetching best route...';
    if (insufficientBalance) return `Insufficient ${tokenIn.symbol} balance`;
    if (quote?.insufficientLiquidity) return 'Insufficient liquidity';
    if (isLoading) return 'Swapping...';
    return 'Swap';
  };

  return (
    <div className="min-h-screen bg-gradient-dark pt-24 pb-12">
      <div className="w-full max-w-2xl mx-auto px-4 md:px-6">
          <div className="bg-darker-green/80 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6">

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-white text-2xl font-semibold">Swap</h2>
              <button
                onClick={() => setShowSettings(true)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>

            {/* You Pay */}
            <div className="bg-white/5 rounded-xl p-4 mb-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400 text-sm">You Pay</span>
                <button
                  onClick={() => {
                    const max = Number(balanceIn) / 10 ** tokenIn.decimals;
                    setAmountIn(max.toString());
                  }}
                  className="text-gray-400 text-sm hover:text-[#BFFF0B] transition-colors"
                >
                  Balance: {formatTokenAmount(balanceIn, tokenIn.decimals)}
                </button>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={amountIn}
                  onChange={(e) => setAmountIn(e.target.value)}
                  placeholder="0.0"
                  className="flex-1 bg-transparent text-white text-2xl outline-none"
                />
                <TokenSelector
                  selectedToken={tokenIn}
                  onSelect={(t) => { setTokenIn(t); setQuote(null); }}
                  excludeToken={tokenOut?.address}
                />
              </div>
            </div>

            {/* Swap Arrow */}
            <div className="flex justify-center -my-2 relative z-10">
              <button
                onClick={switchTokens}
                className="bg-darker-green border border-white/10 rounded-full p-2 hover:border-primary transition-colors"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>
            </div>

            {/* You Receive */}
            <div className="bg-white/5 rounded-xl p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400 text-sm">You Receive</span>
                {quoteLoading && (
                  <span className="text-gray-500 text-xs animate-pulse">Finding best route...</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 text-white text-2xl">
                  {quote && !quote.insufficientLiquidity && quote.amountOut > 0n
                    ? `~${formatTokenAmount(quote.amountOut, tokenOut.decimals)}`
                    : '0.0'}
                </div>
                <TokenSelector
                  selectedToken={tokenOut}
                  onSelect={(t) => { setTokenOut(t); setQuote(null); }}
                  excludeToken={tokenIn?.address}
                />
              </div>
            </div>

            {/* Trade Info */}
            {amountIn && quote && !quote.insufficientLiquidity && quote.amountOut > 0n && (
              <div className="bg-white/5 rounded-xl p-4 mb-4 space-y-2 text-sm">
                {/* Price Impact */}
                <div className="flex justify-between text-gray-400">
                  <span>Price Impact</span>
                  <span className={`font-medium ${impactColor(quote.priceImpact)}`}>
                    {quote.priceImpact < 0.01 ? '< 0.01%' : `${quote.priceImpact.toFixed(2)}%`}
                  </span>
                </div>

                {/* Impact warning */}
                {impactLabel(quote.priceImpact) && (
                  <div className={`text-xs text-right ${impactColor(quote.priceImpact)} opacity-80`}>
                    {impactLabel(quote.priceImpact)}
                  </div>
                )}

                <div className="flex justify-between text-gray-400">
                  <span>Minimum Received</span>
                  <span className="text-white">
                    {formatTokenAmount(minimumReceived, tokenOut.decimals)} {tokenOut.symbol}
                  </span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Slippage Tolerance</span>
                  <span className="text-white">{formatPercentage(slippage)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Fee</span>
                  <span className="text-white">
                    {quote.path.length > 2 ? `${(quote.path.length - 1) * 0.3}% (${quote.path.length - 1} hops)` : '0.3%'}
                  </span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Route</span>
                  <RouteDisplay path={quote.path} />
                </div>
              </div>
            )}

            {/* Insufficient Liquidity */}
            {amountIn && quote?.insufficientLiquidity && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                <p className="text-red-400 text-sm">Insufficient liquidity for this trade.</p>
              </div>
            )}

            {/* High impact warning banner */}
            {quote && quote.priceImpact >= 5 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                <p className="text-red-400 text-sm font-medium">
                  ⚠️ Price impact is {quote.priceImpact.toFixed(2)}%. This trade will move the market significantly.
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <Button
              onClick={() => setShowPreview(true)}
              className={`w-full ${quote && quote.priceImpact >= 5 ? 'border-2 border-red-500' : ''}`}
              disabled={swapDisabled}
            >
              {getButtonLabel()}
            </Button>
          </div>
      </div>

      {/* Settings Modal */}
      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Transaction Settings">
        <div className="space-y-6">
          <div>
            <label className="text-white text-sm mb-2 block">Slippage Tolerance</label>
            <div className="flex gap-2 mb-2">
              {SLIPPAGE_OPTIONS.map((option) => (
                <button
                  key={option}
                  onClick={() => { setSlippage(option); setCustomSlippage(''); }}
                  className={`flex-1 py-2 rounded-lg transition-colors ${
                    slippage === option ? 'bg-primary text-black' : 'bg-white/5 text-white hover:bg-white/10'
                  }`}
                >
                  {option}%
                </button>
              ))}
            </div>
            <input
              type="text"
              value={customSlippage}
              onChange={(e) => {
                setCustomSlippage(e.target.value);
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) setSlippage(val);
              }}
              placeholder="Custom %"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
            />
          </div>
          <div>
            <label className="text-white text-sm mb-2 block">Transaction Deadline</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={deadline}
                onChange={(e) => setDeadline(parseInt(e.target.value) || DEFAULT_DEADLINE)}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
              />
              <span className="text-gray-400">minutes</span>
            </div>
          </div>
        </div>
      </Modal>

      {/* Swap Preview Modal */}
      <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} title="Confirm Swap">
        <div className="space-y-4">
          <div className="bg-white/5 rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">You Pay</span>
              <span className="text-white font-medium">{amountIn} {tokenIn.symbol}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">You Receive (est.)</span>
              <span className="text-white font-medium">
                ~{quote ? formatTokenAmount(quote.amountOut, tokenOut.decimals) : '0'} {tokenOut.symbol}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Minimum Received</span>
              <span className="text-white">
                {formatTokenAmount(minimumReceived, tokenOut.decimals)} {tokenOut.symbol}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Price Impact</span>
              <span className={`font-medium ${quote ? impactColor(quote.priceImpact) : 'text-white'}`}>
                {quote ? (quote.priceImpact < 0.01 ? '< 0.01%' : `${quote.priceImpact.toFixed(2)}%`) : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Route</span>
              {quote && <RouteDisplay path={quote.path} />}
            </div>
          </div>

          {quote && quote.priceImpact >= 5 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-400 text-sm">
                This swap has a very high price impact ({quote.priceImpact.toFixed(2)}%). Proceed with caution.
              </p>
            </div>
          )}

          <Button onClick={handleSwap} className="w-full" disabled={isLoading}>
            {isLoading ? 'Confirming in wallet...' : 'Confirm Swap'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};
