# 🎯 V3 Multi-Oracle Workflow - Complete Guide

## 📊 System Status

### ✅ What's Working:
1. **V3 Contracts Deployed** on Sepolia
   - OracleStakingV3: `0xAA3a2F385374459fDebB35f6Bea87EFd4d18dBb9`
   - AttestationRegistryV3: `0x129e293d574a3F9D5652e477076C31bd1b694991`
   - CIToken: `0xb9ED4a38536BB4B3CbC3e24d5761E7E84D16634d`

2. **10 Schemas Registered** and active
3. **Oracle Staking** working (2+ oracles staked with 510K CIT each)
4. **Frontend** integrated with V3 ABIs
5. **Request Creation** working (MSME can create requests)

### ✅ What Was Just Fixed:
1. **Commit-Reveal Attestation** - Now using V3 cryptographic workflow
2. **Rejection Workflow** - Using commit-reveal with approved=false
3. **Oracle Assignment Check** - Validates oracle is assigned before committing
4. **ABI Updates** - Added complete `getRequestDetails` function

---

## 🔄 Complete V3 Multi-Oracle Workflow

### **Phase 1: MSME Creates Request**

**Location:** MSME Dashboard → Request New Attestation

**Steps:**
1. Select schema (e.g., "GST Revenue")
2. Set fee amount (determines oracle count):
   - **<200 CIT** → Simple tier → 1 oracle
   - **200-499 CIT** → Medium tier → 3 oracles
   - **500-999 CIT** → Complex tier → 5 oracles
   - **1000+ CIT** → Critical tier → 7 oracles
3. Set validity period (30-365 days via slider)
4. Check "Force Single Oracle" for testing (bypasses multi-oracle requirement)
5. Fill document details (hash, URL, additional data)
6. **Submit:**
   - Transaction 1: Approve CIT tokens
   - Transaction 2: Create request

**Result:**
- ✅ Request created on-chain
- ✅ System **AUTO-ASSIGNS** oracle(s) based on:
  - Fee amount (complexity tier)
  - Oracle reputation
  - Oracle cooldown period
  - Weighted random selection
  - Diversity tracking

---

### **Phase 2: Oracle Views Pending Request**

**Location:** Oracle Dashboard → Pending Attestation Requests

**What Oracle Sees:**
```
Schema: GST Revenue
MSME Address: 0x786365...
Fee: 100 CIT
Status: Pending
Assigned Oracles: [0x786365..., ...] (if multi-oracle)
```

**Action:**
- Click "Review" button

---

### **Phase 3: Oracle Commits Attestation (Approval)**

**Location:** Request Details Modal → "✅ Verify & Submit Attestation" button

**Process:**

#### Step 1: Validation
- ✅ Check oracle is assigned to this request
- ✅ Check commitment period is still open

#### Step 2: Prepare Data
```javascript
// Attestation data (what oracle is committing to)
attestationData = encode(
  [bool approved, string reason],
  [true, "Document verified successfully"]
)

// Generate random secret (32 bytes)
secret = randomBytes(32)

// Create commitment hash
commitmentHash = keccak256(attestationData + secret)
```

#### Step 3: Submit Commitment
- **Transaction:** `commitAttestation(requestId, commitmentHash)`
- **On-Chain:** Stores hash, doesn't reveal decision yet
- **Local Storage:** Saves secret for reveal phase

**Confirmation Message:**
```
✅ Commitment Submitted! (Phase 1/2)

📝 Your commitment has been recorded on-chain.
⏳ Wait for all assigned oracles to commit.
🔓 You'll reveal your attestation in the next phase.

Your secret has been stored locally for the reveal phase.
```

---

### **Phase 4: Oracle Commits Rejection (Alternative)**

**Location:** Request Details Modal → "❌ Reject Request" button

**Process:**

#### Difference from Approval:
```javascript
// Rejection attestation data
attestationData = encode(
  [bool approved, string reason],
  [false, "Document verification failed"] // approved=FALSE
)

// Same commit process
secret = randomBytes(32)
commitmentHash = keccak256(attestationData + secret)
```

#### Submit Rejection Commitment
- **Transaction:** `commitAttestation(requestId, commitmentHash)`
- **Result:** Rejection is hidden until reveal phase

---

### **Phase 5: Oracle Reveals Attestation**

**When:** After all oracles have committed (or for testing: immediately)

**Process:**

#### Step 1: Retrieve Secret
- From localStorage: `secret_${requestId}`
- From localStorage: `attestationData_${requestId}`

#### Step 2: Submit Reveal
```javascript
// Transaction
revealAttestation(
  requestId,
  attestationData,    // Original data (includes approved true/false)
  validityPeriod,     // 365 days in seconds
  secret              // Original secret
)
```

#### Step 3: Contract Verification
- Contract recalculates: `keccak256(attestationData + secret)`
- Compares with stored commitment hash
- ✅ If match: Accept reveal
- ❌ If no match: Reject (slashing penalty)

**Confirmation Message:**
```
✅ Attestation Revealed! (Phase 2/2)

🎉 Your attestation is now on-chain.
⏳ Waiting for other oracles to reveal.
💰 Fee will be distributed after consensus.
```

---

### **Phase 6: Consensus Calculation (Automatic)**

**Trigger:** When all oracles have revealed OR reveal deadline passes

**Contract Logic:**

#### Count Votes
```
Majority: Oracles who agreed (approved=true)
Minority: Oracles who disagreed (approved=false)
```

#### Consensus Rules
- **Threshold:** 66% agreement required
- **Example (3 oracles):**
  - 3 agree → Consensus REACHED (100%)
  - 2 agree, 1 rejects → Consensus REACHED (66%)
  - 1 agrees, 2 reject → NO consensus (33%)

#### Fee Distribution
**If consensus reached:**
- Majority oracles: Split 90% of fee equally
- Platform: Keep 10% of fee
- Minority oracles: Get 0 CIT (no slashing, just no reward)

**If no consensus:**
- All oracles: Get 0 CIT
- Fee returned to MSME
- All oracles: Reputation penalty

---

### **Phase 7: Attestation Created (If Consensus)**

**What Happens:**
```
✅ New attestation created on-chain
   - MSME: request.msme
   - Schema: request.schemaId
   - Data: consensusData (majority's attestation)
   - Validity: Until (now + validityPeriod)
   - Issuer: AttestationRegistry contract
```

**MSME Dashboard Shows:**
- ✅ "My Attestations" section updated
- New attestation with:
  - Schema name
  - Validity period
  - Expiry date
  - Status: Active

---

## 🔧 Complete Function Reference

### V3 Contract Functions Used

#### 1. Request Management
```solidity
function requestAttestation(
    bytes32 schemaId,
    string calldata documentHash,
    string calldata documentUrl,
    bytes calldata additionalData,
    uint256 feePaid,
    uint256 requestedValidityPeriod,
    bool forceSingleOracle
) external returns (uint256 requestId)

function getRequestDetails(uint256 requestId) 
    external view returns (AttestationRequest memory)

function getPendingRequests() 
    external view returns (uint256[] memory)

function getOracleRequests(address oracle) 
    external view returns (uint256[] memory)
```

#### 2. Commit-Reveal
```solidity
function commitAttestation(
    uint256 requestId,
    bytes32 commitmentHash
) external

function revealAttestation(
    uint256 requestId,
    bytes calldata attestationData,
    uint256 validityPeriod,
    bytes32 secret
) external
```

#### 3. Consensus
```solidity
function getConsensusResult(uint256 requestId) 
    external view returns (ConsensusResult memory)
    
// ConsensusResult struct:
// - address[] majorityOracles
// - address[] minorityOracles  
// - uint256 majorityCount
// - uint256 totalOracles
// - bytes32 majorityHash
// - bool consensusReached
```

---

## 🎓 Testing Scenarios

### Scenario 1: Single Oracle (Simple)
**Fee:** 100 CIT (forceSingleOracle=true)
**Expected:**
1. 1 oracle assigned
2. Oracle commits → reveals
3. Immediate consensus (100%)
4. Oracle gets 90 CIT
5. Attestation created

### Scenario 2: Multi-Oracle Agreement (Medium)
**Fee:** 300 CIT (forceSingleOracle=false)
**Expected:**
1. 3 oracles assigned
2. All 3 commit → reveal (all approve)
3. Consensus reached (100%)
4. Each oracle gets 90 CIT (270 total)
5. Platform gets 30 CIT
6. Attestation created

### Scenario 3: Multi-Oracle Disagreement (Medium)
**Fee:** 300 CIT (forceSingleOracle=false)
**Expected:**
1. 3 oracles assigned
2. 2 approve, 1 rejects
3. Consensus reached (66%)
4. 2 majority oracles get 135 CIT each
5. 1 minority oracle gets 0 CIT
6. Attestation created with majority decision

### Scenario 4: No Consensus
**Fee:** 300 CIT (forceSingleOracle=false)
**Expected:**
1. 3 oracles assigned
2. 1 approves, 2 reject
3. NO consensus (33% < 66%)
4. All oracles get 0 CIT
5. Fee returned to MSME
6. All oracles: reputation penalty

---

## 🚨 Important Notes

### Current Limitations:
1. **Pending Requests Filter:** Shows ALL pending requests, not just those assigned to current oracle
2. **Reveal UI:** Manual reveal via confirmation dialog (production should auto-detect when all committed)
3. **Consensus Display:** Not shown in UI yet (need to add consensus result section)

### Security Features:
1. ✅ **Commit-Reveal:** Prevents oracle collusion
2. ✅ **Hash Verification:** Invalid secret = slashing
3. ✅ **Assignment Check:** Only assigned oracles can commit
4. ✅ **Time Bounds:** Commitment and reveal deadlines enforced
5. ✅ **Cooldown Periods:** Prevents oracle monopoly (30 days)

### Anti-Gaming Measures:
1. ✅ **Weighted Random:** Prevents predictable selection
2. ✅ **Diversity Tracking:** Ensures different oracles get chances
3. ✅ **Reputation Impact:** Bad behavior reduces selection probability
4. ✅ **Stake Requirements:** Higher tiers required for higher value attestations

---

## 📝 Next Steps for Full Production

### Frontend Enhancements Needed:
1. **Filter pending requests** to show only assigned to current oracle
2. **Display assigned oracles** in request details
3. **Show commitment status** (who has committed, who hasn't)
4. **Auto-detect reveal readiness** (all oracles committed)
5. **Display consensus results** after reveal phase
6. **Show oracle earnings breakdown** by request
7. **Add request status timeline** (created → assigned → committing → revealing → completed)

### Testing Tasks:
1. ✅ Single oracle flow (already tested)
2. ⏳ Multi-oracle agreement (need 3+ oracles)
3. ⏳ Multi-oracle disagreement
4. ⏳ No consensus scenario
5. ⏳ Cooldown period enforcement
6. ⏳ Diversity tracking
7. ⏳ Reputation impact on selection

---

## 💡 Quick Command Reference

### Check Oracle Stake:
```powershell
$env:CHECK_ADDRESS='0xYourAddress'; npx hardhat run scripts/check-stake.js --network sepolia
```

### Mint CIT Tokens:
```powershell
$env:TARGET_ADDRESS='0xYourAddress'; npx hardhat run scripts/mint-tokens.js --network sepolia
```

### Stake as Oracle:
```powershell
npx hardhat run scripts/stake-oracle.js --network sepolia
```

### Register Schemas:
```powershell
npx hardhat run scripts/register-schemas-v3.js --network sepolia
```

---

## ✅ Workflow Summary (TL;DR)

1. **MSME** → Creates request → System auto-assigns oracle(s)
2. **Oracle** → Reviews request → Commits decision (hidden)
3. **Oracle** → Reveals decision (after all commit)
4. **Contract** → Calculates consensus → Distributes fees
5. **MSME** → Gets attestation (if consensus reached)

**Key Difference from V2:** No manual oracle assignment. Everything is automatic and cryptographically secure through commit-reveal.
