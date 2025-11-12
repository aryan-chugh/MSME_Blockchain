# 🚀 Deployment Guide

## Quick Start (Localhost)

### 1. Start Local Blockchain
```powershell
npx hardhat node
```

### 2. Deploy All Contracts
```powershell
npx hardhat run scripts/deploy.js --network localhost
```

This script will:
- ✅ Deploy all 11 core contracts
- ✅ Register 4 attestation schemas
- ✅ Auto-update frontend contract addresses
- ✅ Save deployment info to `deployments/deployment-{timestamp}.json`

### 3. Start Frontend
```powershell
cd frontend
npm start
```

## Deployed Contracts

The deploy script deploys in this order:
1. **CIToken** - Platform utility token
2. **OracleStakingV3** - Oracle staking and reputation
3. **AttestationRegistryV3_1** - Commit-reveal attestations (1 min cooldown)
4. **LoanMarketplace** - Loan listings and matching
5. **LoanAgreementRegistry** - Active loan tracking
6. **PlatformGovernance** - DAO governance
7. **SampleMSMEIdentity** - Identity verification
8. **DynamicCreditScore** - AI credit scoring
9. **SocialCreditSystem** - Social trust scores
10. **PredictiveAnalyticsOracle** - Risk predictions
11. **FlashAssessment** - Quick assessments

## Registered Schemas

Automatically registered:
- `financial_statement` - Financial documents
- `business_license` - Business registration
- `tax_return` - Tax compliance
- `bank_statement` - Banking history

## Configuration

### Attestation Registry Settings
- **Oracle Cooldown**: 1 minute (testing mode)
- **Consensus Threshold**: 66%
- **Required Oracles**: 3 per request

### Oracle Staking
- **Minimum Stake**: 1000 CIT tokens
- **Reputation Decay**: 5% per 30 days
- **Slash Amount**: 10% of stake

## Troubleshooting

### Frontend shows old addresses
```powershell
node scripts/update-frontend-addresses.js
```

### Need to check deployment info
```powershell
node scripts/check-deployment.js
```

### Test specific features
```powershell
node scripts/test-cooldown.js
node scripts/test-commit-reveal.js
```

## Network Switching

### Deploy to Sepolia
1. Configure `.env`:
```
SEPOLIA_RPC_URL=your_rpc_url
PRIVATE_KEY=your_private_key
```

2. Deploy:
```powershell
npx hardhat run scripts/deploy.js --network sepolia
```

## Post-Deployment

1. **Setup Oracles**: 3+ wallets stake CIT tokens via frontend
2. **Test Workflow**: MSME creates request → Oracles accept → Commit → Reveal
3. **Verify Consensus**: Check consensus details in MSME dashboard

## Development

### Recompile Contracts
```powershell
npx hardhat compile
```

### Run Tests
```powershell
npx hardhat test
```

### Coverage
```powershell
npx hardhat coverage
```

## Important Notes

⚠️ **Testing Mode**: Cooldown is 1 minute (production should be 30 days)  
⚠️ **Local Network**: Data resets when hardhat node restarts  
⚠️ **Wallet Cache**: Clear Rabby wallet cache if addresses don't match  

## Need Help?

Check these docs:
- `LOCALHOST_QUICKSTART.md` - Quick setup guide
- `docs/COMMIT_REVEAL_WORKFLOW_ANALYSIS.md` - Workflow details
- `docs/E2E_TESTING_GUIDE.md` - Testing procedures
