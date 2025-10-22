# 🚀 MSME Credit Platform - Startup Guide

**A Revolutionary DeFi Lending Platform for MSMEs on Sepolia Testnet**

## 📋 Table of Contents
1. [Quick Start](#quick-start)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Running the Platform](#running-the-platform)
6. [User Workflows](#user-workflows)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Quick Start

```powershell
# 1. Install dependencies
npm install
cd frontend
npm install
cd ..

# 2. Configure environment (copy .env.example to .env)
cp .env.example .env

# 3. Start the frontend
cd frontend
npm start

# The platform will open at http://localhost:3000
```

**That's it!** The contracts are already deployed on Sepolia testnet.

---

## 📦 Prerequisites

### Required Software
- **Node.js**: v16+ ([Download](https://nodejs.org/))
- **MetaMask**: Browser extension ([Install](https://metamask.io/))
- **Git**: For cloning ([Download](https://git-scm.com/))

### Required Assets
- **Sepolia ETH**: Get free testnet ETH from:
  - [Alchemy Faucet](https://sepoliafaucet.com/)
  - [Infura Faucet](https://www.infura.io/faucet/sepolia)
  - [QuickNode Faucet](https://faucet.quicknode.com/ethereum/sepolia)

### MetaMask Setup
1. Install MetaMask browser extension
2. Create/import wallet
3. Add Sepolia network:
   - Network Name: `Sepolia`
   - RPC URL: `https://ethereum-sepolia.publicnode.com`
   - Chain ID: `11155111`
   - Currency Symbol: `ETH`
   - Block Explorer: `https://sepolia.etherscan.io`

---

## 💻 Installation

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd blockchain
```

### 2. Install Backend Dependencies
```bash
npm install
```

### 3. Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

### 4. Environment Configuration
The platform uses pre-deployed contracts on Sepolia. Environment variables are already configured in:
- `frontend/.env` - Main configuration
- `frontend/.env.local` - Local overrides

**No additional configuration needed!**

---

## ⚙️ Configuration

### Deployed Contract Addresses (Sepolia)

| Contract | Address |
|----------|---------|
| **CIT Token** | `0xf92e9e05D816962F856b8e0EaA3De4f57e2e5E3f` |
| **Oracle Staking** | `0x27193be71b8D84dB1fCd57D9A8D917155C71a574` |
| **Attestation Registry** | `0xf931D540fFB875ea6A5952dCf00c83260e94bE9f` |
| **Loan Marketplace** | `0x67fcDa4FFee9f0Da9657b81DC88d168eE9f5eBBd` |
| **Loan Agreement Registry** | `0xff8F38601B4A0B2F467efB9862333705e1a8815F` |
| **Platform Governance** | `0xF560e4859f8294ae0d7BFaf29a674b2c12cDE465` |
| **Dynamic Credit Score** | `0x68ebD0B9bFdb08080DC30ef1D3Bee20A280e6707` |
| **Social Credit System** | `0x37d13bB91b6BF2A764F7a64491302e37D81efd54` |
| **Flash Assessment** | `0xC4ba25Fa62793e9d56Cb3eD8fa4E281B4aB4A433` |

### Environment Variables

All environment variables are pre-configured in `frontend/.env`:

```env
REACT_APP_CIT_TOKEN=0xf92e9e05D816962F856b8e0EaA3De4f57e2e5E3f
REACT_APP_ORACLE_STAKING=0x27193be71b8D84dB1fCd57D9A8D917155C71a574
REACT_APP_ATTESTATION_REGISTRY=0xf931D540fFB875ea6A5952dCf00c83260e94bE9f
REACT_APP_LOAN_MARKETPLACE=0x67fcDa4FFee9f0Da9657b81DC88d168eE9f5eBBd
REACT_APP_LOAN_AGREEMENT_REGISTRY=0xff8F38601B4A0B2F467efB9862333705e1a8815F
REACT_APP_PLATFORM_GOVERNANCE=0xF560e4859f8294ae0d7BFaf29a674b2c12cDE465
REACT_APP_DYNAMIC_CREDIT_SCORE=0x68ebD0B9bFdb08080DC30ef1D3Bee20A280e6707
REACT_APP_SOCIAL_CREDIT_SYSTEM=0x37d13bB91b6BF2A764F7a64491302e37D81efd54
REACT_APP_FLASH_ASSESSMENT=0xC4ba25Fa62793e9d56Cb3eD8fa4E281B4aB4A433
```

---

## 🚀 Running the Platform

### Start the Frontend
```bash
cd frontend
npm start
```

The application will open automatically at `http://localhost:3000`

### Available Pages
- **Home** (`/`) - Platform statistics and overview
- **Marketplace** (`/marketplace`) - Browse and bid on loan requests
- **MSME Dashboard** (`/msme`) - Create identity, request attestations, create loans
- **Lender Dashboard** (`/lender`) - Manage bids and reveal committed bids
- **Oracle Dashboard** (`/oracle`) - Register as oracle, stake tokens, provide attestations

---

## 👥 User Workflows

### 🏢 For MSMEs (Borrowers)

#### 1. Create MSME Identity
1. Go to **MSME Dashboard** (`/msme`)
2. Connect MetaMask wallet
3. Click "Create MSME Identity"
4. Fill in business details:
   - Business Name
   - Registration Number
   - Business Type (Retail/Manufacturing/Services/Agriculture/Technology)
   - Website URL
5. Submit and confirm transaction

#### 2. Request Oracle Attestation
1. On MSME Dashboard, go to "Request Attestation" section
2. Select an active oracle from the list
3. Provide attestation data (business verification documents)
4. **Pay attestation fee**: 0.01 CIT tokens
5. Submit and confirm transaction
6. Wait for oracle to review and attest

#### 3. Create Loan Request
1. On MSME Dashboard, scroll to "Create Loan Request"
2. Enter loan details:
   - **Amount**: In CIT tokens (e.g., 0.01 - 0.1 for testing)
   - **Tenure**: Months (e.g., 12)
   - **Purpose**: Describe loan use (e.g., "Working capital")
   - **Commit Period**: Hours (minimum 1 hour)
   - **Reveal Period**: Hours (minimum 1 hour)
3. Approve CIT token spending (first time only)
4. Submit loan request
5. Wait for lenders to bid

#### 4. View Your Loans
1. Check "My Loan Requests" section
2. See loan status: Open, Commit, Reveal, Matched, Active
3. View bids and winner after reveal period

---

### 💰 For Lenders

#### 1. Browse Loan Requests
1. Go to **Marketplace** (`/marketplace`)
2. View all active loan requests
3. Filter by status, amount, tenure
4. Click "Details" to view full information

#### 2. Place a Bid (Commit Phase)
1. On a loan during **Commit Phase**, click "Place Bid"
2. Enter bid details:
   - **Interest Rate**: Annual percentage (e.g., 12%)
   - **Amount**: CIT tokens to lend
3. System generates a random nonce
4. Creates commitment hash: `keccak256(interestRate, amount, nonce)`
5. Submit and confirm transaction
6. **IMPORTANT**: Bid details saved in browser localStorage

#### 3. Reveal Your Bid (Reveal Phase)
1. Go to **Lender Dashboard** (`/lender`)
2. During **Reveal Phase**, you'll see "🔓 REVEAL PHASE ACTIVE"
3. Click "🔓 Reveal My Bid" button
4. System retrieves stored nonce from localStorage
5. Reveals: interest rate, amount, and nonce
6. Submit and confirm transaction

#### 4. Monitor Your Bids
- **Active Bids**: Waiting for reveal phase
- **Revealed Bids**: Waiting for matching
- **Won Bids**: You won! Loan active
- **Total Committed**: Total CIT tokens committed

---

### 🔮 For Oracles

#### 1. Register as Oracle
1. Go to **Oracle Dashboard** (`/oracle`)
2. Connect MetaMask wallet
3. Click "Register as Oracle"
4. Choose tier and stake tokens:
   - **Tier 1**: 100 CIT (attest 1 MSME/month)
   - **Tier 2**: 500 CIT (attest 3 MSMEs/month)
   - **Tier 3**: 1000 CIT (unlimited attestations)
5. Approve CIT tokens and stake
6. Submit and confirm

#### 2. Provide Attestations
1. On Oracle Dashboard, view "Pending Attestation Requests"
2. Review MSME business information
3. Verify documents and credentials
4. Choose attestation type:
   - Business Verification
   - Financial Health
   - Credit History
   - Asset Verification
   - Tax Compliance
5. Enter score (0-100) and notes
6. Submit attestation
7. **Earn rewards**: Receive attestation fee (0.01 CIT)

#### 3. Manage Stake
- View current stake and tier
- Add more stake to upgrade tier
- Unstake tokens (with cooldown period)
- Monitor rewards earned

---

## 🧪 Testing

### Run Smart Contract Tests
```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/LoanMarketplace.test.js

# Run with gas reporting
REPORT_GAS=true npx hardhat test

# Run with coverage
npx hardhat coverage
```

### Test Scenarios

#### 1. Oracle Registration & Staking
```bash
npx hardhat test test/OracleStaking.test.js
```
Tests: Registration, staking, tier upgrades, unstaking, slashing

#### 2. MSME Identity & Attestations
```bash
npx hardhat test test/MSMEIdentity.test.js
```
Tests: Identity creation, attestation requests, oracle attestations

#### 3. Loan Marketplace
```bash
npx hardhat test test/LoanMarketplace.test.js
```
Tests: Loan creation, bidding, commit-reveal, matching, repayment

#### 4. Revolutionary Contracts
```bash
node scripts/test-revolutionary-contracts.js
```
Tests: Dynamic credit scoring, social credit, flash assessment

### Create Test Data
```bash
# Create a test loan with 1-hour periods
node scripts/create-test-loan.js

# Check loan status
node scripts/check-loan-status.js
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. "Wrong Network" Error
**Problem**: MetaMask connected to wrong network

**Solution**:
- Open MetaMask
- Switch to "Sepolia Test Network"
- Refresh page

#### 2. "Insufficient Funds" Error
**Problem**: Not enough Sepolia ETH for gas fees

**Solution**:
- Get free Sepolia ETH from faucets (see Prerequisites)
- Need ~0.1 ETH for testing

#### 3. "Not Enough CIT Tokens"
**Problem**: Need CIT tokens for staking/loans

**Solution**:
```bash
# Mint test CIT tokens
node scripts/mint-test-tokens.js
```

#### 4. Transaction Fails
**Problem**: Transaction reverts or fails

**Solutions**:
- Check you have enough gas (increase gas limit)
- Verify you're on Sepolia network
- Check contract state (e.g., loan status, attestation validity)
- Look at error message in MetaMask

#### 5. Reveal Button Not Showing
**Problem**: Can't reveal bid on Lender Dashboard

**Reasons**:
- Still in commit phase (wait for commit deadline)
- Past reveal deadline (too late to reveal)
- Haven't placed a bid yet
- Bid data not in localStorage (clear cache and re-bid)

**Check**:
```bash
node scripts/check-loan-status.js
```

#### 6. Stats Showing Zeros
**Problem**: Home page shows 0 MSMEs, 0 loans

**Solutions**:
- Ensure wallet is connected
- Hard refresh: `Ctrl + Shift + R`
- Clear browser cache
- Check console for errors (F12)
- Verify contract addresses in `.env`

#### 7. Frontend Won't Start
**Problem**: `npm start` fails

**Solutions**:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Or on Windows PowerShell
Remove-Item -Recurse -Force node_modules, package-lock.json
npm install
```

---

## 📚 Additional Resources

### Documentation
- **Architecture**: `docs/PROJECT_STRUCTURE.md`
- **Smart Contracts**: `contracts/README.md`
- **API Reference**: `docs/QUICK_REFERENCE.md`
- **Testing Guide**: `docs/E2E_TESTING_GUIDE.md`

### Block Explorer
- [Sepolia Etherscan](https://sepolia.etherscan.io)
- View transactions, contracts, and events

### Useful Scripts
```bash
# Check deployment info
cat deployments/sepolia.json

# View test logs
npx hardhat test --logs

# Compile contracts
npx hardhat compile

# Clean and recompile
npx hardhat clean && npx hardhat compile
```

---

## 🎓 Learning Resources

### Understanding Commit-Reveal
The platform uses a **commit-reveal scheme** for sealed-bid auctions:

1. **Commit Phase**: 
   - Lenders submit `hash(interestRate, amount, nonce)`
   - Other lenders can't see your bid
   - Prevents bid sniping and manipulation

2. **Reveal Phase**:
   - Lenders reveal actual values
   - Contract verifies hash matches commitment
   - Best bid (lowest interest) wins

### Revolutionary Features

#### 1. Dynamic Credit Scoring
- On-chain credit history tracking
- Real-time score updates based on payments
- Instant approval for high scorers

#### 2. Social Credit System
- Community endorsements
- Reputation building
- Sybil-resistant scoring

#### 3. Flash Assessment
- Zero-knowledge proof verification
- Instant eligibility checks
- Privacy-preserving verification

---

## 🔐 Security Notes

### Private Keys
- **NEVER** commit private keys to Git
- **NEVER** share your mnemonic phrase
- Use hardware wallets for mainnet

### Smart Contract Auditing
- Contracts use OpenZeppelin libraries
- Reentrancy guards on all external calls
- Access controls on admin functions

### Frontend Security
- Bid nonces stored in localStorage (browser-specific)
- Switching browsers/devices loses bid reveal data
- Always use same browser for commit → reveal

---

## 🚀 Deployment (Advanced)

### Deploy to Sepolia
```bash
# Set up .env with private key
cp .env.example .env
# Edit .env and add SEPOLIA_PRIVATE_KEY

# Deploy all contracts
npx hardhat run scripts/deploy.js --network sepolia

# Update frontend/.env with new addresses
```

### Deploy to Other Networks
Edit `hardhat.config.js` and add network configuration.

---

## 📞 Support

### Getting Help
- Check troubleshooting section above
- Review documentation in `docs/` folder
- Check contract ABIs in `artifacts/`

### Common Commands
```bash
# Backend
npm install          # Install dependencies
npx hardhat test    # Run tests
npx hardhat compile # Compile contracts

# Frontend  
cd frontend
npm install         # Install dependencies
npm start          # Start dev server (port 3000)
npm run build      # Build for production
```

---

## ✅ Quick Checklist

Before using the platform:
- [ ] Node.js 16+ installed
- [ ] MetaMask installed and configured
- [ ] Connected to Sepolia network
- [ ] Have Sepolia ETH (0.1+ recommended)
- [ ] Dependencies installed (`npm install`)
- [ ] Frontend running (`npm start`)
- [ ] Wallet connected to app

---

## 🎉 You're Ready!

Visit `http://localhost:3000` and start exploring the platform!

**Recommended First Steps**:
1. Connect your wallet (top-right button)
2. Check Home page statistics
3. Browse Marketplace to see loans
4. Create MSME identity (MSME Dashboard)
5. Register as Oracle (Oracle Dashboard)
6. Place a test bid (Marketplace)

**Happy Testing! 🚀**
