# Oracle Tier Requirements

## Tier System Overview

Oracles are assigned tiers based on their staked CIT tokens. Higher tiers can verify more sensitive documents.

### Tier Levels:

| Tier | Minimum Stake | Capabilities |
|------|--------------|--------------|
| **Tier 0** | 0 CIT | Not an oracle (cannot verify) |
| **Tier 1** | 50,000 CIT | Basic documents |
| **Tier 2** | 100,000 CIT | Financial documents |
| **Tier 3** | 200,000 CIT | Credit & sensitive data |

---

## Document Type Requirements

### Tier 1 Documents (50,000 CIT minimum)
- **KYC Verification** - Identity documents, Aadhaar, PAN
- **Business License** - Registration certificates, trade licenses

### Tier 2 Documents (100,000 CIT minimum)
- **GST Revenue** - GST returns, revenue verification
- **Bank Statements** - Transaction history, cash flow
- **Tax Returns** - Income tax returns, compliance

### Tier 3 Documents (200,000 CIT minimum)
- **Credit Score** - CIBIL scores, credit bureau reports

---

## Why Tier Requirements?

1. **Quality Control**: Higher stakes = more accountability
2. **Risk Management**: Sensitive docs require experienced oracles
3. **Reputation**: Tier 3 oracles have proven track record
4. **Slashing Protection**: More stake at risk = less fraud

---

## Upgrading Your Tier

To upgrade from Tier 1 to Tier 2:
```
Current Stake: 50,000 CIT
Required Stake: 100,000 CIT
Additional Needed: 50,000 CIT
```

Use the "Increase Stake" button in Oracle Dashboard to stake more CIT tokens.

---

## Rejection vs Verification

### When an Oracle Reviews a Document:

**Option 1: Verify ✅**
- Oracle submits attestation on-chain
- MSME gets verification badge
- Oracle earns fee (80-150 CIT)
- Oracle's attestation count increases

**Option 2: Reject ❌**
- Oracle provides rejection reason
- Stored off-chain (localStorage)
- MSME sees which oracle rejected and why
- No fee earned, but maintains integrity

### MSME View:
- **Verified By**: List of oracles who verified (with addresses)
- **Rejected By**: List of oracles who rejected (with tier & reason)
- **Trust Score**: Percentage of positive reviews (e.g., 3 verified / 4 total = 75%)

### Example Display:
```
Document: GST Revenue
✅ Verified By: 3 Oracles
   - 0x4C7A...8571 (Tier 2) - Jan 15, 2025
   - 0x70997...79C8 (Tier 3) - Jan 16, 2025
   - 0xf39Fd...266d (Tier 2) - Jan 16, 2025

❌ Rejected By: 1 Oracle
   - 0x3C44C...0aDD (Tier 2) - "Revenue figures don't match GST portal"

Trust Score: 75% (3/4 positive)
```

---

## Implementation Details

### Frontend Logic (OracleDashboard.js):
```javascript
const SCHEMA_TIER_REQUIREMENTS = {
  'GST Revenue': 2,
  'Bank Statements': 2,
  'Credit Score': 3,
  'KYC Verification': 1,
  'Business License': 1,
  'Tax Returns': 2
};

// Check before attestation
if (currentTier < requiredTier) {
  alert(`Insufficient Oracle Tier\nRequired: Tier ${requiredTier}\nYour Tier: ${currentTier}`);
  return;
}
```

### Rejection Tracking (localStorage):
```json
{
  "requestId": 12345,
  "msmeAddress": "0x4C7A8d194A36FDf53365490D1cAd92E59f648571",
  "schema": "GST Revenue",
  "documentHash": "0x1234...",
  "oracle": "0x3C44C...0aDD",
  "oracleTier": "2",
  "reason": "Revenue figures don't match GST portal",
  "timestamp": 1642345678000
}
```

### MSME Attestation Display:
Groups attestations by documentHash, shows:
- Verified count + oracle addresses
- Rejected count + oracle addresses + reasons + tiers
- Trust score percentage

---

## Future Enhancements

1. **On-chain Rejection**: Store rejections in contract with stake penalty
2. **Dispute Resolution**: MSMEs can challenge rejections
3. **Reputation Decay**: Tier requirements increase over time
4. **Dynamic Tiers**: Adjust based on oracle performance
5. **Multi-Sig Requirements**: Critical docs need 3+ Tier 3 oracles
