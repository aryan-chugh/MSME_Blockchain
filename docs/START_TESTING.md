# 🚀 Start Testing - Simple Guide

## Current Status

✅ **You have:** 0.8 SepoliaETH (verified on Etherscan)  
✅ **Rabby wallet:** Configured on Sepolia network  
✅ **Project:** Complete with all contracts, frontend, and oracle service  

---

## 🎯 Next Steps: Deploy to Sepolia Testnet

### Step 1: Get Your Private Key from Rabby

1. **Open Rabby wallet**
2. **Click on your account name** at the top
3. **Select "Export Private Key"** or similar option
4. **Enter your password**
5. **Copy the private key** (starts with `0x` and is 64 characters long)
6. **⚠️ Keep it secret!** (This is for testnet only)

---

### Step 2: Configure Environment Variables

**Edit your `.env` file:**

```powershell
cd d:\blockchain
notepad .env
```

**Add/Update these lines:**

```env
# Sepolia Network Configuration
SEPOLIA_RPC_URL=https://rpc.ankr.com/eth_sepolia
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_FROM_RABBY_HERE

# Etherscan API (optional, for contract verification)
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY

# Gas Settings
REPORT_GAS=true
```

**Save and close the file.**

---

### Step 3: Deploy All Contracts to Sepolia

```powershell
# Make sure you're in the project root
cd d:\blockchain

# Deploy all contracts
npm run deploy -- --network sepolia
```

**Expected output:**
```
Deploying contracts to Sepolia...
✓ CIT Token deployed to: 0x...
✓ Oracle Staking deployed to: 0x...
✓ Attestation Registry deployed to: 0x...
✓ Loan Marketplace deployed to: 0x...
✓ Loan Agreement Registry deployed to: 0x...
✓ Platform Governance deployed to: 0x...
✓ Sample MSME Identity deployed to: 0x...

Deployment complete!
Addresses saved to: deployments/sepolia.json
```

**This will use about 0.2-0.3 ETH in gas fees.**

---

### Step 4: Verify Contracts on Etherscan (Optional)

**Get Etherscan API key (free):**
1. Go to: https://etherscan.io/register
2. Create account
3. Get API key: https://etherscan.io/myapikey
4. Add to `.env` file

**Verify each contract:**

```powershell
# Get contract addresses from deployments/sepolia.json
# Then verify each one:

npx hardhat verify --network sepolia <CI_TOKEN_ADDRESS>

npx hardhat verify --network sepolia <ORACLE_STAKING_ADDRESS> <CI_TOKEN_ADDRESS>

npx hardhat verify --network sepolia <ATTESTATION_REGISTRY_ADDRESS> <ORACLE_STAKING_ADDRESS>

# And so on for each contract...
```

---

## 🧪 Testing Workflow

### Option 1: Test via Hardhat Console (Recommended for first test)

**Start interactive console:**

```powershell
npx hardhat console --network sepolia
```

**In the console, test basic functionality:**

```javascript
// Get deployed contract addresses from deployments/sepolia.json
const citToken = await ethers.getContractAt("CIToken", "0xYOUR_CI_TOKEN_ADDRESS");
const governance = await ethers.getContractAt("PlatformGovernance", "0xYOUR_GOVERNANCE_ADDRESS");

// Check token info
const name = await citToken.name();
const symbol = await citToken.symbol();
console.log(`Token: ${name} (${symbol})`);

// Deploy an MSME identity
const [deployer] = await ethers.getSigners();
console.log("Your address:", deployer.address);
console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

const tx = await governance.deployMSMEIdentity();
const receipt = await tx.wait();
console.log("MSME Identity created! Transaction:", receipt.hash);

// Exit console
.exit
```

---

### Option 2: Test via Frontend

**Step 1: Update Frontend Configuration**

Edit `frontend/.env.local`:

```env
# Network Configuration
REACT_APP_NETWORK=sepolia
REACT_APP_CHAIN_ID=11155111
REACT_APP_RPC_URL=https://rpc.ankr.com/eth_sepolia

# Contract Addresses (copy from deployments/sepolia.json)
REACT_APP_CI_TOKEN=0xYOUR_CI_TOKEN_ADDRESS
REACT_APP_MSME_IDENTITY_FACTORY=0xYOUR_GOVERNANCE_ADDRESS
REACT_APP_ORACLE_STAKING=0xYOUR_ORACLE_STAKING_ADDRESS
REACT_APP_ATTESTATION_REGISTRY=0xYOUR_ATTESTATION_REGISTRY_ADDRESS
REACT_APP_LOAN_MARKETPLACE=0xYOUR_LOAN_MARKETPLACE_ADDRESS
REACT_APP_LOAN_AGREEMENT_REGISTRY=0xYOUR_LOAN_AGREEMENT_REGISTRY_ADDRESS
REACT_APP_PLATFORM_GOVERNANCE=0xYOUR_GOVERNANCE_ADDRESS
```

**Step 2: Start Frontend**

```powershell
cd frontend
npm start
```

**Step 3: Test in Browser**

1. Open http://localhost:3000
2. Connect Rabby wallet
3. Try creating an MSME identity
4. Add data to your identity
5. Test other features

---

### Option 3: Configure and Test Oracle Service

**Step 1: Update Oracle Service Configuration**

Edit `oracle-service/.env`:

```env
# Network Configuration
RPC_URL=https://rpc.ankr.com/eth_sepolia

# Oracle Private Key (use a different wallet than deployer)
ORACLE_PRIVATE_KEY=0xYOUR_ORACLE_PRIVATE_KEY_HERE

# Contract Addresses (copy from deployments/sepolia.json)
ATTESTATION_REGISTRY=0xYOUR_ATTESTATION_REGISTRY_ADDRESS
ORACLE_STAKING=0xYOUR_ORACLE_STAKING_ADDRESS

# Service Configuration
ORACLE_PORT=3001
```

**Step 2: Fund Oracle Wallet**

You need to send some CIT tokens and ETH to your oracle address:

```javascript
// In Hardhat console
const citToken = await ethers.getContractAt("CIToken", "0xYOUR_CI_TOKEN_ADDRESS");
const oracleAddress = "0xYOUR_ORACLE_ADDRESS";

// Mint 100,000 CIT to oracle
await citToken.mint(oracleAddress, ethers.parseEther("100000"));

// Send some ETH for gas (using your deployer account)
await deployer.sendTransaction({
  to: oracleAddress,
  value: ethers.parseEther("0.1") // 0.1 SepoliaETH for gas
});

console.log("Oracle funded!");
```

**Step 3: Start Oracle Service**

```powershell
cd oracle-service
npm start
```

**Step 4: Test Oracle API**

```powershell
# Health check
curl http://localhost:3001/health

# Get oracle info
curl http://localhost:3001/oracle-info
```

---

## 📊 Complete Testing Flow

### End-to-End Test Scenario:

**1. Deploy MSME Identity (via frontend or console)**
```javascript
const governance = await ethers.getContractAt("PlatformGovernance", "0x...");
const tx = await governance.deployMSMEIdentity();
const receipt = await tx.wait();
const event = receipt.logs.find(e => e.fragment?.name === 'MSMEIdentityCreated');
const identityAddress = event.args.identity;
console.log("Identity created:", identityAddress);
```

**2. Add Data to Identity**
```javascript
const identity = await ethers.getContractAt("MSMEIdentity", identityAddress);
const key = ethers.keccak256(ethers.toUtf8Bytes("businessName"));
const value = ethers.toUtf8Bytes("Test Company Pvt Ltd");
await identity.setData(key, value);
console.log("Data added!");
```

**3. Oracle Submits Attestation**
```javascript
const attestationRegistry = await ethers.getContractAt("AttestationRegistry", "0x...");
const schemaId = ethers.keccak256(ethers.toUtf8Bytes("gst-verification"));
const attestationData = ethers.AbiCoder.defaultAbiCoder().encode(
  ['string', 'string', 'uint256', 'bool'],
  ['GST123456', 'Test Company', ethers.parseEther("1000000"), true]
);
await attestationRegistry.submitAttestation(identityAddress, schemaId, attestationData, 31536000);
console.log("Attestation submitted!");
```

**4. Create Loan Request**
```javascript
const loanMarketplace = await ethers.getContractAt("LoanMarketplace", "0x...");
const tx = await loanMarketplace.createLoanRequest(
  ethers.parseEther("100000"), // 100K loan
  12, // 12 months
  1500, // 15% max rate
  identityAddress,
  "Working capital"
);
const receipt = await tx.wait();
console.log("Loan request created!");
```

**5. Lender Commits Bid**
```javascript
const [,, lender] = await ethers.getSigners(); // Use 3rd account as lender
const requestId = 1;
const rate = 1200; // 12%
const nonce = ethers.randomBytes(32);
const commitment = ethers.keccak256(
  ethers.AbiCoder.defaultAbiCoder().encode(['uint256','uint256','bytes32'], [requestId, rate, nonce])
);
await loanMarketplace.connect(lender).commitBid(requestId, commitment);
console.log("Bid committed!");
```

---

## 🎯 Quick Start Checklist

**Before you start:**
- [ ] Have 0.8 SepoliaETH in Rabby ✅ (you have this!)
- [ ] Exported private key from Rabby
- [ ] Updated `.env` with private key and RPC URL
- [ ] Ready to deploy

**Deployment:**
- [ ] Run `npm run deploy -- --network sepolia`
- [ ] Note all contract addresses
- [ ] Verify contracts on Etherscan (optional)

**Testing:**
- [ ] Test in Hardhat console (quick checks)
- [ ] Update frontend `.env.local` with addresses
- [ ] Start frontend and test UI
- [ ] Configure oracle service (optional)

---

## 💰 Gas Cost Estimate

**Deployment (one-time):**
- Deploy 7 contracts: ~0.2-0.3 ETH
- Sample transactions: ~0.05 ETH
- **Total for deployment: ~0.3 ETH**

**Testing transactions:**
- Create identity: ~0.003 ETH
- Add data: ~0.001 ETH each
- Submit attestation: ~0.002 ETH
- Create loan: ~0.002 ETH
- Commit bid: ~0.001 ETH
- **Testing budget: ~0.1-0.2 ETH**

**Your 0.8 ETH is plenty for deployment + extensive testing!** ✅

---

## 🔗 Important Links

**Check your transactions:**
- Sepolia Etherscan: https://sepolia.etherscan.io/
- Your address: https://sepolia.etherscan.io/address/YOUR_ADDRESS

**Documentation:**
- Complete guide: `TESTNET_DEPLOYMENT_GUIDE.md`
- Feature verification: `FEATURE_VERIFICATION_MATRIX.md`
- Oracle setup: `ORACLE_SETUP.md`
- Project overview: `PROJECT_COMPLETE.md`

---

## 🚨 If You Run Into Issues

**Issue: Private key format error**
- Make sure it starts with `0x`
- Must be 64 hex characters (66 total with 0x)

**Issue: Insufficient funds error**
- Check balance: https://sepolia.etherscan.io/address/YOUR_ADDRESS
- Make sure Rabby private key matches the address with 0.8 ETH

**Issue: RPC connection error**
- Try different RPC: `https://ethereum-sepolia.publicnode.com`
- Or: `https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161`

**Issue: Transaction stuck**
- Sepolia sometimes slow (12 second blocks)
- Wait 1-2 minutes
- Check on Etherscan

---

## 🎯 Recommended Path (Start Now!)

**Next 10 minutes:**

```powershell
# 1. Export private key from Rabby
# (Do this in Rabby wallet)

# 2. Update .env file
cd d:\blockchain
notepad .env
# Add your PRIVATE_KEY and SEPOLIA_RPC_URL

# 3. Deploy contracts
npm run deploy -- --network sepolia

# 4. Note the contract addresses
# They'll be saved in deployments/sepolia.json

# 5. Test in console
npx hardhat console --network sepolia
```

**Then:**
- Test basic functionality in console
- Update frontend config
- Start testing UI
- Follow TESTNET_DEPLOYMENT_GUIDE.md for complete feature verification

---

## ✅ You're Ready!

You have:
- ✅ 0.8 SepoliaETH
- ✅ Rabby wallet configured
- ✅ All contracts ready to deploy
- ✅ Frontend and oracle service ready
- ✅ Complete documentation

**Next command to run:**

```powershell
cd d:\blockchain
notepad .env
# Add your private key, then save

npm run deploy -- --network sepolia
```

**Let's deploy!** 🚀
