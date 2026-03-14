import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, UTCTimestamp, AreaSeries, HistogramSeries } from 'lightweight-charts';
import { usePairs, useDayData, usePairDayData, useSwapEvents, useAllPairDayDatas, formatUSD, formatDate } from '../hooks/useSubgraph';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Pair {
  id: string;
  token0: { id: string; symbol: string; name: string };
  token1: { id: string; symbol: string; name: string };
  reserve0: string;
  reserve1: string;
  reserveUSD: string;
  volumeUSD: string;
  txCount: string;
  token0Price: string;
  token1Price: string;
  createdAtTimestamp: string;
}

// ─── Mock Prices (Oracle Workaround) ───────────────────────────────────────

const getMockPrice = (symbol: string) => {
  const s = symbol.toUpperCase();
  if (s.includes('WETH') || s.includes('ETH')) return 2000;
  if (s.includes('WBTC') || s.includes('BTC')) return 60000;
  if (s.includes('USDC') || s.includes('DAI')) return 1;
  if (s.includes('ARB')) return 1;
  return 0;
};

const getPairTVL = (pair: Pair) => {
  const r0USD = parseFloat(pair.reserve0) * getMockPrice(pair.token0.symbol);
  const r1USD = parseFloat(pair.reserve1) * getMockPrice(pair.token1.symbol);
  return r0USD + r1USD;
};

// ─── Mini Sparkline Chart ──────────────────────────────────────────────────

const SparklineChart: React.FC<{ data: { time: UTCTimestamp; value: number }[]; color: string }> = ({ data, color }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 60,
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: 'transparent' },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      rightPriceScale: { visible: false },
      leftPriceScale: { visible: false },
      timeScale: { visible: false },
      crosshair: { vertLine: { visible: false }, horzLine: { visible: false } },
      handleScroll: false,
      handleScale: false,
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: color,
      topColor: `${color}33`,
      bottomColor: `${color}00`,
      lineWidth: 2,
      crosshairMarkerVisible: false,
    });
    const chartData = [...data]
      .sort((a, b) => (a.time as number) - (b.time as number))
      .filter((d, i, arr) => i === 0 || d.time !== arr[i - 1].time);
    series.setData(chartData);
    chart.timeScale().fitContent();
    chartRef.current = chart;

    return () => { chart.remove(); };
  }, [data, color]);

  return <div ref={containerRef} className="w-full overflow-hidden" />;
};

// ─── Volume Bar Chart ──────────────────────────────────────────────────────

const VolumeBarChart: React.FC<{ data: { date: number; dailyVolumeUSD: string }[] }> = ({ data }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 220,
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#9ca3af' },
      grid: { vertLines: { color: 'rgba(255,255,255,0.05)' }, horzLines: { color: 'rgba(255,255,255,0.05)' } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true },
      crosshair: { vertLine: { color: '#BFFF0B44' }, horzLine: { color: '#BFFF0B44' } },
    });

    const series = chart.addSeries(HistogramSeries, {
      color: '#BFFF0B',
      priceFormat: { 
        type: 'custom', 
        formatter: (v: number) => {
          if (v >= 1000000) return `$${(v / 1000000).toFixed(2)}M`;
          if (v >= 1000) return `$${(v / 1000).toFixed(2)}K`;
          return `$${v.toFixed(2)}`;
        }
      },
    });
    const chartData = data
      .map(d => ({
        time: parseInt(d.date.toString(), 10) as UTCTimestamp,
        value: parseFloat(d.dailyVolumeUSD) || 0,
        color: '#BFFF0B88',
      }))
      .sort((a, b) => (a.time as number) - (b.time as number))
      .filter((d, i, arr) => i === 0 || d.time !== arr[i - 1].time);

    series.setData(chartData);
    const maxVal = Math.max(0, ...chartData.map(d => d.value));
    series.applyOptions({
      autoscaleInfoProvider: () => ({
        priceRange: { minValue: 0, maxValue: maxVal * 1.1 || 10 },
      }),
    });
    chart.timeScale().fitContent();
    chartRef.current = chart;

    return () => { chart.remove(); };
  }, [data]);

  return <div ref={containerRef} className="w-full overflow-hidden" />;
};

// ─── Liquidity Line Chart ──────────────────────────────────────────────────

const LiquidityChart: React.FC<{ data: { date: number; totalLiquidityUSD: string }[] }> = ({ data }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 220,
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#9ca3af' },
      grid: { vertLines: { color: 'rgba(255,255,255,0.05)' }, horzLines: { color: 'rgba(255,255,255,0.05)' } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true },
      crosshair: { vertLine: { color: '#60a5fa44' }, horzLine: { color: '#60a5fa44' } },
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: '#60a5fa',
      topColor: '#60a5fa33',
      bottomColor: '#60a5fa00',
      lineWidth: 2,
      priceFormat: { 
        type: 'custom', 
        formatter: (v: number) => {
          if (v >= 1000000) return `$${(v / 1000000).toFixed(2)}M`;
          if (v >= 1000) return `$${(v / 1000).toFixed(2)}K`;
          return `$${v.toFixed(2)}`;
        }
      },
    });
    const chartData = data
      .map(d => ({
        time: parseInt(d.date.toString(), 10) as UTCTimestamp,
        value: parseFloat(d.totalLiquidityUSD) || 0,
      }))
      .sort((a, b) => (a.time as number) - (b.time as number))
      .filter((d, i, arr) => i === 0 || d.time !== arr[i - 1].time);

    series.setData(chartData);
    const maxVal = Math.max(0, ...chartData.map(d => d.value));
    series.applyOptions({
      autoscaleInfoProvider: () => ({
        priceRange: { minValue: 0, maxValue: maxVal * 1.1 || 10 },
      }),
    });
    chart.timeScale().fitContent();
    chartRef.current = chart;

    return () => { chart.remove(); };
  }, [data]);

  return <div ref={containerRef} className="w-full overflow-hidden" />;
};

// ─── Pair Detail Drawer ────────────────────────────────────────────────────

const PairDetailDrawer: React.FC<{ pair: Pair; onClose: () => void }> = ({ pair, onClose }) => {
  const { data: swapData } = useSwapEvents(pair.id);
  const [activeTab, setActiveTab] = useState<'swaps' | 'info'>('info');

  const swaps = swapData?.swapEvents ?? [];
  const pairLabel = `${pair.token0.symbol} / ${pair.token1.symbol}`;
  const pairTVL = getPairTVL(pair);
  const feeAPR = parseFloat(pair.volumeUSD) > 0 && pairTVL > 0
    ? ((parseFloat(pair.volumeUSD) * 0.003 * 365) / pairTVL * 100).toFixed(2)
    : '0.00';

  const token0PriceLocal = parseFloat(pair.reserve0) > 0 ? parseFloat(pair.reserve1) / parseFloat(pair.reserve0) : 0;
  const token1PriceLocal = parseFloat(pair.reserve1) > 0 ? parseFloat(pair.reserve0) / parseFloat(pair.reserve1) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-xl bg-[#0d0d0d] border border-white/10 rounded-t-2xl sm:rounded-2xl p-6 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-white font-bold text-xl">{pairLabel}</h3>
            <p className="text-gray-500 text-xs font-mono mt-0.5">{pair.id.slice(0, 8)}...{pair.id.slice(-6)}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-2xl leading-none">✕</button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Liquidity', value: formatUSD(pairTVL, true), color: 'text-blue-400' },
            { label: 'Volume', value: formatUSD(pair.volumeUSD, true), color: 'text-[#BFFF0B]' },
            { label: 'Fee APR', value: `${feeAPR}%`, color: 'text-purple-400' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 rounded-xl p-3 text-center">
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Price section */}
        <div className="bg-white/5 rounded-xl p-4 mb-5">
          <p className="text-gray-400 text-xs mb-2">Current Prices</p>
          <div className="flex justify-between">
            <span className="text-white text-sm">1 {pair.token0.symbol} = <span className="text-[#BFFF0B] font-bold">{token0PriceLocal.toFixed(6)} {pair.token1.symbol}</span></span>
            <span className="text-white text-sm">1 {pair.token1.symbol} = <span className="text-[#BFFF0B] font-bold">{token1PriceLocal.toFixed(6)} {pair.token0.symbol}</span></span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(['info', 'swaps'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-all ${activeTab === tab ? 'bg-[#BFFF0B] text-black' : 'bg-white/5 text-gray-400 hover:text-white'}`}
            >
              {tab === 'swaps' ? `Swaps (${swaps.length})` : 'Info'}
            </button>
          ))}
        </div>

        {activeTab === 'info' && (
          <div className="space-y-2 text-sm">
            {[
              ['Token 0 Reserve', `${parseFloat(pair.reserve0).toFixed(4)} ${pair.token0.symbol}`],
              ['Token 1 Reserve', `${parseFloat(pair.reserve1).toFixed(4)} ${pair.token1.symbol}`],
              ['Total Transactions', pair.txCount],
              ['Created', formatDate(pair.createdAtTimestamp)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 border-b border-white/5">
                <span className="text-gray-500">{k}</span>
                <span className="text-white font-medium">{v}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'swaps' && (
          <div className="space-y-2">
            {swaps.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">No swaps recorded yet.</div>
            ) : swaps.map((s: any) => (
              <div key={s.id} className="bg-white/5 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-white text-xs font-mono">{s.sender.slice(0, 8)}...</p>
                  <p className="text-gray-500 text-xs mt-0.5">{formatDate(s.timestamp)}</p>
                </div>
                <p className="text-[#BFFF0B] font-semibold text-sm">{formatUSD(s.amountUSD)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Pool Explorer Page ───────────────────────────────────────────────

export const Pools: React.FC = () => {
  const { data: pairsData, loading: pairsLoading } = usePairs();
  const { data: dayData, loading: dayLoading } = useDayData();
  const { data: allPairDayDatasRes, loading: allPairDayLoading } = useAllPairDayDatas();
  
  const [selectedPair, setSelectedPair] = useState<Pair | null>(null);
  const [search, setSearch] = useState('');
  const [activeChart, setActiveChart] = useState<'volume' | 'liquidity'>('volume');

  const pairs: Pair[] = pairsData?.pairs ?? [];
  const dayDatas = dayData?.dayDatas ?? [];
  const allPairDayDatas: any[] = allPairDayDatasRes?.pairDayDatas ?? [];

  // Filter
  const filtered = pairs.filter(p => {
    const q = search.toLowerCase();
    return !q || p.token0.symbol.toLowerCase().includes(q) || p.token1.symbol.toLowerCase().includes(q);
  });

  // Reconstruct Historical TVL perfectly using Mock Prices
  const uniqueDates = Array.from(new Set(allPairDayDatas.map(d => d.date as number))).sort((a, b) => a - b);
  const pairTvlHistory = new Map<string, number>();
  const pairMap = new Map<string, Pair>();
  pairs.forEach(p => pairMap.set(p.id.toLowerCase(), p));

  const historicalTvlData = uniqueDates.map(date => {
    const dayDatasForDate = allPairDayDatas.filter(d => d.date === date);
    dayDatasForDate.forEach(d => {
      const pair = pairMap.get(d.pairAddress.toLowerCase());
      if (pair) {
        const tvl = (parseFloat(d.reserve0) * getMockPrice(pair.token0.symbol)) +
                    (parseFloat(d.reserve1) * getMockPrice(pair.token1.symbol));
        pairTvlHistory.set(d.pairAddress.toLowerCase(), tvl);
      }
    });

    let totalTvl = 0;
    pairTvlHistory.forEach(tvl => { totalTvl += tvl; });
    return { date, totalLiquidityUSD: totalTvl.toString() };
  });

  // Build sparkline data
  const getSparklineData = (pair: Pair) => {
    // Use price ratio as proxy (token0Price changes reflect trade activity)
    const price = parseFloat(pair.token0Price);
    const now = Math.floor(Date.now() / 1000);
    return Array.from({ length: 7 }, (_, i) => ({
      time: (now - (6 - i) * 86400) as UTCTimestamp,
      value: price * (0.97 + Math.random() * 0.06), // small variation for visual
    }));
  };

  return (
    <div className="min-h-screen bg-black pt-24 pb-16 px-4 sm:px-6">
      <div className="w-full max-w-7xl mx-auto">

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white font-orbitron mb-1">Verdex Analytics</h1>
          <p className="text-gray-500 text-sm">Real-time protocol data indexed on-chain via The Graph</p>
        </div>

        {/* Global Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-5 md:p-6">
            <p className="text-gray-400 text-sm tracking-wide">Total Value Locked (TVL)</p>
            <p className="text-2xl md:text-3xl font-bold text-white mt-1">
              {pairs.length > 0 ? formatUSD(pairs.reduce((a, p) => a + getPairTVL(p), 0), true) : '$0.00'}
            </p>
          </div>
          <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-5 md:p-6">
            <p className="text-gray-400 text-sm tracking-wide">Total Volume</p>
            <p className="text-2xl md:text-3xl font-bold text-[#BFFF0B] mt-1">
              {dayDatas.length > 0 ? formatUSD(dayDatas.reduce((a: number, d: any) => a + parseFloat(d.dailyVolumeUSD), 0), true) : '$0.00'}
            </p>
          </div>
          <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-5 md:p-6">
            <p className="text-gray-400 text-sm tracking-wide">LP Fees Generated (0.3%)</p>
            <p className="text-2xl md:text-3xl font-bold text-purple-400 mt-1">
              {dayDatas.length > 0 ? formatUSD(dayDatas.reduce((a: number, d: any) => a + (parseFloat(d.dailyVolumeUSD) * 0.003), 0), false) : '$0.00'}
            </p>
            <p className="text-gray-600 text-xs mt-1">Earned by liquidity providers</p>
          </div>
        </div>

        {/* Global Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          {/* Volume Chart */}
          <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-4 md:p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-widest">Total Volume (30d)</p>
                {dayDatas.length > 0 ? (
                  <p className="text-white text-xl md:text-2xl font-bold mt-1">
                    {formatUSD(dayDatas.reduce((a: number, d: any) => a + parseFloat(d.dailyVolumeUSD), 0), true)}
                  </p>
                ) : (
                  <p className="text-gray-600 text-xl md:text-2xl font-bold mt-1">—</p>
                )}
              </div>
              <span className="text-[#BFFF0B] text-xs bg-[#BFFF0B]/10 px-2 py-1 rounded-full">30d</span>
            </div>
            {dayLoading ? (
              <div className="h-[220px] flex items-center justify-center text-gray-600 text-sm">Loading chart...</div>
            ) : dayDatas.length > 0 ? (
              <VolumeBarChart data={dayDatas} />
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-600 text-sm">
                Awaiting on-chain activity…
              </div>
            )}
          </div>

          {/* Liquidity Chart */}
          <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-4 md:p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-widest">Total Liquidity (TVL)</p>
                {pairs.length > 0 ? (
                  <p className="text-blue-400 text-xl md:text-2xl font-bold mt-1">
                    {formatUSD(pairs.reduce((a, p) => a + getPairTVL(p), 0), true)}
                  </p>
                ) : (
                  <p className="text-gray-600 text-xl md:text-2xl font-bold mt-1">—</p>
                )}
              </div>
              <span className="text-blue-400 text-xs bg-blue-400/10 px-2 py-1 rounded-full">TVL</span>
            </div>
            {allPairDayLoading ? (
              <div className="h-[220px] flex items-center justify-center text-gray-600 text-sm">Loading chart...</div>
            ) : historicalTvlData.length > 0 ? (
              <LiquidityChart data={historicalTvlData} />
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-600 text-sm">
                Awaiting on-chain activity…
              </div>
            )}
          </div>
        </div>

        {/* Pool Table */}
        <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl overflow-hidden">
          {/* Table header */}
          <div className="flex items-center justify-between p-4 md:p-5 border-b border-white/5">
            <h2 className="text-white font-semibold text-lg">All Pools</h2>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by token…"
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-[#BFFF0B]/50 transition-colors w-36 md:w-44"
            />
          </div>

          {pairsLoading ? (
            <div className="py-20 text-center text-gray-600">
              <div className="inline-block w-8 h-8 border-2 border-[#BFFF0B] border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm">Fetching pools from The Graph…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-gray-600">
              <p className="text-4xl mb-3">🌱</p>
              <p className="text-sm font-medium text-gray-400">No pools found yet</p>
              <p className="text-xs text-gray-600 mt-1">Add liquidity to create the first pool!</p>
            </div>
          ) : (
            <>
              {/* Desktop table — hidden on mobile */}
              <div className="hidden md:block">
                <div className="grid grid-cols-6 px-5 py-2 text-xs text-gray-600 uppercase tracking-widest border-b border-white/5">
                  <span className="col-span-2"># Pool</span>
                  <span className="text-right">Liquidity</span>
                  <span className="text-right">Volume</span>
                  <span className="text-right">Fee APR</span>
                  <span className="text-right">Txns</span>
                </div>
                {filtered.map((pair, i) => {
                  const pairTVL = getPairTVL(pair);
                  const feeAPR = parseFloat(pair.volumeUSD) > 0 && pairTVL > 0
                    ? ((parseFloat(pair.volumeUSD) * 0.003 * 365) / pairTVL * 100).toFixed(2)
                    : '0.00';
                  return (
                    <button
                      key={pair.id}
                      onClick={() => setSelectedPair(pair)}
                      className="w-full grid grid-cols-6 items-center px-5 py-4 border-b border-white/5 hover:bg-white/5 transition-colors group text-left"
                    >
                      <div className="col-span-2 flex items-center gap-3">
                        <span className="text-gray-600 text-xs w-5">{i + 1}</span>
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#BFFF0B] to-emerald-500 flex items-center justify-center text-black text-xs font-bold">
                            {pair.token0.symbol.slice(0, 1)}
                          </div>
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold -ml-2">
                            {pair.token1.symbol.slice(0, 1)}
                          </div>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm group-hover:text-[#BFFF0B] transition-colors">
                            {pair.token0.symbol} / {pair.token1.symbol}
                          </p>
                          <p className="text-gray-600 text-xs">0.3% fee</p>
                        </div>
                      </div>
                      <p className="text-white text-sm text-right">{formatUSD(pairTVL, true)}</p>
                      <p className="text-[#BFFF0B] text-sm font-semibold text-right">{formatUSD(pair.volumeUSD, true)}</p>
                      <p className={`text-sm font-semibold text-right ${parseFloat(feeAPR) > 0 ? 'text-purple-400' : 'text-gray-600'}`}>
                        {feeAPR}%
                      </p>
                      <p className="text-gray-400 text-sm text-right">{pair.txCount}</p>
                    </button>
                  );
                })}
              </div>

              {/* Mobile card list — shown only on mobile */}
              <div className="md:hidden divide-y divide-white/5">
                {filtered.map((pair, i) => {
                  const pairTVL = getPairTVL(pair);
                  const feeAPR = parseFloat(pair.volumeUSD) > 0 && pairTVL > 0
                    ? ((parseFloat(pair.volumeUSD) * 0.003 * 365) / pairTVL * 100).toFixed(2)
                    : '0.00';
                  return (
                    <button
                      key={pair.id}
                      onClick={() => setSelectedPair(pair)}
                      className="w-full flex items-center justify-between px-4 py-4 hover:bg-white/5 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-gray-600 text-xs w-4">{i + 1}</span>
                        <div className="flex items-center">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#BFFF0B] to-emerald-500 flex items-center justify-center text-black text-xs font-bold">
                            {pair.token0.symbol.slice(0, 1)}
                          </div>
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold -ml-2">
                            {pair.token1.symbol.slice(0, 1)}
                          </div>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">
                            {pair.token0.symbol} / {pair.token1.symbol}
                          </p>
                          <p className="text-gray-500 text-xs">TVL: {formatUSD(pairTVL, true)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[#BFFF0B] text-sm font-semibold">{formatUSD(pair.volumeUSD, true)}</p>
                        <p className={`text-xs ${parseFloat(feeAPR) > 0 ? 'text-purple-400' : 'text-gray-600'}`}>{feeAPR}% APR</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Pair Detail Modal */}
      {selectedPair && (
        <PairDetailDrawer pair={selectedPair} onClose={() => setSelectedPair(null)} />
      )}
    </div>
  );
};
