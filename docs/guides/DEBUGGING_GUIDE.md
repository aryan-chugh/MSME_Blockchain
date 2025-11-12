# 🔍 Loan Marketplace Debugging Guide

## Issue: "Invalid reveal" Error

### Root Causes

The "Invalid reveal" error occurs when the hash computed during reveal doesn't match the commitment stored on-chain. This can happen due to:

1. **Wrong Rate or Nonce**: Using different values than when committing
2. **LocalStorage Failure**: Browser cleared localStorage or bid wasn't saved
3. **Account Mismatch**: Revealing from different wallet than committed
4. **Wrong Loan ID**: Trying to reveal for wrong loan request

### How Commit-Reveal Works

**Commit Phase:**
```javascript
// What you enter:
Interest Rate: 12.5%
Nonce: mySecret123

// What gets calculated:
rateBP = 1250 (basis points: 12.5 * 100)
nonceBytes = keccak256("mySecret123") // 0x9ae00005654e38540d599ae26530aab9f2ae4dda40c30f9b54bc38dc85c2c18
commitment = keccak256(rateBP, nonceBytes, yourAddress)

// Stored on blockchain:
commitments[loanId][yourAddress] = commitment

// Stored in localStorage:
{
  "0xYourAddress": [{
    "loanId": 1,
    "rateBP": 1250,
    "rate": 12.5,
    "nonce": "mySecret123",
    "nonceBytes": "0x9ae00005654e38540d599ae26530aab9f2ae4dda40c30f9b54bc38dc85c2c18"
  }]
}
```

**Reveal Phase:**
```javascript
// Retrieved from localStorage:
rateBP = 1250
nonceBytes = "0x9ae00005654e38540d599ae26530aab9f2ae4dda40c30f9b54bc38dc85c2c18"

// Sent to contract:
revealBid(loanId, 1250, "0x9ae00005654e38540d599ae26530aab9f2ae4dda40c30f9b54bc38dc85c2c18")

// Contract verifies:
computedHash = keccak256(1250, "0x9ae00005654e38540d599ae26530aab9f2ae4dda40c30f9b54bc38dc85c2c18", yourAddress)
require(computedHash == storedCommitment, "Invalid reveal")
```

### Debugging Steps

#### 1. Check Browser Console

Open browser console (F12) and look for:

```
🔍 LocalStorage Debug:
  All stored bids: {...}
  My account: 0xYourAddress
  My stored bids: [...]
  Looking for loan ID: 1
  Found bid info: {...}

🔓 Revealing bid...
  Request ID: 1
  Rate (BP): 1250
  Nonce (bytes32): 0x9ae0000...
  Current time: 1729876543
  Commit deadline: 1729876420 (ended: true)
  Reveal deadline: 1729876540 (ended: false)
  Account: 0xYourAddress
  Stored commitment: 0xabc123...
  Computed hash: 0xabc123...
  Hashes match: true
```

#### 2. Common Issues

**Issue: "Bid Information Not Found"**
- **Cause**: LocalStorage doesn't have your bid
- **Solution**: Use "🔧 Manual Reveal" button
- **Workaround**: Enter exact rate and nonce you used

**Issue: "Hash Mismatch"**
- **Cause**: Rate or nonce is incorrect
- **Solution**: Double-check values in commit confirmation
- **Debug**: Console shows both hashes - compare them

**Issue: "Still in Commit Phase"**
- **Cause**: Trying to reveal before commit deadline
- **Solution**: Wait for commit period to end
- **Check**: Look at countdown timer

**Issue: "Reveal Period Ended"**
- **Cause**: Waited too long after reveal period
- **Solution**: Cannot reveal anymore, deposit lost
- **Prevention**: Reveal within 2-minute window

**Issue: "No commitment found"**
- **Cause**: Revealing from wrong account or wrong loan
- **Solution**: Use same wallet that committed
- **Check**: Verify loan ID matches

**Issue: "Already revealed"**
- **Cause**: You already revealed this bid (new security feature)
- **Solution**: Can only reveal once per loan
- **Check**: Look for "Revealed" status on bid card

### Manual Reveal Process

If localStorage failed to save your bid:

1. Go to **Lender Dashboard**
2. Find your bid in "My Bids" section
3. Click **🔧 Manual Reveal** button
4. Enter:
   - **Interest Rate**: Exact % you committed (e.g., 12.50)
   - **Nonce**: Exact secret string (e.g., mySecret123)
5. Click **🔓 Reveal Bid**

**⚠️ CRITICAL**: You must enter EXACTLY the same values you used when committing. Even small differences will fail.

### LocalStorage Inspector

To check your stored bids manually:

1. Open browser console (F12)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Expand **Local Storage** → `http://localhost:3000`
4. Look for key: `myBids`
5. Value format:
```json
{
  "0xYourAddress": [
    {
      "loanId": 1,
      "rateBP": 1250,
      "rate": 12.5,
      "nonce": "mySecret123",
      "nonceBytes": "0x9ae0000...",
      "commitment": "0xabc123...",
      "txHash": "0xdef456...",
      "timestamp": 1729876543000
    }
  ]
}
```

### Testing Checklist

Before revealing:

- [ ] Commit period has ended (check countdown timer)
- [ ] Reveal period is still active (< 2 minutes from commit end)
- [ ] Using same wallet that committed
- [ ] Correct loan request ID
- [ ] LocalStorage has bid info (check console)
- [ ] If manual reveal: Have exact rate and nonce written down

### Prevention Tips

1. **Write Down Your Nonce**: Save it somewhere safe
2. **Screenshot Commit Confirmation**: Has all values
3. **Don't Clear Browser Data**: During active bids
4. **Set Reminder**: Reveal within 2-minute window
5. **Use Same Browser/Device**: For commit and reveal

## Issue: Loan Details Not Showing on MSME Dashboard

### Symptoms
- Clicking "View Details" doesn't open modal
- Modal opens but shows empty/N/A values
- Bid count shows 0 even after reveals

### Solutions

#### Modal Not Opening
1. Check browser console for errors
2. Verify `selectedLoanDetails` state is set
3. Click the blue "📋 View Details" button

#### Fields Showing "Not specified"
This is **normal** for:
- Category
- Collateral Type
- Collateral Value
- Expected Rate

These fields are in the form but NOT stored in the smart contract's `LoanRequest` struct. They show "Not specified" because the contract only stores:
- amount
- tenure
- purpose
- status
- deadlines
- msme address

#### Bids Showing 0
1. Wait for lenders to **reveal** (not just commit)
2. Click **🔄 Refresh Bids** button
3. Check reveal period is active

#### Remaining Time Shows 0
- This is normal after both periods end
- During active periods, shows countdown in seconds
- Format: "120s (2m 0s) - Commit Phase"

### Enhanced Features

**✅ Real-time Countdown**
- Shows remaining seconds until deadline
- Auto-refreshes every 15 seconds
- Color-coded: green (commit), orange (reveal)

**✅ Revealed Bids Table**
- Only shows during reveal period
- Click "🔄 Refresh Bids" to load
- Shows: Lender, Rate, Time
- Lowest bid highlighted in green

**✅ Bid Selection**
- MSME can select any revealed bid
- Click "✅ Select" button next to bid
- Requires reveal period to end
- Creates loan agreement with selected lender

## Multiple Reveal Prevention

### Security Feature
Lenders can now only reveal **once per loan request**. This prevents:
- Gaming the system by revealing multiple times
- Changing bids after seeing others
- Spam attacks on the contract

### How It Works

```solidity
mapping(uint256 => mapping(address => bool)) public hasRevealed;

function revealBid(...) {
    require(!hasRevealed[requestId][msg.sender], "Already revealed");
    hasRevealed[requestId][msg.sender] = true;
    // ... rest of reveal logic
}
```

### User Impact
- **First reveal**: Works normally, deposit refunded
- **Second reveal attempt**: Transaction fails with "Already revealed"
- **Workaround**: None - this is intentional security

### Checking Reveal Status
Look for "Revealed" badge on your bid card in Lender Dashboard.

## Contract Addresses (Latest)

**Sepolia Testnet:**
```
LoanMarketplace: 0x203e16b9113b98798EEF2BF06a2b77d74E07789D
CIToken:         0xad942a8EEade6c95e5dbB2F83C433E0BB2314a1B
```

**Features:**
- ✅ 2-minute commit period
- ✅ 2-minute reveal period
- ✅ Prevent multiple reveals
- ✅ Manual bid selection by MSME

## Getting Help

If you're still stuck:

1. **Check console logs**: F12 → Console tab
2. **Export localStorage**: Copy `myBids` value
3. **Check transaction**: View on Etherscan
4. **Verify timing**: Use browser console time logs
5. **Use manual reveal**: If localStorage failed

**Debug Command:**
```javascript
// In browser console:
console.log('My Bids:', localStorage.getItem('myBids'));
console.log('Current Time:', Math.floor(Date.now() / 1000));
```
