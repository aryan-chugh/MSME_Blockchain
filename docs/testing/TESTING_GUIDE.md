# 🧪 Quick Testing Guide - Attestation System

## 🚀 Start Testing

### **Prerequisites**:
- ✅ MetaMask installed
- ✅ Connected to Sepolia testnet
- ✅ Have Sepolia ETH (for gas)
- ✅ Have CIT tokens (for fees/staking)

---

## 📋 Test Sequence

### **1. Become an Oracle** (First User)

**Steps**:
1. Navigate to: **Oracle Dashboard**
2. Click **"Become an Oracle"**
3. Enter stake amount: `50000` CIT (minimum for Tier 1)
4. Approve CIT token spending
5. Confirm stake transaction
6. Wait for confirmation

**Expected Result**:
- ✅ Oracle status card appears
- ✅ Shows your tier (based on stake)
- ✅ Shows reputation and attestations

**Console Check**:
```
✅ Oracle is already staked! Tier: 1
```

---

### **2. Create MSME Identity** (Second User)

**Steps**:
1. Switch to different MetaMask account (or use separate browser)
2. Navigate to: **MSME Dashboard**
3. Click **"Create Identity Contract"**
4. Fill in business details:
   - Business Name: "ABC Enterprises"
   - Industry: "Manufacturing"
   - GST Number: "27XXXXX1234Z5"
   - etc.
5. Confirm transaction

**Expected Result**:
- ✅ Identity created message
- ✅ Shows your business profile

---

### **3. Request Attestation** (MSME User)

**Steps**:
1. Still on MSME Dashboard
2. Click **"Request New Attestation"**
3. Fill form:
   - Schema: "Bank Statements"
   - Document Hash: `0x1234...abcd` (32 bytes)
   - Document URL: `https://ipfs.io/ipfs/...`
   - Additional Data: "6 months statements, ₹2L revenue"
4. Confirm fee payment (120 CIT for Bank Statements)
5. Step 1/3: Approve CIT tokens → Confirm in MetaMask
6. Step 2/3: Create request → Confirm in MetaMask

**Expected Result**:
- ✅ Success message with Request ID
- ✅ Request appears in "My Attestation Requests"
- ✅ Status: "Pending"
- ✅ Fee: 120 CIT

**Console Check**:
```
⏳ Waiting for attestation request transaction...
✅ Attestation request created on blockchain! Request ID: 1
```

---

### **4. Oracle Sees Request** (Oracle User)

**Steps**:
1. Switch back to Oracle account
2. Go to **Oracle Dashboard**
3. Scroll to "Pending Attestation Requests"

**Expected Result**:
- ✅ Request from MSME appears
- ✅ Shows: Schema, Document Hash, MSME Address, Fee
- ✅ "View Details" button available

**Console Check**:
```
📋 Loading 1 pending attestation requests from blockchain...
✅ Loaded pending requests from blockchain: [...]
```

---

### **5. Oracle Verifies & Attests** (Oracle User)

**Steps**:
1. Click **"View Details"** on the request
2. Review document details
3. Click **"Verify & Attest"**
4. Step 1: Assign request → Confirm in MetaMask
5. Step 2: Submit attestation → Confirm in MetaMask

**Expected Result**:
- ✅ Success message
- ✅ Shows fee earned (120 CIT)
- ✅ Shows total earned
- ✅ Request disappears from pending list

**Console Check**:
```
Assigning request 1 to oracle 0x...
✅ Request assigned to oracle
✅ Attestation submitted! Transaction: 0x...
💰 Oracle fee of 120 CIT automatically transferred by contract
```

---

### **6. MSME Sees Completed Attestation** (MSME User)

**Steps**:
1. Switch back to MSME account
2. Go to **MSME Dashboard**
3. Check "My Attestation Requests" section

**Expected Result**:
- ✅ Request status: "Completed"
- ✅ Shows oracle address
- ✅ Shows completion time

**Also Check**:
- Scroll to "My Attestations" section
- ✅ Should show the attestation
- ✅ Schema: "Bank Statements"
- ✅ Issuer: Oracle address
- ✅ Valid until: 1 year from now

---

## 🔄 Alternative Flow: Rejection

### **Oracle Rejects Request**

**Steps** (from step 5):
1. Click **"View Details"**
2. Click **"Reject"** instead of "Verify & Attest"
3. Enter reason: "Insufficient documentation"
4. Confirm transaction

**Expected Result**:
- ✅ Request marked as "Rejected"
- ✅ MSME gets CIT refund
- ✅ Rejection reason stored on blockchain

---

## 🐛 Troubleshooting

### **Error: "Insufficient CIT balance"**
**Solution**: 
```bash
# Mint CIT tokens to your wallet
cd D:\blockchain\BWD_Project
npx hardhat run scripts/mint-to-wallet.js --network sepolia
```

### **Error: "Schema not active"**
**Check**: Schema name must match exactly:
- ✅ "Credit Score" (correct)
- ❌ "credit score" (wrong - case sensitive)

### **Error: "Caller is not a valid staked oracle"**
**Solution**: 
- Must stake at least 50,000 CIT first
- Check stake: Oracle Dashboard → Oracle Info card

### **Requests not loading**
**Check Console**:
```javascript
// Should see:
📋 Loading X pending attestation requests from blockchain...
✅ Loaded pending requests from blockchain: [...]

// If error:
❌ Error loading attestation requests: ...
```

### **Clear All localStorage** (Fresh Start):
```javascript
// In browser console:
localStorage.clear();
location.reload();
```

---

## 📊 Verification Checklist

After testing, verify:

**On-Chain Data**:
- [ ] Request created on blockchain
- [ ] Fee transferred from MSME
- [ ] Request assigned to oracle
- [ ] Attestation submitted
- [ ] Fee transferred to oracle
- [ ] Request marked completed

**Off-Chain (UI)**:
- [ ] MSME sees their requests
- [ ] Oracle sees pending requests
- [ ] Status updates correctly
- [ ] Earnings calculated from blockchain
- [ ] No localStorage for attestations

**Cross-Browser**:
- [ ] Open in different browser
- [ ] Same requests visible
- [ ] Same status shown
- [ ] No localStorage dependency

---

## 🎯 Success Criteria

✅ **MSME can**:
- Create attestation request on blockchain
- Pay fee in CIT tokens
- View request status
- See completed attestations

✅ **Oracle can**:
- See all pending requests
- Assign request to themselves
- Submit attestation and receive fee
- Reject request with refund to MSME

✅ **Data persists**:
- After page refresh
- Across different browsers
- For all users to see

✅ **No localStorage**:
- Attestation requests stored on blockchain
- Earnings calculated from blockchain
- Only bid nonces remain in localStorage

---

## 📸 Expected Screenshots

**MSME Dashboard**:
```
┌────────────────────────────────────┐
│ My Attestation Requests            │
├────────────────────────────────────┤
│ Request #1 - Bank Statements       │
│ Status: Completed ✅               │
│ Fee: 120 CIT                       │
│ Oracle: 0x7863...615AB             │
│ Completed: Oct 25, 2025            │
└────────────────────────────────────┘
```

**Oracle Dashboard**:
```
┌────────────────────────────────────┐
│ Oracle Statistics                  │
├────────────────────────────────────┤
│ Staked: 50,000 CIT                │
│ Tier: 🥉 Tier 1                   │
│ Reputation: 100                    │
│ Attestations: 1                    │
│ Total Earned: 120 CIT              │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│ Pending Attestation Requests       │
├────────────────────────────────────┤
│ No pending requests                │
│ (All completed!)                   │
└────────────────────────────────────┘
```

---

## 🚀 Ready to Test!

1. **Start frontend**: `cd frontend && npm start`
2. **Connect wallet**: MetaMask to Sepolia
3. **Follow sequence**: Steps 1-6 above
4. **Verify results**: Check all success criteria

Good luck! 🎉
