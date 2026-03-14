import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { SwapWidget } from '../components/swap/SwapWidget';

// ─── Feature Cards Data ─────────────────────────────────────────────────────

const features = [
  {
    icon: (
      <svg className="w-6 h-6 text-[#BFFF0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    ),
    tag: 'Smart Routing',
    title: 'Best Price, Automatically',
    description: 'Every swap is routed across direct and multi-hop paths to guarantee the maximum output — no configuration needed.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-[#BFFF0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    tag: 'Non-Custodial',
    title: 'Your Keys, Your Tokens',
    description: 'Verdex never touches your funds. All trades execute directly against on-chain liquidity pools — zero intermediaries, zero counterparty risk.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-[#BFFF0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    tag: 'Earn Passively',
    title: 'Liquidity that Works for You',
    description: 'Deposit any token pair and earn 0.3% on every swap proportional to your share. Watch your position grow in real-time.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-[#BFFF0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    tag: 'Full Transparency',
    title: 'Price Impact Before You Commit',
    description: 'See real price impact, exact route, and minimum received — calculated live from on-chain reserves before every trade.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-[#BFFF0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    tag: 'Arbitrum Speed',
    title: 'Sub-second Finality',
    description: 'Built on Arbitrum — trades settle near-instantly at a fraction of Ethereum mainnet gas costs.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-[#BFFF0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    tag: 'Open Protocol',
    title: 'Fully Verifiable On-Chain',
    description: 'Every pool, every swap, every LP position lives on-chain. No black boxes — inspect any contract on Arbiscan at any time.',
  },
];

// ─── FAQ Data ───────────────────────────────────────────────────────────────

const faqs = [
  {
    q: 'What is Verdex and how does it work?',
    a: 'Verdex is a fully on-chain, non-custodial decentralized exchange (DEX) on Arbitrum. You connect your wallet, select tokens, and swap — Verdex routes your trade through the most efficient path across its liquidity pools using the constant-product AMM formula. No accounts, no sign-ups, no middlemen.',
  },
  {
    q: 'What are the fees on Verdex?',
    a: 'Every swap carries a 0.3% LP fee, which goes entirely to liquidity providers. There is no additional protocol fee — 100% of trading fees are distributed to LPs who provide the liquidity backing your trades.',
  },
  {
    q: 'What is multi-hop swapping?',
    a: 'If no direct pool exists between two tokens (e.g. WBTC and WETH), Verdex automatically routes through an intermediate — for example WBTC → USDC → WETH — in a single transaction. You always get the best available path without manually selecting routes.',
  },
  {
    q: 'How do I earn fees as a liquidity provider?',
    a: 'Navigate to "Liquidity" → "Add Liquidity", select a token pair, deposit both tokens at the current pool ratio, and receive LP tokens representing your share. You earn 0.3% of every swap through that pool, proportional to your share. Remove liquidity at any time to withdraw your tokens plus accumulated fees.',
  },
  {
    q: 'Is Verdex safe to use?',
    a: 'Verdex is non-custodial — your tokens never leave your wallet until a trade is confirmed by you in MetaMask. All smart contracts are deployed on Arbitrum and are publicly verifiable on Arbiscan. No team wallet or admin key can move your funds.',
  },
  {
    q: 'What is price impact and should I worry about it?',
    a: 'Price impact measures how much your trade shifts the pool price. Small trades in deep pools have near-zero impact (< 0.1%). Large trades relative to pool size can move the price significantly. Verdex shows you the real price impact before every trade — if it\'s above 5%, you\'ll see a prominent warning.',
  },
];

// ─── FAQ Accordion Item ─────────────────────────────────────────────────────

const FAQItem: React.FC<{ q: string; a: string; index: number }> = ({ q, a, index }) => {
  const [open, setOpen] = useState(index === 0);

  return (
    <div
      className="border border-white/10 rounded-xl overflow-hidden transition-all duration-300"
      style={{ background: open ? 'rgba(191,255,11,0.03)' : 'rgba(255,255,255,0.02)' }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 text-left group"
      >
        <span className={`font-medium transition-colors duration-200 ${open ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
          {q}
        </span>
        <span
          className={`ml-4 flex-shrink-0 w-7 h-7 rounded-full border flex items-center justify-center transition-all duration-300 ${
            open
              ? 'border-[#BFFF0B] text-[#BFFF0B] rotate-45'
              : 'border-white/20 text-gray-400 group-hover:border-white/40'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <p className="px-6 pb-5 text-gray-400 text-sm leading-relaxed">
          {a}
        </p>
      </div>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

export const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-dark">

      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <div className="container mx-auto px-4 md:px-6 pt-28 md:pt-32 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 border-2 border-white/20 rounded-full">
              <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
              <span className="text-white font-medium text-sm md:text-base">Live On Arbitrum Testnet</span>
            </div>
            <div className="space-y-6">
              <h1 className="text-6xl sm:text-7xl lg:text-8xl xl:text-9xl font-bold text-white leading-tight font-vt323">
                Trade Without Limits
              </h1>
              <p className="text-xl md:text-3xl text-gray-300 max-w-2xl font-orbitron font-medium">
                Swap any token, provide liquidity, own your trades.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button onClick={() => navigate('/trade')} className="text-base md:text-lg px-6 md:px-8 py-3 md:py-4">
                Start Swapping
              </Button>
              <Button variant="outline" className="text-base md:text-lg px-6 md:px-8 py-3 md:py-4" onClick={() => navigate('/liquidity/add')}>
                Earn as LP
                <svg className="w-5 h-5 ml-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Button>
            </div>
          </div>
          {/* Right — Swap Widget (hidden on mobile) */}
          <div className="hidden lg:flex justify-center lg:justify-end">
            <SwapWidget isPlaceholder={true} />
          </div>
        </div>
      </div>

      {/* ── Feature Cards Section ─────────────────────────────────────────── */}
      <div className="container mx-auto px-6 py-24">
        {/* Section Label */}
        <div className="text-center mb-16">
          <p className="text-[#BFFF0B] text-sm font-semibold tracking-[0.25em] uppercase mb-3">
            ENGINEERED FOR TRUE DEFI
          </p>
          <h2 className="text-white text-4xl lg:text-5xl font-bold">
            Built on Functional Core Infrastructure
          </h2>
          <p className="text-gray-400 mt-4 max-w-xl mx-auto">
            Secure, scalable, & decentralized solution for your digital assets. Experience the future of financial freedom.
          </p>
        </div>

        {/* 3-col grid, 2 rows */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div
              key={i}
              className="group relative bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-[#BFFF0B]/30 rounded-2xl p-6 transition-all duration-300 cursor-default overflow-hidden"
            >
              {/* Subtle glow on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: 'radial-gradient(circle at 20% 20%, rgba(191,255,11,0.05) 0%, transparent 70%)' }}
              />

              {/* Icon */}
              <div className="w-11 h-11 rounded-xl bg-[#BFFF0B]/10 border border-[#BFFF0B]/20 flex items-center justify-center mb-5 group-hover:bg-[#BFFF0B]/15 transition-colors duration-300">
                {f.icon}
              </div>

              {/* Tag */}
              <p className="text-[#BFFF0B] text-xs font-semibold tracking-widest uppercase mb-2">
                {f.tag}
              </p>

              {/* Title */}
              <h3 className="text-white text-lg font-semibold mb-2 leading-snug">
                {f.title}
              </h3>

              {/* Description */}
              <p className="text-gray-400 text-sm leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── FAQ Section ──────────────────────────────────────────────────── */}
      <div className="container mx-auto px-6 py-24 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-[#BFFF0B] text-sm font-semibold tracking-[0.25em] uppercase mb-3">
            FAQ
          </p>
          <h2 className="text-white text-4xl lg:text-5xl font-bold leading-tight">
            Get Answers To Common Questions
          </h2>
        </div>

        {/* Accordion */}
        <div className="space-y-3">
          {faqs.map((item, i) => (
            <FAQItem key={i} q={item.q} a={item.a} index={i} />
          ))}
        </div>
      </div>

      {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
      <div className="container mx-auto px-6 pb-32">
        <div className="relative rounded-3xl overflow-hidden border border-[#BFFF0B]/20 p-12 text-center"
          style={{ background: 'linear-gradient(135deg, rgba(191,255,11,0.07) 0%, rgba(0,0,0,0) 60%)' }}
        >
          <p className="text-[#BFFF0B] text-sm font-semibold tracking-widest uppercase mb-4">Start now</p>
          <h2 className="text-white text-4xl lg:text-5xl font-bold mb-4">Ready to Trade On-Chain?</h2>
          <p className="text-gray-400 max-w-md mx-auto mb-8">
            Connect your wallet and make your first swap in under 30 seconds.
          </p>
          <Button onClick={() => navigate('/trade')} className="text-lg px-10 py-4">
            Launch App
          </Button>
        </div>
      </div>

    </div>
  );
};
