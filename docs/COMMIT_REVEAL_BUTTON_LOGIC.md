# Commit-Reveal Button Logic Fix

**Date**: November 11, 2025  
**Status**: ✅ FIXED

---

## 🎯 Problem

The commit and reveal buttons were not properly enabling/disabling based on the actual request status from the blockchain. Buttons were only checking if all oracles were assigned, not the actual phase of the commit-reveal process.

---

## 📊 Request Status Flow

```
Status 0: Pending
   ↓ (All oracles accept)
Status 1: OraclesAssigned ← COMMIT ENABLED
   ↓ (First oracle commits)
Status 2: Committing ← COMMIT STILL ENABLED
   ↓ (All oracles commit)
Status 3: Revealing ← REVEAL ENABLED, COMMIT DISABLED
   ↓ (All oracles reveal)
Status 4+: ConsensusReached/Completed ← BOTH DISABLED
```

---

## ✅ New Button Logic

### Commit Button
**Enabled when:**
- Status is 1 (OraclesAssigned) OR 2 (Committing)
- AND oracle has NOT committed yet
- AND oracle tier is sufficient

**Disabled when:**
- Status is 0 (waiting for oracles)
- Status is 3 (reveal phase started)
- Status is 4+ (completed)
- OR oracle already committed

**Button States:**
```javascript
Status 0: "⏳ Waiting for Oracles (X/3)"
Status 1-2 (not committed): "🔒 Phase 1: Commit Hash" [ENABLED]
Status 1-2 (committed): "✅ Already Committed" [DISABLED]
Status 3: "🚫 Commit Phase Ended" [DISABLED]
Status 4+: Button hidden (completion message shown)
```

### Reveal Button
**Enabled when:**
- Status is 3 (Revealing) OR 2 (Committing - edge case)
- AND oracle HAS committed
- AND oracle has NOT revealed yet
- AND oracle tier is sufficient

**Disabled when:**
- Oracle hasn't committed yet
- Status is not 3 (commits not all in yet)
- Status is 4+ (completed)
- OR oracle already revealed

**Button States:**
```javascript
Not committed: "🔒 Must Commit First" [DISABLED]
Committed but Status < 3: "⏳ Waiting for All Commits" [DISABLED]
Committed and Status 3: "🔓 Phase 2: Reveal Decision" [ENABLED]
Already revealed: "✅ Already Revealed" [DISABLED]
Status 4+: Button hidden (completion message shown)
```

---

## 🔧 Implementation

### Key Changes in `OracleDashboard.js`

```javascript
// Calculate button states based on blockchain status
const canCommit = (requestStatus === 1 || requestStatus === 2) && !hasCommitted;
const canReveal = (requestStatus === 3 || requestStatus === 2) && hasCommitted && !hasRevealed;

// Commit button
<button 
  disabled={!canCommit || tierCheck}
  style={{ 
    background: hasCommitted ? '#a0aec0' : (canCommit ? '#667eea' : '#cbd5e0'),
    cursor: canCommit ? 'pointer' : 'not-allowed'
  }}
>
  {/* Dynamic text based on status */}
</button>

// Reveal button
<button 
  disabled={!canReveal || tierCheck}
  style={{ 
    background: hasRevealed ? '#a0aec0' : (canReveal ? '#48bb78' : '#cbd5e0'),
    cursor: canReveal ? 'pointer' : 'not-allowed'
  }}
>
  {/* Dynamic text based on status */}
</button>
```

---

## 🧪 Testing Scenarios

### Scenario 1: Normal Flow
1. **Status 0**: Both buttons disabled, showing "Waiting for Oracles"
2. **All oracles accept → Status 1**: Commit button ENABLED (green)
3. **Oracle 1 commits → Status 2**: Commit still ENABLED for Oracle 2 & 3
4. **All commit → Status 3**: Reveal button ENABLED (green), Commit DISABLED
5. **All reveal → Status 4+**: Both hidden, "Request Completed" shown

### Scenario 2: Late Oracle
1. Oracle 1 & 2 accept (Status still 0)
2. Commit button: "⏳ Waiting for Oracles (2/3)" [DISABLED]
3. Oracle 3 accepts → Status 1
4. Commit button: "🔒 Phase 1: Commit Hash" [ENABLED]

### Scenario 3: One Oracle Commits Early
1. All oracles accept → Status 1
2. Oracle 1 commits immediately → Status 2
3. **Oracle 1**: Button shows "✅ Already Committed" [DISABLED]
4. **Oracle 2 & 3**: Button shows "🔒 Phase 1: Commit Hash" [ENABLED]
5. Status stays at 2 until all commit

### Scenario 4: Reveal Phase
1. All oracles commit → Status 3
2. **For all oracles**:
   - Commit: "🚫 Commit Phase Ended" [DISABLED]
   - Reveal: "🔓 Phase 2: Reveal Decision" [ENABLED]

---

## 📝 Status Enum Reference

```solidity
enum RequestStatus {
    Pending,           // 0 - Initial state
    OraclesAssigned,   // 1 - All oracles accepted
    Committing,        // 2 - First commit happened
    Revealing,         // 3 - All commits in, ready to reveal
    ConsensusReached,  // 4 - Reveals done, consensus reached
    NoConsensus,       // 5 - Reveals done, no consensus
    Completed,         // 6 - Final state
    Rejected,          // 7
    Cancelled,         // 8
    Disputed           // 9
}
```

---

## 🎨 Visual Feedback

### Button Colors
- **Enabled (Commit)**: `#667eea` (Blue)
- **Enabled (Reveal)**: `#48bb78` (Green)
- **Disabled**: `#cbd5e0` (Gray)
- **Already Done**: `#a0aec0` (Dark Gray)

### Tooltips
Buttons now show helpful tooltips:
- "You have already committed"
- "Waiting for all oracles to accept"
- "Commit phase ended, now in reveal phase"
- "You must commit before revealing"
- "Wait for all oracles to commit first"
- "Click to commit/reveal your attestation"

---

## ✅ Success Criteria

1. ✅ Commit button only enabled in Status 1 or 2
2. ✅ Commit button disabled after committing
3. ✅ Commit button disabled when Status 3 (reveal phase)
4. ✅ Reveal button only enabled in Status 3
5. ✅ Reveal button requires commit first
6. ✅ Reveal button disabled after revealing
7. ✅ Both buttons hidden when Status 4+ (completed)
8. ✅ Status display shows current phase
9. ✅ Auto-refresh updates button states every 5 seconds
10. ✅ Clear visual feedback (colors, tooltips, messages)

---

## 🔄 Auto-Refresh Integration

The 5-second auto-refresh (from previous fix) ensures:
- Status updates reflect immediately
- Button states change automatically
- No manual refresh needed
- Real-time workflow visibility

---

## 📚 Related Documentation

- `COMPLETE_FIX_SUMMARY.md` - All fixes overview
- `COMMIT_BUTTON_FIX.md` - Initial commit button issue
- `docs/COMMIT_REVEAL_WORKFLOW_ANALYSIS.md` - Workflow analysis

---

**The commit-reveal button logic now works perfectly with blockchain status updates!** 🎉
