# 🎯 Testing Your Deployed Platform - Step by Step

## Current Status
✅ All 7 contracts deployed to Sepolia  
✅ 0.874 ETH remaining for testing  
✅ Ready to test all features  

---

## 🚀 Step 1: Quick Health Check (2 minutes)

**Test that everything is working:**

```powershell
# Start Hardhat console connected to Sepolia
npx hardhat console --network sepolia
```

**Run these commands in the console:**

```javascript
// 1. Connect to your deployed contracts
const citToken = await ethers.getContractAt("CIToken", "0xeFFC0B02F576DaE67ab88934075E3448bB2B5ECe");
const governance = await ethers.getContractAt("PlatformGovernance", "0xE8570F418E71b1378184d9D6AF52dBd44DA75A84");
const oracleStaking = await ethers.getContractAt("OracleStaking", "0x8CE33491BFadeee6589131fB53855ac41c3Fb021");

// 2. Check token details
console.log("=== CIT Token ===");
console.log("Name:", await citToken.name());
console.log("Symbol:", await citToken.symbol());
console.log("Total Supply:", ethers.formatEther(await citToken.totalSupply()));

// 3. Check your account
const [signer] = await ethers.getSigners();
console.log("\n=== Your Account ===");
console.log("Address:", signer.address);
console.log("ETH Balance:", ethers.formatEther(await ethers.provider.getBalance(signer.address)));

// 4. Check governance
console.log("\n=== Platform Governance ===");
console.log("Owner:", await governance.owner());

console.log("\n✅ All contracts are working!");

// Don't exit yet, continue to Step 2...
```

---

## 🏗️ Step 2: Create Your First MSME Identity (3 minutes)

**Still in the Hardhat console:**

```javascript
// 1. Deploy a new MSME identity
console.log("\n=== Creating MSME Identity ===");
const tx1 = await governance.deployMSMEIdentity();
console.log("Transaction sent:", tx1.hash);
console.log("Waiting for confirmation...");

const receipt1 = await tx1.wait();
console.log("✅ Transaction confirmed!");

// 2. Get the identity address from the event
const event = receipt1.logs.find(log => {
  try {
    return governance.interface.parseLog(log).name === 'MSMEIdentityCreated';
  } catch(e) { return false; }
});

const identityAddress = event ? governance.interface.parseLog(event).args.identity : null;
console.log("\n🎉 MSME Identity created at:", identityAddress);

// Save this address for next steps
// Copy it somewhere!
```

**Expected output:**
```
Transaction sent: 0x...
Waiting for confirmation...
✅ Transaction confirmed!
🎉 MSME Identity created at: 0x...
```

---

## 📝 Step 3: Add Data to Identity (3 minutes)

**Still in console, using the identity you just created:**

```javascript
// 1. Connect to your identity contract
const MSMEIdentity = await ethers.getContractFactory("MSMEIdentity");
const identity = MSMEIdentity.attach(identityAddress);

console.log("\n=== Adding Business Data ===");

// 2. Add business name
const nameKey = ethers.keccak256(ethers.toUtf8Bytes("businessName"));
const nameValue = ethers.toUtf8Bytes("My Test Company Pvt Ltd");
const tx2 = await identity.setData(nameKey, nameValue);
await tx2.wait();
console.log("✅ Business name added");

// 3. Add GST number
const gstKey = ethers.keccak256(ethers.toUtf8Bytes("gstNumber"));
const gstValue = ethers.toUtf8Bytes("27AABCU9603R1ZV");
const tx3 = await identity.setData(gstKey, gstValue);
await tx3.wait();
console.log("✅ GST number added");

// 4. Add industry
const industryKey = ethers.keccak256(ethers.toUtf8Bytes("industry"));
const industryValue = ethers.toUtf8Bytes("Manufacturing");
const tx4 = await identity.setData(industryKey, industryValue);
await tx4.wait();
console.log("✅ Industry added");

// 5. Read back the data to verify
console.log("\n=== Verifying Data ===");
const storedName = await identity.getData(nameKey);
const storedGst = await identity.getData(gstKey);
const storedIndustry = await identity.getData(industryKey);

console.log("Business Name:", ethers.toUtf8String(storedName));
console.log("GST Number:", ethers.toUtf8String(storedGst));
console.log("Industry:", ethers.toUtf8String(storedIndustry));

console.log("\n✅ Identity data stored successfully!");
```

---

## 🔐 Step 4: Register as an Oracle (5 minutes)

**Still in console:**

```javascript
// 1. Mint CIT tokens to yourself (you're the owner, so you can mint)
console.log("\n=== Setting Up Oracle ===");
const mintAmount = ethers.parseEther("100000"); // 100,000 CIT
const tx5 = await citToken.mint(signer.address, mintAmount);
await tx5.wait();
console.log("✅ Minted 100,000 CIT tokens");

// 2. Check your CIT balance
const citBalance = await citToken.balanceOf(signer.address);
console.log("Your CIT balance:", ethers.formatEther(citBalance));

// 3. Approve oracle staking contract to spend your tokens
const stakeAmount = ethers.parseEther("50000"); // Minimum stake
const tx6 = await citToken.approve(oracleStaking.target, stakeAmount);
await tx6.wait();
console.log("✅ Approved staking contract");

// 4. Stake tokens to become an oracle
const tx7 = await oracleStaking.stake(stakeAmount);
await tx7.wait();
console.log("✅ Staked 50,000 CIT tokens");

// 5. Check oracle status
const isRegistered = await oracleStaking.isOracleRegistered(signer.address);
const tier = await oracleStaking.getOracleTier(signer.address);
console.log("\n=== Oracle Status ===");
console.log("Registered:", isRegistered);
console.log("Tier:", tier.toString());

console.log("\n🎉 You are now a registered oracle!");
```

---

## ✍️ Step 5: Submit an Attestation (3 minutes)

**Still in console:**

```javascript
// 1. Connect to attestation registry
const attestationRegistry = await ethers.getContractAt("AttestationRegistry", "0xafC385E1DED3f464E1346C48Af5c230924c08e82");

console.log("\n=== Submitting Attestation ===");

// 2. Prepare attestation data
const schemaId = ethers.keccak256(ethers.toUtf8Bytes("gst-revenue"));
const attestationData = ethers.AbiCoder.defaultAbiCoder().encode(
  ['string', 'string', 'uint256', 'string', 'bool'],
  [
    '27AABCU9603R1ZV',           // GST number
    'My Test Company Pvt Ltd',   // Business name
    ethers.parseEther("50000000"), // Annual revenue (50M)
    'Active',                     // Status
    true                          // Verified
  ]
);

// 3. Submit attestation (1 year validity)
const validityPeriod = 365 * 24 * 60 * 60; // 1 year in seconds
const tx8 = await attestationRegistry.submitAttestation(
  identityAddress,
  schemaId,
  attestationData,
  validityPeriod
);
await tx8.wait();
console.log("✅ Attestation submitted");

// 4. Check attestation count
const count = await attestationRegistry.getAttestationCount(identityAddress);
console.log("Total attestations for this MSME:", count.toString());

console.log("\n🎉 Oracle attestation completed!");
```

---

## 💰 Step 6: Create a Loan Request (3 minutes)

**Still in console:**

```javascript
// 1. Connect to loan marketplace
const loanMarketplace = await ethers.getContractAt("LoanMarketplace", "0x3EBFE1570cb333D46D6249D056db88eada7483F3");

console.log("\n=== Creating Loan Request ===");

// 2. Create loan request
const tx9 = await loanMarketplace.createLoanRequest(
  ethers.parseEther("1000000"), // 1M loan amount
  12,                           // 12 months duration
  1500,                         // 15% maximum interest rate (in basis points)
  identityAddress,              // Your MSME identity
  "Working capital for expansion"
);
await tx9.wait();
console.log("✅ Loan request created");

// 3. Get the request ID from event
const receipt9 = await ethers.provider.getTransactionReceipt(tx9.hash);
const eventLog = receipt9.logs.find(log => {
  try {
    return loanMarketplace.interface.parseLog(log).name === 'LoanRequestCreated';
  } catch(e) { return false; }
});

const requestId = eventLog ? loanMarketplace.interface.parseLog(eventLog).args.requestId : 1n;
console.log("Loan Request ID:", requestId.toString());

// 4. Get loan request details
const request = await loanMarketplace.loanRequests(requestId);
console.log("\n=== Loan Request Details ===");
console.log("Borrower:", request.borrower);
console.log("Amount:", ethers.formatEther(request.amount), "ETH");
console.log("Duration:", request.duration.toString(), "months");
console.log("Max Rate:", request.maxRate.toString(), "basis points");
console.log("Status:", request.status.toString());

console.log("\n🎉 Loan request is live!");

// Save the requestId for next steps
```

---

## 📊 Step 7: Check Your Progress (1 minute)

**Still in console:**

```javascript
console.log("\n" + "=".repeat(60));
console.log("🎉 TESTING PROGRESS SUMMARY");
console.log("=".repeat(60));

console.log("\n✅ Completed Steps:");
console.log("1. ✅ Health check - All contracts working");
console.log("2. ✅ Created MSME Identity:", identityAddress);
console.log("3. ✅ Added business data (name, GST, industry)");
console.log("4. ✅ Registered as Oracle (Tier", tier.toString() + ")");
console.log("5. ✅ Submitted attestation for MSME");
console.log("6. ✅ Created loan request (ID:", requestId.toString() + ")");

console.log("\n📊 Your Stats:");
console.log("- ETH Balance:", ethers.formatEther(await ethers.provider.getBalance(signer.address)));
console.log("- CIT Balance:", ethers.formatEther(await citToken.balanceOf(signer.address)));
console.log("- Oracle Status: Registered");
console.log("- Attestations Submitted: 1");
console.log("- Active Loan Requests: 1");

console.log("\n🎯 Next: Test Loan Bidding (Step 8)");
console.log("=".repeat(60));

// Exit console when done
.exit
```

---

## 🎯 Step 8: Test Frontend (10 minutes)

**Now let's configure the frontend:**

### 8.1 Configure Frontend

```powershell
# Exit the console if still in it
# Then configure frontend

cd frontend
notepad .env.local
```

**Add this to `.env.local`:**

```env
# Network Configuration
REACT_APP_NETWORK=sepolia
REACT_APP_CHAIN_ID=11155111
REACT_APP_RPC_URL=https://ethereum-sepolia.publicnode.com

# Contract Addresses (from your deployment)
REACT_APP_CI_TOKEN=0xeFFC0B02F576DaE67ab88934075E3448bB2B5ECe
REACT_APP_ORACLE_STAKING=0x8CE33491BFadeee6589131fB53855ac41c3Fb021
REACT_APP_ATTESTATION_REGISTRY=0xafC385E1DED3f464E1346C48Af5c230924c08e82
REACT_APP_LOAN_MARKETPLACE=0x3EBFE1570cb333D46D6249D056db88eada7483F3
REACT_APP_LOAN_AGREEMENT_REGISTRY=0xDD748157911E1FE05b7D42cAb96cb4cdD8EB97E0
REACT_APP_PLATFORM_GOVERNANCE=0xE8570F418E71b1378184d9D6AF52dBd44DA75A84
```

**Save and close the file.**

### 8.2 Start Frontend

```powershell
# Make sure you're in frontend directory
npm start
```

**This will open http://localhost:3000**

### 8.3 Test in Browser

1. **Connect Rabby Wallet**
   - Click "Connect Wallet"
   - Make sure Rabby is on Sepolia network
   - Approve connection

2. **Test MSME Dashboard**
   - Go to "MSME Dashboard"
   - View your identity
   - Add more data
   - Request attestations
   - Create loan requests

3. **Test Lender Dashboard**
   - Go to "Lender Dashboard"
   - Browse loan requests
   - Commit a bid (sealed)
   - Reveal bid after commit phase

4. **Test Oracle Dashboard**
   - Go to "Oracle Dashboard"
   - View your stake
   - Submit attestations
   - Check reputation

5. **Test Marketplace**
   - View all active loans
   - See auction status
   - Browse MSMEs

---

## 📝 Step 9: Advanced Testing (Optional)

### Test Loan Bidding Flow

**In a new console session:**

```powershell
npx hardhat console --network sepolia
```

```javascript
// Setup
const loanMarketplace = await ethers.getContractAt("LoanMarketplace", "0x3EBFE1570cb333D46D6249D056db88eada7483F3");
const requestId = 1n; // Use your request ID from Step 6

// Commit a sealed bid
const rate = 1200; // 12% interest rate
const nonce = ethers.randomBytes(32);
const commitment = ethers.keccak256(
  ethers.AbiCoder.defaultAbiCoder().encode(
    ['uint256', 'uint256', 'bytes32'],
    [requestId, rate, nonce]
  )
);

const tx = await loanMarketplace.commitBid(requestId, commitment);
await tx.wait();
console.log("✅ Bid committed (sealed)");

// After commit phase ends (24 hours), you can reveal:
// await loanMarketplace.revealBid(requestId, rate, nonce);

.exit
```

---

## ✅ Testing Checklist

**After completing all steps, you should have:**

- [x] Deployed all contracts to Sepolia
- [x] Created MSME identity
- [x] Added business data
- [x] Registered as oracle
- [x] Submitted attestation
- [x] Created loan request
- [ ] Tested frontend UI
- [ ] Tested complete loan flow
- [ ] Verified on Etherscan

---

## 🔗 Useful Links

**Your Deployment:**
- [All Contracts](https://sepolia.etherscan.io/address/0x4C7A8d194A36FDf53365490D1cAd92E59f648571)
- [CIT Token](https://sepolia.etherscan.io/address/0xeFFC0B02F576DaE67ab88934075E3448bB2B5ECe)
- [Platform Governance](https://sepolia.etherscan.io/address/0xE8570F418E71b1378184d9D6AF52dBd44DA75A84)

**Documentation:**
- `TESTNET_DEPLOYMENT_GUIDE.md` - Complete verification guide
- `FEATURE_VERIFICATION_MATRIX.md` - All features mapped
- `PROJECT_COMPLETE.md` - Project overview

---

## 💡 Quick Commands Reference

```powershell
# Start console
npx hardhat console --network sepolia

# Start frontend
cd frontend; npm start

# Start oracle service
cd oracle-service; npm start

# Check balance on Etherscan
# https://sepolia.etherscan.io/address/YOUR_ADDRESS
```

---

## 🎯 Current Progress

**You are here:** Step 1  
**Completed:** Deployment ✅  
**Next:** Health check and create identity  
**Time needed:** ~20-30 minutes for all steps  

---

## 🚀 Let's Start!

**Run this now:**

```powershell
npx hardhat console --network sepolia
```

**Then follow Step 1 above!**

I'll help you through each step. Just copy-paste the commands and let me know when you complete each step or if you encounter any issues! 🎉
