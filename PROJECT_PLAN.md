# DEX Frontend Development Plan

## Project Overview
Building a production-grade DEX frontend for Arbitrum Sepolia testnet with the following deployed contracts:
- Factory: 0xf290c44B751262230Fb3737AbF6219199AF92f37
- Router: 0xc00416cbdC7268A5Cb599382F05dE9adeE5A2EC1
- Chain ID: 421614 (Arbitrum Sepolia)

## Supported Tokens
- WETH: 0x9a1eDFdcA16212683E45Fb3C285115a2668F3d10
- USDC: 0x5c55e9075386Bb76d77bed821E209fE6cac350b6
- DAI: 0x280F784ff03772fBc82E20052bb0247d042a5b07
- WBTC: 0x5140a037A1cD818a17ebFbF812D6fEf60e8dc5a8
- ARB: 0xA52079EE2000c801A1d355d51f276b0A03F86D39

## Tech Stack
- React + Vite
- TypeScript
- ethers.js v6
- TailwindCSS
- React Router
- Zustand (state management)

## Pages & Features

### 1. Landing Page (/)
**Left Section:**
- "Decentralised" badge (lime green dot + outlined pill)
- Hero text: "The Zero Fee Stablecoin DEX"
- Subtitle: "Secure, scalable, and decentralized solutions..."
- CTA Buttons: "Start Swapping" (lime green) + "Join Community"
- Dark gradient background (dark green to black)

**Right Section:**
- Swap widget placeholder
- Token selector (dropdown)
- Input amount field
- Estimated output display
- Price impact indicator
- Minimum received
- Swap fee display
- Route visualization
- "Swap" button → redirects to /trade

### 2. Trade Page (/trade)
- Full functional swap interface
- Token selection (both input/output)
- Amount inputs
- Real-time price quotes using getAmountsOut
- Slippage settings
- Transaction deadline
- Price impact warnings
- Route display (multi-hop)
- Transaction preview modal
- Execute swap via swapExactTokensForTokens

### 3. Liquidity Pages
**Add Liquidity (/liquidity/add)**
- Token A & B selection
- Amount inputs with auto-calculation
- Pool share percentage
- LP tokens to receive
- Execute via addLiquidity

**Remove Liquidity (/liquidity/remove)**
- LP token amount selector
- Shows underlying assets to receive
- Execute via removeLiquidity

**Pool Dashboard (/liquidity)**
- User's liquidity positions
- LP token balances
- Pool share percentages
- Underlying asset breakdown
- Quick actions (Add/Remove)

### 4. Core Features
- Wallet connection (MetaMask)
- Transaction status tracking
- Slippage tolerance settings (0.1%, 0.5%, 1%, Custom)
- Transaction deadline (default 20 min)
- Price information panel
- Route visualization for multi-hop
- Transaction preview before execution
- Error handling & user feedback

## File Structure
```
dex-frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   └── Footer.tsx
│   │   ├── swap/
│   │   │   ├── SwapWidget.tsx
│   │   │   ├── TokenSelector.tsx
│   │   │   ├── PriceInfo.tsx
│   │   │   └── RouteDisplay.tsx
│   │   ├── liquidity/
│   │   │   ├── AddLiquidityForm.tsx
│   │   │   ├── RemoveLiquidityForm.tsx
│   │   │   └── PositionCard.tsx
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── TransactionStatus.tsx
│   │   └── settings/
│   │       └── SlippageSettings.tsx
│   ├── pages/
│   │   ├── Landing.tsx
│   │   ├── Trade.tsx
│   │   ├── Liquidity.tsx
│   │   ├── AddLiquidity.tsx
│   │   └── RemoveLiquidity.tsx
│   ├── hooks/
│   │   ├── useWallet.ts
│   │   ├── useSwap.ts
│   │   ├── useLiquidity.ts
│   │   └── useTokenBalance.ts
│   ├── store/
│   │   └── walletStore.ts
│   ├── contracts/
│   │   ├── abis/
│   │   │   ├── Factory.json
│   │   │   ├── Router.json
│   │   │   ├── Pair.json
│   │   │   └── ERC20.json
│   │   └── addresses.ts
│   ├── utils/
│   │   ├── formatters.ts
│   │   ├── calculations.ts
│   │   └── constants.ts
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## Implementation Steps

### Phase 1: Project Setup
1. Initialize Vite + React + TypeScript
2. Install dependencies (ethers, react-router, tailwind, zustand)
3. Configure Tailwind with custom colors
4. Set up contract ABIs and addresses

### Phase 2: Core Infrastructure
1. Wallet connection logic
2. Contract interaction utilities
3. State management setup
4. Routing configuration

### Phase 3: UI Components
1. Reusable components (Button, Input, Modal)
2. Layout components (Header, Footer)
3. Token selector component
4. Transaction status component

### Phase 4: Landing Page
1. Hero section with exact design
2. Swap widget placeholder (right section)
3. Responsive layout

### Phase 5: Trade Page
1. Full swap interface
2. Price calculation integration
3. Slippage & deadline settings
4. Transaction execution

### Phase 6: Liquidity Features
1. Add liquidity page
2. Remove liquidity page
3. Pool dashboard
4. Position tracking

### Phase 7: Polish & Testing
1. Error handling
2. Loading states
3. Transaction confirmations
4. Responsive design refinement

## Design Specifications
- Primary Color: Lime Green (#BFFF0B or similar)
- Background: Dark gradient (dark green #1a2e1a to black #000000)
- Text: White/off-white for primary, gray for secondary
- Font: Modern sans-serif (Inter or similar)
- Border Radius: Rounded (pills for badges, moderate for cards)
- Shadows: Subtle glows on interactive elements
