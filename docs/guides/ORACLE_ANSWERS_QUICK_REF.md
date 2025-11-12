# Quick Reference: Oracle System Questions & Answers

## 1️⃣ How Do Oracles Earn?

**Current V1:** ❌ They don't! Fees are collected but never distributed.

**Fixed V2:** ✅ 
- MSME pays 100 CIT fee → Held in escrow
- Oracle completes work → Gets 90 CIT (90%)
- Platform gets 10 CIT (10%)

**One oracle per request model** - First to assign gets the job!

---

## 2️⃣ Reputation Mechanism

**Automatic Reputation Changes:**
```
Complete attestation:     +5 points  ✅
Reject request:           -3 points  ⚠️
Revoke attestation:      -10 points  ❌
Slashed for fraud:       -50 points  🚨
Flagged for collusion:  -100 points  ☠️
Time decay:          -1 point/month  ⏰
```

**Starting reputation:** 100 points

**Benefits:**
- High reputation (150+) → More requests, MSME trust
- Low reputation (<50) → Fewer requests, avoided by MSMEs

---

## 3️⃣ Stake Slashing

**✅ Already implemented in your V1 contract!**

**How it works:**
```solidity
// Governance can slash bad oracles
slash(oracleAddress, 10000 CIT, "False attestation")
```

**Effects:**
- Stake reduced by slashed amount
- Oracle marked `isActive = false`
- Must re-stake to continue working

**Triggers:**
- False attestations (proven via disputes)
- Collusion (>70% co-attestation rate)
- Malicious behavior

---

## 4️⃣ Where Do Slashed Funds Go?

**Current V1:**
```
100% → Governance treasury
```

**Improved V2:**
```
50% → Affected MSME (compensation)
30% → Platform treasury
20% → Burned/locked (deflationary)
```

**Example:** 10,000 CIT slashed
- 5,000 CIT to MSME who got false attestation
- 3,000 CIT to platform operations
- 2,000 CIT burned (increases token value)

---

## 5️⃣ Document Validity Periods

**Current V1:** ❌ Oracle decides validity, MSME has no control

**Fixed V2:** ✅ MSME requests, oracle confirms (±20%)

**Example:**
```javascript
// MSME: "I want my audit valid for 6 months"
requestAttestation(..., requestedValidityPeriod: 180 days)

// Oracle: "Based on the document quality, 5 months is better"
submitAttestation(..., proposedValidityPeriod: 150 days)

// System validates: 150 is within 144-216 range ✅
```

**Typical Validity Periods:**
- GST Certificate: 1 year
- Financial Audit: 6 months  
- Bank Statement: 3 months
- Incorporation: Forever
- Business License: 1 year

---

## 🔧 What Needs to Be Fixed?

| Issue | Status | Fix File |
|-------|--------|----------|
| Oracle fee distribution | ❌ Missing | AttestationRegistryV2.sol |
| Automatic reputation | ⚠️ Partial | OracleStakingV2.sol |
| Slashing fund split | ⚠️ Basic | OracleStakingV2.sol |
| Validity period control | ❌ Missing | AttestationRegistryV2.sol |
| Dispute system | ❌ Missing | AttestationRegistryV2.sol |

---

## 📁 Implementation Files

**Created for you:**
1. `contracts/AttestationRegistryV2.sol` - Enhanced attestation with fees & validity
2. `contracts/OracleStakingV2.sol` - Enhanced staking with better slashing
3. `ORACLE_SYSTEM_ANALYSIS.md` - Full analysis and explanations

**Next steps:**
1. Review the V2 contracts
2. Test on Sepolia testnet
3. Deploy when ready
4. Update frontend to use V2

---

## 💡 Key Insights

**Economic Model:**
- Oracles earn 90% of fees (incentive to do good work)
- Platform earns 10% (sustainable revenue)
- Slashed funds compensate victims (builds trust)
- Burned tokens increase value (benefits holders)

**Reputation System:**
- Automatic updates prevent manipulation
- Time decay prevents oracle monopolies
- Clear incentives for good behavior
- Severe penalties for fraud

**Validity Control:**
- MSMEs know how long attestations last
- Oracles can adjust based on quality
- Prevents disputes about expiration
- Better for loan applications

---

## 🚀 Deployment Priority

**High Priority (Critical):**
1. ✅ Oracle fee distribution
2. ✅ MSME compensation on slashing
3. ✅ Automatic reputation updates

**Medium Priority (Important):**
4. ✅ Validity period control
5. ✅ Dispute resolution system
6. ✅ Time-based reputation decay

**Low Priority (Nice to have):**
7. ⚪ Platform fee withdrawal tracking
8. ⚪ Advanced collusion detection
9. ⚪ Oracle performance analytics

---

**Questions?** Review `ORACLE_SYSTEM_ANALYSIS.md` for detailed explanations!
