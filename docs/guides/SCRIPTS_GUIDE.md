# 📜 Scripts Guide

## Essential Scripts

### 🚀 Deployment

#### `deploy.js`
**The main deployment script - use this for all deployments**
```powershell
npx hardhat run scripts/deploy.js --network localhost
```
- Deploys all 11 contracts in correct order
- Registers 4 attestation schemas
- Auto-updates frontend addresses
- Saves deployment to `deployments/deployment-{timestamp}.json`

#### `update-frontend-addresses.js`
**Updates frontend with latest deployed contract addresses**
```powershell
node scripts/update-frontend-addresses.js
```
- Auto-finds latest deployment file
- Updates `frontend/src/utils/contracts.js`
- Run this if frontend shows "contract not deployed" errors

---

## 🔍 Diagnostic Scripts

### Check Contract State

#### `check-balances.js`
Check CIT token balances for addresses
```powershell
node scripts/check-balances.js
```

#### `check-oracles.js`
View all registered oracles and their stakes
```powershell
node scripts/check-oracles.js
```

#### `check-stake.js`
Check oracle stake status for specific address
```powershell
node scripts/check-stake.js
```

#### `check-schemas.js`
List all registered attestation schemas
```powershell
node scripts/check-schemas.js
```

#### `check-requests.js`
View all attestation requests with details
```powershell
node scripts/check-requests.js
```

#### `check-pending-requests.js`
Show only pending attestation requests
```powershell
node scripts/check-pending-requests.js
```

#### `check-consensus.js`
View consensus details for specific request
```powershell
node scripts/check-consensus.js <requestId>
```

#### `check-loan.js` / `check-loan-status.js`
Check loan marketplace and loan agreement status
```powershell
node scripts/check-loan.js
node scripts/check-loan-status.js
```

---

## 🧪 Testing Scripts

### Manual Testing

#### `test-attestation-request.js`
Create a test attestation request
```powershell
node scripts/test-attestation-request.js
```

#### `test-balance.js`
Test token balance queries
```powershell
node scripts/test-balance.js
```

#### `test-contract-query.js`
Test contract read operations
```powershell
node scripts/test-contract-query.js
```

#### `test-platform.js`
End-to-end platform functionality test
```powershell
node scripts/test-platform.js
```

#### `test-revolutionary-contracts.js`
Test DynamicCreditScore, SocialCreditSystem, etc.
```powershell
node scripts/test-revolutionary-contracts.js
```

### Performance

#### `performanceTest.js`
Run performance benchmarks
```powershell
node scripts/performanceTest.js
```

---

## 🛠️ Utility Scripts

### Token Operations

#### `mint-tokens.js`
Mint CIT tokens to default account
```powershell
node scripts/mint-tokens.js
```

#### `mint-to-wallet.js`
Mint CIT tokens to specific address
```powershell
node scripts/mint-to-wallet.js <address> <amount>
```

### Oracle Operations

#### `stake-oracle.js`
Stake tokens to register as oracle
```powershell
node scripts/stake-oracle.js
```

#### `oracle-accept-request.js`
Accept attestation request as oracle
```powershell
node scripts/oracle-accept-request.js <requestId>
```

### Schema Operations

#### `register-schemas.js`
Register attestation schemas (only if not done in deploy)
```powershell
node scripts/register-schemas.js
```

#### `diagnose-schemas.js`
Diagnose schema registration issues
```powershell
node scripts/diagnose-schemas.js
```

### Loan Operations

#### `create-test-loan.js`
Create a test loan listing
```powershell
node scripts/create-test-loan.js
```

### Deployment Verification

#### `verify-deployment.js`
Verify all contracts deployed correctly
```powershell
node scripts/verify-deployment.js
```

---

## 📋 Common Workflows

### Fresh Deployment
```powershell
# 1. Start local blockchain
npx hardhat node

# 2. Deploy everything
npx hardhat run scripts/deploy.js --network localhost

# 3. Verify deployment
node scripts/verify-deployment.js

# 4. Check schemas
node scripts/check-schemas.js

# 5. Start frontend
cd frontend
npm start
```

### Oracle Setup
```powershell
# 1. Mint tokens
node scripts/mint-to-wallet.js 0xYourAddress 10000

# 2. Stake as oracle
node scripts/stake-oracle.js

# 3. Verify stake
node scripts/check-stake.js

# 4. View all oracles
node scripts/check-oracles.js
```

### Testing Attestation Flow
```powershell
# 1. Create test request
node scripts/test-attestation-request.js

# 2. Check pending requests
node scripts/check-pending-requests.js

# 3. Oracle accepts (via frontend or script)
node scripts/oracle-accept-request.js 1

# 4. Check request status
node scripts/check-requests.js

# 5. Oracle commits decision (via frontend)
# 6. Oracle reveals decision (via frontend)

# 7. Check consensus
node scripts/check-consensus.js 1
```

### Debugging
```powershell
# Check contract addresses
cat deployments/deployment-*.json | Select-Object -Last 1

# Check frontend has correct addresses
cat frontend/src/utils/contracts.js

# Update frontend if needed
node scripts/update-frontend-addresses.js

# Check oracle balances
node scripts/check-balances.js

# View all oracles
node scripts/check-oracles.js
```

---

## 📝 Notes

- **Network**: Scripts default to `localhost`. For Sepolia, add `--network sepolia`
- **Private Keys**: Configure in `.env` file (never commit!)
- **Fresh Deploy**: Always run `npx hardhat clean` before redeploying
- **Frontend Sync**: If addresses mismatch, run `update-frontend-addresses.js`
- **Testing Mode**: Cooldown is 1 minute (change in `AttestationRegistryV3_1.sol` for production)

## 🚨 Important

- **Never edit** deployed contract addresses manually
- **Always use** `deploy.js` for full deployments
- **Auto-update** frontend addresses is now built into deploy.js
- **Schema registration** is automatic in deploy.js (no need for separate script)
