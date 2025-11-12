# ✅ One-Script Deployment Complete!

## What We Created

**Single Deployment Script**: `scripts/deploy-localhost.js`

This ONE script does EVERYTHING:
- ✅ Deploys all 11 smart contracts
- ✅ Registers 4 attestation schemas  
- ✅ Mints tokens to 8 test accounts (100,000 CIT each)
- ✅ Verifies deployment success
- ✅ Updates frontend configuration automatically
- ✅ Saves deployment info to `deployments/localhost.json`

## How to Use

### 🚀 Three Simple Commands

**Terminal 1 - Start Network:**
```powershell
npm run node
```

**Terminal 2 - Deploy Everything:**
```powershell
.\deploy-localhost.ps1
# OR
npm run deploy
# OR
npx hardhat run scripts/deploy-localhost.js --network localhost
```

**Terminal 3 - Start Frontend:**
```powershell
cd frontend
npm start
```

### ⏱️ Total Time: ~30 seconds

## What Gets Deployed

### 📦 Smart Contracts (11)
1. **CIToken** - ERC20 token (10M initial + 800K minted = 10.8M total)
2. **OracleStakingV3** - Multi-oracle consensus system
3. **AttestationRegistryV3_1** - Commit-reveal attestations
4. **LoanMarketplace** - P2P lending platform
5. **LoanAgreementRegistry** - Loan tracking
6. **PlatformGovernance** - Governance system
7. **MSMEIdentity** - Identity management
8. **DynamicCreditScore** - Credit scoring
9. **FlashAssessment** - Quick assessments
10. **SocialCreditSystem** - Social credit
11. **PredictiveAnalyticsOracle** - Analytics

### 📋 Attestation Schemas (4)
- **gst-revenue** - GST Revenue Verification
- **bank-statements** - Bank Statement Verification (plural!)
- **kyc-basic** - KYC Basic Verification (not just "kyc"!)
- **credit-score** - Credit Score Attestation

### 💰 Funded Accounts (8)
Each account receives 100,000 CIT + 10,000 ETH for gas:
- **Admin/Deployer**: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
- **Oracle 1**: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
- **Oracle 2**: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
- **Oracle 3**: 0x90F79bf6EB2c4f870365E785982E1f101E93b906
- **MSME 1**: 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65
- **MSME 2**: 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc
- **Lender 1**: 0x976EA74026E726554dB657fA54763abd0C3a0aa9
- **Lender 2**: 0x14dC79964da2C08b23698B3D3cc7Ca32193d9955

## Output

The script provides:
- ✅ Real-time deployment progress with emojis
- ✅ Contract addresses for all deployed contracts
- ✅ Schema registration confirmation with hashes
- ✅ Token minting success for each account
- ✅ Verification of contracts, schemas, and balances
- ✅ Complete deployment summary
- ✅ Next steps instructions

## Files Created/Updated

### Created:
- `scripts/deploy-localhost.js` - Master deployment script
- `deploy-localhost.ps1` - PowerShell wrapper with network check
- `deployments/localhost.json` - Current deployment addresses
- `deployments/localhost-{timestamp}.json` - Backup

### Updated:
- `package.json` - Added `npm run deploy` command
- `frontend/src/utils/contracts.js` - Auto-updated with new addresses
- `scripts/check-schemas-localhost.js` - Now reads from localhost.json

## Verification

After deployment, you can verify:

```powershell
# Check all schemas are registered
node scripts/check-schemas-localhost.js

# Check contract addresses
cat deployments/localhost.json

# Check specific account balance
node scripts/mint-to-wallet.js <address> 0
```

## Replaced Scripts

This ONE script replaces:
- ❌ `scripts/deploy.js` (for localhost)
- ❌ `scripts/register-schemas-localhost.js`
- ❌ `scripts/mint-to-wallet.js` (manual per-account)
- ❌ `setup-and-mint.ps1`
- ❌ `start-fresh.ps1`
- ❌ Multiple diagnostic scripts

**Everything in ONE place!**

## Benefits

### Before (Old Way):
1. Start node
2. Deploy contracts (separate script)
3. Register schemas (separate script)
4. Mint tokens to account 1 (separate command)
5. Mint tokens to account 2 (separate command)
6. ... repeat 6 more times ...
7. Verify deployment (separate script)
8. Update frontend manually
9. Check schemas work (separate script)

**Total: 10+ commands, 5+ minutes**

### After (New Way):
1. Start node
2. Run `.\deploy-localhost.ps1`

**Total: 2 commands, 30 seconds**

## MetaMask Setup

1. **Add Network:**
   - Network Name: `Localhost 8545`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`

2. **Import Accounts** (Private keys from hardhat):
   ```
   Oracle 1: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
   MSME 1: 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6
   Lender 1: 0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a
   ```

## Troubleshooting

### "Cannot connect to network"
**Solution:** Start hardhat node first: `npm run node`

### "Schema not active"
**Solution:** Already fixed! Frontend now uses correct schema IDs.

### "Transaction failed"
**Solution:** Check you have enough CIT (all accounts pre-funded with 100K)

### "Wrong network"
**Solution:** MetaMask must be on Chain ID 31337 (localhost)

## Documentation

- **Quick Start**: `LOCALHOST_QUICKSTART.md`
- **Complete Setup**: `READY_TO_USE.md`
- **Full Deployment Guide**: `DEPLOYMENT_GUIDE.md`
- **All Scripts Reference**: `SCRIPTS_GUIDE.md`

---

**✨ Everything works with ONE script!** 🎉

No more juggling multiple commands and scripts. Just run it and go! 🚀
