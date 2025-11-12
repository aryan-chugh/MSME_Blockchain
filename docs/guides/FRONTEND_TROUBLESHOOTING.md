# Frontend Troubleshooting Guide - V3 Multi-Oracle

## Issue: "Nothing is visible in the frontend"

### ✅ V3 Contracts Deployed & Frontend Updated

**Updated Contract Addresses:**
- ✅ OracleStakingV3: `0xAA3a2F385374459fDebB35f6Bea87EFd4d18dBb9`
- ✅ AttestationRegistryV3: `0x129e293d574a3F9D5652e477076C31bd1b694991`
- ✅ CIToken: `0xb9ED4a38536BB4B3CbC3e24d5761E7E84D16634d` (unchanged)

**Files Updated:**
- ✅ `frontend/.env` - V3 addresses
- ✅ `frontend/src/utils/contracts.js` - V3 addresses
- ✅ Frontend server restarted at `http://localhost:3000`

---

## 🔍 Step-by-Step Diagnosis

### Step 1: Open Browser & Navigate
```
1. Open your browser (Chrome/Brave/Firefox)
2. Go to: http://localhost:3000
3. Open Developer Console (F12 or Ctrl+Shift+I)
4. Look at the Console tab for errors
```

### Step 2: Connect Wallet
The frontend requires a wallet connection to display content.

**What you should see:**
- A "Connect Wallet" button in the top-right corner
- Click it to connect MetaMask or Rabby wallet

**If you see errors:**
```
❌ "Please install MetaMask" → Install MetaMask or Rabby extension
❌ "Please switch to Sepolia" → Change network to Sepolia testnet
❌ "Provider not found" → Refresh page after installing wallet
```

### Step 3: Check Network
Make sure you're on **Sepolia Testnet**:

**MetaMask:**
1. Click network dropdown (top-left)
2. Enable "Show test networks" in Settings
3. Select "Sepolia test network"

**Rabby:**
1. Click network dropdown
2. Search for "Sepolia"
3. Select Sepolia

**Sepolia Details:**
- Network Name: Sepolia
- RPC URL: https://rpc.sepolia.org
- Chain ID: 11155111
- Currency Symbol: ETH
- Block Explorer: https://sepolia.etherscan.io

### Step 4: Get Test ETH
If you don't have Sepolia ETH for gas:

**Faucets:**
- https://sepoliafaucet.com/
- https://www.infura.io/faucet/sepolia
- https://faucet.quicknode.com/ethereum/sepolia

**You need:** ~0.1 ETH for testing

### Step 5: Check Console Logs
Open browser console (F12) and look for:

**Good Signs (✅):**
```
🏠 Home useEffect triggered
✅ Provider exists, calling loadPlatformStats
📊 Home: Starting to load platform stats...
✅ Home: Got contract instance
📋 Home: Total loans (as number): X
```

**Bad Signs (❌):**
```
❌ No provider, skipping stats load
❌ Home: No provider available
Error: network does not support ENS
Error: call revert exception
```

### Step 6: Verify Contract Connection
In browser console, run this:
```javascript
// Check if contracts are accessible
console.log('CIT Token:', '0xb9ED4a38536BB4B3CbC3e24d5761E7E84D16634d');
console.log('OracleStakingV3:', '0xAA3a2F385374459fDebB35f6Bea87EFd4d18dBb9');
console.log('AttestationRegistryV3:', '0x129e293d574a3F9D5652e477076C31bd1b694991');
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Blank Page / Nothing Visible
**Cause:** Wallet not connected
**Solution:** Click "Connect Wallet" button and approve connection

### Issue 2: "Please switch to Sepolia" Error
**Cause:** Wrong network
**Solution:** 
1. Click network dropdown in MetaMask/Rabby
2. Select "Sepolia test network"
3. Refresh page

### Issue 3: Contract Loading Errors
**Cause:** Old contract addresses cached
**Solution:**
```bash
# In frontend directory:
cd D:\blockchain\BWD_Project\frontend
rm -rf node_modules/.cache
npm start
```

### Issue 4: "Insufficient Funds" Error
**Cause:** No Sepolia ETH in wallet
**Solution:** Get test ETH from faucet (see Step 4 above)

### Issue 5: Stats Not Loading
**Cause:** No data in contracts yet (fresh deployment)
**Solution:** This is normal! Stats will show:
- Total MSMEs: 0
- Total Loans: 0
- Total Oracles: 0

**To populate data:**
- Go to "Oracle Dashboard" → Stake CIT tokens
- Go to "MSME Dashboard" → Request attestation
- Go to "Marketplace" → Create loan request

### Issue 6: V3 Functions Not Available
**Cause:** Frontend still using V1 ABIs
**Solution:** For full V3 functionality, we need to update ABIs (see next section)

---

## 🔧 What's Currently Working

With current frontend (V1 ABIs but V3 addresses):

**✅ Working:**
- Basic contract connections
- Oracle staking (compatible interface)
- Attestation requests (backward compatible)
- Marketplace functions
- Wallet connection
- Network detection

**⚠️ Limited/Not Working:**
- Multi-oracle assignment (frontend shows single oracle only)
- Commit-reveal UI (not implemented yet)
- Consensus percentage display
- Oracle diversity tracking
- Complexity tier selection

**Why?** The frontend was built for V1 single-oracle model. V3 multi-oracle features need frontend updates.

---

## 🚀 Quick Test Script

Run this in browser console after connecting wallet:

```javascript
// Test contract connectivity
async function testContracts() {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const citToken = new ethers.Contract(
    '0xb9ED4a38536BB4B3CbC3e24d5761E7E84D16634d',
    ['function totalSupply() view returns (uint256)'],
    provider
  );
  
  const totalSupply = await citToken.totalSupply();
  console.log('✅ CIT Total Supply:', ethers.formatEther(totalSupply));
  
  const balance = await citToken.balanceOf(await provider.getSigner().getAddress());
  console.log('💰 Your CIT Balance:', ethers.formatEther(balance));
}

testContracts();
```

---

## 📊 Expected UI After Wallet Connection

**Home Page:**
```
┌─────────────────────────────────────┐
│  MSME Blockchain Credit Platform    │
│  [Connect Wallet] ← Click here      │
└─────────────────────────────────────┘

After connection:
┌─────────────────────────────────────┐
│  Connected: 0x4C7A...8571           │
│  Sepolia Testnet                    │
└─────────────────────────────────────┘

Platform Statistics:
├─ Total MSMEs: 0
├─ Total Loans: 0
├─ Total Oracles: 0
├─ Total Volume: 0 CIT
└─ Active Loans: 0

Navigation:
├─ MSME Dashboard
├─ Lender Dashboard  
├─ Oracle Dashboard
└─ Marketplace
```

---

## 🔥 Next Steps for Full V3 Support

To enable full multi-oracle features in frontend:

### 1. Update ABIs (Priority)
Add V3-specific functions to `frontend/src/utils/contracts.js`:

```javascript
AttestationRegistryV3: [
  // Multi-oracle functions
  "function requestAttestation(bytes32 schemaId, string documentHash, string documentUrl, bytes additionalData, uint256 feePaid, bool forceSingleOracle) returns (uint256)",
  "function commitAttestation(uint256 requestId, bytes32 commitmentHash) external",
  "function revealAttestation(uint256 requestId, bytes attestationData, uint256 validity, bytes32 secret) external",
  "function getConsensusResult(uint256 requestId) view returns (tuple(address[] majorityOracles, address[] minorityOracles, uint256 majorityCount, uint256 totalOracles, bytes32 majorityHash, bool consensusReached))",
  // ... more V3 functions
]
```

### 2. Update UI Components
- **MSMEDashboard.js**: Add complexity tier selection
- **OracleDashboard.js**: Show commit/reveal workflow
- **Marketplace.js**: Display multiple oracles per request
- **Home.js**: Show consensus statistics

### 3. Test V3 Features
Follow **V3_TESTING_GUIDE.md** to test multi-oracle consensus

---

## ✅ Current Status Summary

**Deployed:** ✅ V3 contracts on Sepolia
**Frontend:** ✅ Running with V3 addresses
**Connectivity:** ✅ Should work with wallet connection
**V3 Features:** ⚠️ Need frontend updates for full support

**What to do NOW:**
1. Open http://localhost:3000
2. Connect your wallet (MetaMask/Rabby)
3. Switch to Sepolia network
4. You should see the platform interface
5. Basic features (staking, single attestation) will work
6. Multi-oracle features need frontend updates

---

## 🆘 Still Not Working?

**Share these details:**
1. Browser console errors (F12 → Console tab)
2. Network console errors (F12 → Network tab)
3. Wallet type (MetaMask/Rabby)
4. Current network in wallet
5. Screenshot of the blank page

**Check terminal output:**
```bash
# Look for compilation errors
PS D:\blockchain\BWD_Project\frontend> npm start
```

**Force clean restart:**
```bash
cd D:\blockchain\BWD_Project\frontend
rm -rf node_modules/.cache
rm -rf build
npm start
```
