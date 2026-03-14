import React, { useState } from 'react';
import { TOKEN_LIST } from '../../contracts/addresses';
import { Modal } from '../common/Modal';

interface TokenSelectorProps {
  selectedToken: typeof TOKEN_LIST[0] | null;
  onSelect: (token: typeof TOKEN_LIST[0]) => void;
  excludeToken?: string;
}

export const TokenSelector: React.FC<TokenSelectorProps> = ({
  selectedToken,
  onSelect,
  excludeToken,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const filteredTokens = TOKEN_LIST.filter(
    (token) => token.address !== excludeToken
  );

  const handleSelect = (token: typeof TOKEN_LIST[0]) => {
    onSelect(token);
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-colors"
      >
        {selectedToken ? (
          <>
            <span className="text-white font-medium">{selectedToken.symbol}</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        ) : (
          <>
            <span className="text-gray-400">Select token</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Select Token">
        <div className="space-y-2">
          {filteredTokens.map((token) => (
            <button
              key={token.address}
              onClick={() => handleSelect(token)}
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-primary font-bold text-sm">
                    {token.symbol.charAt(0)}
                  </span>
                </div>
                <div className="text-left">
                  <div className="text-white font-medium">{token.symbol}</div>
                  <div className="text-gray-400 text-sm">{token.name}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </Modal>
    </>
  );
};
