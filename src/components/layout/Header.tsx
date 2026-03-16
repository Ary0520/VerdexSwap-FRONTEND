import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWalletStore } from '../../store/walletStore';
import { Button } from '../common/Button';
import { formatAddress } from '../../utils/formatters';

const verdexLogo = '/verdex-logo.png';
const metamaskIcon = '/metamask.svg';

export const Header: React.FC = () => {
  const { address, isConnected, connect, disconnect } = useWalletStore();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { to: '/pools', label: 'Explorer' },
    { to: '/trade', label: 'Trade' },
    { to: '/liquidity', label: 'Liquidity' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-black/50 backdrop-blur-md border-b border-white/10">
      <div className="w-full px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0" onClick={() => setMenuOpen(false)}>
            <img src={verdexLogo} alt="Verdex Logo" className="h-8 md:h-12 w-auto" />
            <span className="hidden md:block text-white font-semibold text-xl font-orbitron">VerdexSwap</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map(link => (
              <Link key={link.to} to={link.to} className="text-gray-300 hover:text-white transition-colors">
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Wallet button */}
            {isConnected ? (
              <>
                <button onClick={disconnect} className="md:hidden flex items-center justify-center w-9 h-9 transition-colors" aria-label="Disconnect">
                  <img src={metamaskIcon} alt="Wallet" className="w-6 h-6" />
                </button>
                <Button variant="outline" onClick={disconnect} className="hidden md:inline-flex text-sm px-4 py-2">
                  {formatAddress(address!)}
                </Button>
              </>
            ) : (
              <>
                <button onClick={connect} className="md:hidden flex items-center justify-center w-9 h-9 transition-colors" aria-label="Connect Wallet">
                  <img src={metamaskIcon} alt="Connect Wallet" className="w-6 h-6" />
                </button>
                <Button onClick={connect} className="hidden md:inline-flex text-sm px-4 py-2">
                  Connect Wallet
                </Button>
              </>
            )}

            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMenuOpen(prev => !prev)}
              className="md:hidden flex flex-col justify-center items-center w-9 h-9 gap-1.5"
              aria-label="Menu"
            >
              <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${menuOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
        <nav className="flex flex-col px-4 pb-4 pt-1 gap-1 border-t border-white/10">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className={`px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                location.pathname === link.to
                  ? 'bg-white/10 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
};
