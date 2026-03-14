import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TokenSelector } from './TokenSelector';
import { TOKEN_LIST } from '../../contracts/addresses';
import { Button } from '../common/Button';

interface SwapWidgetProps {
  isPlaceholder?: boolean;
}

export const SwapWidget: React.FC<SwapWidgetProps> = ({ isPlaceholder = false }) => {
  const navigate = useNavigate();
  const [tokenIn, setTokenIn] = useState(TOKEN_LIST[1]); // USDC
  const [tokenOut, setTokenOut] = useState(TOKEN_LIST[0]); // WETH
  const [amountIn, setAmountIn] = useState('');

  const handleSwap = () => {
    if (isPlaceholder) {
      navigate('/trade');
    }
  };

  return (
    <div className="bg-darker-green/80 backdrop-blur-sm border border-white/10 rounded-2xl p-6 w-full max-w-md">
      <h3 className="text-white text-lg font-semibold mb-4">Swap</h3>

      {/* You Pay */}
      <div className="bg-white/5 rounded-xl p-4 mb-2">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400 text-sm">You Pay</span>
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
            onSelect={setTokenIn}
            excludeToken={tokenOut?.address}
          />
        </div>
      </div>

      {/* Swap Arrow */}
      <div className="flex justify-center -my-2 relative z-10">
        <button className="bg-darker-green border border-white/10 rounded-full p-2 hover:border-primary transition-colors">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>
      </div>

      {/* You Receive */}
      <div className="bg-white/5 rounded-xl p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400 text-sm">You Receive</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 text-gray-500 text-2xl">~0.00</div>
          <TokenSelector
            selectedToken={tokenOut}
            onSelect={setTokenOut}
            excludeToken={tokenIn?.address}
          />
        </div>
      </div>

      {/* Info Section */}
      {amountIn && (
        <div className="bg-white/5 rounded-xl p-4 mb-4 space-y-2 text-sm">
          <div className="flex justify-between text-gray-400">
            <span>Price Impact</span>
            <span className="text-white">~0.12%</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Minimum Received</span>
            <span className="text-white">~0.00 {tokenOut?.symbol}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Fee</span>
            <span className="text-white">0.3%</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Route</span>
            <span className="text-white">{tokenIn?.symbol} → {tokenOut?.symbol}</span>
          </div>
        </div>
      )}

      <Button
        onClick={handleSwap}
        className="w-full"
        disabled={!amountIn || !tokenIn || !tokenOut}
      >
        {isPlaceholder ? 'Start Swapping' : 'Swap'}
      </Button>
    </div>
  );
};
