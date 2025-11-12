# 🚀 QUICK TEST GUIDE - All Fixes Applied

## ✅ What Was Fixed

1. **Reject Button** - Now shows properly when oracles can commit/reject
2. **Wrong Notifications** - Fixed "can commit" showing after already committed  
3. **MSME Status** - Now shows detailed phase updates with oracle progress

---

## 🔧 Start Testing Now

### Step 1: Restart Frontend (REQUIRED)
```powershell
cd d:\blockchain\BWD_Project\frontend
npm start
```
**Then:** Hard refresh browser with `Ctrl + Shift + R`

---

### Step 2: Create Test Request (MSME Wallet)

1. Switch to MSME wallet in MetaMask
2. Go to **MSME Dashboard**
3. Click "Request New Attestation"
4. Fill in:
   - **Schema:** Bank Statements  
   - **Amount:** 300 CIT (Medium tier = 3 oracles required)
   - **Document Hash:** `test-bank-statements-v31`
   - **Document URL:** `https://example.com/bank.pdf`
   - **Validity Period:** 365 days
5. Click "Submit Request" → Pay 300 CIT
6. **Watch Status:** Should show "Pending" with "Oracles: 0/3"

---

### Step 3: Oracle 1 - Accept Request

1. Switch to Oracle 1 wallet (`0x7863...`)
2. Go to **Oracle Dashboard**
3. You should see the request in table
4. **Button should say:** "Review" (green)
5. Click "Review" → Modal opens with document details
6. **Button in modal:** "🖐️ Accept This Request"
7. Click Accept → Confirm transaction
8. **After tx confirms:**
   - Button changes to "Accepted" (orange)
   - MSME status: "Pending" with "Oracles: 1/3"

---

### Step 4: Oracle 2 & 3 - Accept Request

1. Switch to Oracle 2 wallet (`0xC309...`)
2. Click "Review" → Accept
3. Status: "Oracles: 2/3"
4. Switch to Oracle 3 wallet (`0x32c9...`)
5. Click "Review" → Accept
6. **After Oracle 3 accepts:**
   - All oracles see "Commit Now" (green) ✅
   - MSME status: "Oracles Assigned" with "🔒 Oracles Committing..."

---

### Step 5: Test Reject Button (Oracle 1)

1. Switch to Oracle 1
2. Click "Commit Now" button
3. **Modal should show TWO buttons:** ✅
   - "✅ Verify & Submit Attestation" (green)
   - "❌ Reject Request" (red) ← **THIS IS THE FIX!**
4. **Don't reject yet** - just verify button is visible
5. Click "Close" for now

---

### Step 6: All Oracles Commit (Approve)

1. **Oracle 1:** Click "Commit Now" → Click "Verify & Submit" → Confirm tx
   - Button changes to "Committed" (orange)
2. **Oracle 2:** Commit approval
3. **Oracle 3:** Commit approval
4. **After all 3 commit:**
   - MSME status: "Committing" → "Revealing"
   - Oracle buttons change to "Reveal Now" (purple)

---

### Step 7: All Oracles Reveal

1. **Oracle 1:** Click "Reveal Now" → Confirm tx
   - Button changes to "Done" (purple)
2. **Oracle 2:** Reveal
3. **Oracle 3:** Reveal
4. **After all 3 reveal:**
   - MSME status: "Consensus Reached" → "Completed" ✅
   - MSME sees: "✅ Consensus Reached! Finalizing..."

---

### Step 8: Verify MSME Status Updates

Go to MSME Dashboard and verify you saw these status changes:

| Phase | Status Label | Oracle Progress | Action Text |
|-------|-------------|-----------------|-------------|
| 1 | Pending | 0/3 | ⏳ Waiting for Oracles (0/3) |
| 2 | Pending | 1/3 | ⏳ Waiting for Oracles (1/3) |
| 3 | Pending | 2/3 | ⏳ Waiting for Oracles (2/3) |
| 4 | Oracles Assigned | 3/3 | 🔒 Oracles Committing... |
| 5 | Committing | 3/3 | ⏳ Oracles Committing Attestations... |
| 6 | Revealing | 3/3 | 🔓 Oracles Revealing Attestations... |
| 7 | Consensus Reached | 3/3 | ✅ Consensus Reached! Finalizing... |
| 8 | Completed | - | ✅ Verified |

---

## 🧪 Test Rejection Flow (Optional)

To test the reject button actually works:

1. Create **second** request (300 CIT, Tax Returns)
2. 3 oracles accept
3. **Oracle 1:** Click "Commit Now" → Click "❌ Reject Request"
4. Enter reason: "Tax documents incomplete"
5. Confirm transaction
6. **Oracle 2 & 3:** Approve normally
7. After all reveal:
   - Majority wins (2 approvals vs 1 rejection)
   - Oracle 1 gets slashed for minority vote
   - Oracles 2 & 3 get 90 CIT each

---

## 🔍 Debugging Tips

### If buttons not showing correctly:
```javascript
// Open browser console (F12) and check logs:
"📡 Fetching pending requests from contract..."
"📋 Found X pending attestation requests"
"📄 Request #N: { status: X, assignedOracles: Y, ... }"
```

### If status not updating:
- Hard refresh: `Ctrl + Shift + R`
- Check MetaMask is on Sepolia network
- Verify contract address in DevTools Network tab

### If reject button missing:
- Check modal shows: "assigned && full && !hasCommitted"
- Verify oracle wallet matches assigned oracle
- Check blockchain status is 1 (OraclesAssigned) or 2 (Committing)

---

## ✅ Success Criteria

All three issues fixed when you see:

1. ✅ **Reject button visible** in modal when 3/3 oracles assigned
2. ✅ **No "can commit" notification** after already committed
3. ✅ **Detailed MSME status** showing all 8 phases with oracle progress

---

## 📝 Files Changed

- `frontend/src/components/OracleDashboard.js` (enhanced status tracking)
- `frontend/src/components/MSMEDashboard.js` (V3.1 status enum)
- `frontend/src/utils/contracts.js` (new contract address)

**Contract:** 0xFD0B899Dc9f6d3184c0276c061a1fd866f20B779 (V3.1 with Reputation)

---

## 🎯 What's New in This Version

### Oracle Dashboard:
- ✅ 7 different button states (Review → Accepted → Commit → Committed → Reveal → Done)
- ✅ Reject button always shows when appropriate
- ✅ Smart notifications based on actual commitment status
- ✅ No duplicate actions possible

### MSME Dashboard:
- ✅ 10 different status labels (Pending → Completed)
- ✅ Real-time oracle progress (X/Y oracles)
- ✅ Phase-specific action messages
- ✅ Visual status badges (warning/info/success/error)

### Under the Hood:
- ✅ Fetches `hasCommitted` and `hasRevealed` from blockchain
- ✅ Proper status enum matching V3.1 contract
- ✅ Enhanced logging for debugging
- ✅ Reputation requirements enforced (50+ for Medium tier)

---

Ready to test! 🚀
