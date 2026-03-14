import { gql, useQuery } from '@apollo/client';

// ─── Queries ───────────────────────────────────────────────────────────────

const FACTORY_QUERY = gql`
  query FactoryStats {
    factory(id: "1") {
      pairCount
      totalVolumeUSD
      totalVolumeETH
      txCount
    }
  }
`;

const PAIRS_QUERY = gql`
  query Pairs {
    pairs(first: 50, orderBy: volumeUSD, orderDirection: desc) {
      id
      token0 { id symbol name }
      token1 { id symbol name }
      reserve0
      reserve1
      reserveUSD
      volumeUSD
      txCount
      token0Price
      token1Price
      createdAtTimestamp
    }
  }
`;

const DAY_DATA_QUERY = gql`
  query DayDatas {
    dayDatas(first: 30, orderBy: date, orderDirection: asc) {
      id
      date
      dailyVolumeUSD
      totalLiquidityUSD
      txCount
    }
  }
`;

const PAIR_DAY_DATA_QUERY = gql`
  query PairDayData($pairAddress: String!) {
    pairDayDatas(
      first: 30
      orderBy: date
      orderDirection: asc
      where: { pairAddress: $pairAddress }
    ) {
      id
      date
      reserve0
      reserve1
      reserveUSD
      dailyVolumeUSD
      dailyTxns
    }
  }
`;

const ALL_PAIR_DAY_DATAS_QUERY = gql`
  query AllPairDayDatas {
    pairDayDatas(first: 1000, orderBy: date, orderDirection: asc) {
      id
      date
      pairAddress
      reserve0
      reserve1
    }
  }
`;

const SWAP_EVENTS_QUERY = gql`
  query SwapEvents($pairId: String!) {
    swapEvents(
      first: 50
      orderBy: timestamp
      orderDirection: desc
      where: { pair: $pairId }
    ) {
      id
      timestamp
      amount0In
      amount1In
      amount0Out
      amount1Out
      amountUSD
      sender
    }
  }
`;

// ─── Hooks ─────────────────────────────────────────────────────────────────

export function useFactoryStats() {
  return useQuery(FACTORY_QUERY, { pollInterval: 30000 });
}

export function usePairs() {
  return useQuery(PAIRS_QUERY, { pollInterval: 30000 });
}

export function useDayData() {
  return useQuery(DAY_DATA_QUERY, { pollInterval: 60000 });
}

export function usePairDayData(pairAddress: string) {
  return useQuery(PAIR_DAY_DATA_QUERY, {
    variables: { pairAddress: pairAddress.toLowerCase() },
    skip: !pairAddress,
    pollInterval: 60000,
  });
}

export function useAllPairDayDatas() {
  return useQuery(ALL_PAIR_DAY_DATAS_QUERY, { pollInterval: 60000 });
}

export function useSwapEvents(pairId: string) {
  return useQuery(SWAP_EVENTS_QUERY, {
    variables: { pairId: pairId.toLowerCase() },
    skip: !pairId,
    pollInterval: 30000,
  });
}

// ─── Helpers ───────────────────────────────────────────────────────────────

export function formatUSD(value: string | number, compact = false): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0.00';
  if (compact) {
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}

export function formatDate(timestamp: string | number): string {
  return new Date(Number(timestamp) * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });
}
