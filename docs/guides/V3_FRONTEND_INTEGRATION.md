# V3 Multi-Oracle Frontend Integration - Complete

## ✅ What's Been Implemented

### 1. **V3 Contract ABIs Updated** (`frontend/src/utils/contracts.js`)

**New V3 Functions Added:**
```javascript
// Multi-oracle attestation request with validity period
requestAttestation(
  schemaId, 
  documentHash, 
  documentUrl, 
  additionalData, 
  feePaid,              // ← User selects fee amount
  requestedValidityPeriod, // ← NEW: Validity in seconds
  forceSingleOracle      // ← NEW: Opt-in for single oracle
)

// Commit-reveal functions
commitAttestation(requestId, commitmentHash)
revealAttestation(requestId, attestationData, validityPeriod, secret)
getConsensusResult(requestId) // View consensus details

// Fee threshold constants
MULTI_ORACLE_THRESHOLD() // 200 CIT
COMPLEX_THRESHOLD()      // 500 CIT
CRITICAL_THRESHOLD()     // 1000 CIT
```

---

### 2. **Complexity Calculation Helpers** (`frontend/src/utils/contracts.js`)

**New Helper Functions:**
```javascript
// Calculate security tier based on fee amount
calculateComplexity(feeAmount)
// Returns: { tier: 'Medium', oracles: 3, color: '#f59e0b' }

// Format complexity for display
formatComplexityTier(complexityEnum)
// Input: 0, 1, 2, 3
// Output: { name: 'Simple', color: '#10b981', oracles: 1 }

// Get recommended fee for desired oracle count
getRecommendedFee(oracleCount)
// Input: 3 → Output: '200'
```

**Complexity Tiers:**
| Fee Range | Tier | Oracles | Security | Color |
|-----------|------|---------|----------|-------|
| < 200 CIT | Simple | 1 | Fast & economical | Green |
| 200-499 CIT | Medium | 3 | Balanced security | Amber |
| 500-999 CIT | Complex | 5 | High security | Orange |
| 1000+ CIT | Critical | 7 | Byzantine fault tolerance | Red |

---

### 3. **MSME Dashboard - V3 Attestation Form** (`frontend/src/components/MSMEDashboard.js`)

**New State Variables:**
```javascript
const [requestedValidityDays, setRequestedValidityDays] = useState(180); // 6 months default
const [forceSingleOracle, setForceSingleOracle] = useState(false);
const [feeAmount, setFeeAmount] = useState('200'); // Medium tier default
```

**New Form Fields:**

#### A. **Dynamic Fee Selector with Real-time Complexity Display**
```jsx
<input 
  type="number"
  value={feeAmount}
  onChange={(e) => setFeeAmount(e.target.value)}
  min="50"
  max="10000"
  step="50"
/>
<span style={{ 
  background: complexity.color,
  color: 'white'
}}>
  {complexity.oracles} Oracle{complexity.oracles > 1 ? 's' : ''}
</span>
```

**Features:**
- Real-time oracle count display
- Color-coded security level
- Automatic tier calculation
- Min/max validation

#### B. **Validity Period Slider**
```jsx
<input 
  type="range"
  min="30"
  max="365"
  step="30"
  value={requestedValidityDays}
  onChange={(e) => setRequestedValidityDays(parseInt(e.target.value))}
/>
<span>{requestedValidityDays} days</span>
```

**Features:**
- Visual slider control
- 30-365 days range
- Real-time day counter
- 30-day increments

#### C. **Single Oracle Override**
```jsx
<input 
  type="checkbox"
  checked={forceSingleOracle}
  onChange={(e) => setForceSingleOracle(e.target.checked)}
/>
Force Single Oracle (faster, lower cost, less secure)
```

**Features:**
- Bypass multi-oracle for speed
- Cost optimization option
- Security trade-off clearly shown

---

### 4. **Enhanced Confirmation Dialogs**

**Before Submission:**
```
💰 V3 Multi-Oracle Attestation Request

Schema: GST Registration
Fee: 500 CIT tokens
Security Level: Complex (5 oracles)
Validity: 180 days

🔒 Multi-oracle consensus verification:
• 5 independent oracles will verify
• Majority (66%+) must agree
• Byzantine fault tolerant

The fee will be distributed among verifying oracles.

Continue?
```

**After Submission:**
```
✅ V3 Multi-Oracle Attestation Request Submitted!

Request ID: 42
Schema: GST Registration
Fee Paid: 500 CIT
Security Level: Complex (5 oracles)
Validity Period: 180 days
Document Hash: 0x1234567890abcdef...

🔒 5 oracles will independently verify your documents.
Majority (66%+) consensus required for approval.

Transaction: https://sepolia.etherscan.io/tx/0x...
```

---

### 5. **Visual Improvements**

**Security Level Indicator:**
- **Simple** (1 oracle): 🟢 Green badge
- **Medium** (3 oracles): 🟡 Amber badge
- **Complex** (5 oracles): 🟠 Orange badge
- **Critical** (7 oracles): 🔴 Red badge

**Form Section Styling:**
```css
background: #edf2f7;
border: 2px solid #667eea;
border-radius: 8px;
padding: 16px;
```

**Informational Tips:**
- Security tier explanations
- Oracle consensus description
- Validity period guidance
- Fee structure breakdown

---

## 🎯 How It Works (User Journey)

### Step 1: Select Schema
User clicks "Request New Attestation" and selects schema (e.g., GST Registration)

### Step 2: Enter Document Details
- Document type
- Document URL/IPFS hash
- SHA-256 hash (with test generator)
- Additional information

### Step 3: Configure V3 Security ✨ **NEW**
**Fee Amount Selection:**
- User enters fee amount (e.g., 500 CIT)
- Badge shows "5 Oracles" in orange
- Tooltip explains "Complex" tier security

**Validity Period:**
- User slides to 180 days
- Real-time counter updates
- Tooltip: "Oracles may adjust ±20%"

**Override Option:**
- Checkbox to force single oracle
- Warning shown: "faster, lower cost, less secure"

### Step 4: Confirm & Submit
**Confirmation Dialog Shows:**
- Total fee: 500 CIT
- Security level: Complex (5 oracles)
- Multi-oracle explanation
- Consensus requirement (66%+)

### Step 5: Blockchain Transaction
**Three Transactions:**
1. Approve CIT token spend
2. Request attestation on-chain
3. Confirmation with request ID

### Step 6: Oracle Verification (Backend)
**V3 Multi-Oracle Process:**
```
Request Created
    ↓
System assigns 5 oracles (weighted random)
    ↓
COMMIT PHASE: Each oracle submits hash(attestation + secret)
    ↓
REVEAL PHASE: Each oracle reveals actual attestation
    ↓
CONSENSUS: Compare all 5 attestations
    ↓
If 3+ agree (66%+): Consensus reached ✅
    ↓
Distribute fees: Majority oracles paid
    ↓
Create final attestation with validity period
```

---

## 📊 Key Improvements Visible in Frontend

### 1. **Validity Period Control** ✅
- **Before V1:** Oracle decides validity, MSME has no input
- **Now V3:** MSME requests 30-365 days, oracle confirms (±20%)

### 2. **Dynamic Fee-Based Security** ✅
- **Before V1:** Fixed fee per schema
- **Now V3:** User chooses fee = chooses security level
  - 100 CIT → 1 oracle (fast)
  - 500 CIT → 5 oracles (secure)
  - 1000 CIT → 7 oracles (maximum security)

### 3. **Multi-Oracle Transparency** ✅
- **Before V1:** Single oracle verification (hidden)
- **Now V3:** Shows oracle count, consensus requirement, Byzantine fault tolerance

### 4. **Security vs Cost Trade-off** ✅
- **Before V1:** No choice, one size fits all
- **Now V3:** User decides based on document importance
  - Low-value doc: 100 CIT, 1 oracle
  - Critical doc: 1000 CIT, 7 oracles, consensus

### 5. **Real-time Complexity Calculation** ✅
- **Before V1:** No visibility into verification process
- **Now V3:** Live badge showing oracle count as fee changes

---

## 🔍 Testing the V3 Features

### Test Case 1: Simple Tier (1 Oracle)
```
Fee: 100 CIT
Expected: Green badge "1 Oracle"
Validity: 90 days
Force single: Auto-enabled
```

### Test Case 2: Medium Tier (3 Oracles)
```
Fee: 250 CIT
Expected: Amber badge "3 Oracles"
Validity: 180 days
Force single: Disabled
Result: Consensus calculation with 3 oracles
```

### Test Case 3: Complex Tier (5 Oracles)
```
Fee: 750 CIT
Expected: Orange badge "5 Oracles"
Validity: 270 days
Force single: Disabled
Result: Consensus calculation with 5 oracles
```

### Test Case 4: Critical Tier (7 Oracles)
```
Fee: 2000 CIT
Expected: Red badge "7 Oracles"
Validity: 365 days
Force single: Disabled
Result: Maximum Byzantine fault tolerance
```

---

## 🚀 Deployment Status

### Contracts (Sepolia Testnet)
- ✅ **OracleStakingV3:** `0xAA3a2F385374459fDebB35f6Bea87EFd4d18dBb9`
- ✅ **AttestationRegistryV3:** `0x129e293d574a3F9D5652e477076C31bd1b694991`
- ✅ **Schemas Registered:** 5 (GST, Financial Audit, Incorporation, Bank Statement, Business License)

### Frontend
- ✅ **Updated ABIs:** V3 functions available
- ✅ **Complexity Helpers:** Calculation functions added
- ✅ **MSME Dashboard:** V3 form fields integrated
- ✅ **Server:** Running at http://localhost:3000
- ✅ **Compilation:** Successful

---

## 📸 Screenshots (Expected UI)

### Attestation Request Form (V3)
```
┌─────────────────────────────────────────┐
│  Submit GST Registration Attestation    │
├─────────────────────────────────────────┤
│  Document Type: GST Return Filing       │
│  Document URL: ipfs://QmXxx...          │
│  Document Hash: 0x1234...               │
│  Additional Info: Q4 2024 Returns       │
│                                         │
│  ┌─ 🔒 V3 Multi-Oracle Verification ─┐ │
│  │                                    │ │
│  │  Fee (CIT): [500]  [5 Oracles 🟠] │ │
│  │                                    │ │
│  │  💡 Security Tiers:                │ │
│  │  • Simple (1): <200 CIT            │ │
│  │  • Medium (3): 200-499 CIT         │ │
│  │  • Complex (5): 500-999 CIT  ← YOU │ │
│  │  • Critical (7): 1000+ CIT         │ │
│  │                                    │ │
│  │  ☐ Force Single Oracle             │ │
│  │                                    │ │
│  │  Validity: [━━━●━━] 180 days       │ │
│  │  Oracles may adjust ±20%           │ │
│  └────────────────────────────────────┘ │
│                                         │
│  [📤 Submit for Verification]  [Cancel] │
└─────────────────────────────────────────┘
```

---

## 🎉 Summary of Changes

### Files Modified (3):
1. **frontend/src/utils/contracts.js**
   - Added V3 ABIs (requestAttestation with 7 params)
   - Added complexity calculation helpers
   - Added fee recommendation functions

2. **frontend/src/components/MSMEDashboard.js**
   - Added validity period state (30-365 days)
   - Added forceSingleOracle checkbox
   - Added dynamic fee selector
   - Updated confirmation dialogs
   - Enhanced visual feedback

3. **frontend/.env**
   - Updated contract addresses to V3

### New Features (5):
1. ✅ **Validity Period Control** - MSME selects 30-365 days
2. ✅ **Dynamic Fee/Security** - Fee determines oracle count
3. ✅ **Real-time Complexity Badge** - Visual security indicator
4. ✅ **Single Oracle Override** - Cost optimization option
5. ✅ **Enhanced Confirmations** - Multi-oracle info shown

### Removed Legacy Code:
- ❌ Fixed fee structure per schema
- ❌ V1 requestAttestation (5 params → 7 params)
- ❌ Hardcoded validity periods

---

## 🔧 Next Steps for Testing

1. **Open Frontend:** http://localhost:3000
2. **Connect Wallet:** MetaMask/Rabby on Sepolia
3. **Navigate to:** MSME Dashboard → Request Attestation
4. **Test Scenarios:**
   - Submit 100 CIT request (1 oracle)
   - Submit 300 CIT request (3 oracles)
   - Submit 600 CIT request (5 oracles)
   - Submit 1500 CIT request (7 oracles)
   - Adjust validity slider (30-365 days)
   - Toggle single oracle checkbox

5. **Verify on Blockchain:**
   - Check request complexity on Sepolia
   - Verify oracle assignment count
   - Confirm validity period stored

---

## ✅ All User Requests Implemented

| Requirement | Status | Details |
|------------|--------|---------|
| Validity field for attestations | ✅ Done | Slider: 30-365 days |
| Dynamic fee for multi-oracle | ✅ Done | Fee → Oracle count (1, 3, 5, 7) |
| All improvements visible in frontend | ✅ Done | Real-time badges, complexity calculator |
| Byzantine fault tolerance | ✅ Done | 7 oracles for critical tier |
| Cost vs security trade-off | ✅ Done | User chooses fee = security level |

**Status:** 🎉 **All V3 features fully integrated and visible in frontend!**

The frontend now provides complete visibility into the V3 multi-oracle consensus system, allowing MSMEs to make informed decisions about security vs cost trade-offs for their attestation requests.
