# Oracle Dashboard & MSME Status Fix Summary
**Date:** January 26, 2025
**Contract:** AttestationRegistryV3_1 (0xFD0B899Dc9f6d3184c0276c061a1fd866f20B779)

## Issues Fixed

### Issue #1: Missing Reject Button ✅ FIXED
**Problem:** Reject button was not showing up anywhere in the Oracle interface.

**Root Cause:** The conditional logic was only checking `isCurrentOracleAssigned && isFull`, but wasn't checking if the oracle had already committed. This meant the button appeared for a split second and then disappeared.

**Solution:**
- Added `hasCommitted` and `hasRevealed` status tracking for each oracle
- Fetch oracle commitment status from contract using `getOracleCommitment()`
- Show reject button ONLY when:  
  * Oracle is assigned (`isCurrentOracleAssigned`)
  * All oracles assigned (`isFull`)
  * Status is OraclesAssigned(1) or Committing(2)
  * Oracle hasn't committed yet (`!hasCommitted`)

**Files Changed:**
- `frontend/src/components/OracleDashboard.js` (lines 186-222, 1232-1340)

---

### Issue #2: Wrong Notification After 3 Oracles Accept ✅ FIXED
**Problem:** After 3 oracles accepted a request, notification said "You can commit your attestation now" even though the oracle already committed.

**Root Cause:** The `canCommit` flag was calculated incorrectly - it only checked blockchain status but didn't verify if the oracle had already submitted their commitment.

**Solution:**
- Enhanced `canCommit` logic to check: `isCurrentOracleAssigned && isFull && (status === 1 || 2) && !hasCommitted`
- Added `canReveal` flag: `hasCommitted && !hasRevealed && status === 3`
- Created proper status cascade in modal buttons:
  1. **Accept** → if not assigned and not full
  2. **Commit/Reject** → if can commit (assigned, full, not committed)
  3. **Reveal** → if committed and reveal phase started
  4. **Waiting for reveal** → if committed but reveal phase hasn't started
  5. **Completed** → if already revealed
  6. **Waiting for oracles** → if assigned but not full yet

**Files Changed:**
- `frontend/src/components/OracleDashboard.js` (lines 186-222, 1232-1340)

---

### Issue #3: Poor MSME Status Updates ✅ FIXED
**Problem:** MSME dashboard showed vague statuses like "Pending" or "InProgress" with no visibility into what's actually happening with their request.

**Root Cause:** Frontend was using old V2 status enum `['Pending', 'InProgress', 'Completed', 'Rejected', 'Cancelled']` but V3.1 contract has 10 different statuses with detailed phases.

**Solution:**
- Updated status enum to match V3.1 contract:
  ```javascript
  [
    'Pending',                // 0 - Waiting for oracles to accept
    'Oracles Assigned',       // 1 - All oracles accepted, ready to commit
    'Committing',             // 2 - Oracles submitting commitments
    'Revealing',              // 3 - Oracles revealing attestations
    'Consensus Reached',      // 4 - Majority agreement found
    'No Consensus',           // 5 - No majority (all oracles get slashed)
    'Completed',              // 6 - Attestation finalized
    'Rejected',               // 7 - Majority rejected
    'Cancelled',              // 8 - MSME cancelled
    'Disputed'                // 9 - Under dispute resolution
  ]
  ```

- Added oracle progress indicator: "Oracles: 2/3" 
- Added phase-specific action messages:
  * **Pending:** "⏳ Waiting for Oracles (2/3)"
  * **Oracles Assigned:** "🔒 Oracles Committing..."
  * **Committing:** "⏳ Oracles Committing Attestations..."
  * **Revealing:** "🔓 Oracles Revealing Attestations..."
  * **Consensus Reached:** "✅ Consensus Reached! Finalizing..."
  * **Completed:** "✅ Verified" or etherscan link

**Files Changed:**
- `frontend/src/components/MSMEDashboard.js` (lines 236-270, 1267-1330)

---

## Oracle Dashboard Table Buttons - New Logic

The table now shows **7 different button states** based on oracle progress:

| State | Button | Color | Action |
|-------|--------|-------|--------|
| 1. Not assigned, not full | **Review** | Green | Opens modal to review & accept |
| 2. Assigned, waiting for oracles | **Accepted** | Orange | Opens modal showing wait message |
| 3. Can commit | **Commit Now** | Green | Opens modal with verify/reject buttons |
| 4. Already committed | **Committed** | Orange | Opens modal showing wait for reveal |
| 5. Can reveal | **Reveal Now** | Purple | Opens modal with reveal button |
| 6. Already revealed | **Done** | Purple | Opens modal showing completion |
| 7. Full, not assigned | **Full** (disabled) | Gray | Can't interact |

---

## Modal Button Logic - New Flow

### Before Accept (Not Assigned, Not Full):
```
📋 Modal shows request details
Button: "🖐️ Accept This Request" (green)
```

### After Accept, Waiting for Oracles:
```
⚠️ "Waiting for X more oracle(s) to accept..."
Button: "Close"
```

### Ready to Commit (All Oracles Assigned):
```
📋 Modal shows document details with verification steps
Buttons: 
  - "✅ Verify & Submit Attestation" (green)
  - "❌ Reject Request" (red) ← THIS NOW SHOWS!
  - "Close"
```

### After Commit, Waiting for Reveal Phase:
```
ℹ️ "Waiting for commit phase to end before reveal..."
Button: "Close"
```

### Ready to Reveal:
```
📋 Modal shows reveal instruction
Button: "🔓 Reveal Your Attestation" (purple)
```

### After Reveal:
```
✅ "You have completed your attestation! Waiting for other oracles..."
Button: "Close"
```

---

## Testing Checklist

- [ ] Create new request (300 CIT, Medium tier, 3 oracles required)
- [ ] Oracle 1: Click "Review" → See details → Click "Accept" → See "Accepted" button
- [ ] Oracle 2: Accept → 2/3 shown
- [ ] Oracle 3: Accept → All see "Commit Now" (green)
- [ ] Oracle 1: Click "Commit Now" → See "Verify & Submit" AND "Reject" buttons ✅
- [ ] Oracle 1: Test rejection flow → Enter reason → Commits rejection
- [ ] Oracle 2 & 3: Commit approvals
- [ ] All oracles: See "Reveal Now" button after commit phase
- [ ] All oracles: Reveal attestations
- [ ] MSME: See status change through all phases:
  - Pending (0/3)
  - Pending (1/3)
  - Pending (2/3)
  - Oracles Assigned (3/3)
  - Committing
  - Revealing
  - Consensus Reached
  - Completed

---

## Contract Functions Used

### New Function Calls Added:
```javascript
// Get oracle's commitment status
const commitment = await attestationContract.getOracleCommitment(requestId, oracleAddress);
// Returns: { commitmentHash, commitTimestamp, hasCommitted, hasRevealed, attestationData, secret }
```

### Existing Functions:
- `getPendingRequests()` - Get all request IDs
- `getRequestDetails(id)` - Get full request info
- `acceptRequest(id)` - Oracle accepts request
- `commitAttestation(id, hash)` - Oracle commits (approval or rejection)
- `revealAttestation(id, data, secret)` - Oracle reveals commitment

---

## Key Improvements

1. **Reject Button Always Visible** ✅  
   - Shows in modal when oracle can commit
   - Shows alongside "Verify & Submit" button
   - Properly handles rejection flow via commit-reveal

2. **Smart Notifications** ✅  
   - No more "You can commit" when already committed
   - Clear phase indicators (Accepted → Commit → Committed → Reveal → Done)
   - Proper waiting messages between phases

3. **MSME Transparency** ✅  
   - Real-time oracle progress (2/3, 3/3)
   - Detailed status labels (10 different states)
   - Phase-specific action messages
   - Visual status badges (warning/info/success/error)

4. **Proper Status Cascade** ✅  
   - Checks `hasCommitted` before showing commit button
   - Checks `hasRevealed` before showing reveal button  
   - No duplicate actions possible
   - Clear progression: Review → Accept → Commit → Reveal → Done

---

## Next Steps

1. **Restart Frontend:**
   ```powershell
   cd d:\blockchain\BWD_Project\frontend
   npm start
   ```

2. **Hard Refresh Browser:**
   - Press `Ctrl + Shift + R` to clear cache
   - Or open DevTools → Network tab → Check "Disable cache"

3. **Test Complete Flow:**
   - MSME creates 300 CIT request
   - 3 oracles accept (watch status updates)
   - Test reject button visibility
   - Test commit-reveal flow
   - Verify MSME sees all status changes

4. **Monitor Console Logs:**
   - Enhanced logging added for debugging
   - Check browser console for request loading
   - Verify commitment status checks working

---

## Files Modified

1. **frontend/src/components/OracleDashboard.js**
   - Lines 186-222: Enhanced request loading with commitment status
   - Lines 1112-1137: New table button cascade logic
   - Lines 1232-1340: New modal button conditional flow

2. **frontend/src/components/MSMEDashboard.js**
   - Lines 236-270: V3.1 status enum mapping
   - Lines 1267-1330: Enhanced status display with progress

3. **frontend/src/utils/contracts.js**
   - Line 6: Updated to new V3.1 address (0xFD0B...)

---

## Reputation Requirements (Reminder)

**Active in current contract:**
- Simple (1 oracle): 0 reputation required
- Medium (3 oracles): 50+ reputation required
- Complex (5 oracles): 100+ reputation required
- Critical (7 oracles): 200+ reputation required

All current staked oracles have 100 reputation → Can handle Simple, Medium, Complex (not Critical yet).
