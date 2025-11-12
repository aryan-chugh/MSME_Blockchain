# 🔍 Diagnostic Guide - Requests Not Showing

## Issue: Attestation requests not visible to oracles

### Step 1: Check Contract Has Requests

Run this command:
```powershell
cd d:\blockchain\BWD_Project
npx hardhat run scripts/check-pending-requests.js --network sepolia
```

**Expected Output:**
```
📊 Total Requests Created: 3

📄 Request #3:
   Status: 0 (0=Pending, 1=OraclesAssigned)
   Assigned Oracles: 0/3
```

✅ If you see Request #3 with status 0 and 0/3 oracles, the contract is fine.
❌ If you see 0 requests, create one from MSME Dashboard.

---

### Step 2: Check Browser Console Logs

1. Open browser: `http://localhost:3000`
2. Open Developer Tools: Press **F12**
3. Click **Console** tab
4. Switch to Oracle wallet in MetaMask
5. Go to Oracle Dashboard

**Look for these logs:**

```
📡 Fetching active requests from contract...
🔗 Contract address: 0xFD0B899Dc9f6d3184c0276c061a1fd866f20B779
📊 Total requests in contract: 3
🔍 Request #1: status=2, msme=0x4C7A...
  ⏭️ Skipping request #1 (status: 2 - completed/rejected)
🔍 Request #2: status=2, msme=0x4C7A...
  ⏭️ Skipping request #2 (status: 2 - completed/rejected)
🔍 Request #3: status=0, msme=0x4C7A...
  ✅ Including request #3 (status: 0)
📋 Found 1 active attestation requests
📄 Request #3: { status: 0, assignedOracles: 0, requiredOracles: 3 }
✅ Loaded pending requests from blockchain: [...]
```

---

### Step 3: Troubleshooting

#### Problem: Console shows "Total requests: 0"

**Cause:** No requests created OR wrong contract address

**Fix:**
1. Check contract address in console log matches: `0xFD0B899Dc9f6d3184c0276c061a1fd866f20B779`
2. If different, check `frontend/src/utils/contracts.js` line 6
3. Create new request from MSME Dashboard (300 CIT)

---

#### Problem: Console shows "No account connected"

**Cause:** MetaMask not connected OR wrong network

**Fix:**
1. Open MetaMask
2. Check network: Should be **Sepolia**
3. Click "Connect Wallet" button
4. Approve connection
5. Hard refresh: **Ctrl + Shift + R**

---

#### Problem: Console shows error "requestCounter is not a function"

**Cause:** ABI mismatch OR wrong contract

**Fix:**
1. Verify contract address: `0xFD0B899Dc9f6d3184c0276c061a1fd866f20B779`
2. Hard refresh to reload ABI: **Ctrl + Shift + R**
3. Check `frontend/src/utils/contracts.js` has `requestCounter` in ABI

---

#### Problem: Request shows in console but not in UI

**Cause:** React state not updating OR filter issue

**Fix:**
1. Check console for `✅ Loaded pending requests from blockchain:`
2. Look at the array - should have 1 object with Request #3
3. Hard refresh: **Ctrl + Shift + R**
4. Check if `pendingRequests.length === 0` is preventing display

---

###Step 4: Force Hard Refresh

Sometimes React caches aggressively. Try:

1. **Windows:** `Ctrl + Shift + R` or `Ctrl + F5`
2. **Clear cache:**
   - F12 → Network tab → Right-click → "Clear browser cache"
   - F12 → Application tab → Clear storage → "Clear site data"
3. **Restart frontend:**
   ```powershell
   # In the terminal running npm start, press Ctrl+C
   # Then restart:
   cd d:\blockchain\BWD_Project\frontend
   npm start
   ```

---

### Step 5: Verify Contract Address

Open `d:\blockchain\BWD_Project\frontend\src\utils\contracts.js`:

**Line 6 should be:**
```javascript
AttestationRegistry: '0xFD0B899Dc9f6d3184c0276c061a1fd866f20B779', // V3.1 with Reputation ✨ LATEST!
```

If it's different, update it and save. Frontend will auto-reload.

---

### Step 6: Check Wallet Connection

In browser console, type:
```javascript
window.ethereum.selectedAddress
```

Should show your oracle wallet address like: `0x7863...`

If `null`, click "Connect Wallet" button.

---

### Step 7: Manual Test in Console

Open browser console and run:
```javascript
// Check contract address
console.log('Contract:', '0xFD0B899Dc9f6d3184c0276c061a1fd866f20B779');

// Get provider (if using ethers in console)
const provider = new ethers.BrowserProvider(window.ethereum);
const contract = new ethers.Contract(
  '0xFD0B899Dc9f6d3184c0276c061a1fd866f20B779',
  ['function requestCounter() view returns (uint256)'],
  provider
);

// Check counter
contract.requestCounter().then(c => console.log('Counter:', c.toString()));
```

Expected: `Counter: 3`

---

## 🎯 Expected Result

After following these steps, you should see in Oracle Dashboard:

**🔄 Active Attestation Requests**
- 1 active request (Pending, Committing, or Revealing)

**Table showing:**
| Schema | MSME | Status | Oracles | Action |
|--------|------|--------|---------|--------|
| Credit Score | 0x4C7A... | **Pending** | 0/3 | 📋 Review |

**Click "Review"** → Modal opens with request details → Click "Accept This Request"

---

## Still Not Working?

Share the exact console output:
1. Copy ALL console logs (Ctrl+A in Console tab)
2. Look for any red errors
3. Check what `📊 Total requests in contract:` shows
4. Check what `🔗 Contract address:` shows
