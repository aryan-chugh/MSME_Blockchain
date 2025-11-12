# 📋 Attestation Request & Verification Flow

## Overview
The attestation system now has a complete document submission and verification workflow where MSMEs submit documents and Oracles review and verify them.

---

## 🏢 MSME Flow (Submit Documents for Attestation)

### Step 1: Navigate to Attestations Tab
1. Go to **MSME Dashboard**
2. Click **Attestations** tab
3. Click one of the attestation type buttons:
   - 🧾 **GST Revenue**
   - 🏦 **Bank Statements** 
   - ✅ **KYC Verification**
   - 📊 **Credit Score**

### Step 2: Fill Document Submission Form
The form will appear with the following fields:

| Field | Description | Example |
|-------|-------------|---------|
| **Document Type** | Pre-filled based on schema | "GST Return Filing" |
| **Document URL** | IPFS hash or URL to document | `ipfs://QmXxx...` or `https://example.com/doc.pdf` |
| **Document Hash** | SHA-256 hash for integrity | `0x1234567890abcdef...` |
| **Additional Info** | Context for oracle | "FY 2024-25, Q2 returns" |

### Step 3: Submit Request
- Click **"📤 Submit for Verification"**
- Request is stored and visible to all oracles
- Status: **Pending** ⏳

### Step 4: Track Your Requests
View all your attestation requests in the table:
- **Schema**: Type of attestation
- **Document Type**: What you submitted
- **Document Hash**: First 20 chars shown
- **Status**: Pending / Verified / Rejected
- **Requested**: Date submitted

### Step 5: Wait for Oracle Verification
- Oracles will review your document
- When verified, status changes to **Verified** ✅
- Attestation appears in "Your Attestations" section

---

## 🔍 Oracle Flow (Review & Verify Documents)

### Step 1: Become an Oracle
1. Go to **Oracle Dashboard**
2. Stake minimum 50,000 CIT tokens
3. You're now an active oracle!

### Step 2: View Pending Requests
In your oracle dashboard, you'll see:
- **Pending Attestation Requests** table
- Real-time updates (refreshes every 3 seconds)
- Number of pending requests

Table shows:
- Schema type
- MSME address
- Document type
- Date requested
- Fee earned (100-150 CIT)

### Step 3: Review Request Details
Click **"Review"** button to see full details:
- MSME Address
- Document Type
- **Document URL** (clickable link)
- **Document Hash** (for verification)
- Additional Information
- Fee amount

### Step 4: Verify Document
**Verification Steps:**
1. ✅ Download document from URL
2. ✅ Calculate SHA-256 hash
3. ✅ Compare with provided hash
4. ✅ Cross-check with official sources:
   - GST Portal for GST returns
   - Bank letterhead verification
   - Credit bureau authenticity
5. ✅ Verify data accuracy

### Step 5: Submit Decision
Two options:

**✅ Approve:**
- Click **"✅ Verify & Submit Attestation"**
- Earns you:
  - 100-150 CIT fee
  - +5 Reputation points
  - +1 Attestation count
- Status changes to **Verified**
- MSME receives attestation

**❌ Reject:**
- Click **"❌ Reject Request"**
- Document issues or fraud detected
- Status changes to **Rejected**
- MSME notified

---

## 📊 Data Storage

### Current Implementation (Frontend Demo)
- Uses **localStorage** for shared state
- MSMEs and Oracles see same data
- Refreshes every 3 seconds
- Works across tabs/windows

### Production Implementation (Recommended)
```javascript
// Replace localStorage with:
1. IPFS for document storage
2. Oracle Network (Chainlink, etc.) for requests
3. Smart contract events for state
4. Decentralized database (Ceramic, etc.)
```

---

## 🔄 Status States

| Status | Icon | Description | Who Can See |
|--------|------|-------------|-------------|
| **Pending** | ⏳ | Awaiting oracle review | All oracles |
| **Verified** | ✅ | Oracle approved | MSME only |
| **Rejected** | ❌ | Oracle rejected | MSME only |

---

## 💰 Fee Structure

| Attestation Type | Fee (CIT) | Required Tier |
|------------------|-----------|---------------|
| KYC Verification | 80 | Tier 1 |
| GST Revenue | 100 | Tier 1 |
| Credit Score | 120 | Tier 1 |
| Bank Statements | 150 | Tier 2 |

---

## 🧪 Testing the Flow

### Test Scenario 1: Complete Verification
1. **As MSME** (Account #3):
   - Submit GST Revenue attestation
   - Document URL: `https://example.com/gst-return.pdf`
   - Hash: `0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`
   - Additional: "FY 2024-25 Q2"

2. **Switch to Oracle** (Account #1):
   - See request in pending table
   - Click "Review"
   - View all details
   - Click "✅ Verify & Submit Attestation"

3. **Switch back to MSME**:
   - Request status now "Verified"
   - Attestation appears in attestations list

### Test Scenario 2: Rejection
1. **As MSME**: Submit invalid document
2. **As Oracle**: Review and click "❌ Reject Request"
3. **As MSME**: See rejected status

---

## 🎯 Key Improvements Made

### Before (Hardcoded):
```javascript
// Just a button that simulates attestation
requestAttestation('GST Revenue')
// Alert box → Done
```

### After (Proper Flow):
```javascript
// Complete workflow:
1. MSME fills form with document details
2. Request stored and visible to oracles
3. Oracle reviews actual document
4. Oracle verifies hash and data
5. Oracle approves/rejects
6. Status updates for both parties
7. Real-time synchronization
```

---

## 📱 UI Features

### MSME Dashboard
- ✅ Comprehensive form with validation
- ✅ Document URL/hash input
- ✅ Request tracking table
- ✅ Status indicators
- ✅ Real-time updates

### Oracle Dashboard
- ✅ Live pending requests feed
- ✅ Detailed review modal
- ✅ Clickable document links
- ✅ Verification checklist
- ✅ Approve/Reject actions
- ✅ Reputation & fee tracking

---

## 🚀 Next Steps for Production

1. **Document Storage**
   - Integrate IPFS/Arweave
   - Encrypted document uploads
   - Access control

2. **Oracle Network Integration**
   - Connect to Chainlink oracles
   - Multi-oracle consensus
   - Automated verification APIs

3. **Smart Contract Events**
   - Listen to AttestationRegistry events
   - On-chain request queue
   - Automated fee distribution

4. **Enhanced Security**
   - Document encryption
   - Zero-knowledge proofs
   - Multi-signature approvals

---

**The attestation flow is now production-ready for demo and testing!** 🎉
