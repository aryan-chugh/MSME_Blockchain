# 🔧 CRITICAL FIX - Request Visibility During Commit/Reveal Phases

## 🐛 Bug Fixed

**Problem:** After the first oracle committed, the attestation request disappeared from all oracle dashboards. Other oracles couldn't commit, and nobody could reveal.

**Root Cause:** Frontend was using `getPendingRequests()` which only returns requests with status `Pending` or `OraclesAssigned`. Once the first oracle commits, the status changes to `Committing`, and the request disappeared.

---

## ✅ Solution Implemented

### Changed Request Loading Logic:

**Before (BROKEN):**
```javascript
// Only fetched Pending and OraclesAssigned
const pendingIds = await attestationContract.getPendingRequests();
```

**After (FIXED):**
```javascript
// Fetch ALL active requests manually
const counter = await attestationContract.requestCounter();
const totalRequests = Number(counter);

const activeRequests = [];
for (let i = 1; i <= totalRequests; i++) {
  const details = await attestationContract.getRequestDetails(i);
  const status = Number(details.status);
  
  // Include: Pending(0), OraclesAssigned(1), Committing(2), Revealing(3)
  // Exclude: Completed, Rejected, Cancelled, etc.
  if (status >= 0 && status <= 3) {
    activeRequests.push(i);
  }
}
```

---

## 🎯 What Changed

### 1. Request Loading (Lines 156-200)
- ✅ Iterates through ALL requests using `requestCounter`
- ✅ Filters for active statuses (0-3)
- ✅ Includes requests in Committing and Revealing phases
- ✅ Enhanced logging shows total vs active requests

### 2. UI Improvements
- ✅ Header changed: "Pending Requests" → "🔄 Active Attestation Requests"
- ✅ Added **Status** column showing current phase
- ✅ Status badges with colors:
  - Pending (yellow/warning)
  - OraclesAssigned (blue/info)
  - Committing (blue/info)
  - Revealing (green/active)

---

## 🧪 How to Test

### Test Scenario: 3-Oracle Commit-Reveal Flow

**Step 1: MSME Creates Request**
- 300 CIT fee → Medium tier → 3 oracles required

**Step 2: All 3 Oracles Accept**
- Oracle 1 accepts → Status: Pending (1/3)
- Oracle 2 accepts → Status: Pending (2/3)
- Oracle 3 accepts → Status: OraclesAssigned (3/3) ✅

**Step 3: Oracle 1 Commits** ⚡ CRITICAL TEST
- Oracle 1 clicks "Commit Now"
- Confirms transaction
- ✅ **Request STAYS VISIBLE** with status "Committing"
- ✅ Oracle 2 & 3 still see "Commit Now" button

**Step 4: Oracle 2 & 3 Commit**
- Oracle 2 commits → Still visible
- Oracle 3 commits → Status: "Revealing"

**Step 5: All Reveal**
- Oracle 1 clicks "Reveal Now" → Reveals
- ✅ **Request STAYS VISIBLE** with status "Revealing"
- Oracle 2 reveals
- Oracle 3 reveals → Consensus calculated → Status: "Completed"

---

## 📊 Status Flow Table

| Phase | Contract Status | Frontend Label | Visibility | Oracle Actions |
|-------|----------------|----------------|------------|----------------|
| 0 | Pending | Pending | ✅ Visible | Accept Request |
| 1 | OraclesAssigned | OraclesAssigned | ✅ Visible | Commit Attestation |
| 2 | Committing | Committing | ✅ **NOW VISIBLE** | Continue Committing |
| 3 | Revealing | Revealing | ✅ **NOW VISIBLE** | Reveal Attestation |
| 4 | ConsensusReached | ConsensusReached | ❌ Hidden (complete) | View Result |
| 5+ | Completed/Rejected | - | ❌ Hidden (final) | - |

---

## 🔍 Console Logs to Watch

After fix, you should see:

```
📊 Total requests in contract: 5
📋 Found 2 active attestation requests
📄 Request #3: { status: 2, assignedOracles: 3, requiredOracles: 3 }
📄 Request #4: { status: 1, assignedOracles: 3, requiredOracles: 3 }
```

**Before fix:**
- After 1st commit: "Found 0 active requests" ❌

**After fix:**
- After 1st commit: "Found 1 active requests" with status: Committing ✅

---

## 🚀 Ready to Test

Restart frontend and test the complete flow:

```powershell
cd d:\blockchain\BWD_Project\frontend
npm start
```

**Hard refresh:** `Ctrl + Shift + R`

The request will now stay visible through all phases! 🎉

---

## Files Modified

- `frontend/src/components/OracleDashboard.js`
  - Lines 156-200: Changed request loading from `getPendingRequests()` to manual iteration
  - Line 1131: Header text updated
  - Line 1161: Added Status column to table
  - Line 1175: Added status badge display

