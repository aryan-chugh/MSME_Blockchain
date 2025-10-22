# 🚀 QUICK START - Copy & Paste This!

## ✅ Everything is READY!

### 1️⃣ Hardhat Node: ✅ RUNNING
- URL: http://localhost:8545
- Chain ID: 31337

### 2️⃣ Contracts: ✅ DEPLOYED
```
CIT Token:              0x5FbDB2315678afecb367f032d93F642f64180aa3
Oracle Staking:         0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
Attestation Registry:   0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
Loan Marketplace:       0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
Agreement Registry:     0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
Governance:             0x5FC8d32690cc91D4c39d9d3abcBD16989F875707
```

### 3️⃣ Frontend: ✅ STARTING
- URL: http://localhost:3000 (will open automatically)

---

## 🦊 Rabby Wallet Setup (DO THIS FIRST!)

### Add Hardhat Network
```
Network Name:    Hardhat Local
RPC URL:         http://localhost:8545
Chain ID:        31337
Currency:        ETH
```

### Import These 3 Accounts

**1. Oracle Account:**
```
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
Address:     0x70997970C51812dc3A010C7d01b50e0d17dc79C8
```

**2. MSME Account:**
```
Private Key: 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6
Address:     0x90F79bf6EB2c4f870365E785982E1f101E93b906
```

**3. Lender Account:**
```
Private Key: 0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba
Address:     0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc
```

---

## 📝 First Test - Complete Loan Flow

### ⏱️ BEFORE YOU START: Get CIT Tokens for Oracle

**Run this command:**
```bash
npx hardhat console --network localhost
```

**Then paste this:**
```javascript
const [deployer, oracle1] = await ethers.getSigners();
const citToken = await ethers.getContractAt("CIToken", "0x5FbDB2315678afecb367f032d93F642f64180aa3");
await citToken.transfer(oracle1.address, ethers.parseEther("100000"));
console.log("✅ Transferred 100,000 CIT to Oracle");
```

---

### Step 1: Oracle Stakes (5 min)

**Switch to Oracle Account in Rabby**

1. Open http://localhost:3000
2. Go to **Oracle Dashboard**
3. Approve: 50,000 CIT
4. Stake: 50,000 CIT
5. ✅ Status should show "Active"

---

### Step 2: Oracle Submits Attestation (2 min)

**Still as Oracle**

1. MSME Address: `0x90F79bf6EB2c4f870365E785982E1f101E93b906`
2. Schema: GST Revenue Verification
3. Data: `0x000000000000000000000000000000000000000000000000000000000000003200000000000000000000000000000000000000000000000000000000000f4240`
4. Validity: 31536000
5. Click "Submit Attestation"
6. ✅ Should see success message

---

### Step 3: MSME Creates Identity (2 min)

**Switch to MSME Account in Rabby**

1. Go to **MSME Dashboard**
2. Click "Create Identity"
3. Copy the Identity Address (save it!)
4. Approve Attestation Registry: `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0`
5. ✅ Should see 1 attestation

---

### Step 4: MSME Creates Loan Request (2 min)

**Still as MSME**

1. Fill form:
   - Amount: **100** ETH
   - Tenure: **12** months
   - Purpose: Working Capital
   - Commit Period: **7200** seconds (2 hours)
   - Reveal Period: **3600** seconds (1 hour)
2. Click "Create Loan Request"
3. ✅ Note Request ID (should be 1)

---

### Step 5: Lender Bids (3 min)

**Switch to Lender Account in Rabby**

1. Go to **Marketplace**
2. Find Request #1
3. Enter Rate: **1000** (10%)
4. **IMPORTANT**: Make sure you're sending 5 ETH as deposit!
5. Click "Commit Bid"
6. ✅ 5 ETH should be deducted

---

### Step 6: Fast-Forward Time (1 min)

**In a new terminal:**
```bash
npx hardhat console --network localhost
```
```javascript
await ethers.provider.send("evm_increaseTime", [7201]); // 2 hours
await ethers.provider.send("evm_mine");
console.log("✅ Time advanced 2 hours");
```

---

### Step 7: Lender Reveals (2 min)

**Still as Lender**

1. Go to Marketplace
2. Find your bid on Request #1
3. Click "Reveal Bid"
4. ✅ Your 5 ETH deposit is REFUNDED!

---

### Step 8: Fast-Forward Again (1 min)

```javascript
await ethers.provider.send("evm_increaseTime", [3601]); // 1 hour
await ethers.provider.send("evm_mine");
console.log("✅ Time advanced 1 hour");
```

---

### Step 9: MSME Selects Winner (1 min)

**Switch to MSME Account**

1. Go to MSME Dashboard
2. Find Request #1
3. Click "Select Winner"
4. ✅ Should select lowest rate (10%)

---

### Step 10: Register Agreement (2 min)

**Switch to Lender Account**

1. Go to Lender Dashboard
2. Find Matched Loan #1
3. Agreement Hash: `0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`
4. Click "Register Agreement"
5. ✅ Note Record ID (should be 1)

---

### Step 11: Record Disbursement (1 min)

**Still as Lender**

1. Find Record #1
2. Expected Repayment: `1761360000` (or current time + 31536000)
3. Click "Record Disbursement"
4. ✅ Disbursement recorded

---

### Step 12: Mark as Repaid (1 min)

**Still as Lender**

1. Find Record #1
2. Click "Mark as Repaid"
3. ✅ Status: Repaid

---

### Step 13: Check Reputation (1 min)

**Switch to MSME Account**

1. Go to MSME Dashboard
2. Check reputation:
   - ✅ Total Loans: 1
   - ✅ Repaid Loans: 1
   - ✅ Reputation Score: 50

---

## 🎉 COMPLETE! You just tested the entire platform!

**Total Time: ~25 minutes**

---

## 🔍 Quick Commands Reference

### Transfer CIT to Oracle:
```javascript
const [deployer, oracle1] = await ethers.getSigners();
const citToken = await ethers.getContractAt("CIToken", "0x5FbDB2315678afecb367f032d93F642f64180aa3");
await citToken.transfer(oracle1.address, ethers.parseEther("100000"));
```

### Fast-Forward Time:
```javascript
await ethers.provider.send("evm_increaseTime", [7200]); // 2 hours
await ethers.provider.send("evm_mine");
```

### Check Balance:
```javascript
const [deployer, oracle1] = await ethers.getSigners();
const bal = await ethers.provider.getBalance(oracle1.address);
console.log("Balance:", ethers.formatEther(bal), "ETH");
```

### Pause Marketplace (as Governance):
```javascript
const marketplace = await ethers.getContractAt("LoanMarketplace", "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9");
await marketplace.pause();
```

---

## ⚠️ If Something Breaks

1. **Restart Hardhat Node**: Close the node terminal, run `npx hardhat node` again
2. **Redeploy**: `npx hardhat run scripts/deploy.js --network localhost`
3. **Clear Rabby**: Settings → Advanced → Clear activity data
4. **Refresh Frontend**: Ctrl+F5 or Cmd+Shift+R

---

## 📚 Need More Details?

See **FRONTEND_TESTING_GUIDE.md** for:
- All 8 test accounts
- Advanced testing scenarios
- Troubleshooting guide
- Edge cases

---

**Happy Testing! 🚀**
