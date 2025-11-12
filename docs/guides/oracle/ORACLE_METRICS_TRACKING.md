# Oracle Metrics Tracking - Blockchain Integration

**Date**: November 11, 2025  
**Status**: ✅ COMPLETE

---

## 🎯 Overview

Updated the Oracle Dashboard to display accurate metrics from the blockchain instead of localStorage, including:
- Earnings from attestations
- Slashing penalties
- Consensus participation metrics
- Agreement rates

---

## 📊 Metrics Tracked

### 1. Oracle Info (from OracleStakingV3)
```javascript
{
  stakedAmount,           // Total CIT staked
  reputation,             // Reputation score
  tier,                   // Calculated tier (1-4)
  attestations,           // Total attestations completed
  slashCount,             // Number of times slashed
  consensusAgreements,    // Times agreed with majority
  consensusDisagreements, // Times disagreed with majority
  perfectConsensusCount,  // Times all oracles agreed
  noConsensusCount        // Times no consensus reached
}
```

### 2. Earnings (from FeeDistributed events)
```javascript
{
  total,  // Total CIT earned (calculated from events)
  count   // Number of attestations that paid out
}
```

**Calculation:**
- Query `FeeDistributed(uint256 requestId, address[] oracles, uint256 totalFee)` events
- Check if oracle address is in the `oracles` array
- Calculate share: `totalFee / oracles.length`
- Sum up all shares

### 3. Penalties (from OracleSlashed events)
```javascript
{
  total,  // Total CIT slashed
  count   // Number of slashing incidents
}
```

**Calculation:**
- Query `OracleSlashed(address oracle, uint256 amount, string reason)` events
- Filter by oracle address
- Sum up all `amount` values

---

## 🎨 Dashboard Display

### Top Row (5 cards)
1. **CIT Staked** - Green background
2. **Reputation** - Blue background
3. **Oracle Tier** - Yellow background with tier badge
4. **Attestations** - Purple background
5. **Total Earned (CIT)** - Orange background
   - Shows total + attestation count

### Bottom Row (4 cards)
1. **Total Slashed (CIT)** - Red background
   - Shows total + slash count
2. **Consensus Agreements** - Green background
   - Times agreed with majority
3. **Consensus Disagreements** - Red background
   - Times disagreed with majority
4. **Agreement Rate** - Yellow background
   - Percentage: `(agreements / attestations) * 100`

---

## 🔧 Implementation Details

### State Management
```javascript
const [oracleEarnings, setOracleEarnings] = useState({ total: 0, count: 0 });
const [oraclePenalties, setOraclePenalties] = useState({ total: 0, count: 0 });
```

### Event Query Range
- **Block Range**: Last 100,000 blocks (~2 weeks on most networks)
- **Refresh Rate**: Every 30 seconds
- **Networks**: Works on localhost, Sepolia, mainnet

### Event Filters
```javascript
// Earnings
const feeFilter = attestationContract.filters.FeeDistributed();
const feeEvents = await attestationContract.queryFilter(feeFilter, fromBlock, 'latest');

// Penalties
const slashFilter = stakingContract.filters.OracleSlashed(account);
const slashEvents = await stakingContract.queryFilter(slashFilter, fromBlock, 'latest');
```

---

## 📝 Data Flow

### Oracle Info Loading
```
Component Mount
  ↓
loadOracleStatus()
  ↓
getOracleInfo(account) → OracleStakingV3
  ↓
Parse struct fields [0-11]
  ↓
setOracleInfo({ ...all fields })
  ↓
Display in cards
```

### Earnings/Penalties Loading
```
isOracle = true
  ↓
loadEarningsAndPenalties()
  ↓
Query FeeDistributed events
  ↓
Filter by oracle address
  ↓
Calculate total earned
  ↓
Query OracleSlashed events
  ↓
Filter by oracle address
  ↓
Calculate total slashed
  ↓
Display in cards
```

---

## 🧪 Testing Scenarios

### Scenario 1: New Oracle (No Activity)
**Expected:**
- CIT Staked: 50,000+
- Reputation: 100
- Tier: 1-4 (based on stake)
- Attestations: 0
- Total Earned: 0 (0 attestations)
- Total Slashed: 0 (0 slashes)
- Consensus Agreements: 0
- Consensus Disagreements: 0
- Agreement Rate: 0%

### Scenario 2: Active Oracle (3 Attestations, All Majority)
**Expected:**
- Attestations: 3
- Total Earned: X CIT (3 attestations)
- Total Slashed: 0
- Consensus Agreements: 3
- Consensus Disagreements: 0
- Agreement Rate: 100%

### Scenario 3: Oracle with Disagreements
**Example:** 5 attestations (3 majority, 2 minority)
**Expected:**
- Attestations: 5
- Consensus Agreements: 3
- Consensus Disagreements: 2
- Agreement Rate: 60% (3/5)

### Scenario 4: Slashed Oracle
**Example:** Slashed 5,000 CIT once
**Expected:**
- Total Slashed: 5,000 (1 slash)
- CIT Staked: Reduced by 5,000
- Reputation: Reduced (depends on slashing logic)

---

## 💡 Benefits

### 1. Accuracy
- ✅ Real-time data from blockchain
- ✅ No localStorage sync issues
- ✅ Immutable source of truth

### 2. Transparency
- ✅ Shows exact earnings per attestation
- ✅ Shows all slashing incidents
- ✅ Agreement rate visible

### 3. Performance Tracking
- ✅ Oracles can see consensus participation
- ✅ Agreement rate indicates accuracy
- ✅ Penalties track misbehavior

### 4. UX Improvements
- ✅ Clear visual hierarchy (color-coded cards)
- ✅ Contextual counts ("3 attestations", "1 slash")
- ✅ Percentage calculations (agreement rate)

---

## 🔄 Auto-Update Behavior

### Oracle Info
- **Initial Load**: On component mount
- **Refresh**: Every 10 seconds
- **Trigger**: Account/provider change

### Earnings/Penalties
- **Initial Load**: When `isOracle` becomes true
- **Refresh**: Every 30 seconds
- **Trigger**: Account/provider/isOracle change

---

## 📈 Example Display

```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│   50,000 CIT    │       120       │    Tier 1 🥉    │        5        │      450.50     │
│   CIT Staked    │   Reputation    │   Oracle Tier   │  Attestations   │  Total Earned   │
│                 │                 │                 │                 │  5 attestations │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┴─────────────────┘

┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│     5,000       │        4        │        1        │      80.0%      │
│  Total Slashed  │    Consensus    │    Consensus    │   Agreement     │
│    1 slash      │   Agreements    │ Disagreements   │      Rate       │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

---

## 🚀 Future Enhancements

### Potential Additions
1. **Per-Attestation Breakdown**
   - Table showing each attestation with earnings
   - Link to transaction hash
   
2. **Slashing History**
   - List of all slashing incidents
   - Reasons for each slash
   - Date/time of slashing

3. **Consensus Analysis**
   - Chart showing agreement trend over time
   - Comparison with other oracles

4. **Earnings Chart**
   - Line graph of cumulative earnings
   - Bar chart of earnings per month

---

## ✅ Success Criteria

1. ✅ All metrics load from blockchain (not localStorage)
2. ✅ Earnings calculated correctly from FeeDistributed events
3. ✅ Penalties calculated correctly from OracleSlashed events
4. ✅ Consensus metrics displayed from OracleInfo struct
5. ✅ Agreement rate calculated correctly
6. ✅ Auto-refresh works (10s for info, 30s for events)
7. ✅ Display shows contextual counts (attestations, slashes)
8. ✅ No errors when no events found (shows 0)

---

**The Oracle Dashboard now provides complete, accurate metrics from the blockchain!** 🎉
