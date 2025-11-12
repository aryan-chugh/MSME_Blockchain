# 🚀 V3.1 QUICK START TESTING GUIDE

**Contract:** AttestationRegistryV3_1  
**Address:** `0x402fBd2632e7165378f0C98d1010895eeEA880e7`  
**Network:** Sepolia Testnet

---

## 🎯 WHAT'S NEW IN V3.1?

**Before (V3):** Oracles auto-assigned by complex algorithm  
**Now (V3.1):** Oracles click "Accept" to join requests (first-come-first-served!)

---

## ⚡ QUICK TEST (5 MINUTES)

### **Step 1: Create Request (MSME)**
1. Go to **MSME Dashboard**
2. Fill in:
   - Schema: `Bank Statements`
   - Document Hash: `abc123`
   - Document URL: `https://example.com/doc.pdf`
   - Fee: `300 CIT` ← This requires 3 oracles
   - Validity: `180 days`
3. Click **"Request Attestation"**
4. Confirm in wallet
5. ✅ Request created!

### **Step 2: Accept as Oracle 1**
1. Switch to **Oracle 1** wallet (0x786365...)
2. Go to **Oracle Dashboard**
3. See pending request:
   ```
   Bank Statements | 0x4C7... | 300 CIT | 0/3 | [🖐️ Accept]
   ```
4. Click **"🖐️ Accept"**
5. Confirm transaction
6. Status updates to `1/3 oracles ⏳`

### **Step 3: Accept as Oracle 2**
1. Switch to **Oracle 2** wallet (0xc30999...)
2. Refresh page
3. See same request:
   ```
   Bank Statements | 0x4C7... | 300 CIT | 1/3 | [🖐️ Accept]
   ```
4. Click **"🖐️ Accept"**
5. Status updates to `2/3 oracles ⏳`

### **Step 4: Accept as Oracle 3**
1. Switch to **Oracle 3** wallet (0x32c966...)
2. Refresh page
3. See request:
   ```
   Bank Statements | 0x4C7... | 300 CIT | 2/3 | [🖐️ Accept]
   ```
4. Click **"🖐️ Accept"**
5. 🎉 Status updates to `3/3 oracles ✓ 🎉`
6. Request is now **"OraclesAssigned"**

### **Step 5: Commit Attestations (All 3 Oracles)**
For **each oracle** (1, 2, 3):
1. Click **"✓ Accepted"** button
2. Click **"✅ Verify & Submit Attestation"**
3. Wait for commitment transaction
4. Wait for reveal transaction
5. Done!

### **Step 6: Check Results**
After all 3 oracles reveal:
- ✅ Consensus calculated (100% agreement)
- ✅ Each oracle receives `90 CIT` (300 CIT * 90% / 3)
- ✅ Platform receives `30 CIT` (10% fee)
- ✅ MSME receives attestation

---

## 🧪 TEST SCENARIOS

### **Scenario 1: Single Oracle (Simple)**
```
Fee: 100 CIT → 1 oracle required
Oracle 1 accepts → 1/1 full instantly
Oracle 1 commits + reveals → Done!
```

### **Scenario 2: Multi-Oracle Agreement (Medium)**
```
Fee: 300 CIT → 3 oracles required
Oracle 1, 2, 3 accept → 3/3 full
All approve → 100% consensus → All paid
```

### **Scenario 3: Multi-Oracle Disagreement**
```
Fee: 300 CIT → 3 oracles required
Oracle 1, 2 approve | Oracle 3 rejects
66% consensus reached ✅
Oracle 1, 2 paid | Oracle 3 reputation penalty
```

### **Scenario 4: No Consensus**
```
Fee: 500 CIT → 5 oracles required
Oracle 1, 2 approve | Oracle 3, 4, 5 reject
40% vs 60% → No consensus ❌
All oracles get 20% base pay
MSME refunded 60%
```

### **Scenario 5: Oracle Competition**
```
Fee: 300 CIT → 3 oracles needed
5 oracles try to accept
First 3 get in → Others get error: "All oracles assigned"
```

### **Scenario 6: Assignment Timeout**
```
Fee: 300 CIT → 3 oracles needed
Only 2 oracles accept within 24 hours
Request expires (can't be completed)
MSMEcan cancel and get refund
```

---

## 📋 ORACLE WALLET ADDRESSES

For multi-wallet testing:

| Wallet | Address | Stake | Tier |
|--------|---------|-------|------|
| Oracle 1 | `0x786365403cf38f71f1478c7d9d6e6ed4243615ab` | 510K CIT | Tier 3 |
| Oracle 2 | `0xc3099f9dd37f4afcc55eeb2f6372f6ccd4e38141` | 510K CIT | Tier 3 |
| Oracle 3 | `0x32c96610e639acce19da60525203894882996fe8` | 510K CIT | Tier 3 |

---

## 🎨 UI INDICATORS

### **Pending Requests Table:**

```
┌──────────────────────────────────────────────────┐
│ Oracles Column Shows:                            │
├──────────────────────────────────────────────────┤
│ 0/3      ← Gray: No oracles yet                  │
│ 1/3      ← Gray: Partially assigned              │
│ 2/3 ✓    ← Orange: You're assigned, waiting     │
│ 3/3 ✓ 🎉 ← Green: All assigned, you're in       │
│ 3/3 🎉   ← Green: All assigned, you're NOT in   │
└──────────────────────────────────────────────────┘
```

### **Action Buttons:**

```
🖐️ Accept     ← Green: Click to join request
✓ Accepted    ← Orange: You've already accepted
Full          ← Gray (disabled): Request is full
```

### **Request Details Modal:**

```
┌──────────────────────────────────────────────────┐
│ 📊 Oracle Assignment Status:                     │
├──────────────────────────────────────────────────┤
│ ✅ You have accepted (3/3 oracles assigned)      │  ← You're in, all ready
│ ⏳ Waiting for oracles (1/3 assigned)            │  ← Need more
│ ⚠️ All oracles assigned (you are not assigned)   │  ← You missed it
└──────────────────────────────────────────────────┘
```

---

## 💡 TIPS & TRICKS

### **Multi-Wallet Testing:**
1. Use **Chrome profiles** or different browsers
2. Or use **Rabby Wallet multi-account** feature
3. Keep each oracle in a separate browser window

### **Fee Amount Guide:**
```
< 200 CIT   → 1 oracle  (Simple)
200-499 CIT → 3 oracles (Medium)
500-999 CIT → 5 oracles (Complex)
1000+ CIT   → 7 oracles (Critical)
```

### **Force Single Oracle:**
Even with high fee, check **"Force Single Oracle"** to override multi-oracle requirement.

### **Assignment Deadline:**
You have **24 hours** from request creation to accept. After that, request expires if not full.

---

## ❗ TROUBLESHOOTING

### **"Already assigned" Error:**
✅ You already accepted this request. Check your assigned requests list.

### **"All oracles assigned" Error:**
✅ Request is full. Try another request or create a new one.

### **"Assignment period expired" Error:**
✅ 24 hours passed. Request expired. MSME needs to create new request.

### **"Oracle not eligible" Error:**
✅ Check your stake with:
```powershell
$env:CHECK_ADDRESS='0xYOUR_ADDRESS'
npx hardhat run scripts/check-stake.js --network sepolia
```

### **"Insufficient stake" Error:**
✅ Need minimum 50,000 CIT staked. Stake more tokens.

### **Request Not Showing:**
✅ Hard refresh: `Ctrl + Shift + R`  
✅ Check correct wallet connected  
✅ Wait 10 seconds for polling update

---

## 🔍 CHECKING STATUS

### **On-Chain (Etherscan):**
1. Go to: https://sepolia.etherscan.io/address/0x402fBd2632e7165378f0C98d1010895eeEA880e7
2. Click **"Contract"** → **"Read Contract"**
3. Call `getRequestDetails(requestId)`
4. Check:
   - `assignedOracles` array length
   - `requiredOracles` count
   - `status` (0=Pending, 1=OraclesAssigned)

### **In Frontend (Console):**
```javascript
// Open browser DevTools (F12)
// Paste this in console:
const req = await attestationContract.getRequestDetails(1);
console.log('Assigned:', req.assignedOracles.length);
console.log('Required:', req.requiredOracles.toString());
console.log('Status:', req.status);
```

---

## 📊 EXPECTED TIMINGS

| Action | Duration | Notes |
|--------|----------|-------|
| Create Request | 30-60 sec | 1 transaction |
| Accept Request | 15-30 sec | 1 transaction per oracle |
| Commit Attestation | 30-60 sec | 1 transaction |
| Reveal Attestation | 30-60 sec | 1 transaction |
| **Total (3 oracles)** | **5-10 min** | All steps combined |

---

## 🎯 SUCCESS CHECKLIST

After completing a full test:

- [ ] MSME created request with 300 CIT fee
- [ ] 3 oracles accepted request (first-come-first-served)
- [ ] Oracle count showed 0/3 → 1/3 → 2/3 → 3/3 ✓ 🎉
- [ ] All 3 oracles committed attestations
- [ ] All 3 oracles revealed attestations
- [ ] Consensus calculated (66%+ agreement)
- [ ] Majority oracles received 90 CIT each
- [ ] Platform received 30 CIT (10% fee)
- [ ] MSME received attestation with validity period
- [ ] Frontend updated with completed request

---

## 🚀 READY TO TEST!

**Start here:** http://localhost:3000

1. Connect MSME wallet → Create request with 300 CIT
2. Switch to Oracle 1 → Accept request
3. Switch to Oracle 2 → Accept request
4. Switch to Oracle 3 → Accept request
5. All oracles commit → All oracles reveal → Done! 🎉

---

**Questions?** Check the detailed docs:
- `V3_1_DEPLOYMENT_COMPLETE.md` - Full deployment info
- `V3_COMPLETE_WORKFLOW.md` - Commit-reveal workflow
- `ORACLE_ASSIGNMENT_OPTIONS.md` - V3 vs V3.1 comparison
