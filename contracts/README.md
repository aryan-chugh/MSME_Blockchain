# Smart Contracts Documentation

This directory contains all the Solidity smart contracts for the MSME Credit Platform.

## Core Contracts

### 1. CIToken.sol
**Purpose**: Platform utility token (ERC-20)

**Key Features**:
- Standard ERC-20 implementation
- Mintable by owner
- Burnable by token holders
- Used for oracle staking and platform fees

**Key Functions**:
- `mint(address to, uint256 amount)` - Mint new tokens (owner only)
- `burn(uint256 amount)` - Burn caller's tokens
- `burnFrom(address from, uint256 amount)` - Burn tokens with allowance

---

### 2. MSMEIdentity.sol
**Purpose**: Self-sovereign identity for each MSME

**Key Features**:
- Owner-controlled data storage
- Operator permissions for trusted contracts
- Key-value data structure
- Batch data operations

**Key Functions**:
- `setData(bytes32 key, bytes calldata value)` - Store data
- `getData(bytes32 key)` - Retrieve data
- `approveOperator(address operator)` - Grant write permissions
- `revokeOperator(address operator)` - Revoke permissions

**Usage Example**:
```javascript
// Store GST number
const key = ethers.keccak256(ethers.toUtf8Bytes("gst-number"));
const value = ethers.toUtf8Bytes("27AABCU9603R1ZM");
await identity.setData(key, value);
```

---

### 3. OracleStaking.sol
**Purpose**: Oracle staking and reputation management

**Key Features**:
- Minimum stake requirement: 50,000 CIT
- Oracle reputation scoring
- Tiered staking levels
- Slashing mechanism for fraud

**Key Functions**:
- `stake(uint256 amount)` - Stake CIT tokens to become oracle
- `withdraw(uint256 amount)` - Withdraw staked tokens
- `slash(address oracle, uint256 amount, string reason)` - Slash malicious oracle
- `getOracleTier(address oracle)` - Get oracle's tier level

**Oracle Tiers**:
- Tier 1: 50K+ CIT
- Tier 2: 200K+ CIT
- Tier 3: 500K+ CIT
- Tier 4: 1M+ CIT

---

### 4. AttestationRegistry.sol
**Purpose**: Store verifiable claims from oracles

**Key Features**:
- Schema-based attestations
- Expiry and revocation support
- Multi-oracle verification
- Public attestation visibility

**Key Functions**:
- `registerSchema(bytes32 schemaId, string name, string description)` - Register schema
- `submitAttestation(address msmeId, bytes32 schemaId, bytes data, uint256 validityPeriod)` - Submit attestation
- `revokeAttestation(address msmeId, uint256 index)` - Revoke attestation
- `getAttestationsBySchema(address msmeId, bytes32 schemaId)` - Query attestations

**Standard Schemas**:
- `gst-revenue` - GST revenue verification
- `bank-statements` - Bank statement verification
- `kyc-basic` - Basic KYC verification
- `credit-score` - Credit bureau score

---

### 5. LoanMarketplace.sol
**Purpose**: Credit discovery via sealed-bid auctions

**Key Features**:
- Sealed-bid auction mechanism
- Two-phase process (commit & reveal)
- Automatic winner selection (lowest rate)
- Request lifecycle management

**Key Functions**:
- `createLoanRequest(...)` - MSME creates loan request
- `commitBid(uint256 requestId, bytes32 commitment)` - Lender commits sealed bid
- `revealBid(uint256 requestId, uint256 rateBP, bytes32 nonce)` - Lender reveals bid
- `selectWinner(uint256 requestId)` - MSME selects winning bid

**Workflow**:
1. MSME creates loan request with commit/reveal periods
2. Lenders commit hashed bids during commit period
3. After commit deadline, lenders reveal actual rates
4. After reveal deadline, MSME selects lowest rate winner

---

### 6. LoanAgreementRegistry.sol
**Purpose**: Immutable record of loan agreements and reputation

**Key Features**:
- Links to marketplace requests
- Loan lifecycle tracking
- MSME reputation system
- Dispute management

**Key Functions**:
- `registerAgreement(uint256 marketplaceRequestId, bytes32 agreementHash)` - Register loan
- `recordDisbursement(uint256 recordId, uint256 expectedRepaymentDate)` - Record disbursement
- `updateStatus(uint256 recordId, LoanStatus newStatus)` - Update loan status
- `getReputation(address msme)` - Get MSME reputation

**Reputation Scoring**:
- Base score: 500 (new MSMEs)
- Repayment bonus: up to +300
- Default penalty: up to -400
- Volume bonus: up to +100
- Maximum score: 1000

---

### 7. PlatformGovernance.sol
**Purpose**: Platform administration and governance

**Key Features**:
- Multi-sig capable governance
- Emergency pause mechanism
- Oracle complaint system
- Proposal voting (simplified)
- MSME identity factory

**Key Functions**:
- `deployMSMEIdentity(address msmeOwner)` - Deploy new MSME identity
- `executeSlash(address oracle, uint256 amount, string reason)` - Slash oracle
- `fileComplaint(address oracle)` - File complaint against oracle
- `updatePlatformFee(uint256 newFeeBP)` - Update platform fees
- `pause() / unpause()` - Emergency controls

---

## Security Considerations

### Economic Security
- Oracle staking makes fraud expensive
- Slashing penalties deter malicious behavior
- Tiered staking limits oracle capabilities

### Access Control
- Owner-only functions for critical operations
- Multi-signature governance for production
- Emergency admin for quick response

### Data Integrity
- Immutable attestations (revocation flag only)
- Hash commitments prevent bid manipulation
- On-chain reputation cannot be erased

---

## Gas Optimization

All contracts are optimized with:
- Efficient data structures
- Minimal storage operations
- Batch operations where applicable
- View functions for read operations

---

## Testing

Run comprehensive test suite:
```bash
npm run test
```

Generate coverage report:
```bash
npm run test:coverage
```

---

## Deployment

Deploy to local network:
```bash
npm run deploy:local
```

Deploy to Sepolia testnet:
```bash
npm run deploy:sepolia
```

---

## Integration Examples

See `/examples` directory for:
- Creating MSME identity
- Submitting attestations
- Creating loan requests
- Bidding process
- Agreement registration

---

## License

MIT License - See LICENSE file
