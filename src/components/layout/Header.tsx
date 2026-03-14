import React from 'react';
import { Link } from 'react-router-dom';
import { useWalletStore } from '../../store/walletStore';
import { Button } from '../common/Button';
import { formatAddress } from '../../utils/formatters';

const verdexLogo = '/verdex-logo.png';
const metamaskIcon = '/metamask.svg';

export const Header: React.FC = () => {
  const { address, isConnected, connect, disconnect } = useWalletStore();

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-black/50 backdrop-blur-md border-b border-white/10">
      <div className="container mx-auto px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <img src={verdexLogo} alt="Verdex Logo" className="h-8 md:h-12 w-auto flex-shrink-0" />
            <span className="text-white font-semibold text-base md:text-xl font-orbitron truncate">VerdexSwap</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link to="/pools" className="text-gray-300 hover:text-white transition-colors">
              Explorer
            </Link>
            <Link to="/trade" className="text-gray-300 hover:text-white transition-colors">
              Trade
            </Link>
            <Link to="/liquidity" className="text-gray-300 hover:text-white transition-colors">
              Liquidity
            </Link>
          </nav>

          <div className="flex-shrink-0">
            {isConnected ? (
              <>
                <button
                  onClick={disconnect}
                  className="md:hidden flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  aria-label="Disconnect"
                >
                  <img src={metamaskIcon} alt="Wallet" className="w-6 h-6" />
                </button>
                <Button variant="outline" onClick={disconnect} className="hidden md:inline-flex text-sm px-4 py-2">
                  {formatAddress(address!)}
                </Button>
              </>
            ) : (
              <>
                <button
                  onClick={connect}
                  className="md:hidden flex items-center justify-center w-9 h-9 transition-colors"
                  aria-label="Connect Wallet"
                >
                  <img src={metamaskIcon} alt="Connect Wallet" className="w-6 h-6" />
                </button>
                <Button onClick={connect} className="hidden md:inline-flex text-sm px-4 py-2">
                  Connect Wallet
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
