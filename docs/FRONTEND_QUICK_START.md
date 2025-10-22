# ✅ Frontend Testing - Quick Start

## 🎯 Right Now (5 minutes)

### Step 1: Restart Frontend
```powershell
# In your terminal, press Ctrl+C to stop current frontend
# Then run:
cd frontend
npm start
```
Browser opens at: http://localhost:3000

---

### Step 2: Connect Rabby Wallet
1. Make sure Rabby is on **Sepolia** network
2. Click **"Connect Wallet"** button
3. Approve in Rabby
4. ✅ You should see: `0x4C7A...8571` and `0.867 ETH`

---

### Step 3: Test These 5 Things

#### 1️⃣ **Dashboard - View Your Stats**
- Go to main dashboard
- Check: ETH balance (0.867)
- Check: CIT balance (10.3M)
- Check: Platform stats

#### 2️⃣ **MSME Dashboard - Your Business**
- Click "MSME Dashboard"
- Your identity: `0xeD88...af68`
- See business data:
  - Name: Test Company Pvt Ltd
  - GST: 27AABCU9603R1ZV
  - Industry: Manufacturing

#### 3️⃣ **Oracle Dashboard - Your Oracle Status**
- Click "Oracle Dashboard"
- Check staked: 300,000 CIT
- Check tier: 2
- View reputation

#### 4️⃣ **Lender Dashboard - Browse Loans**
- Click "Lender Dashboard"
- See your loan request (1 ETH, 12 months)
- Try to commit a bid

#### 5️⃣ **Marketplace - Explore Platform**
- Click "Marketplace"
- Browse active loans
- Check MSME listings
- View oracle leaderboard

---

## 🎨 What You Should See

### Connected Wallet Display:
```
🟢 Connected: 0x4C7A...8571
💰 Balance: 0.867 ETH
💎 CIT: 10,300,000
```

### Your MSME Card:
```
📋 Test Company Pvt Ltd
🔢 GST: 27AABCU9603R1ZV
🏭 Industry: Manufacturing
✅ 1 Attestation
💰 1 Active Loan
```

### Your Oracle Card:
```
🔮 Oracle Status: Active
⭐ Tier: 2
💎 Staked: 300,000 CIT
📊 Reputation: High
```

### Your Loan Request:
```
💰 Amount: 1 ETH
📅 Tenure: 12 months
📝 Purpose: Working capital
🎯 Status: Open for bids
⏰ Commit Phase: Active
```

---

## 🐛 If Something Doesn't Work

### Can't Connect Wallet?
- Check Rabby is on Sepolia
- Refresh the page
- Try disconnecting and reconnecting

### Don't See Your Data?
- Wait 10-20 seconds for blockchain to load
- Check browser console (F12) for errors
- Make sure you restarted frontend after .env change

### Transaction Fails?
- Check you have ETH (0.867 available)
- Wait 15 seconds between transactions
- Check Etherscan for pending transactions

---

## 🎯 Quick Test Scenarios

### Scenario A: Create New Loan (2 min)
1. Go to MSME Dashboard
2. Click "Create Loan Request"
3. Amount: 0.5 ETH
4. Tenure: 6 months
5. Purpose: "Equipment purchase"
6. Submit → Confirm in Rabby
7. Wait for confirmation
8. ✅ See new loan in marketplace

### Scenario B: Submit Attestation (2 min)
1. Go to Oracle Dashboard
2. Click "Browse Requests" or "Submit Attestation"
3. Select an MSME
4. Fill attestation data
5. Submit → Confirm in Rabby
6. Wait for confirmation
7. ✅ See attestation added

### Scenario C: Commit Bid (2 min)
1. Go to Lender Dashboard
2. Click on your loan request
3. Enter interest rate: 12%
4. Click "Commit Bid"
5. Confirm in Rabby
6. Wait for confirmation
7. ✅ Bid committed (sealed)

---

## 📸 Screenshot Checklist

**Capture these for documentation:**
- [ ] Dashboard with connected wallet
- [ ] MSME identity page
- [ ] Oracle dashboard
- [ ] Active loan request
- [ ] Marketplace view
- [ ] Successful transaction confirmation

---

## 🎉 Success Indicators

**You'll know it's working when:**
- ✅ Wallet connects without errors
- ✅ All balances show correctly
- ✅ MSME data loads
- ✅ Oracle tier shows 2
- ✅ Loan request appears
- ✅ Transactions confirm on Sepolia
- ✅ Etherscan shows your activity

---

## 🚀 Current Status

**Your Testnet Setup:**
- ✅ All 7 contracts deployed
- ✅ MSME identity created
- ✅ Business data added
- ✅ Oracle registered (Tier 2)
- ✅ Attestation submitted
- ✅ Loan request active
- ✅ Frontend configured
- 🔄 **NOW: Test in browser!**

---

## 💬 Report Back!

**After testing, let me know:**
1. Did wallet connect successfully?
2. Can you see your MSME data?
3. Does oracle dashboard show Tier 2?
4. Can you see your loan request?
5. Any errors or issues?

**I'm here to help debug anything that doesn't work!** 🛠️

---

**Start Here:** 
1. Restart frontend: `npm start` in frontend folder
2. Open: http://localhost:3000
3. Connect Rabby wallet
4. Start testing! 🎯
