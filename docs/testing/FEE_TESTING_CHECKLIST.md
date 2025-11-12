# 🧪 Fee System Testing Checklist

## Pre-Test Setup

### Requirements
- [ ] MetaMask installed and connected to Sepolia
- [ ] At least 2 test accounts:
  - Account 1: MSME (needs CIT tokens for fees)
  - Account 2: Oracle (needs 100k CIT staked for Tier 2)
- [ ] Frontend running on http://localhost:3000
- [ ] Etherscan Sepolia open for transaction verification

### Account Preparation

**MSME Account:**
- [ ] Has sufficient CIT balance (at least 500 CIT for testing)
- [ ] Has some Sepolia ETH for gas fees
- [ ] Has approved CIT spending (or will approve during test)

**Oracle Account:**
- [ ] Has 100,000 CIT staked (Tier 2)
- [ ] Oracle status confirmed in dashboard
- [ ] Has some Sepolia ETH for gas fees

## Test 1: MSME Fee Payment

### Steps
1. [ ] Connect MetaMask as MSME account
2. [ ] Navigate to MSME Dashboard
3. [ ] Check CIT balance (should show in wallet or dashboard)
4. [ ] Select document type: "Bank Statements"
5. [ ] Enter document hash: `0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`
6. [ ] Click "Submit Attestation Request"

### Expected Results
- [ ] Confirmation dialog appears: "Fee: 120 CIT tokens. This fee will be paid to the oracle who verifies your document. Continue with payment?"
- [ ] Click "OK"
- [ ] Alert shows: "⏳ Step 1/2: Paying attestation fee..."
- [ ] MetaMask popup appears requesting approval for 120 CIT transfer
- [ ] Confirm transaction in MetaMask
- [ ] Wait for confirmation...
- [ ] Alert shows: "⏳ Step 2/2: Creating attestation request..."
- [ ] Success alert appears with:
  ```
  ✅ Success! Attestation request submitted
  
  Fee paid: 120 CIT
  Transaction: 0x...
  
  Your request is now visible to oracles.
  
  View transaction on Etherscan:
  https://sepolia.etherscan.io/tx/0x...
  ```
- [ ] Click Etherscan link → Verify transaction shows CIT transfer to PlatformGovernance

### Verification
- [ ] Check Etherscan: MSME → PlatformGovernance transfer of 120 CIT
- [ ] Check localStorage: `attestationRequests` array contains new request with:
  - `fee: 120`
  - `feePaid: true`
  - `feeTxHash: "0x..."`

**Debug Console Check:**
```javascript
// Open DevTools → Console
JSON.parse(localStorage.getItem('attestationRequests'))
// Should show latest request with fee metadata
```

## Test 2: Oracle Sees Pending Request

### Steps
1. [ ] Stay on MSME account OR switch to Oracle account
2. [ ] Navigate to Oracle Dashboard
3. [ ] Check "Total Earned (CIT)" card (should show 0 if first time)
4. [ ] Scroll to "Pending Attestation Requests" section

### Expected Results
- [ ] Table shows 1 pending request:
  ```
  | Schema          | MSME Address | Document Type    | Requested | Fee     | Action |
  |-----------------|--------------|------------------|-----------|---------|--------|
  | Bank Statements | 0x1234...    | Bank Statements  | Oct 21    | 120 CIT | Review |
  ```
- [ ] Fee column shows "120 CIT" (not hardcoded value)
- [ ] Click "Review" button

### Expected Modal
- [ ] Modal appears with title: "Attestation Request Details"
- [ ] Shows:
  - Document Type: Bank Statements
  - Required Tier: Tier 2 ⭐⭐
  - Your Tier: Tier 2 ⭐⭐ ✓
  - Fee: 120 CIT
  - Document Hash: 0x1234...
  - MSME Address: 0x...
- [ ] "Verify & Attest" button is enabled (green)
- [ ] "Reject" button is enabled (red)

## Test 3: Oracle Verifies and Earns Fee

### Steps
1. [ ] In the modal, click "Verify & Attest"
2. [ ] Confirm you want to proceed

### Expected Results
- [ ] Alert shows: "Submitting attestation..."
- [ ] MetaMask popup appears requesting approval for `submitAttestation` transaction
- [ ] Confirm transaction in MetaMask
- [ ] Alert shows: "Waiting for confirmation..."
- [ ] Wait 10-20 seconds for blockchain confirmation
- [ ] Success alert appears:
  ```
  ✅ Attestation submitted successfully!
  
  💰 Fee Earned: 120 CIT
  📊 Total Earned: 120 CIT
  
  Transaction: 0x...
  
  View on Etherscan:
  https://sepolia.etherscan.io/tx/0x...
  ```
- [ ] Modal closes automatically
- [ ] Pending requests table now shows 0 requests
- [ ] "Total Earned (CIT)" card updates to **120**

### Verification
- [ ] Check Etherscan: Oracle → AttestationRegistry `submitAttestation` call
- [ ] Check localStorage: `oracleEarnings` object contains:
  ```javascript
  {
    "0xOracleAddress": {
      "total": 120,
      "attestations": [
        {
          "requestId": 1234567890,
          "schema": "Bank Statements",
          "fee": 120,
          "msmeAddress": "0x...",
          "timestamp": 1640000000,
          "txHash": "0x..."
        }
      ]
    }
  }
  ```

**Debug Console Check:**
```javascript
// Open DevTools → Console
JSON.parse(localStorage.getItem('oracleEarnings'))
// Should show oracle earnings with 120 CIT total
```

## Test 4: MSME Sees Verification

### Steps
1. [ ] Switch back to MSME account in MetaMask
2. [ ] Refresh MSME Dashboard
3. [ ] Scroll to "Your Attestations" section

### Expected Results
- [ ] Table shows new attestation:
  ```
  | Document Type    | Document Hash | Verified By           | Status   |
  |------------------|---------------|-----------------------|----------|
  | Bank Statements  | 0x1234...     | ✅ 1 Oracle           | Verified |
  |                  |               | - 0xOracle... (Tier 2)|          |
  ```
- [ ] Trust Score shows 100%
- [ ] Status badge is green with "Verified ✅"

## Test 5: Multiple Attestations (Optional)

### Steps
1. [ ] As MSME, submit 3 more requests:
   - GST Revenue: 100 CIT
   - Tax Returns: 100 CIT
   - KYC Verification: 80 CIT
2. [ ] As Oracle, verify all 3 one by one

### Expected Results After Each Verification
- [ ] First (GST): Total Earned = 220 CIT (120 + 100)
- [ ] Second (Tax): Total Earned = 320 CIT (220 + 100)
- [ ] Third (KYC): Total Earned = 400 CIT (320 + 80)

### Final State
- [ ] Oracle "Total Earned" card shows: **400 CIT**
- [ ] Oracle "Attestations" card shows: **4**
- [ ] MSME dashboard shows 4 verified attestations
- [ ] Total fees paid by MSME: 400 CIT

## Test 6: Tier Restriction (Tier 3 Required)

### Setup
Ensure Oracle is Tier 2 (100k CIT staked, NOT 200k)

### Steps
1. [ ] As MSME, submit request: "Credit Score" (requires Tier 3)
2. [ ] As Oracle (Tier 2), try to verify

### Expected Results
- [ ] Pending requests table shows: "Credit Score - 150 CIT"
- [ ] Click "Review"
- [ ] Modal shows:
  - Required Tier: Tier 3 ⭐⭐⭐
  - Your Tier: Tier 2 ⭐⭐ ❌
  - "Verify & Attest" button is DISABLED (grayed out)
- [ ] Trying to click verify shows alert: "Insufficient Oracle Tier. Required: Tier 3"
- [ ] Can still click "Reject" to reject the request

## Test 7: Error Handling

### Test 7a: Insufficient CIT Balance
1. [ ] Use MSME account with <100 CIT balance
2. [ ] Try to submit "Bank Statements" request (120 CIT)
3. [ ] Expected: MetaMask shows "Insufficient funds" error

### Test 7b: User Cancels Fee Payment
1. [ ] Submit attestation request
2. [ ] When MetaMask popup appears, click "Reject"
3. [ ] Expected: Alert shows "Payment cancelled by user"

### Test 7c: Network Error
1. [ ] Disconnect internet
2. [ ] Try to submit request
3. [ ] Expected: Error message about network connection

## Test 8: Data Persistence

### Steps
1. [ ] Complete Test 1-3 (MSME pays, Oracle verifies)
2. [ ] Close browser completely
3. [ ] Reopen browser and navigate to http://localhost:3000
4. [ ] Connect MetaMask as Oracle

### Expected Results
- [ ] "Total Earned (CIT)" still shows previous total (e.g., 120)
- [ ] Earnings data persisted in localStorage
- [ ] Can continue verifying new requests

## Success Criteria

### All Tests Must Pass
- [x] MSME can pay fees successfully
- [x] Oracle can see fee amounts in pending requests
- [x] Oracle earnings tracked correctly
- [x] Dashboard displays total earned
- [x] Multiple attestations accumulate earnings
- [x] Tier restrictions enforced
- [x] Error handling works properly
- [x] Data persists across sessions

### Blockchain Verification
- [ ] All fee payments visible on Etherscan (MSME → PlatformGovernance)
- [ ] All attestations visible on Etherscan (Oracle → AttestationRegistry)
- [ ] Gas fees reasonable (<$1 per transaction)

### User Experience
- [ ] Clear feedback at every step
- [ ] Etherscan links work correctly
- [ ] Modal closes after successful verification
- [ ] Numbers update in real-time
- [ ] No console errors or warnings

## Known Issues (Expected)

1. **Fee Not Actually Transferred to Oracle**
   - ✅ This is expected in v1.0
   - Fees go to PlatformGovernance (escrow)
   - Earnings tracked in localStorage
   - Future: Smart contract claim function

2. **Multiple Oracles Don't Split Fees**
   - ✅ Each oracle tracks full fee amount
   - Future: Implement proportional distribution

3. **localStorage Dependency**
   - ✅ Clearing browser data loses earnings
   - Future: Store on-chain or in backend

## Troubleshooting

### Issue: "Transaction Failed"
**Possible Causes:**
- Insufficient gas
- Network congestion
- Contract error

**Solutions:**
- Check MetaMask gas settings
- Try again with higher gas limit
- Check console for error details

### Issue: "Total Earned" Shows 0
**Possible Causes:**
- localStorage cleared
- Wrong account connected
- Verification not completed

**Solutions:**
- Check `localStorage.getItem('oracleEarnings')`
- Verify oracle address matches
- Check if attestation transaction confirmed

### Issue: Fee Not Showing in Pending Requests
**Possible Causes:**
- MSME didn't complete fee payment
- Request created before fee system
- localStorage out of sync

**Solutions:**
- Check if `request.fee` exists
- Refresh page
- Submit new request

## Test Report Template

```markdown
## Test Report

**Date**: [Date]
**Tester**: [Name]
**Environment**: Sepolia Testnet
**Frontend Version**: 1.0.0

### Test Results

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | MSME Fee Payment | ✅ PASS | Fee: 120 CIT, Tx: 0x... |
| 2 | Oracle Sees Request | ✅ PASS | Fee displayed correctly |
| 3 | Oracle Earns Fee | ✅ PASS | Total: 120 CIT |
| 4 | MSME Sees Verification | ✅ PASS | Trust score: 100% |
| 5 | Multiple Attestations | ✅ PASS | Total: 400 CIT |
| 6 | Tier Restriction | ✅ PASS | Tier 3 blocked correctly |
| 7 | Error Handling | ✅ PASS | All errors caught |
| 8 | Data Persistence | ✅ PASS | Earnings survived reload |

### Issues Found
- [None / List issues here]

### Recommendations
- [Any suggestions for improvement]

### Conclusion
- [ ] All tests passed - Ready for production
- [ ] Some issues - Need fixes
- [ ] Major issues - Needs redesign
```

---

**Next Steps After Testing:**
1. Document any issues found
2. Fix critical bugs if any
3. Gather user feedback on fee amounts
4. Plan v2.0 smart contract enhancements
5. Implement analytics dashboard

**Estimated Testing Time:** 30-45 minutes for complete test suite
