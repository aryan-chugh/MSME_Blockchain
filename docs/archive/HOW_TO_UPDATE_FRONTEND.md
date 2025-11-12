# 🔄 HOW TO UPDATE FRONTEND CONTRACT ADDRESSES

## 📋 When Do You Need This?

Update frontend addresses whenever you:
- ✅ Redeploy contracts (new addresses are generated)
- ✅ Switch networks (localhost → Sepolia)
- ✅ Start fresh with `npx hardhat node`
- ✅ Get "Contract not found" errors in frontend

---

## ⚡ QUICK METHOD (Automatic - 10 seconds)

### Step 1: Deploy Contracts
```powershell
# Make sure Hardhat node is running in Terminal 1
npx hardhat node

# In another terminal, deploy contracts
npx hardhat run scripts/deploy-localhost.js --network localhost
```

### Step 2: Run Auto-Update Script
```powershell
node scripts/update-frontend-addresses.js
```

**That's it!** ✅ Frontend is now updated with latest addresses.

### Step 3: Refresh Frontend
- If frontend is already running → Just refresh browser (F5)
- If not running → Start it: `cd frontend && npm start`

---

## 📝 MANUAL METHOD (If you prefer)

### Step 1: Find the New Addresses

After deploying, look for this output:
```
DEPLOYMENT SUMMARY - LOCALHOST
════════════════════════════════════════════════════════════

📦 DEPLOYED CONTRACTS:
CIT Token:                 0x5FbDB2315678afecb367f032d93F642f64180aa3
Oracle Staking:            0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6
Attestation Registry:      0x8A791620dd6260079BF849Dc5567aDC3F2FdC318
Loan Marketplace:          0x610178dA211FEF7D417bC0e6FeD39F05609AD788
Loan Agreement Registry:   0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e
Platform Governance:       0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0
MSME Identity (Example):   0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82
```

**Copy these addresses!** 📋

---

### Step 2: Open Frontend Config File

**File Location:** `frontend\src\utils\contracts.js`

Open it in VS Code or any text editor.

---

### Step 3: Replace Contract Addresses

Find this section (around line 4):

```javascript
export const CONTRACT_ADDRESSES = {
  CIToken: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  OracleStaking: '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6',
  AttestationRegistry: '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318',
  LoanMarketplace: '0x610178dA211FEF7D417bC0e6FeD39F05609AD788',
  LoanAgreementRegistry: '0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e',
  PlatformGovernance: '0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0',
  MSMEIdentity: '0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82'
};
```

**Replace each address** with the new ones from Step 1.

---

### Step 4: Save the File

Press `Ctrl + S` to save.

---

### Step 5: Restart Frontend (if needed)

If frontend is already running:
```powershell
# Stop it (Ctrl + C in the terminal)
# Then restart:
cd frontend
npm start
```

Or just **refresh your browser** (F5) - sometimes this is enough!

---

## 🔍 VERIFY THE UPDATE

### Check in Browser Console

Open browser DevTools (F12) and run:

```javascript
// Check if addresses are loaded
console.log(window.CONTRACT_ADDRESSES);

// Or in your app, they should be imported from contracts.js
```

### Check in VS Code

The file should look like:

```javascript
// Localhost configuration - Auto-updated
// Generated: 2025-11-09T13:30:00.000Z

export const CONTRACT_ADDRESSES = {
  CIToken: '0x5FbDB2315678afecb367f032d93F642f64180aa3',  // ← New address
  OracleStaking: '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6',  // ← New address
  // ... rest of addresses
};
```

---

## 🌐 FOR DIFFERENT NETWORKS

### Localhost (Hardhat Network)
```javascript
export const CONTRACT_ADDRESSES = {
  // Use addresses from deployments/localhost.json
};

export const NETWORK_CONFIG = {
  chainId: '0x7a69', // 31337 in hex
  chainName: 'Hardhat Local',
  rpcUrl: 'http://127.0.0.1:8545',
  blockExplorer: null
};
```

### Sepolia Testnet
```javascript
export const CONTRACT_ADDRESSES = {
  // Use addresses from deployments/sepolia-v3-1.json
};

export const NETWORK_CONFIG = {
  chainId: '0xaa36a7', // 11155111 in hex
  chainName: 'Sepolia',
  rpcUrl: 'https://ethereum-sepolia.publicnode.com',
  blockExplorer: 'https://sepolia.etherscan.io'
};
```

---

## 🆘 TROUBLESHOOTING

### Problem: "Contract not found" error

**Solution:**
1. Check addresses match deployment output
2. Make sure you're on correct network in MetaMask
3. Clear browser cache
4. Restart frontend

---

### Problem: "Transaction failed" errors

**Solution:**
1. Check if Hardhat node is still running
2. Redeploy contracts if node was restarted
3. Update addresses again
4. Reset MetaMask (Settings → Advanced → Clear activity tab data)

---

### Problem: Old addresses still showing

**Solution:**
1. Hard refresh browser: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. Clear browser cache completely
3. Stop and restart frontend
4. Check if `contracts.js` file was actually saved

---

## 📁 FILE LOCATIONS

```
BWD_Project/
├── deployments/
│   ├── localhost.json          ← Source of truth for localhost
│   └── sepolia-v3-1.json       ← Source of truth for Sepolia
│
├── frontend/src/utils/
│   └── contracts.js            ← File to update
│
└── scripts/
    ├── deploy-localhost.js      ← Generates localhost.json
    ├── deploy-v3-1.js           ← Generates sepolia-v3-1.json
    └── update-frontend-addresses.js  ← Auto-update script
```

---

## 🔄 COMPLETE WORKFLOW

### From Scratch (First Time):

```powershell
# Terminal 1: Start Hardhat Node
npx hardhat node

# Terminal 2: Deploy Contracts
npx hardhat run scripts/deploy-localhost.js --network localhost

# Terminal 3: Update Frontend (AUTOMATIC)
node scripts/update-frontend-addresses.js

# Terminal 4: Start Frontend
cd frontend
npm start
```

### After Restarting Node:

```powershell
# If you stop hardhat node and start again, addresses change!
# Terminal 1: Restart node
npx hardhat node

# Terminal 2: Redeploy
npx hardhat run scripts/deploy-localhost.js --network localhost

# Terminal 3: Update frontend
node scripts/update-frontend-addresses.js

# Terminal 4: Refresh browser or restart frontend
```

---

## ✅ QUICK CHECKLIST

Before testing frontend:

- [ ] Hardhat node is running
- [ ] Contracts deployed successfully
- [ ] Frontend addresses updated (auto script or manual)
- [ ] Frontend is running (`npm start`)
- [ ] Browser opened to http://localhost:3000
- [ ] MetaMask connected to Localhost 8545 network
- [ ] Test account imported in MetaMask

---

## 💡 PRO TIPS

### Tip 1: Create an npm script

Add to `package.json`:
```json
{
  "scripts": {
    "update-frontend": "node scripts/update-frontend-addresses.js"
  }
}
```

Then run: `npm run update-frontend`

---

### Tip 2: Add to deployment script

You can add this line to `deploy-localhost.js` at the end:

```javascript
// At the very end of deploy-localhost.js
console.log("\n🔄 Updating frontend configuration...");
require('./update-frontend-addresses.js');
```

Now frontend updates automatically after every deployment!

---

### Tip 3: Use environment variables

For production, use `.env` files:

```
# frontend/.env.local
REACT_APP_CIT_TOKEN=0x5FbDB2315678afecb367f032d93F642f64180aa3
REACT_APP_ORACLE_STAKING=0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6
# ... etc
```

Then in `contracts.js`:
```javascript
export const CONTRACT_ADDRESSES = {
  CIToken: process.env.REACT_APP_CIT_TOKEN,
  OracleStaking: process.env.REACT_APP_ORACLE_STAKING,
  // ... etc
};
```

---

## 🎯 SUMMARY

**EASIEST METHOD:**
```powershell
node scripts/update-frontend-addresses.js
```

**WHEN TO DO IT:**
- After every deployment
- When switching networks
- When you see "Contract not found" errors

**WHAT IT DOES:**
- Reads `deployments/localhost.json`
- Updates `frontend/src/utils/contracts.js`
- Keeps your frontend in sync with deployed contracts

**THAT'S IT!** 🚀

---

## 📞 NEED HELP?

If addresses still don't work:

1. **Check deployment file:**
   ```powershell
   cat deployments/localhost.json
   ```

2. **Verify frontend file:**
   ```powershell
   cat frontend/src/utils/contracts.js
   ```

3. **Check if contracts exist:**
   ```powershell
   npx hardhat run scripts/verify-deployment.js --network localhost
   ```

4. **Start completely fresh:**
   ```powershell
   # Stop all terminals
   # Terminal 1: Fresh node
   npx hardhat node
   
   # Terminal 2: Fresh deploy
   npx hardhat run scripts/deploy-localhost.js --network localhost
   
   # Terminal 3: Update frontend
   node scripts/update-frontend-addresses.js
   
   # Terminal 4: Fresh frontend
   cd frontend
   rm -rf node_modules/.cache  # Clear cache
   npm start
   ```

---

**Remember:** Every time you restart `npx hardhat node`, the addresses change! Always redeploy and update frontend after restarting the node.

✅ **You're all set!**
