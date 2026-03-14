export const CHAIN_ID = 421614; // Arbitrum Sepolia
export const RPC_URL = 'https://sepolia-rollup.arbitrum.io/rpc';

export const CONTRACTS = {
  FACTORY: '0xf290c44B751262230Fb3737AbF6219199AF92f37',
  ROUTER: '0xc00416cbdC7268A5Cb599382F05dE9adeE5A2EC1',
} as const;

export const TOKENS = {
  WETH: {
    address: '0x9a1eDFdcA16212683E45Fb3C285115a2668F3d10',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
  },
  USDC: {
    address: '0x5c55e9075386Bb76d77bed821E209fE6cac350b6',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 18, // This token was deployed with 18 decimals (proven by raw balance 270000000000000000000 = 270 USDC)
  },
  DAI: {
    address: '0x280F784ff03772fBc82E20052bb0247d042a5b07',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
  },
  WBTC: {
    address: '0x5140a037A1cD818a17ebFbF812D6fEf60e8dc5a8',
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    decimals: 8,
  },
  ARB: {
    address: '0xA52079EE2000c801A1d355d51f276b0A03F86D39',
    symbol: 'ARB',
    name: 'Arbitrum',
    decimals: 18,
  },
} as const;

export const TOKEN_LIST = Object.values(TOKENS);
