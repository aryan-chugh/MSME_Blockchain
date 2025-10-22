# Frontend README

React-based decentralized application (DApp) for the MSME Credit Platform.

## Features

- **MSME Dashboard**: Create identity, request attestations, manage loan requests
- **Lender Dashboard**: Browse verified MSMEs, place sealed bids, manage loans
- **Oracle Dashboard**: Stake tokens, provide attestations, earn fees
- **Marketplace**: View all active loan requests and auction details

## Installation

```bash
cd frontend
npm install
```

## Configuration

Create `.env.local`:

```
REACT_APP_RPC_URL=http://localhost:8545
REACT_APP_CIT_TOKEN=0x5FbDB2315678afecb367f032d93F642f64180aa3
REACT_APP_ORACLE_STAKING=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
REACT_APP_ATTESTATION_REGISTRY=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
REACT_APP_LOAN_MARKETPLACE=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
REACT_APP_LOAN_AGREEMENT_REGISTRY=0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
REACT_APP_PLATFORM_GOVERNANCE=0x5FC8d32690cc91D4c39d9d3abcBD16989F875707
```

## Running

```bash
npm start
```

Opens at `http://localhost:3000`

## Building for Production

```bash
npm run build
```

## Wallet Integration

The DApp requires MetaMask or a compatible Web3 wallet. Make sure you:

1. Install MetaMask browser extension
2. Connect to the correct network (localhost/Sepolia/mainnet)
3. Have some ETH for gas fees
4. Have CIT tokens for platform operations

## Components

- `Home.js` - Landing page with platform overview
- `MSMEDashboard.js` - MSME interface for identity and loans
- `LenderDashboard.js` - Lender interface for bidding
- `OracleDashboard.js` - Oracle interface for staking and attestations
- `Marketplace.js` - Public marketplace view

## Technology Stack

- React 18
- ethers.js 6
- React Router
- CSS3 (no framework for lightweight design)

## License

MIT
