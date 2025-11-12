# 🧪 Frontend Testing Guide - MSME Credit Platform

## 📋 Quick Start - Contract Addresses & Test Accounts

### 🔧 Deployed Contract Addresses (Local Hardhat)

```
CIT Token:                 0x5FbDB2315678afecb367f032d93F642f64180aa3
Oracle Staking:            0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
Attestation Registry:      0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
Loan Marketplace:          0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
Loan Agreement Registry:   0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
Platform Governance:       0x5FC8d32690cc91D4c39d9d3abcBD16989F875707
Sample MSME Identity:      0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0
```

### 👥 Test Accounts - USE THESE FOR TESTING

| Role | Address | Private Key | ETH Balance |
|------|---------|-------------|-------------|
| **Deployer/Governance** | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` | 10,000 ETH |
| **Oracle #1** | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` | 10,000 ETH |
| **Oracle #2** | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` | 10,000 ETH |
| **MSME #1** | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | `0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6` | 10,000 ETH |
| **MSME #2** | `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` | `0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a` | 10,000 ETH |
| **Lender #1** | `0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc` | `0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba` | 10,000 ETH |
| **Lender #2** | `0x976EA74026E726554dB657fA54763abd0C3a0aa9` | `0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e` | 10,000 ETH |
| **Lender #3** | `0x14dC79964da2C08b23698B3D3cc7Ca32193d9955` | `0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356` | 10,000 ETH |

---

## 🚀 STEP 1: Start Frontend

```bash
cd frontend
npm install
npm start
```

**Frontend URL**: http://localhost:3000

---

## 🦊 STEP 2: Setup Rabby Wallet

### Add Hardhat Network
1. Open Rabby Wallet
2. Click network dropdown → "Add Network" or "Custom Network"
3. Enter details:
   - **Network Name**: Hardhat Local
   - **RPC URL**: `http://localhost:8545`
   - **Chain ID**: `31337`
   - **Currency Symbol**: ETH

### Import Test Accounts
Import these 3 accounts using their private keys:

1. **Oracle Account** (Account #1)
   - Private Key: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`
   
2. **MSME Account** (Account #3)
   - Private Key: `0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6`
   
3. **Lender Account** (Account #5)
   - Private Key: `0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba`

---

## 🎯 COMPLETE TESTING WORKFLOW

### 📍 PHASE 1: Oracle Operations


---

## 📝 PHASE 1: Oracle Operations (10 minutes)

**Switch to Oracle Account #1 in Rabby**

#### Step 1: Get CIT Tokens
You need to transfer CIT tokens from Deployer to Oracle account first.

**Option A - Using Hardhat Console:**
```bash
npx hardhat console --network localhost
```
```javascript
const [deployer, oracle1] = await ethers.getSigners();
const citToken = await ethers.getContractAt("CIToken", "0x5FbDB2315678afecb367f032d93F642f64180aa3");
await citToken.transfer(oracle1.address, ethers.parseEther("100000")); // 100k CIT
console.log("Transferred 100,000 CIT to Oracle #1");
```

#### Step 2: Stake as Oracle (Frontend)
1. Go to **Oracle Dashboard** 
2. Enter stake amount: **50,000** CIT (minimum)
3. Click "Approve CIT Token"
4. Click "Stake Tokens"
5. Verify status shows: **Active Oracle**

**Expected Result:**
- ✅ Status: Active
- ✅ Staked: 50,000 CIT
- ✅ Reputation: 100
- ✅ Tier: 1

#### Step 3: Submit Attestation
1. Enter MSME Address: `0x90F79bf6EB2c4f870365E785982E1f101E93b906` (MSME #1)
2. Select Schema: "GST Revenue Verification"
3. Enter Data (hex bytes): `0x000000000000000000000000000000000000000000000000000000000000003200000000000000000000000000000000000000000000000000000000000f4240` (example: 50 score, 1M revenue)
4. Validity Period: **31536000** (1 year in seconds)
5. Click "Submit Attestation"

**Expected Result:**
- ✅ Attestation submitted
- ✅ Attestation count: 1
- ✅ Transaction confirmed

---

### 📍 PHASE 2: MSME Operations


---

## 📝 PHASE 2: MSME Identity & Loan Request (10 minutes)

**Switch to MSME Account #3 in Rabby**

#### Step 1: Create MSME Identity
1. Go to **MSME Dashboard**
2. Click "Create Identity Contract"
3. Confirm transaction
4. **Note the Identity Contract Address** (you'll need this)

**Expected Result:**
- ✅ Identity contract created
- ✅ You are owner
- ✅ Address shown on dashboard

#### Step 2: Approve Attestation Registry
1. Find "Approve Operator" section
2. Enter: `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` (AttestationRegistry)
3. Click "Approve"

**Expected Result:**
- ✅ Attestation Registry approved
- ✅ Can receive attestations

#### Step 3: View Attestations
1. Check "My Attestations" section
2. Should see 1 attestation from Oracle #1
3. View details: schema, issuer, timestamp, expiry

#### Step 4: Create Loan Request
1. Go to "Create Loan Request" section
2. Fill form:
   - **Amount**: 100 (ETH)
   - **Tenure**: 12 (months)
   - **Purpose**: Working Capital
   - **Commit Period**: 7200 (2 hours in seconds)
   - **Reveal Period**: 3600 (1 hour in seconds)
3. Click "Create Loan Request"
4. **Note the Request ID** (usually 1)

**Expected Result:**
- ✅ Request created
- ✅ Status: Open
- ✅ Request ID: 1
- ✅ Visible in marketplace

---

### 📍 PHASE 3: Lender Operations


---

## 📝 PHASE 3: Lender Bidding (10 minutes)

**Switch to Lender Account #5 in Rabby**

#### Step 1: View Loan Requests
1. Go to **Marketplace** page
2. See all active loan requests
3. Find Request ID: 1 (from MSME)
4. View details: amount, tenure, deadlines

#### Step 2: Commit Bid (SEALED)
1. Click "Bid on Request #1"
2. Enter Interest Rate: **1000** (= 10% in basis points)
3. System generates random nonce automatically
4. **IMPORTANT**: Check "Deposit Amount" = 5 ETH (5% of 100 ETH)
5. Click "Commit Bid"
6. **Confirm transaction with 5 ETH value**

**Expected Result:**
- ✅ Bid committed
- ✅ 5 ETH deposited (deducted from balance)
- ✅ Commitment hash stored
- ✅ Cannot see rate (sealed)

**Optional**: Repeat with Lender #2 at 1200 (12% rate)

#### Step 3: Wait for Commit Period
⏰ **Wait 2 hours** (or fast-forward time in Hardhat console)

**To fast-forward time:**
```bash
npx hardhat console --network localhost
```
```javascript
await ethers.provider.send("evm_increaseTime", [7201]); // 2 hours + 1 sec
await ethers.provider.send("evm_mine");
console.log("Time advanced by 2 hours");
```

#### Step 4: Reveal Bid
1. Go back to Marketplace
2. Find your committed bid
3. Enter same rate: **1000**
4. Enter same nonce (auto-filled)
5. Click "Reveal Bid"
6. **Your 5 ETH deposit is REFUNDED!**

**Expected Result:**
- ✅ Bid revealed
- ✅ Rate visible: 10%
- ✅ 5 ETH refunded (back in balance)
- ✅ Other revealed bids now visible

---

### 📍 PHASE 4: Winner Selection

**Switch back to MSME Account #3**

#### Step 1: Wait for Reveal Period
⏰ **Wait 1 hour** (or fast-forward)

```javascript
await ethers.provider.send("evm_increaseTime", [3601]);
await ethers.provider.send("evm_mine");
```

#### Step 2: Select Winner
1. Go to "My Loan Requests"
2. Find Request #1
3. Click "Select Winner"
4. System automatically picks **lowest rate** (10%)

**Expected Result:**
- ✅ Winner: Lender #1 (10% rate)
- ✅ Status: Matched
- ✅ Winning rate displayed

---

### 📍 PHASE 5: Loan Agreement & Disbursement

**Switch to Lender Account #5 (Winner)**

#### Step 1: Register Agreement
1. Go to Lender Dashboard
2. Find "Matched Loan #1"
3. Create agreement hash:
   - Off-chain: Create legal document
   - Hash it: `0x1234...` (use any 32-byte hash for testing)
4. Enter Agreement Hash
5. Click "Register Agreement"
6. **Note the Record ID** (usually 1)

**Expected Result:**
- ✅ Agreement registered
- ✅ Record ID: 1
- ✅ Status: Active
- ✅ Stored immutably

#### Step 2: Record Disbursement
1. Find "Active Agreements" section
2. Select Record #1
3. Enter Expected Repayment Date:
   - Use timestamp: `1761360000` (Oct 2025 + 1 year)
   - Or current timestamp + 31536000 (1 year)
4. Click "Record Disbursement"

**Expected Result:**
- ✅ Disbursement recorded
- ✅ Disbursement date: Today
- ✅ Expected repayment: 1 year from now
- ✅ Loan now tracked

---

### 📍 PHASE 6: Loan Repayment

**Still as Lender Account #5**

#### Step 1: Mark as Repaid
1. After off-chain repayment received
2. Find Record #1
3. Click "Mark as Repaid"

**Expected Result:**
- ✅ Status: Repaid
- ✅ MSME reputation +50 points
- ✅ Repayment date recorded
- ✅ Average repayment time updated

#### Check MSME Reputation
**Switch to MSME Account #3**
1. View MSME Dashboard
2. Check reputation:
   - Total Loans: 1
   - Repaid Loans: 1
   - Reputation Score: 50
   - Default Rate: 0%

---

## 🧪 ADVANCED TESTING SCENARIOS

### Test 1: Bid Deposit Slashing

1. Lender commits bid (pays 5 ETH)
2. **Lender does NOT reveal**
3. Wait for reveal period to end
4. Anyone calls `slashUnrevealedDeposit(requestId, lenderAddress)`
5. MSME receives 5 ETH as compensation

**Test via Console:**
```javascript
const marketplace = await ethers.getContractAt("LoanMarketplace", "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9");
await marketplace.slashUnrevealedDeposit(1, "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc");
console.log("Deposit slashed!");
```

### Test 2: Oracle Collusion Detection

1. Use Oracle #1 and Oracle #2
2. Both attest to same 15 MSMEs
3. System calculates: 15/15 = 100% > 70%
4. Both flagged for collusion
5. Check on Oracle Dashboard: "⚠️ Flagged for Collusion"

### Test 3: Emergency Pause

**Switch to Deployer Account #0**

```javascript
const marketplace = await ethers.getContractAt("LoanMarketplace", "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9");
await marketplace.pause();
console.log("Marketplace paused!");

// Try to create loan → Should fail
// Try to commit bid → Should fail

await marketplace.unpause();
console.log("Marketplace unpaused!");
```

### Test 4: Oracle Time-lock

1. Oracle stakes 50,000 CIT
2. Oracle withdraws all tokens
3. Try to stake again immediately → **FAILS** with "Stake cooldown period not elapsed"
4. Fast-forward 24 hours:
```javascript
await ethers.provider.send("evm_increaseTime", [86400]); // 24 hours
await ethers.provider.send("evm_mine");
```
5. Try to stake again → **SUCCEEDS**

---

## 📊 Where to Find Addresses

### In Frontend (Browser Console - F12)

```javascript
// Current connected account
const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
console.log("My Address:", accounts[0]);

// Contract addresses
console.log("Marketplace:", "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9");
console.log("Oracle Staking:", "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512");
```

### In Hardhat Console

```bash
npx hardhat console --network localhost
```

```javascript
// Get all accounts
const [deployer, oracle1, oracle2, msme1, msme2, lender1, lender2, lender3] = await ethers.getSigners();

console.log("📍 All Addresses:");
console.log("Deployer:", deployer.address);
console.log("Oracle 1:", oracle1.address);
console.log("Oracle 2:", oracle2.address);
console.log("MSME 1:", msme1.address);
console.log("Lender 1:", lender1.address);

// Get balances
const bal = await ethers.provider.getBalance(lender1.address);
console.log("Lender 1 Balance:", ethers.formatEther(bal), "ETH");
```

---

## 🐛 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Insufficient bid deposit" | Send 5% of loan amount as ETH with commitBid() |
| "Stake cooldown not elapsed" | Wait 24 hours after withdrawal |
| "Schema not active" | Register schema first (governance only) |
| "Only governance can call" | Switch to Account #0 (deployer) |
| "Insufficient stake" | Stake minimum 50,000 CIT |
| Transaction reverts | Check if contracts paused |
| Rabby wrong network | Switch to Hardhat Local (Chain ID 31337) |
| No balance shown | Make sure Hardhat node is running |

---

## ✅ Testing Checklist

- [ ] Hardhat node running (`npx hardhat node`)
- [ ] Contracts deployed (`npx hardhat run scripts/deploy.js --network localhost`)
- [ ] Rabby connected to Hardhat network
- [ ] 3 test accounts imported (Oracle, MSME, Lender)
- [ ] Frontend running (`cd frontend && npm start`)
- [ ] Oracle staked CIT tokens
- [ ] Oracle submitted attestation
- [ ] MSME created identity
- [ ] MSME created loan request  
- [ ] Lender committed bid with deposit
- [ ] Lender revealed bid (deposit refunded)
- [ ] MSME selected winner
- [ ] Winner registered agreement
- [ ] Winner recorded disbursement
- [ ] Loan marked as repaid
- [ ] Reputation updated correctly

---

## 🎉 You're Ready to Test!

**Summary:**
1. ✅ Hardhat node running with deployed contracts
2. ✅ All contract addresses provided
3. ✅ 8 test accounts with addresses & private keys
4. ✅ Complete testing workflow documented
5. ✅ Advanced scenarios included
6. ✅ Troubleshooting guide available

**Start testing now!** Follow the phases in order for best results.

---

**⚠️ Important**: These are **TEST ACCOUNTS ONLY** - Never use these addresses or private keys on mainnet!
