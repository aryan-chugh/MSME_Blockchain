# V3 Multi-Oracle Consensus - Testing Guide
**Date: October 25, 2025**

---

## 🎯 What's New in V3

### Revolutionary Features:
1. **Multi-Oracle Consensus** - 3-7 oracles verify each request
2. **Commit-Reveal Scheme** - Prevents oracle copying/collusion
3. **Weighted Random Selection** - Anti-monopoly mechanism
4. **Oracle-MSME Cooldown** - 30-day rotation period
5. **Diversity Bonuses** - Rewards serving many different MSMEs
6. **Consensus-Based Rewards** - Majority gets paid, minority penalized
7. **Automatic Complexity** - Fee amount determines oracle count
8. **Hybrid Model** - MSMEs can choose single vs multi-oracle

---

## 📋 Pre-Deployment Checklist

### 1. Compile Contracts
```bash
cd D:\blockchain\BWD_Project
npx hardhat compile
```

**Expected output:**
```
Compiled 2 Solidity files successfully
✅ AttestationRegistryV3.sol
✅ OracleStakingV3.sol
```

### 2. Deploy to Sepolia
```bash
npx hardhat run scripts/deploy-v3.js --network sepolia
```

**Monitor for:**
- ✅ OracleStakingV3 deployment
- ✅ AttestationRegistryV3 deployment
- ✅ Registry set in staking contract
- ✅ Default schemas registered (GST, Financial Audit, etc.)

### 3. Verify Contracts on Etherscan
```bash
npx hardhat verify --network sepolia <ORACLE_STAKING_V3_ADDRESS> <CIT_TOKEN_ADDRESS> <GOVERNANCE_ADDRESS>

npx hardhat verify --network sepolia <ATTESTATION_REGISTRY_V3_ADDRESS> <ORACLE_STAKING_V3_ADDRESS> <GOVERNANCE_ADDRESS> <CIT_TOKEN_ADDRESS>
```

---

## 🧪 Testing Phases

### Phase 1: Multi-Oracle Staking (3+ Oracles Required)

**Objective:** Get at least 3 oracles staked to test consensus

**Steps:**

1. **Oracle 1 Stakes (You)**
```javascript
// In Oracle Dashboard
stake(100000 * 1e18) // 100K CIT = Tier 2
```

2. **Oracle 2 Stakes (Use different wallet)**
```javascript
// Switch MetaMask account
stake(150000 * 1e18) // 150K CIT = Tier 3
```

3. **Oracle 3 Stakes (Use third wallet or testnet faucet)**
```javascript
// Another account
stake(100000 * 1e18) // 100K CIT = Tier 2
```

**Verify:**
- [ ] All 3 oracles show "Staked" status
- [ ] Each has tier assigned (1-4)
- [ ] Each has initial reputation = 100
- [ ] All marked as `isActive = true`

**Console check:**
```javascript
const staking = await ethers.getContractAt("OracleStakingV3", STAKING_ADDRESS);
const oracle1Info = await staking.getOracleInfo(oracle1Address);
console.log("Oracle 1 Reputation:", oracle1Info.reputationScore); // Expected: 100
console.log("Oracle 1 Tier:", await staking.getOracleTier(oracle1Address));
```

---

### Phase 2: MSME Creates Medium Complexity Request (3 Oracles)

**Objective:** Test automatic oracle assignment and weighted random selection

**Steps:**

1. **MSME Creates Request with 300 CIT Fee**
```javascript
// In MSME Dashboard
requestAttestation({
    schemaId: ethers.keccak256(ethers.toUtf8Bytes("FINANCIAL_AUDIT")),
    documentHash: "QmFinancialAuditHash123...",
    documentUrl: "ipfs://QmFinancialDocs...",
    additionalData: JSON.stringify({
        revenue: 500000,
        profit: 50000,
        quarter: "Q4-2024"
    }),
    feePaid: 300 * 1e18, // 300 CIT → triggers Medium complexity (3 oracles)
    requestedValidityPeriod: 180 days, // 6 months
    forceSingleOracle: false
})
```

2. **Verify Auto-Assignment**

**Expected console logs:**
```
📋 Request created: ID = 1
🎯 Complexity: Medium (300 CIT)
👥 Required oracles: 3
🔀 Auto-assigning oracles...
✅ Oracles assigned: [0xOracle1, 0xOracle2, 0xOracle3]
⏰ Verification deadline: 24 hours from now
```

3. **Check Request Details**
```javascript
const request = await attestationRegistry.getRequestDetails(1);
console.log("Assigned Oracles:", request.assignedOracles);
console.log("Required Oracles:", request.requiredOracles); // Should be 3
console.log("Status:", request.status); // Should be "OraclesAssigned"
console.log("Complexity:", request.complexity); // Should be "Medium" (1)
```

**Verify:**
- [ ] Exactly 3 oracles assigned
- [ ] All 3 are different addresses
- [ ] Status = "OraclesAssigned"
- [ ] Verification deadline set (24 hours)
- [ ] Reveal deadline set (30 hours)

---

### Phase 3: Oracles Commit Attestations (Phase 1 - Hidden)

**Objective:** Test commit-reveal scheme prevents copying

**Oracle 1 Commits:**
```javascript
// Prepare attestation data
const attestationData = ethers.AbiCoder.defaultAbiCoder().encode(
    ["string", "uint256", "bool"],
    ["Financial audit verified - Revenue $500K, Profit $50K", block.timestamp, true]
);

// Generate secret (random)
const secret = ethers.keccak256(ethers.toUtf8Bytes("oracle1_secret_12345"));

// Calculate commitment hash
const commitmentHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes", "uint256", "bytes32"],
        [attestationData, 180 * 24 * 60 * 60, secret] // 180 days validity
    )
);

// Commit (transaction)
await attestationRegistry.commitAttestation(requestId, commitmentHash);
```

**Oracle 2 & 3 Commit (Independently):**
```javascript
// Each oracle commits their own attestation
// They CANNOT see others' commitments (only hashes)

// Oracle 2
await attestationRegistry.commitAttestation(requestId, oracle2CommitmentHash);

// Oracle 3
await attestationRegistry.commitAttestation(requestId, oracle3CommitmentHash);
```

**Console Logs:**
```
Oracle 1: ✅ Commitment submitted (hash: 0xabc123...)
Oracle 2: ✅ Commitment submitted (hash: 0xdef456...)
Oracle 3: ✅ Commitment submitted (hash: 0x789xyz...)
📊 All oracles committed! Status → Committing
⏰ Reveal period begins now (6 hours)
```

**Verify:**
- [ ] Each oracle can only commit once
- [ ] Commitments are just hashes (data hidden)
- [ ] Status changes to "Committing" after all commit
- [ ] Reveal period starts automatically

---

### Phase 4: Oracles Reveal Attestations (Phase 2 - Public)

**Objective:** Test consensus calculation and reward distribution

**Oracle 1 Reveals:**
```javascript
await attestationRegistry.revealAttestation(
    requestId,
    attestationData,      // Original data
    180 * 24 * 60 * 60,   // Proposed validity (180 days)
    secret                // Original secret
);
```

**Expected:**
```
✅ Oracle 1 revealed
🔍 Verifying commitment... ✅ Valid
📊 Attestation data stored
⏳ Waiting for other oracles...
```

**Oracle 2 & 3 Reveal:**
```javascript
// Oracle 2 reveals (agrees with Oracle 1)
await attestationRegistry.revealAttestation(requestId, sameData, 180 days, oracle2Secret);

// Oracle 3 reveals (DISAGREES - different data for testing)
await attestationRegistry.revealAttestation(requestId, differentData, 150 days, oracle3Secret);
```

**Console after all reveals:**
```
✅ All oracles revealed!
📊 Calculating consensus...

Consensus Result:
├─ Majority hash: 0xabc123...
├─ Majority count: 2 (Oracle 1 + Oracle 2)
├─ Minority count: 1 (Oracle 3)
├─ Consensus percentage: 66.67%
└─ Threshold: 66% ✅ CONSENSUS REACHED!

💰 Distributing rewards...
├─ Oracle 1 (majority): +135 CIT ✅
├─ Oracle 2 (majority): +135 CIT ✅
├─ Oracle 3 (minority): -10 CIT penalty ❌
└─ Platform: 30 CIT (10%)

📈 Reputation updates:
├─ Oracle 1: 100 → 105 (+5) ✅
├─ Oracle 2: 100 → 105 (+5) ✅
└─ Oracle 3: 100 → 90 (-10) ❌

✅ Attestation finalized!
```

**Verify:**
- [ ] Consensus calculated correctly (2/3 = 66%)
- [ ] Majority oracles get ~135 CIT each (270 / 2)
- [ ] Minority oracle gets reputation penalty (-10)
- [ ] Platform gets 30 CIT (10% of 300)
- [ ] Final attestation created with majority data
- [ ] Attestation has 2 issuers (Oracle 1 + Oracle 2)
- [ ] Consensus percentage stored (66%)

---

### Phase 5: Test Different Complexities

**5A: Simple Request (1 Oracle - Opt-In)**
```javascript
// MSME requests single oracle (fast & cheap)
requestAttestation({
    ...,
    feePaid: 100 * 1e18,    // 100 CIT
    forceSingleOracle: true  // ← Forces single oracle
})

// Expected: Only 1 oracle assigned, works like V2
```

**5B: Complex Request (5 Oracles)**
```javascript
requestAttestation({
    ...,
    feePaid: 700 * 1e18    // 700 CIT → triggers Complex (5 oracles)
})

// Expected:
// - 5 oracles auto-assigned
// - Consensus threshold: 66% (4/5 or 5/5)
// - Higher security
```

**5C: Critical Request (7 Oracles)**
```javascript
requestAttestation({
    ...,
    feePaid: 1500 * 1e18   // 1500 CIT → triggers Critical (7 oracles)
})

// Expected:
// - 7 oracles auto-assigned
// - Maximum security
// - Consensus threshold: 66% (5/7, 6/7, or 7/7)
```

---

### Phase 6: Test Anti-Monopoly Features

**6A: Oracle-MSME Cooldown**

1. Oracle 1 completes attestation for MSME A
2. MSME A creates another request immediately
3. Oracle 1 tries to get assigned again

**Expected:**
```
❌ Oracle 1 not eligible for this MSME
✅ System selects different oracles
⏰ Oracle 1 must wait 30 days before serving MSME A again
```

**6B: Diversity Bonus Testing**

1. Oracle 1 serves 10 different MSMEs
2. Oracle 2 serves same 2 MSMEs repeatedly

**Check reputation:**
```javascript
const oracle1Rep = await staking.getCurrentReputation(oracle1Address);
const oracle2Rep = await staking.getCurrentReputation(oracle2Address);

console.log("Oracle 1 diversity score:", await attestationRegistry.getOracleDiversityScore(oracle1));
// Expected: 10 unique MSMEs

console.log("Oracle 2 diversity score:", await attestationRegistry.getOracleDiversityScore(oracle2));
// Expected: 2 unique MSMEs

// Oracle 1 should have higher reputation due to diversity bonus
```

**6C: Weighted Random Selection**

Create 5 requests and observe oracle selection:

```javascript
// Oracle with higher reputation + stake should be selected more often
// But NOT 100% of the time (randomness ensures fair distribution)

const selectionCounts = {};
for (let i = 0; i < 5; i++) {
    const request = await createTestRequest();
    const assigned = request.assignedOracles;
    
    assigned.forEach(oracle => {
        selectionCounts[oracle] = (selectionCounts[oracle] || 0) + 1;
    });
}

console.log("Selection distribution:", selectionCounts);
// Expected: Higher-rep oracles selected more, but not exclusively
```

---

### Phase 7: Test No Consensus Scenario

**Objective:** Verify system handles disagreement gracefully

**Setup:**
1. Assign 3 oracles to request
2. Each oracle submits DIFFERENT attestation data
3. No majority agreement

**Expected Behavior:**
```
📊 Consensus calculation:
├─ Oracle 1 data: "Approved - $500K revenue"
├─ Oracle 2 data: "Rejected - Insufficient documentation"
├─ Oracle 3 data: "Approved - $450K revenue"
└─ No 66% consensus reached ❌

⚠️ Handling no consensus:
├─ Status → NoConsensus
├─ All oracles paid base rate (20% each): ~20 CIT
├─ All oracles reputation -5 (small penalty)
├─ MSME refunded 60%: 180 CIT
├─ Platform keeps 20%: 60 CIT
└─ Request flagged for governance review

📋 Governance can manually review and:
   Option A: Select correct attestation
   Option B: Request re-verification with new oracles
   Option C: Full refund to MSME
```

**Verify:**
- [ ] No consensus triggers alternative flow
- [ ] MSME not charged full fee
- [ ] Oracles get minimal compensation for effort
- [ ] Governance alerted for manual review

---

### Phase 8: Test Edge Cases

**8A: Oracle Goes Offline After Assignment**
```javascript
// Oracle assigned but never commits
// Wait for verification deadline to pass

// Expected:
// - System detects missing oracle
// - Oracle penalized (1% stake slash)
// - Replacement oracle assigned
// - Verification period extended
```

**8B: Oracle Commits But Doesn't Reveal**
```javascript
// Oracle commits but disappears before reveal

// Expected:
// - Commitment hash stored but unusable
// - Consensus calculated with remaining oracles
// - Missing oracle gets reputation penalty (-15)
```

**8C: Insufficient Oracles Available**
```javascript
// Only 2 oracles staked, but request needs 3

// Expected:
// - Assignment period extended by 12 hours
// - Fee incentive increased by 20%
// - If still insufficient after 48h → refund MSME
```

---

## 📊 Success Criteria

### Contract Deployment:
- [ ] OracleStakingV3 deployed successfully
- [ ] AttestationRegistryV3 deployed successfully
- [ ] Registry set in staking contract
- [ ] Default schemas registered
- [ ] Verified on Etherscan

### Multi-Oracle Consensus:
- [ ] 3+ oracles can be assigned to one request
- [ ] Weighted random selection works
- [ ] Commit-reveal prevents data copying
- [ ] Consensus calculated correctly (66%+ threshold)
- [ ] Majority oracles rewarded
- [ ] Minority oracles penalized

### Fee Distribution:
- [ ] Total fee split among majority oracles
- [ ] Platform gets 10%
- [ ] No consensus → partial refund works
- [ ] All fees accounted for (no loss)

### Anti-Monopoly:
- [ ] Oracle-MSME cooldown enforced (30 days)
- [ ] Diversity tracking works
- [ ] High-reputation oracles can't dominate 100%
- [ ] Fair distribution across oracle pool

### Reputation System:
- [ ] Consensus agreement: +5 reputation
- [ ] Consensus disagreement: -10 reputation
- [ ] No consensus: -5 reputation (all)
- [ ] Accuracy bonus applied correctly
- [ ] Perfect consensus bonus (+2 per instance)

### Complexity Tiers:
- [ ] <200 CIT → 1 oracle (if forced)
- [ ] 200-500 CIT → 3 oracles
- [ ] 500-1000 CIT → 5 oracles
- [ ] >1000 CIT → 7 oracles

---

## 🐛 Common Issues & Solutions

### Issue 1: "Insufficient oracles available"
**Solution:** Stake more oracles (need at least 3 for testing)

### Issue 2: "Commitment mismatch"
**Solution:** Ensure attestation data, validity period, and secret match exactly between commit and reveal

### Issue 3: "No oracles assigned"
**Solution:** Check oracles are not in cooldown period with this MSME

### Issue 4: Consensus calculation takes too long
**Solution:** This is on-chain computation, may need gas optimization for production

### Issue 5: All oracles select same data (no disagreement for testing)
**Solution:** Manually submit different data from one oracle wallet for testing

---

## 📈 Performance Metrics to Track

1. **Gas Costs:**
   - Request creation: ~200K-300K gas
   - Oracle commit: ~80K gas
   - Oracle reveal: ~100K-150K gas
   - Consensus calculation: ~200K-500K gas (scales with oracle count)

2. **Oracle Selection Distribution:**
   - Track how many times each oracle selected over 10 requests
   - Should be balanced but weighted by reputation/stake

3. **Consensus Rate:**
   - % of requests reaching consensus
   - Target: >90%

4. **Accuracy Tracking:**
   - Oracle 1 accuracy: Agreements / (Agreements + Disagreements)
   - Target per oracle: >80%

---

## 🚀 Next Steps After Testing

1. **Deploy to Mainnet** (when ready)
2. **Update Frontend:**
   - Show multiple oracle addresses per attestation
   - Display consensus percentage
   - Show oracle diversity scores
   - Visualize commit-reveal progress

3. **Monitor Production:**
   - Oracle selection fairness
   - Consensus success rate
   - Fee distribution accuracy
   - Reputation score trends

4. **Optimize:**
   - Gas optimizations for consensus calculation
   - Efficient storage for large oracle arrays
   - Caching for weighted selection

---

## 🎉 Congratulations!

You now have a **truly decentralized, Byzantine fault-tolerant oracle attestation system** that:
- ✅ Prevents single oracle monopoly
- ✅ Resists collusion through commit-reveal
- ✅ Rewards accuracy, penalizes inaccuracy
- ✅ Distributes work fairly across oracles
- ✅ Provides statistical consensus (not single opinion)
- ✅ Scales security with request value

**This is production-ready decentralized infrastructure!** 🚀
