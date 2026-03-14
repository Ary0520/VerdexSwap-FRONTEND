import { formatUnits, parseUnits } from 'ethers';

/**
 * Formats a token amount the way Uniswap does:
 *  - value === 0 → '0'
 *  - 0 < value < 0.0001 → '< 0.0001'
 *  - 0.0001 ≤ value < 1 → up to 6 significant digits (e.g. '0.0004981')
 *  - value ≥ 1 → 2 decimal places with thousands commas (e.g. '2,649,824.84')
 *  - very large → uses K/M/B suffixes
 */
export const formatAmount = (value: number | string | bigint): string => {
  const n = typeof value === 'bigint' ? Number(value) : Number(value);
  if (isNaN(n) || n === 0) return '0';
  if (n < 0.0001) return '< 0.0001';
  if (n < 1) {
    // show up to 6 significant digits, trim trailing zeros
    const sig = parseFloat(n.toPrecision(6));
    return sig.toString();
  }
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  // thousands separator + 2 decimal places
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const formatTokenAmount = (amount: bigint, decimals: number): string => {
  const n = Number(formatUnits(amount, decimals));
  return formatAmount(n);
};

export const parseTokenAmount = (amount: string, decimals: number): bigint => {
  try {
    return parseUnits(amount, decimals);
  } catch {
    return 0n;
  }
};

export const formatAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(2)}%`;
};

export const formatPrice = (price: number): string => {
  if (price < 0.01) return price.toExponential(4);
  if (price < 1) return price.toFixed(6);
  if (price < 100) return price.toFixed(4);
  return price.toFixed(2);
};
