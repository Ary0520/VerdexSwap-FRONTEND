export const calculatePriceImpact = (
  inputAmount: bigint,
  outputAmount: bigint,
  inputReserve: bigint,
  outputReserve: bigint
): number => {
  if (inputReserve === 0n || outputReserve === 0n) return 0;
  
  const exactQuote = (inputAmount * outputReserve) / inputReserve;
  const priceImpact = ((exactQuote - outputAmount) * 10000n) / exactQuote;
  
  return Number(priceImpact) / 100;
};

export const calculateMinimumReceived = (
  amount: bigint,
  slippage: number
): bigint => {
  const slippageBps = BigInt(Math.floor(slippage * 100));
  return (amount * (10000n - slippageBps)) / 10000n;
};

export const calculateDeadline = (minutes: number): bigint => {
  return BigInt(Math.floor(Date.now() / 1000) + minutes * 60);
};

export const calculatePoolShare = (
  lpTokens: bigint,
  totalSupply: bigint
): number => {
  if (totalSupply === 0n) return 0;
  return (Number(lpTokens) / Number(totalSupply)) * 100;
};
