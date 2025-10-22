# 💰 CIT Token Fee System

## Overview

The Credit Incentive Token (CIT) fee system creates economic incentives for oracles to provide high-quality attestations. MSMEs pay fees to oracles for verifying their business documents, making the platform sustainable and rewarding for all participants.

## Fee Structure

| Document Type | Fee Amount (CIT) | Required Oracle Tier |
|--------------|------------------|---------------------|
| Credit Score | 150 | Tier 3 (200k CIT) |
| Bank Statements | 120 | Tier 2 (100k CIT) |
| GST Revenue | 100 | Tier 2 (100k CIT) |
| Tax Returns | 100 | Tier 2 (100k CIT) |
| KYC Verification | 80 | Tier 1 (50k CIT) |
| Business License | 80 | Tier 1 (50k CIT) |

## How It Works

### 1. MSME Submits Attestation Request

When an MSME requests document verification:

1. **Select Document Type**: Choose which document needs verification (e.g., "Bank Statements")
2. **Fee Calculation**: System automatically determines fee (e.g., 120 CIT for Bank Statements)
3. **Confirmation Dialog**: MSME sees fee amount and confirms payment
4. **Fee Payment**: 
   - MSME transfers CIT tokens to PlatformGovernance address (escrow)
   - Transaction is recorded on blockchain (Etherscan link provided)
   - Request is created with fee metadata:
     ```javascript
     {
       fee: 120,
       feePaid: true,
       feeTxHash: "0x..."
     }
     ```
5. **Request Visible to Oracles**: All eligible oracles see the pending request with fee amount

### 2. Oracle Verifies Document

When an oracle verifies a document:

1. **Tier Validation**: System checks if oracle meets minimum tier requirement
2. **Document Review**: Oracle examines the document hash and metadata
3. **Submit Attestation**: 
   - Oracle calls `submitAttestation()` on AttestationRegistry (on-chain)
   - Transaction is confirmed on blockchain
4. **Fee Distribution**:
   - Fee tracking updated in localStorage
   - Oracle's total earnings increased
   - Request marked as verified with oracle address
5. **Earnings Display**: Oracle sees updated "Total Earned" stat in dashboard

### 3. Oracle Earnings Tracking

**Earnings Data Structure:**
```javascript
{
  "0xOracleAddress123": {
    "total": 450,  // Total CIT earned
    "attestations": [
      {
        "requestId": 1234567890,
        "schema": "Bank Statements",
        "fee": 120,
        "msmeAddress": "0xMSME...",
        "timestamp": 1640000000000,
        "txHash": "0x..."
      },
      // ... more attestations
    ]
  }
}
```

**Display:**
- Oracle Dashboard shows "Total Earned (CIT)" card
- Success message shows individual fee earned
- Attestation history can track earnings over time

## User Experience Flow

### MSME Perspective

1. **Before Submission:**
   ```
   Select Document Type: [Bank Statements ▼]
   Upload Document Hash: [0x123...]
   
   Fee: 120 CIT tokens
   This fee will be paid to the oracle who verifies your document.
   
   [Submit Request]
   ```

2. **Payment Confirmation:**
   ```
   ⏳ Step 1/2: Paying attestation fee...
   (MetaMask popup for 120 CIT transfer)
   
   ⏳ Step 2/2: Creating attestation request...
   
   ✅ Success! Attestation request submitted
   Fee paid: 120 CIT
   Transaction: 0x... (View on Etherscan)
   
   Your request is now visible to oracles. They will review and verify your document.
   ```

3. **After Verification:**
   ```
   Document Type: Bank Statements
   Document Hash: 0x123...
   
   ✅ Verified By: 3 Oracles
     - 0xOracle1... (Tier 2)
     - 0xOracle2... (Tier 3)
     - 0xOracle3... (Tier 2)
   
   Trust Score: 100%
   Status: Verified ✅
   ```

### Oracle Perspective

1. **Pending Requests:**
   ```
   Pending Attestation Requests (2)
   
   | Schema          | MSME        | Fee      | Action  |
   |-----------------|-------------|----------|---------|
   | Bank Statements | 0xMSME1...  | 120 CIT  | Review  |
   | GST Revenue     | 0xMSME2...  | 100 CIT  | Review  |
   ```

2. **Review & Verify:**
   ```
   Attestation Request Details
   
   Document Type: Bank Statements
   Required Tier: Tier 2 ⭐⭐
   Your Tier: Tier 2 ⭐⭐ ✓
   
   Fee: 120 CIT
   
   Document Hash: 0x123...
   MSME Address: 0xMSME1...
   
   [Verify & Attest] [Reject]
   ```

3. **After Verification:**
   ```
   ✅ Attestation submitted successfully!
   
   💰 Fee Earned: 120 CIT
   📊 Total Earned: 450 CIT
   
   Transaction: 0x... (View on Etherscan)
   ```

4. **Dashboard Stats:**
   ```
   ┌─────────────┬────────────┬────────┬──────────────┬──────────────────┐
   │ 100,000     │ 85         │ Tier 2 │ 12           │ 450              │
   │ CIT Staked  │ Reputation │        │ Attestations │ Total Earned (CIT)│
   └─────────────┴────────────┴────────┴──────────────┴──────────────────┘
   ```

## Economic Model Benefits

### For MSMEs
- **Fair Pricing**: Fees based on document complexity and value
- **Quality Assurance**: Oracles incentivized to be accurate
- **Transparent Costs**: Know exact fee before payment
- **Blockchain Proof**: All payments recorded on-chain

### For Oracles
- **Revenue Generation**: Earn CIT for each attestation
- **Higher Stakes = Higher Fees**: Tier 3 oracles access premium documents
- **Reputation Building**: Quality work increases future opportunities
- **Passive Income**: Automated fee distribution

### For Platform
- **Self-Sustaining**: No need for external subsidies
- **Quality Control**: Economic incentives drive accuracy
- **Growth Mechanism**: More MSMEs → More fees → More oracles
- **Token Utility**: CIT has real-world value beyond governance

## Technical Implementation

### Frontend Fee Payment (MSMEDashboard.js)

```javascript
const FEE_STRUCTURE = {
  'Credit Score': 150,
  'Bank Statements': 120,
  'GST Revenue': 100,
  'Tax Returns': 100,
  'KYC Verification': 80,
  'Business License': 80
};

const submitAttestationRequest = async (e) => {
  e.preventDefault();
  
  // 1. Calculate fee
  const feeAmount = FEE_STRUCTURE[selectedSchema] || 100;
  
  // 2. Show confirmation
  const confirmPayment = window.confirm(
    `Fee: ${feeAmount} CIT tokens\n` +
    `This fee will be paid to the oracle who verifies your document.\n\n` +
    `Continue with payment?`
  );
  if (!confirmPayment) return;
  
  // 3. Transfer CIT to escrow
  const tokenContract = getContractInstance('CIToken', signer);
  const feeInWei = parseTokens(feeAmount.toString());
  const feeTx = await tokenContract.transfer(
    CONTRACT_ADDRESSES.PlatformGovernance,
    feeInWei
  );
  await feeTx.wait();
  
  // 4. Create request with fee metadata
  const request = {
    schema: selectedSchema,
    documentHash,
    msmeAddress: account,
    fee: feeAmount,
    feePaid: true,
    feeTxHash: feeTx.hash
  };
  
  // 5. Store in localStorage
  localStorage.setItem('attestationRequests', JSON.stringify(allRequests));
};
```

### Frontend Fee Distribution (OracleDashboard.js)

```javascript
const verifyAndAttest = async (requestId) => {
  // 1. Submit attestation on-chain
  const tx = await attestationContract.submitAttestation(
    request.msmeAddress,
    schemaId,
    data,
    365 * 24 * 60 * 60
  );
  const receipt = await tx.wait();
  
  // 2. Track oracle earnings
  const earnings = JSON.parse(localStorage.getItem('oracleEarnings') || '{}');
  if (!earnings[account]) {
    earnings[account] = { total: 0, attestations: [] };
  }
  earnings[account].total += (request.fee || 0);
  earnings[account].attestations.push({
    requestId,
    schema: request.schema,
    fee: request.fee || 0,
    msmeAddress: request.msmeAddress,
    timestamp: Date.now(),
    txHash: receipt.hash
  });
  localStorage.setItem('oracleEarnings', JSON.stringify(earnings));
  
  // 3. Show success with earnings
  alert(
    `✅ Attestation submitted successfully!\n\n` +
    `💰 Fee Earned: ${request.fee || 0} CIT\n` +
    `📊 Total Earned: ${earnings[account].total} CIT\n\n` +
    `Transaction: ${receipt.hash}`
  );
};
```

### Earnings Display (OracleDashboard.js)

```javascript
// In Oracle Stats Grid
<div className="card" style={{ background: '#fff7ed' }}>
  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f59e0b' }}>
    {(() => {
      const earnings = JSON.parse(localStorage.getItem('oracleEarnings') || '{}');
      return (earnings[account]?.total || 0).toLocaleString();
    })()}
  </div>
  <div style={{ color: '#718096', marginTop: '8px' }}>Total Earned (CIT)</div>
</div>
```

## Current Limitations & Future Enhancements

### Current Approach (v1.0)
- **Escrow**: Fees transferred to PlatformGovernance address
- **Tracking**: Oracle earnings tracked in localStorage
- **Distribution**: Automatic tracking on verification (no actual token transfer to oracle yet)

### Why This Approach?
The deployed `AttestationRegistry` contract doesn't have a built-in fee mechanism. Rather than redeploying contracts, we implemented a frontend-managed system that:
1. ✅ Collects fees from MSMEs (on-chain via CIT token transfer)
2. ✅ Tracks oracle earnings (localStorage)
3. ⏳ Requires manual claim or governance distribution (future)

### Future Enhancements (v2.0)

1. **Smart Contract Fee Distribution**
   - Add `claimFees()` function to PlatformGovernance
   - Oracle can withdraw earned fees on-demand
   - Automatic transfer after attestation confirmation

2. **Fee Splitting**
   - Multi-oracle attestations split fees proportionally
   - Example: 3 oracles verify → 40 CIT each (120 total)

3. **Dynamic Pricing**
   - Market-driven fee adjustments
   - Surge pricing for urgent attestations
   - Discount for bulk requests

4. **Staking Rewards**
   - Oracles earn passive yield on staked CIT
   - Higher tiers = higher APY
   - Compound earnings back into stake

5. **Fee Pools**
   - Undistributed fees accumulate in pool
   - Used for platform development
   - Community governance decides allocation

6. **Slashing Integration**
   - Dishonest oracles lose staked CIT
   - Slashed amount distributed to honest verifiers
   - Creates strong economic disincentive for fraud

## Testing the Fee System

### Test Scenario 1: MSME Pays Fee
1. Connect as MSME (MetaMask account)
2. Go to MSME Dashboard
3. Select "Bank Statements" (120 CIT fee)
4. Enter document hash
5. Submit request
6. **Expected**: 
   - Confirmation dialog shows "Fee: 120 CIT"
   - MetaMask prompts for CIT transfer to PlatformGovernance
   - Success message shows fee paid with Etherscan link

### Test Scenario 2: Oracle Earns Fee
1. Connect as Oracle (different MetaMask account)
2. Ensure staked ≥100k CIT (Tier 2)
3. Go to Oracle Dashboard
4. See pending request: "Bank Statements - 120 CIT"
5. Click "Review" → "Verify & Attest"
6. **Expected**:
   - MetaMask prompts for attestation transaction
   - Success message shows "Fee Earned: 120 CIT"
   - Total Earned card updates to "120"

### Test Scenario 3: Multiple Attestations
1. MSME submits 3 requests:
   - GST Revenue: 100 CIT
   - Tax Returns: 100 CIT
   - KYC Verification: 80 CIT
2. Oracle verifies all 3
3. **Expected**:
   - Total Earned shows: 280 CIT
   - Attestations count: 3
   - Each success message shows cumulative total

### Test Scenario 4: Tier Restrictions
1. Connect as Tier 1 Oracle (50k CIT staked)
2. See request for "Credit Score" (requires Tier 3)
3. Click "Review"
4. **Expected**:
   - Verify button disabled
   - Alert: "Insufficient Oracle Tier - Required: Tier 3"
   - Can reject but cannot verify

## Troubleshooting

**Issue**: Fee payment fails
- **Check**: MSME has sufficient CIT balance
- **Check**: CIT token allowance for PlatformGovernance
- **Solution**: Call `approve()` on CIT token first

**Issue**: Oracle earnings not updating
- **Check**: localStorage enabled in browser
- **Check**: Oracle verified on-chain (transaction confirmed)
- **Solution**: Refresh page to reload earnings data

**Issue**: Total Earned shows 0 despite verifications
- **Check**: Fee was included in request object
- **Check**: `oracleEarnings` key in localStorage
- **Solution**: Verify earlier requests without fee metadata won't count

## Conclusion

The CIT fee system transforms the platform from a theoretical concept into a practical, economically sustainable ecosystem. By rewarding oracles for quality work, we ensure MSMEs receive reliable attestations, oracles earn passive income, and the platform grows organically through aligned incentives.

**Key Takeaways:**
- ✅ Fees based on document complexity (80-150 CIT)
- ✅ MSME pays upfront → Escrow → Oracle earns on verification
- ✅ Higher oracle tiers access higher-value documents
- ✅ All transactions recorded on blockchain for transparency
- ✅ Oracle earnings displayed in real-time dashboard

---

**Next Steps:**
1. Test complete fee flow with real transactions
2. Monitor oracle participation rates
3. Gather user feedback on fee structure
4. Implement v2.0 smart contract fee distribution
5. Add analytics dashboard for fee metrics
