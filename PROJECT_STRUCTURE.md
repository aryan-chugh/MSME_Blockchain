# 📁 Project Structure

This document provides an overview of the MSME Credit Platform's file organization.

## 🗂️ Root Directory

```
blockchain/
├── contracts/              # Solidity smart contracts
├── frontend/               # React web application  
├── scripts/                # Deployment & utility scripts
├── test/                   # Smart contract tests
├── docs/                   # Documentation archive
├── deployments/            # Deployment records
├── artifacts/              # Compiled contract artifacts
├── cache/                  # Hardhat cache
├── node_modules/           # Node dependencies
├── .env                    # Environment variables
├── .env.example            # Environment template
├── hardhat.config.js       # Hardhat configuration
├── package.json            # Node.js dependencies
├── README.md               # Project overview
└── STARTUP_GUIDE.md        # Complete setup guide
```

---

## 📄 Smart Contracts (`/contracts`)

### Core Platform Contracts

| File | Purpose | Key Functions |
|------|---------|---------------|
| **CIToken.sol** | ERC-20 utility token | `mint()`, `burn()`, `transfer()` |
| **MSMEIdentity.sol** | Business identity registry | `createIdentity()`, `requestAttestation()` |
| **OracleStaking.sol** | Oracle registration & staking | `registerOracle()`, `stake()`, `unstake()` |
| **AttestationRegistry.sol** | Credential attestations | `attest()`, `getAttestation()`, fee collection |
| **LoanMarketplace.sol** | Sealed-bid loan auctions | `createLoanRequest()`, `commitBid()`, `revealBid()` |
| **LoanAgreementRegistry.sol** | Active loan management | `recordPayment()`, `checkDefault()` |
| **PlatformGovernance.sol** | Admin & governance | `slashOracle()`, `updateFees()` |

### Revolutionary Contracts

| File | Purpose | Key Functions |
|------|---------|---------------|
| **DynamicCreditScore.sol** | On-chain credit scoring | `recordPayment()`, `getCreditRating()`, `qualifiesForInstantApproval()` |
| **SocialCreditSystem.sol** | Community reputation | `endorse()`, `getSocialProof()` |
| **FlashAssessment.sol** | ZK-proof verification | `submitZKProof()`, `runInstantAssessment()` |

---

## 🌐 Frontend (`/frontend`)

### Source Files (`/src`)

```
frontend/src/
├── components/             # React components
│   ├── Home.js            # Platform statistics dashboard
│   ├── Marketplace.js     # Loan browsing & bidding
│   ├── MSMEDashboard.js   # Borrower interface
│   ├── LenderDashboard.js # Lender interface
│   └── OracleDashboard.js # Oracle interface
│
├── utils/                 # Utility functions
│   ├── contracts.js       # Contract ABIs & addresses
│   └── wallet.js          # MetaMask integration
│
├── App.js                 # Main app component
├── index.js               # React entry point
└── index.css              # Global styles
```

### Component Responsibilities

#### **Home.js**
- Display platform statistics (total MSMEs, loans, volume)
- Auto-refresh every 30 seconds
- Navigate to role-specific dashboards

#### **Marketplace.js**
- List all loan requests with filtering
- Show loan details (amount, tenure, purpose, deadlines)
- Place sealed bids during commit phase
- Prevent self-bidding

#### **MSMEDashboard.js**
- Create MSME identity
- Request oracle attestations (pay 0.01 CIT fee)
- Create loan requests
- View own loans and their status
- Monitor received bids

#### **LenderDashboard.js**
- View active bids and commitments
- Reveal bids during reveal phase
- Track won loans
- Monitor total committed capital

#### **OracleDashboard.js**
- Register as oracle with stake
- View pending attestation requests
- Provide attestations (earn 0.01 CIT)
- Manage stake and tier

---

## 🔧 Scripts (`/scripts`)

### Deployment Scripts

| File | Purpose | Usage |
|------|---------|-------|
| **deploy.js** | Deploy all contracts to Sepolia | `npx hardhat run scripts/deploy.js --network sepolia` |

### Testing Scripts

| File | Purpose | Usage |
|------|---------|-------|
| **create-test-loan.js** | Create loan with 1-hour periods | `node scripts/create-test-loan.js` |
| **check-loan-status.js** | Check loan timing & deadlines | `node scripts/check-loan-status.js` |
| **test-revolutionary-contracts.js** | Test new features | `node scripts/test-revolutionary-contracts.js` |
| **test-contract-query.js** | Direct blockchain query | `node scripts/test-contract-query.js` |

---

## 🧪 Tests (`/test`)

### Test Files

| File | Tests | Coverage |
|------|-------|----------|
| **CIToken.test.js** | Token minting, burning, transfers | ERC-20 compliance |
| **MSMEIdentity.test.js** | Identity creation, attestation requests | Access control |
| **OracleStaking.test.js** | Registration, staking, tiers, slashing | Economic security |
| **LoanMarketplace.test.js** | Loan creation, bidding, matching | Commit-reveal scheme |

### Running Tests

```bash
# All tests
npx hardhat test

# Specific test file
npx hardhat test test/LoanMarketplace.test.js

# With gas reporting
REPORT_GAS=true npx hardhat test

# With coverage
npx hardhat coverage
```

---

## 📦 Dependencies

### Backend Dependencies

```json
{
  "@openzeppelin/contracts": "^5.4.0",  // Secure contract libraries
  "hardhat": "^2.22.0",                 // Development environment
  "ethers": "^6.15.0",                  // Ethereum library
  "@nomicfoundation/hardhat-toolbox": "^5.0.0"
}
```

### Frontend Dependencies

```json
{
  "react": "^18.0.0",                   // UI framework
  "react-dom": "^18.0.0",               // React DOM
  "react-router-dom": "^6.0.0",         // Routing
  "ethers": "^6.15.0",                  // Web3 provider
  "react-scripts": "^5.0.0"             // Build tools
}
```

---

## 🗄️ Generated Directories

### `/artifacts`
- Compiled contract artifacts
- ABIs (Application Binary Interface)
- Bytecode and deployment data
- Generated by: `npx hardhat compile`

### `/cache`
- Hardhat compilation cache
- Solidity files cache
- Console history
- Auto-generated, can be deleted

### `/deployments`
- Deployment transaction records
- Contract addresses by network
- Deployment timestamps
- Format: `deployment-{timestamp}.json`

### `/docs`
- Archive of old documentation
- Technical reference documents
- Implementation notes
- Testing guides

---

## ⚙️ Configuration Files

### `hardhat.config.js`
Hardhat development environment configuration:
- Solidity compiler version (0.8.19)
- Network configurations (localhost, sepolia)
- Plugin settings (etherscan, gas reporter)
- Compiler optimizations (viaIR enabled)

### `package.json`
Node.js project configuration:
- Dependencies and versions
- Scripts for testing and deployment
- Project metadata

### `.env` / `.env.example`
Environment variables:
- Private keys (DO NOT COMMIT `.env`)
- RPC URLs
- Etherscan API keys
- Contract addresses

### `frontend/.env`
Frontend environment variables:
- React app prefix: `REACT_APP_*`
- Contract addresses for each contract
- Pre-configured for Sepolia deployment

---

## 🚫 Ignored Files (`.gitignore`)

```
node_modules/          # Node dependencies
.env                   # Private keys & secrets
cache/                 # Hardhat cache
artifacts/             # Compiled contracts (can regenerate)
coverage/              # Test coverage reports
coverage.json          # Coverage data
typechain-types/       # TypeScript type definitions
.DS_Store             # macOS system files
```

---

## 📝 Documentation

### User Documentation
- **README.md** - Project overview and quick start
- **STARTUP_GUIDE.md** - Comprehensive setup guide
- **QUICKSTART.md** - Quick reference commands

### Developer Documentation
- **contracts/README.md** - Smart contract documentation
- **docs/** - Archived technical documents
- **DEPLOYMENT_SUCCESS.md** - Deployment records

---

## 🔄 Development Workflow

### 1. Setup Phase
```bash
npm install                    # Install backend dependencies
cd frontend && npm install     # Install frontend dependencies
```

### 2. Development Phase
```bash
npx hardhat compile           # Compile contracts
npx hardhat test              # Run tests
cd frontend && npm start      # Start dev server
```

### 3. Deployment Phase
```bash
npx hardhat run scripts/deploy.js --network sepolia  # Deploy to testnet
```

### 4. Testing Phase
```bash
node scripts/create-test-loan.js      # Create test data
node scripts/check-loan-status.js     # Verify deployment
```

---

## 📊 File Counts

| Directory | Files | Purpose |
|-----------|-------|---------|
| `/contracts` | 10 | Smart contracts (.sol) |
| `/frontend/src` | ~10 | React components & utils |
| `/scripts` | 5+ | Deployment & testing scripts |
| `/test` | 4 | Smart contract tests |
| `/docs` | 20+ | Archived documentation |

**Total Lines of Code**: ~15,000+
- Solidity: ~5,000 lines
- React/JavaScript: ~8,000 lines
- Tests: ~2,000 lines

---

## 🎯 Key Entry Points

### For Users
1. **Start Here**: `README.md`
2. **Setup Guide**: `STARTUP_GUIDE.md`
3. **Run Frontend**: `frontend/src/index.js`

### For Developers
1. **Contracts**: `contracts/LoanMarketplace.sol`
2. **Tests**: `test/LoanMarketplace.test.js`
3. **Deploy**: `scripts/deploy.js`

### For Auditors
1. **Core Logic**: `contracts/LoanMarketplace.sol`
2. **Security**: `contracts/OracleStaking.sol`
3. **Economics**: `contracts/AttestationRegistry.sol`

---

## 🔍 Finding Files

### By Feature

| Feature | Contract | Frontend | Test |
|---------|----------|----------|------|
| **Loan Creation** | `LoanMarketplace.sol` | `MSMEDashboard.js` | `LoanMarketplace.test.js` |
| **Bidding** | `LoanMarketplace.sol` | `Marketplace.js`, `LenderDashboard.js` | `LoanMarketplace.test.js` |
| **Attestations** | `AttestationRegistry.sol` | `OracleDashboard.js` | `MSMEIdentity.test.js` |
| **Staking** | `OracleStaking.sol` | `OracleDashboard.js` | `OracleStaking.test.js` |

---

## 💡 Tips

### Quick Navigation
```bash
# View all contracts
ls contracts/*.sol

# View all components
ls frontend/src/components/*.js

# View all tests
ls test/*.js

# View deployment records
ls deployments/*.json
```

### Search for Code
```bash
# Find all references to a function
grep -r "createLoanRequest" .

# Find contract addresses
grep -r "0x67fcDa4F" .

# Find environment variables
grep -r "REACT_APP_" frontend/
```

---

This structure is designed for:
- ✅ Easy navigation
- ✅ Clear separation of concerns
- ✅ Scalability
- ✅ Maintainability
- ✅ Developer-friendly organization
