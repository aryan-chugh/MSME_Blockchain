# 🏦 MSME Credit Platform

**Blockchain-based DeFi Lending Platform with Oracle Attestations, Sealed-Bid Auctions, and AI Credit Scoring**

[![Solidity](https://img.shields.io/badge/Solidity-0.8.19-blue)](https://soliditylang.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.22.0-yellow)](https://hardhat.org/)
[![React](https://img.shields.io/badge/React-18.0-blue)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📖 Quick Navigation

### 🚀 Getting Started (3 Commands!)
```powershell
npm run node                    # Terminal 1: Start blockchain
.\deploy-localhost.ps1          # Terminal 2: Deploy everything
cd frontend && npm start        # Terminal 3: Start frontend
```
---

## 🌟 Overview

The MSME Credit Platform connects Micro, Small, and Medium Enterprises with lenders through transparent blockchain-based mechanisms featuring oracle attestations, sealed-bid auctions, and AI-powered credit scoring.

### 🎯 Key Features

#### 🔐 **Commit-Reveal Oracle Attestations**
- Multi-oracle consensus (3-7 oracles per request)
- Byzantine fault-tolerant commit-reveal protocol
- Anti-collusion measures (1 min cooldown for testing, 30 days for production)
- Weighted reputation scoring
- 66% consensus threshold

#### 💰 **Sealed-Bid Loan Marketplace**
- Prevents bid manipulation with commit-reveal scheme
- Lowest interest rate wins automatically
- Configurable auction phases (2-minute defaults)
- Manual selection option for MSMEs

#### 📊 **AI Credit Scoring**
- On-chain dynamic credit scores
- Real-time updates based on loan performance
- Attestation-verified credentials
- Social trust integration

#### 🔮 **Revolutionary Features**
- **Flash Assessment**: Zero-knowledge proof instant eligibility
- **Social Credit System**: Community endorsements
- **Predictive Analytics**: ML-powered risk assessment
- **On-Chain Governance**: DAO-controlled parameters

---

## 🚀 Quick Start

### Localhost Development
```bash
# 1. Install dependencies
npm install
cd frontend && npm install && cd ..

# 2. Start local blockchain (Terminal 1)
npx hardhat node

# 3. Deploy contracts (Terminal 2)
npx hardhat run scripts/deploy.js --network localhost

# 4. Start frontend (Terminal 3)
cd frontend
npm start
```

**Frontend opens at**: http://localhost:3000

See **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** for detailed instructions.

---

## 📦 What's Deployed

### Smart Contracts (11 Total)

| Contract | Purpose | Key Features |
|----------|---------|-------------|
| **CIToken** | Platform utility token | ERC-20, Mintable, Oracle staking |
| **OracleStakingV3** | Oracle registration | Min 1000 CIT, Reputation scoring |
| **AttestationRegistryV3_1** | Commit-reveal attestations | Multi-oracle consensus, 1-min cooldown |
| **LoanMarketplace** | Sealed-bid auctions | Commit-reveal, Auto-matching |
| **LoanAgreementRegistry** | Active loan tracking | Repayment, Default handling |
| **PlatformGovernance** | DAO governance | Proposals, Voting, Timelock |
| **MSMEIdentity** | Identity verification | Self-sovereign ID, Credentials |
| **DynamicCreditScore** | AI credit scoring | Real-time updates, History |
| **SocialCreditSystem** | Community trust | Endorsements, Reputation |
| **PredictiveAnalyticsOracle** | Risk predictions | ML-powered assessment |
| **FlashAssessment** | ZK instant eligibility | Zero-knowledge proofs |

### Registered Schemas (Auto-configured)
- `financial_statement` - Financial documents
- `business_license` - Business registration
- `tax_return` - Tax compliance
- `bank_statement` - Banking history

---

## 🔧 Development

### Project Structure
```
contracts/          # Solidity smart contracts
├── AttestationRegistryV3_1.sol  # Main oracle consensus
├── OracleStakingV3.sol          # Oracle management
├── LoanMarketplace.sol          # Loan auctions
└── ...

frontend/           # React application
├── src/
│   ├── components/  # React components
│   │   ├── OracleDashboard.js   # Oracle interface
│   │   ├── MSMEDashboard.js     # MSME interface
│   │   └── LenderDashboard.js   # Lender interface
│   └── utils/       # Contracts & helpers

scripts/            # Deployment & testing
├── deploy.js        # Main deployment (USE THIS)
├── check-*.js       # Diagnostic scripts
└── test-*.js        # Testing utilities

test/               # Hardhat tests
docs/               # Documentation
deployments/        # Deployment artifacts
```

### Available Scripts

See **[SCRIPTS_GUIDE.md](./SCRIPTS_GUIDE.md)** for complete documentation.

**Essential commands:**
```bash
# Deploy everything
npx hardhat run scripts/deploy.js --network localhost

# Check deployment
node scripts/verify-deployment.js

# Update frontend addresses (now automatic in deploy.js)
node scripts/update-frontend-addresses.js

# View oracles
node scripts/check-oracles.js

# View attestation requests
node scripts/check-requests.js

# Run tests
npx hardhat test

# Coverage
npx hardhat coverage
```

---

## 🧪 Testing

### Manual Testing Flow

1. **Setup Oracles** (3+ wallets):
```bash
node scripts/mint-to-wallet.js 0xOracleAddress 10000
node scripts/stake-oracle.js
```

2. **Create Attestation Request** (MSME Dashboard):
   - Connect wallet → Request Attestation → Select schema → Submit

3. **Oracle Workflow**:
   - Accept request (all 3 oracles)
   - Commit decision (Approve/Reject with comments)
   - Reveal decision (after all commit)

4. **View Consensus** (MSME Dashboard):
   - Check consensus details
   - View oracle decisions
   - See final approval status

### Automated Tests
```bash
# Run all tests
npx hardhat test

# Specific test
npx hardhat test test/AttestationRegistry.test.js

# With gas reporting
REPORT_GAS=true npx hardhat test

# Coverage
npx hardhat coverage
```

---

## 📊 Configuration

### Current Settings (Testing Mode)

| Parameter | Value | Production |
|-----------|-------|-----------|
| Oracle Cooldown | 1 minute | 30 days |
| Consensus Threshold | 66% | 66% |
| Min Oracles per Request | 3 | 3 |
| Oracle Min Stake | 1000 CIT | 50000 CIT |
| Auction Commit Phase | 2 minutes | 1 hour |
| Auction Reveal Phase | 2 minutes | 1 hour |

⚠️ **Note**: Cooldown is set to 1 minute for testing. Change in `AttestationRegistryV3_1.sol` line 43 for production.

---

## 🌐 Network Deployment

### Localhost (Development)
```bash
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost
```

### Sepolia Testnet
1. Configure `.env`:
```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
PRIVATE_KEY=your_private_key_without_0x
```

2. Deploy:
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

3. Verify on Etherscan:
```bash
npx hardhat verify --network sepolia CONTRACT_ADDRESS
```

---

## 🛠️ Troubleshooting

### Common Issues

**"Contract not deployed" error**
```bash
node scripts/update-frontend-addresses.js
```

**Frontend shows old addresses**
- Clear browser cache
- Restart frontend: `cd frontend && npm start`

**Wallet cache issues (Rabby)**
- Settings → Advanced → Clear Cache
- Reconnect wallet

**Cooldown period blocking tests**
- Wait 1 minute between same MSME-oracle attestations
- Or use different MSME/oracle combinations

**Transaction fails with "missing revert data"**
- Check pre-flight conditions (stake, cooldown, status)
- Look for detailed logs in console
- Verify contract addresses match deployment

---

## 📝 Architecture

### Commit-Reveal Flow

```
1. MSME creates attestation request
   ↓
2. Platform assigns 3 oracles (weighted random)
   ↓
3. Oracles accept request (ALL must accept)
   ↓
4. Status: OraclesAssigned → Committing
   ↓
5. Each oracle commits: keccak256(decision + secret)
   ↓
6. Status: Committing → Revealing (after all commit)
   ↓
7. Each oracle reveals: actual decision + secret
   ↓
8. Contract verifies: keccak256(revealed) == committed
   ↓
9. Status: Revealing → ConsensusReached
   ↓
10. Consensus calculated: ≥66% = Approved
```

### Oracle Selection Algorithm
- Weighted by reputation score
- Diversity bonus (different oracles per MSME)
- Cooldown enforcement (30 days between same pairs)
- Byzantine fault tolerance

---

## 🏗️ Technical Stack

### Blockchain
- **Solidity 0.8.19**: Smart contracts
- **Hardhat 2.22.0**: Development framework
- **OpenZeppelin 4.9.0**: Security standards
- **Ethers.js 6.9.0**: Blockchain interaction

### Frontend
- **React 18**: UI framework
- **ethers.js**: Web3 integration
- **Rabby/MetaMask**: Wallet providers

### Testing
- **Hardhat Test**: Unit & integration tests
- **Chai**: Assertions
- **Coverage**: 95%+ code coverage

---

## 🔐 Security Features

- ✅ **Commit-Reveal Pattern**: Prevents oracle collusion
- ✅ **Cooldown Periods**: Anti-manipulation (1 min testing / 30 days production)
- ✅ **Economic Security**: Slashing for malicious oracles
- ✅ **Byzantine Fault Tolerance**: 66% consensus threshold
- ✅ **Reputation Decay**: Incentivizes active participation
- ✅ **Timelock Governance**: 48-hour proposal execution delay

---

## 📈 Performance

| Metric | Value |
|--------|-------|
| Deployment Time | ~30 seconds |
| Attestation Request | ~5 seconds |
| Oracle Accept | ~3 seconds |
| Commit Decision | ~3 seconds |
| Reveal Decision | ~3 seconds |
| Consensus Calculation | Instant |
| Loan Auction (full) | 4 minutes |

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Development Guidelines
- Write tests for new features
- Follow Solidity style guide
- Document complex logic
- Update relevant docs

---

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file.

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/aryan-chugh/BWD_Project/issues)
- **Documentation**: See `docs/` directory
- **Guides**: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) & [SCRIPTS_GUIDE.md](./SCRIPTS_GUIDE.md)

---

## 🎯 Roadmap

### ✅ Completed (v1.0)
- Multi-oracle commit-reveal attestations
- Sealed-bid loan marketplace
- AI credit scoring integration
- On-chain governance
- Full frontend dashboard suite

### 🚧 In Progress
- Mobile wallet support
- Advanced analytics dashboard
- Multi-chain deployment

### 📋 Planned (v2.0)
- Cross-chain attestations
- Automated credit score updates
- Machine learning risk models
- Social graph analysis

---

**Built with ❤️ for decentralized finance and MSME empowerment**
