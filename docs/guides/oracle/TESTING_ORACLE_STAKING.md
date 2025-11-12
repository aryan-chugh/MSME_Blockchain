# 🧪 Testing Oracle Staking Integration

## ✅ What We Just Integrated

**OracleDashboard** now uses **real smart contract calls** instead of localStorage:

### Features Implemented:
1. **Load Oracle Status** - Reads from blockchain every 10 seconds
2. **Stake Tokens** - Two-step process:
   - Step 1: Approve CIToken contract to spend your tokens
   - Step 2: Call OracleStaking.stake() to register as oracle
3. **Increase Stake** - Add more tokens to your stake
4. **Withdraw Stake** - Initiate 24-hour cooldown withdrawal

---

## 🧪 Test Steps

### Step 1: Navigate to Oracle Dashboard
1. Open http://localhost:3000
2. Click **"🦊 Connect Wallet"** (if not already connected)
3. Ensure you see **"🟢 Sepolia"** in top-right
4. Click **"Oracle Dashboard"** from the navigation menu

**Expected**: You should see "Become an Oracle" section

---

### Step 2: Stake Tokens

**Test Input:**
- Enter amount: `100000` (100k CIT tokens)
- This qualifies you for **Tier 2**

**Click "Stake & Become Oracle"**

**Expected Flow:**
1. Status shows: "Preparing transaction..."
2. Status shows: "Checking token balance..."
3. Status shows: "Approving tokens... (1/2) - Confirm in wallet"
4. **→ Rabby/MetaMask popup appears for Approval**
5. Click **"Confirm"** in wallet
6. Status shows: "Waiting for approval confirmation..."
7. Status shows: "✅ Tokens approved!"
8. Status shows: "Staking tokens... (2/2) - Confirm in wallet"
9. **→ Rabby/MetaMask popup appears for Staking**
10. Click **"Confirm"** in wallet
11. Status shows: "Waiting for staking confirmation..."
12. Alert appears: "✅ Successfully staked 100000 CIT tokens!"
13. **Oracle status appears** with your stake info

**After Success:**
- You should see:
  - Staked Amount: 100,000 CIT
  - Tier: **Tier 2** badge
  - Reputation: 100
  - Attestations Completed: 0

**Verify on Etherscan:**
Copy transaction hash from alert (e.g., `0xabcd1234...`)
Visit: https://sepolia.etherscan.io/tx/YOUR_TX_HASH

---

### Step 3: Increase Stake

**Once oracle status is showing:**
1. Click **"Increase Stake"** button
2. Prompt appears: "Enter additional CIT tokens to stake"
3. Enter: `50000`
4. Click OK

**Expected Flow:**
1. Wallet popup for approval (if needed)
2. Wallet popup for increase stake
3. Alert: "✅ Successfully increased stake by 50000 CIT!"
4. **New total shows: 150,000 CIT**
5. **Tier updates to Tier 2** (150k qualifies for Tier 2)

---

### Step 4: Test Withdrawal (Optional)

**WARNING: This will remove your oracle status!**

1. Click **"Withdraw Stake"** button
2. Confirm warning dialog
3. Wallet popup appears
4. Confirm transaction
5. Alert: "✅ Withdrawal initiated! 24-hour cooldown started"
6. Oracle status disappears
7. "Become an Oracle" form reappears

---

## 🐛 Common Issues & Solutions

### Issue 1: "Insufficient CIT balance"
**Cause**: You don't have enough CIT tokens

**Solution**: Run the mint script again:
```powershell
cd d:\blockchain
npx hardhat run scripts/mint-tokens.js --network sepolia
```

---

### Issue 2: "Transaction rejected by user"
**Cause**: You clicked "Reject" in wallet popup

**Solution**: Try again and click "Confirm"

---

### Issue 3: "Insufficient SepoliaETH for gas fees"
**Cause**: Not enough ETH for transaction gas

**Solution**: Get more from faucet:
- Visit: https://sepoliafaucet.com/
- Enter your address
- Get 0.5 SepoliaETH

---

### Issue 4: Transaction pending forever
**Cause**: Sepolia network congestion (rare)

**Solution**: Wait 30-60 seconds or check on Etherscan

---

### Issue 5: "Please switch to Sepolia network"
**Cause**: Connected to wrong network

**Solution**: 
- Open Rabby/MetaMask
- Switch to Sepolia network
- Refresh page

---

## ✅ Success Criteria

You've successfully tested Oracle staking if:

- ✅ You can stake tokens (100k+)
- ✅ Oracle status appears with correct tier
- ✅ Transaction shows on Sepolia Etherscan
- ✅ Can increase stake
- ✅ Can withdraw stake
- ✅ All transactions have Etherscan links in alerts

---

## 📊 Verify on Blockchain

### Check Oracle Status On-Chain:
1. Visit OracleStaking contract: https://sepolia.etherscan.io/address/0xB2c87BE405bF0D84d5E510F5f735c99129c7bEc6
2. Click **"Contract"** → **"Read Contract"**
3. Find function **"getOracleInfo"**
4. Enter your wallet address
5. Click **"Query"**

**Expected Output:**
```
stakedAmount: 100000000000000000000000 (100k * 10^18)
reputationScore: 100
tier: 2
attestationsCompleted: 0
```

---

## 🎯 What's Next?

Once Oracle staking is working, we'll integrate:

1. **MSMEDashboard** - Real attestation requests
2. **OracleDashboard** - Real attestation verification
3. **Marketplace** - Real loan creation and bidding
4. **Dashboard** - Real blockchain statistics

---

## 💡 Tips for Testing

1. **Keep Developer Console Open**
   - Press F12 in browser
   - Check Console tab for any errors
   - Watch Network tab for transactions

2. **Check Etherscan After Each Transaction**
   - Verify transaction succeeded
   - Check token balances
   - View event logs

3. **Test Different Amounts**
   - Try 50k CIT (Tier 1)
   - Try 200k CIT (Tier 2)
   - Try 500k CIT (Tier 3)
   - Try 1M CIT (Tier 4)

4. **Test Error Cases**
   - Try staking with insufficient balance
   - Try rejecting transaction
   - Try with wrong network selected

---

**Let me know once you've tested, and I'll integrate the next component! 🚀**
