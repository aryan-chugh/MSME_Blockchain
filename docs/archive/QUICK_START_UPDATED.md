# 🚀 QUICK START - UPDATED SYSTEM

**Date:** November 9, 2025  
**Status:** ✅ All contracts updated to latest versions (V3.1)

---

## ⚡ START IN 3 MINUTES

### Terminal 1: Start Blockchain
```powershell
cd d:\blockchain\BWD_Project
npx hardhat node
```
**Keep this running!** You'll see 20 test accounts with 10,000 ETH each.

---

### Terminal 2: Deploy Contracts
```powershell
cd d:\blockchain\BWD_Project
npx hardhat run scripts/deploy-localhost.js --network localhost
```

**Copy these addresses from the output:**
```
CIT Token:                 0x5FbDB...
Oracle Staking:            0x2279B...
Attestation Registry:      0x8A791...
Loan Marketplace:          0x61017...
Loan Agreement Registry:   0xB7f8B...
Platform Governance:       0xA51c1...
MSME Identity (Example):   0x0DCd1...
```

---

### Terminal 3: Update Frontend Config

Open `frontend\src\utils\contracts.js` and paste the addresses:

```javascript
export const CONTRACT_ADDRESSES = {
  CIToken: '0x5FbDB...',                    // ← Paste here
  OracleStaking: '0x2279B...',              // ← Paste here
  AttestationRegistry: '0x8A791...',        // ← Paste here
  LoanMarketplace: '0x61017...',            // ← Paste here
  LoanAgreementRegistry: '0xB7f8B...',      // ← Paste here
  PlatformGovernance: '0xA51c1...',         // ← Paste here
  MSMEIdentity: '0x0DCd1...'                // ← Paste here
};
```

**Save the file!**

---

### Terminal 4: Start Frontend
```powershell
cd d:\blockchain\BWD_Project\frontend
npm start
```

Browser opens at `http://localhost:3000` 🎉

---

## 🦊 METAMASK SETUP (2 minutes)

### 1. Add Localhost Network

- Click MetaMask
- Networks dropdown → "Add Network"
- Enter:
  - **Network Name:** Localhost 8545
  - **RPC URL:** http://127.0.0.1:8545
  - **Chain ID:** 31337
  - **Currency:** ETH
- Click "Save"

### 2. Import Test Accounts

Copy these private keys from Terminal 1 output:

**Account #0 (Deployer/Admin):**
```
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

**Account #1 (Oracle 1):**
```
0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

**Account #2 (Oracle 2):**
```
0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
```

**Account #7 (Lender):**
```
0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e
```

**To Import:**
1. MetaMask → Click account icon
2. "Import Account"
3. Paste private key
4. Repeat for each account

---

## 🎮 TEST THE SYSTEM (10 minutes)

### Phase 1: Register as Oracle

**Switch to Oracle 1 account in MetaMask**

1. Go to `http://localhost:3000`
2. Click "Oracle Dashboard"
3. You should see **500,000 CIT tokens** (pre-minted)
4. Enter stake amount: `100000` (100k CIT)
5. Click "Approve CIT" → Confirm in MetaMask
6. Click "Stake & Register" → Confirm in MetaMask
7. ✅ You're now a registered oracle!

---

### Phase 2: Create MSME Identity & Request Attestation

**Switch to Account #0 (MSME) in MetaMask**

1. Click "MSME Dashboard"
2. Click "Create Identity" → Confirm in MetaMask
3. ✅ Identity created! Note the address
4. Click "Request Attestation" tab
5. Fill form:
   - **Schema:** GST Revenue
   - **Document Hash:** `QmX7Y8Z9...` (fake IPFS hash)
   - **Document URL:** `https://ipfs.io/ipfs/QmX7Y8Z9...`
   - **Fee:** `300` CIT
6. Click "Approve CIT" → Confirm
7. Click "Submit Request" → Confirm
8. ✅ Request created! Note the Request ID

---

### Phase 3: Oracle Accepts & Verifies (NEW V3.1 Feature!)

**Switch to Oracle 1 account in MetaMask**

1. Go to "Oracle Dashboard"
2. Click "Pending Requests" tab
3. You should see the MSME's request
4. Click **"Accept Request"** → Confirm in MetaMask
   - 🆕 This is the NEW V3.1 self-assignment feature!
5. Wait for 2 more oracles to accept (or switch accounts and accept as Oracle 2 & 3)
6. Once 3 oracles accepted, commit phase starts
7. Click "Commit Attestation"
8. Enter verification result (approve/reject)
9. Click "Submit Commitment" → Confirm
10. Wait for reveal phase
11. Click "Reveal Attestation" → Confirm
12. ✅ After all oracles reveal, consensus is calculated!

---

### Phase 4: Create Loan Request

**Switch to MSME account**

1. "MSME Dashboard" → "Loans" tab
2. Click "Create Loan Request"
3. Fill form:
   - **Amount:** `1000` CIT
   - **Tenure:** `12` months
   - **Purpose:** "Buy equipment"
   - **Commit Period:** `120` seconds (2 min)
   - **Reveal Period:** `120` seconds (2 min)
4. Click "Create Request" → Confirm
5. ✅ Loan request created!

---

### Phase 5: Lender Places Sealed Bid

**Switch to Lender account in MetaMask**

1. Go to "Marketplace"
2. Find the loan request (should show "Open" status)
3. Click "Place Bid"
4. Fill form:
   - **Interest Rate:** `12.5` %
   - **Nonce:** `mySecret123` (remember this!)
5. Send deposit: `50` CIT worth of ETH
6. Click "Commit Bid" → Confirm
7. ✅ Sealed bid committed!

**⏰ Wait 2 minutes for commit period to end**

---

### Phase 6: Lender Reveals Bid

**Still as Lender**

1. Go to "Lender Dashboard"
2. Click "My Bids" tab
3. Find your bid (should show "🔓 Reveal Phase Active")
4. Click "🔓 Reveal My Bid" → Confirm
5. ✅ Bid revealed!

---

### Phase 7: MSME Selects Winner

**Switch to MSME account**

1. "MSME Dashboard" → "Loans" tab
2. Click "View Details" on your loan
3. Click "🔄 Refresh Bids"
4. See all revealed bids (sorted by rate)
5. Click "✅ Select" on best bid → Confirm
6. ✅ Winner selected!

---

### Phase 8: Lender Creates Agreement

**Switch to Lender account**

1. "Lender Dashboard"
2. See green banner: "🏆 Congratulations! You won a bid"
3. Click "📝 Create Agreement" → Confirm
4. ✅ Loan agreement created!

---

### Phase 9: View Agreements

**Both parties can view:**
- MSME: "Agreements" tab → See as borrower
- Lender: "My Loan Agreements" → See as lender

---

## 🔍 VERIFY DEPLOYMENT

Run this anytime to check system health:

```powershell
npx hardhat run scripts/verify-deployment.js --network localhost
```

Should show:
```
✅ ALL CONTRACTS VERIFIED
✅ OracleStaking: V3 (Multi-oracle consensus) ✓
✅ AttestationRegistry: V3.1 (Self-assignment) ✓
```

---

## 🧪 RUN TESTS

```powershell
# All tests
npx hardhat test

# Specific contract
npx hardhat test --grep "OracleStaking"
npx hardhat test --grep "LoanMarketplace"

# With gas report
REPORT_GAS=true npx hardhat test

# Coverage
npx hardhat coverage
```

---

## 🆘 TROUBLESHOOTING

### "Nonce too high" error
```powershell
# Reset MetaMask:
# Settings → Advanced → Clear Activity Tab Data
```

### "Contract not found"
```powershell
npx hardhat clean
npx hardhat compile
```

### "Wrong network"
```
Check MetaMask:
- Network: Localhost 8545
- Chain ID: 31337
```

### Frontend shows wrong data
```
1. Stop frontend (Ctrl+C)
2. Clear browser cache
3. Restart: npm start
```

### Contract addresses wrong
```
1. Check Terminal 2 output (deployment addresses)
2. Update frontend/src/utils/contracts.js
3. Restart frontend
```

---

## 📚 DOCUMENTATION

- **Complete Guide:** `SYSTEM_VERIFICATION_REPORT.md`
- **Fixes Applied:** `FIXES_APPLIED.md`
- **Project Structure:** `PROJECT_STRUCTURE.md`
- **Beginner's Guide:** (The in-depth explanation I provided earlier)

---

## ✅ SUCCESS CHECKLIST

- [ ] Hardhat node running (Terminal 1)
- [ ] Contracts deployed (Terminal 2)
- [ ] Frontend config updated
- [ ] Frontend running (Terminal 4)
- [ ] MetaMask on Localhost network
- [ ] Test accounts imported
- [ ] Can create MSME identity
- [ ] Can register as oracle
- [ ] Oracle can accept requests (V3.1!)
- [ ] Can create loan request
- [ ] Can place and reveal bid
- [ ] Can select winner
- [ ] Can create agreement

---

## 🎉 THAT'S IT!

Your system is now running with:
- ✅ Latest V3.1 contracts
- ✅ Multi-oracle consensus
- ✅ Self-assignment oracles
- ✅ Sealed-bid auctions
- ✅ Complete DeFi lending platform

**Enjoy testing!** 🚀
