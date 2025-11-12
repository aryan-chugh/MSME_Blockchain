# ✅ Attestation Request System - localStorage Eliminated

**Date**: October 24, 2025  
**Goal**: Remove localStorage dependency for Oracle attestation requests and replace with on-chain storage

---

## 🔄 What Changed

### Smart Contract Updates (`AttestationRegistry.sol`)

#### **New Data Structures**

```solidity
struct AttestationRequest {
    uint256 id;
    address msme;
    bytes32 schemaId;
    string documentHash;
    string documentUrl;
    bytes additionalData;
    uint256 feePaid;
    uint256 timestamp;
    RequestStatus status;
    address assignedOracle;
    uint256 completedAt;
}

enum RequestStatus {
    Pending,      // Request created, waiting for oracle
    InProgress,   // Oracle assigned, verifying
    Completed,    // Attestation submitted
    Rejected,     // Oracle rejected
    Cancelled     // MSME cancelled
}
```

#### **New Storage Mappings**

```solidity
mapping(uint256 => AttestationRequest) public attestationRequests;
uint256 public requestCounter;
mapping(address => uint256[]) public msmeRequests;  // MSME => request IDs
mapping(address => uint256[]) public oracleRequests; // Oracle => request IDs
```

#### **New Events**

```solidity
event AttestationRequested(uint256 indexed requestId, address indexed msme, bytes32 indexed schemaId, uint256 feePaid, string documentHash);
event RequestAssigned(uint256 indexed requestId, address indexed oracle);
event RequestCompleted(uint256 indexed requestId, uint256 attestationIndex);
event RequestRejected(uint256 indexed requestId, address indexed oracle, string reason);
event RequestCancelled(uint256 indexed requestId, address indexed msme);
```

---

## 🆕 New Contract Functions

### For MSMEs

#### **1. requestAttestation()**
```solidity
function requestAttestation(
    bytes32 schemaId,
    string calldata documentHash,
    string calldata documentUrl,
    bytes calldata additionalData,
    uint256 feePaid
) external returns (uint256 requestId)
```
- **Purpose**: MSME creates an on-chain attestation request
- **Returns**: Unique request ID
- **Emits**: `AttestationRequested` event
- **Replaces**: localStorage storing in `MSMEDashboard.js`

#### **2. cancelRequest()**
```solidity
function cancelRequest(uint256 requestId) external
```
- **Purpose**: MSME cancels their own pending request
- **Requirement**: Request must be in `Pending` status

#### **3. getMSMERequests()**
```solidity
function getMSMERequests(address msme) external view returns (uint256[] memory)
```
- **Purpose**: Get all request IDs created by an MSME
- **Replaces**: localStorage filtering in frontend

---

### For Oracles

#### **1. getPendingRequests()**
```solidity
function getPendingRequests() external view returns (uint256[] memory)
```
- **Purpose**: Get all pending attestation requests
- **Returns**: Array of request IDs with status `Pending`
- **Replaces**: localStorage `attestationRequests` in `OracleDashboard.js`

#### **2. assignRequest()**
```solidity
function assignRequest(uint256 requestId) external onlyStakedOracle
```
- **Purpose**: Oracle assigns themselves to a request
- **Changes**: Status from `Pending` → `InProgress`
- **Emits**: `RequestAssigned` event

#### **3. rejectRequest()**
```solidity
function rejectRequest(uint256 requestId, string calldata reason) external onlyStakedOracle
```
- **Purpose**: Oracle rejects a request with reason
- **Changes**: Status to `Rejected`
- **Emits**: `RequestRejected` event
- **Replaces**: localStorage `attestationRejections`

#### **4. getOracleRequests()**
```solidity
function getOracleRequests(address oracle) external view returns (uint256[] memory)
```
- **Purpose**: Get all requests assigned to an oracle
- **Returns**: Array of request IDs

#### **5. getRequestDetails()**
```solidity
function getRequestDetails(uint256 requestId) external view returns (AttestationRequest memory)
```
- **Purpose**: Get full details of a specific request
- **Returns**: Complete `AttestationRequest` struct

---

### Updated Functions

#### **submitAttestation()** - Enhanced
```solidity
function submitAttestation(
    address msmeId,
    bytes32 schemaId,
    bytes calldata data,
    uint256 validityPeriod,
    uint256 requestId  // ← NEW PARAMETER
) external onlyStakedOracle
```
- **Added**: Optional `requestId` parameter (0 if not linked to request)
- **New Logic**: If requestId > 0, marks request as `Completed`
- **Emits**: `RequestCompleted` event when linked

---

## 🗑️ localStorage Items to Remove

### In `OracleDashboard.js`

#### **Remove:**
1. `localStorage.getItem('attestationRequests')` - Lines ~147, 428, 475
2. `localStorage.setItem('attestationRequests', ...)` - Lines ~459, 574
3. `localStorage.getItem('attestationRejections')` - Line ~440
4. `localStorage.setItem('attestationRejections', ...)` - Line ~451
5. `localStorage.getItem('oracleEarnings')` - Lines ~577, 613, 763
6. `localStorage.setItem('oracleEarnings', ...)` - Line ~588

#### **Replace With:**
1. **Load pending requests**: `attestationRegistry.getPendingRequests()`
2. **Load oracle's assigned requests**: `attestationRegistry.getOracleRequests(account)`
3. **Get request details**: `attestationRegistry.getRequestDetails(requestId)`
4. **Track earnings**: Query `AttestationMade` events filtered by `issuer == account`

---

### In `MSMEDashboard.js`

#### **Remove:**
1. `localStorage.getItem('attestationRequests')` - Line ~478
2. `localStorage.setItem('attestationRequests', ...)` - Line ~480

#### **Replace With:**
1. **Submit request**: Call `attestationRegistry.requestAttestation()`
2. **Load requests**: Call `attestationRegistry.getMSMERequests(account)`

---

## 📋 Implementation Steps

### Phase 1: Deploy Updated Contract ✅
- [x] Added AttestationRequest struct and mappings
- [x] Added request management functions
- [x] Added getter functions
- [x] Compiled successfully

### Phase 2: Update Frontend (Next)
- [ ] Update `MSMEDashboard.js` to call `requestAttestation()`
- [ ] Update `OracleDashboard.js` to query blockchain instead of localStorage
- [ ] Add event listeners for real-time updates
- [ ] Remove all localStorage references

### Phase 3: Redeploy to Sepolia
- [ ] Deploy updated `AttestationRegistry` contract
- [ ] Update frontend contract addresses
- [ ] Test end-to-end flow

---

## 🎯 Benefits

### Before (localStorage)
❌ Data only visible in one browser  
❌ Lost if cache cleared  
❌ Not shared between users  
❌ No audit trail  
❌ Manually managed state  

### After (On-Chain)
✅ **Decentralized**: Data stored on blockchain  
✅ **Persistent**: Cannot be lost  
✅ **Shared**: All users see same data  
✅ **Auditable**: Full history via events  
✅ **Trustworthy**: Immutable records  
✅ **Real-time**: Event-driven updates  

---

## 🔄 Migration Flow

### Old Flow (localStorage)
```
MSME Dashboard
  ↓
1. Create request object
2. localStorage.setItem('attestationRequests', JSON.stringify(request))
  ↓
Oracle Dashboard
3. localStorage.getItem('attestationRequests')
4. Filter by status
5. Display to oracle
```

### New Flow (Blockchain)
```
MSME Dashboard
  ↓
1. Call attestationRegistry.requestAttestation(...)
2. Transaction mined → Event emitted
  ↓
Oracle Dashboard  
3. Call attestationRegistry.getPendingRequests()
4. For each ID, call getRequestDetails(id)
5. Display to oracle
  ↓
Oracle Actions
6. assignRequest(id) → Status: InProgress
7. submitAttestation(..., requestId) → Status: Completed
   OR rejectRequest(id, reason) → Status: Rejected
```

---

## 📊 Data Flow

```
┌─────────────┐
│    MSME     │
│  Dashboard  │
└──────┬──────┘
       │
       │ requestAttestation()
       ↓
┌─────────────────────┐
│  AttestationRegistry│ ← Stores request on-chain
│    (Blockchain)     │   Emits AttestationRequested event
└──────┬──────────────┘
       │
       │ getPendingRequests()
       ↓
┌─────────────┐
│   Oracle    │
│  Dashboard  │
└──────┬──────┘
       │
       ├─→ assignRequest() → InProgress
       ├─→ submitAttestation() → Completed
       └─→ rejectRequest() → Rejected
```

---

## ✅ Next Steps

1. **Update MSMEDashboard.js**:
   - Replace localStorage submission with contract call
   - Query user's requests from blockchain

2. **Update OracleDashboard.js**:
   - Load requests via `getPendingRequests()`
   - Display request details from blockchain
   - Call contract functions for assign/reject/attest

3. **Add Event Listeners**:
   - Listen for `AttestationRequested` events
   - Auto-refresh when new requests arrive
   - Show real-time status updates

4. **Redeploy**:
   - Deploy updated contract to Sepolia
   - Update frontend .env with new address
   - Test complete workflow

---

## 🚀 Impact

This eliminates **ALL localStorage usage** for Oracle/MSME attestation workflow and moves to a fully decentralized, blockchain-based system!

**Status**: ✅ Smart contract updated and compiled  
**Next**: Update frontend to use new contract functions
