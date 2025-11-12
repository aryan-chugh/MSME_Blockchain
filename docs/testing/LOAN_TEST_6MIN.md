# 🚀 Loan Marketplace - 6 Minute Test

## ✅ Complete End-to-End Flow Test

### Prerequisites
- MetaMask with Sepolia ETH (>0.01 ETH)
- Frontend running at http://localhost:3000
- 2 accounts: MSME & Lender

---

## 🎬 **Minute 0-1: Create Loan (MSME)**

1. Connect MSME account
2. **MSME Dashboard → Loans Tab**
3. Create loan:
   - Amount: `0.001` CIT
   - Tenure: `12` months
   - Purpose: `Equipment Purchase`
   - Commit: `120` seconds
   - Reveal: `120` seconds
4. Submit → Wait for tx
5. ✅ Loan shows with "Open" status

---

## 🎬 **Minute 1-2: Place Bid (Lender)**

1. Switch to Lender account
2. **Marketplace**
3. Find loan → Click "Place Bid"
4. Enter:
   - Rate: `12.5` %
   - Nonce: `mySecret123`
5. Submit → Confirm deposit
6. ✅ Bid committed

**⏰ WAIT: Cannot reveal yet (commit phase)**

---

## 🎬 **Minute 3: Reveal Bid (Lender)**

1. **Lender Dashboard → My Bids**
2. Wait for "🔓 Reveal Phase Active"
3. Click "🔓 Reveal My Bid"
4. ✅ Revealed! Deposit refunded

**Try revealing again:**
- Should fail: "Already revealed" ✅

---

## 🎬 **Minute 4-5: Select Winner (MSME)**

1. Switch to MSME account
2. **MSME Dashboard → Loans**
3. Click "View Details" on loan
4. Click "🔄 Refresh Bids"
5. See bid table (12.50% APR)
6. Click "✅ Select"
7. ✅ Winner selected!

---

## 🎬 **Minute 5-6: Create Agreement (Lender)**

1. Switch to Lender account
2. **Lender Dashboard** → Green "🏆 Winning Bids" section appears
3. Click "📝 Create Agreement"
4. ✅ Agreement created!

---

## 🎯 **Final Check: Both See Agreement**

**MSME:**
- Dashboard → **Agreements Tab** (new!)
- See Agreement #1

**Lender:**
- Dashboard → **My Loan Agreements**
- See Agreement #1

**Both should match!** ✅

---

## 🧪 Extra Tests

### Test: Prevent Double Reveal
- After revealing, try again
- Expected: ❌ "Already revealed"

### Test: Manual Reveal
- Clear localStorage (F12)
- Click "🔧 Manual Reveal"
- Enter rate `12.5` and nonce `mySecret123`
- Expected: ✅ Works

### Test: Data Persistence
- Refresh page
- Loans still show (blockchain ✅)
- Agreements still show (blockchain ✅)

---

## ✅ Success Checklist

- [ ] Loan created (2 min periods)
- [ ] Bid committed successfully
- [ ] Cannot reveal during commit
- [ ] Bid revealed successfully
- [ ] Cannot reveal twice
- [ ] MSME sees revealed bids
- [ ] Winner selected
- [ ] Agreement created
- [ ] Both see agreement
- [ ] Data persists after refresh

**Total Time:** ~6 minutes
**All features working!** 🎉
