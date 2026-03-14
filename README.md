# Zero Fee Stablecoin DEX

A production-grade decentralized exchange (DEX) frontend built for Arbitrum Sepolia testnet.

## Features

### Swap
- Token selection with dropdown
- Real-time price quotes
- Price impact calculation
- Slippage tolerance settings
- Transaction deadline configuration
- Multi-hop routing support
- Transaction preview before execution

### Liquidity
- Add liquidity to pools
- Remove liquidity from pools
- View liquidity positions
- Pool share calculation
- LP token tracking

### Wallet Integration
- MetaMask connection
- Automatic network switching to Arbitrum Sepolia
- Transaction status tracking

## Deployed Contracts

- **Factory**: `0xf290c44B751262230Fb3737AbF6219199AF92f37`
- **Router**: `0xc00416cbdC7268A5Cb599382F05dE9adeE5A2EC1`
- **Chain ID**: 421614 (Arbitrum Sepolia)
- **RPC**: https://sepolia-rollup.arbitrum.io/rpc

## Supported Tokens

- WETH: `0x9a1eDFdcA16212683E45Fb3C285115a2668F3d10`
- USDC: `0x5c55e9075386Bb76d77bed821E209fE6cac350b6`
- DAI: `0x280F784ff03772fBc82E20052bb0247d042a5b07`
- WBTC: `0x5140a037A1cD818a17ebFbF812D6fEf60e8dc5a8`
- ARB: `0xA52079EE2000c801A1d355d51f276b0A03F86D39`

## Tech Stack

- React 18
- TypeScript
- Vite
- TailwindCSS
- ethers.js v6
- Zustand (state management)
- React Router

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- MetaMask browser extension

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

4. Connect your MetaMask wallet and switch to Arbitrum Sepolia network

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
dex-frontend/
├── src/
│   ├── components/
│   │   ├── common/          # Reusable UI components
│   │   ├── layout/          # Layout components (Header, Footer)
│   │   └── swap/            # Swap-specific components
│   ├── contracts/
│   │   ├── abis/            # Contract ABIs
│   │   └── addresses.ts     # Contract addresses and tokens
│   ├── hooks/               # Custom React hooks
│   ├── pages/               # Page components
│   ├── store/               # Zustand stores
│   ├── utils/               # Utility functions
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
├── public/
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## Usage

### Swapping Tokens

1. Navigate to the Trade page
2. Select input and output tokens
3. Enter the amount you want to swap
4. Review price impact, minimum received, and fees
5. Click "Swap" to preview the transaction
6. Confirm the swap in the preview modal
7. Approve the transaction in MetaMask

### Adding Liquidity

1. Navigate to Liquidity → Add Liquidity
2. Select token pair
3. Enter amount for first token
4. Second token amount will be calculated automatically based on pool ratio
5. Review pool share and rate
6. Click "Add Liquidity"
7. Approve both tokens in MetaMask
8. Confirm the transaction

### Removing Liquidity

1. Navigate to Liquidity → Your position → Remove Liquidity
2. Select the percentage of liquidity to remove
3. Review the amounts you'll receive
4. Click "Remove Liquidity"
5. Confirm the transaction in MetaMask

## Design

The UI follows the provided design specifications:
- Primary color: Lime green (#BFFF0B)
- Background: Dark gradient (dark green to black)
- Modern, clean interface with rounded elements
- Responsive design for mobile and desktop

## Security Notes

- Always verify transaction details before confirming
- This is deployed on testnet - do not use real funds
- Smart contracts should be audited before mainnet deployment
- Keep your private keys secure

## License

MIT
