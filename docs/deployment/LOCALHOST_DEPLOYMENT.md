# 🏠 Localhost Deployment Guide

## Overview

Run the entire system locally without any external network requests (no Sepolia, no public RPC).

**Benefits:**
- ✅ **Zero RPC rate limits** - Unlimited requests
- ✅ **Instant transactions** - No waiting for block confirmations
- ✅ **Free testing** - No testnet ETH needed
- ✅ **Complete control** - Reset anytime
- ✅ **Fast development** - Immediate feedback

---

## 🚀 Quick Start (3 Steps)

### **Step 1: Start Hardhat Node**

Open a terminal and run:

```powershell
# In project root
npx hardhat node
```

**Expected Output:**
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Accounts
========

WARNING: These accounts, and their private keys, are publicly known.
Any funds sent to them on Mainnet or any other live network WILL BE LOST.

Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH)
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

...
```

**⚠️ KEEP THIS TERMINAL RUNNING** - This is your local blockchain

---

### **Step 2: Deploy Contracts (New Terminal)**

Open a **new terminal** (keep the first one running):

```powershell
# In project root
npx hardhat run scripts/deploy-localhost.js --network localhost
```

**Expected Output:**
```
======================================================================
🚀 DEPLOYING TO LOCALHOST (Hardhat Network)
======================================================================

📝 Deployment Details:
   Network: localhost
   Chain ID: 31337n
   Deployer: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
   Balance: 10000.0 ETH

1. Deploying CIT Token...
   ✅ CIT Token deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
   💰 Minting test tokens...
   ✅ Test tokens minted

2. Deploying Oracle Staking...
   ✅ Oracle Staking deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
   
... (more deployments)

✅ LOCALHOST DEPLOYMENT COMPLETE!

📋 NEXT STEPS:
1. Keep this terminal running (Hardhat node)
2. In frontend, update imports to use localhost config
3. Add Hardhat network to MetaMask
4. Import test account private keys
5. Start frontend: cd frontend && npm start
```

**Files Created:**
- `deployments/localhost.json` - Contract addresses
- `frontend/src/utils/contracts.localhost.js` - Frontend config

---

### **Step 3: Configure Frontend**

Update `frontend/src/utils/contracts.js`:

```javascript
// At the top of the file, replace the import:

// OLD (Sepolia):
// export const CONTRACT_ADDRESSES = { ... };

// NEW (Localhost):
import { 
  CONTRACT_ADDRESSES, 
  NETWORK_CONFIG, 
  RPC_URL,
  TEST_ACCOUNTS 
} from './contracts.localhost.js';

export { CONTRACT_ADDRESSES, NETWORK_CONFIG, RPC_URL, TEST_ACCOUNTS };

// ... rest of file stays the same
```

Or simply copy the localhost config:

```powershell
cp frontend/src/utils/contracts.localhost.js frontend/src/utils/contracts.js
```

---

## 🦊 MetaMask Setup

### **Add Localhost Network**

1. Open MetaMask
2. Click network dropdown → **"Add Network"**
3. **"Add a network manually"**
4. Enter details:

```
Network Name:     Hardhat Local
RPC URL:          http://127.0.0.1:8545
Chain ID:         31337
Currency Symbol:  ETH
```

5. Click **"Save"**
6. Switch to **"Hardhat Local"** network

### **Import Test Accounts**

Import these private keys (from Hardhat node output):

**Account #0 (Deployer/Admin):**
```
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

**Account #1 (Oracle 1):**
```
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

**Account #2 (Oracle 2):**
```
Private Key: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
```

**Account #3 (MSME 1):**
```
Private Key: 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6
```

**Account #4 (MSME 2):**
```
Private Key: 0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a
```

**Account #5 (Lender 1):**
```
Private Key: 0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba
```

**How to Import:**
1. MetaMask → Click account icon → **"Import Account"**
2. Paste private key
3. Click **"Import"**
4. Repeat for each account

---

## 🖥️ Start Frontend

```powershell
cd frontend
npm start
```

Frontend will open at: **http://localhost:3000**

**Switch between accounts** in MetaMask to test different roles:
- Account #0: Admin/Deployer
- Account #1-2: Oracles
- Account #3-4: MSMEs
- Account #5: Lender

---

## 🧪 Testing Features

### **Test 1: Oracle Staking**

1. Switch to **Account #1** (Oracle 1) in MetaMask
2. Go to **Oracle Dashboard**
3. Already staked 100,000 CIT ✅
4. Balance should show: **400,000 CIT** (500k minted - 100k staked)

### **Test 2: Request Attestation**

1. Switch to **Account #3** (MSME 1)
2. Go to **MSME Dashboard** → **Attestations** tab
3. Click **"GST Revenue"**
4. Fill form:
   - Document URL: `ipfs://test123`
   - Document Hash: `0x1234567890abcdef...`
   - Additional Info: "Test attestation"
5. Submit
6. Check transaction completes instantly ⚡

### **Test 3: Oracle Verification**

1. Switch to **Account #1** (Oracle 1)
2. Go to **Oracle Dashboard**
3. See pending request
4. Click **"Review"**
5. Click **"Verify & Submit Attestation"**
6. Transaction completes instantly ⚡
7. Check earnings increase

### **Test 4: Loan Request**

1. Switch to **Account #3** (MSME 1)
2. Create loan request
3. Switch to **Account #5** (Lender)
4. Submit bid
5. Test instant transactions

---

## 🔄 Reset & Restart

### **Reset Blockchain State**

Stop Hardhat node (Ctrl+C) and restart:

```powershell
npx hardhat node
```

**Everything resets:**
- All balances back to 10,000 ETH
- All contracts gone
- Fresh start

Then re-deploy:

```powershell
npx hardhat run scripts/deploy-localhost.js --network localhost
```

### **Keep State (Just Restart Node)**

If you just want to restart the node without resetting:

1. Stop node (Ctrl+C)
2. Start again: `npx hardhat node`
3. Contracts and state persist in memory

---

## 📊 Monitoring

### **Terminal 1 (Hardhat Node)**

Shows all transactions in real-time:

```
eth_getBlockByNumber
eth_sendTransaction
  Contract deployment: CIToken
  From: 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266
  Contract created: 0x5fbdb2315678afecb367f032d93f642f64180aa3
  Gas used: 1234567

eth_call
  To: 0x5fbdb2315678afecb367f032d93f642f64180aa3
  Method: balanceOf(address)
```

### **Terminal 2 (Deployment)**

Shows deployment progress and addresses

### **Browser Console (DevTools)**

Shows frontend logs:

```javascript
✅ Connected to Hardhat Local (Chain ID: 31337)
✅ Loaded oracle status
📋 Loaded 1 pending requests
💰 Oracle balance: 400000 CIT
```

---

## 🐛 Troubleshooting

### **Issue: "Network Error" in Frontend**

**Solution:** 
1. Check Hardhat node is running
2. Verify RPC URL is `http://127.0.0.1:8545`
3. MetaMask switched to "Hardhat Local" network

### **Issue: "Invalid Nonce"**

**Solution:**
1. MetaMask → Settings → Advanced → **"Reset Account"**
2. This clears the nonce counter

### **Issue: "Contract Not Deployed"**

**Solution:**
1. Re-run deployment script
2. Check `contracts.localhost.js` has correct addresses
3. Verify frontend is importing localhost config

### **Issue: Transactions Pending Forever**

**Solution:**
1. Check Hardhat node terminal for errors
2. Restart Hardhat node
3. Re-deploy contracts
4. Reset MetaMask account

### **Issue: "Insufficient Funds"**

**Solution:**
- Each account starts with **10,000 ETH**
- CIT tokens are minted in deployment
- If you run out, restart Hardhat node

---

## 🎯 Advantages vs Sepolia

| Feature | Localhost | Sepolia |
|---------|-----------|---------|
| **RPC Requests** | Unlimited | 600/min (rate limited) |
| **Transaction Speed** | Instant | 12-15 seconds |
| **Cost** | Free | Needs testnet ETH |
| **Reset** | Anytime | Permanent |
| **Privacy** | Complete | Public blockchain |
| **Development** | Fast iteration | Slow feedback |

---

## 🔐 Security Notes

⚠️ **NEVER use these private keys on mainnet or with real funds!**

These accounts are publicly known test accounts. They're safe for:
- ✅ Local development
- ✅ Testing
- ✅ Demonstrations

But **NEVER** for:
- ❌ Mainnet
- ❌ Real money
- ❌ Production

---

## 📚 Advanced: Hardhat Console

Test contracts directly from console:

```powershell
npx hardhat console --network localhost
```

```javascript
// Get contract instance
const citToken = await ethers.getContractAt("CIToken", "0x5FbDB231...");

// Check balance
const balance = await citToken.balanceOf("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
console.log(ethers.formatEther(balance));

// Mint more tokens
await citToken.mint("0xYourAddress", ethers.parseEther("1000000"));
```

---

## 🔄 Development Workflow

**Recommended workflow:**

1. **Start Hardhat node** (Terminal 1)
   ```powershell
   npx hardhat node
   ```

2. **Deploy contracts** (Terminal 2)
   ```powershell
   npx hardhat run scripts/deploy-localhost.js --network localhost
   ```

3. **Start frontend** (Terminal 3)
   ```powershell
   cd frontend && npm start
   ```

4. **Make changes** to contracts

5. **Re-deploy** (Terminal 2)
   ```powershell
   npx hardhat run scripts/deploy-localhost.js --network localhost
   ```

6. **Frontend auto-updates** (if addresses changed, refresh browser)

**Tip:** Use `nodemon` to auto-restart frontend on contract changes:

```powershell
npm install -g nodemon
nodemon --exec "npx hardhat run scripts/deploy-localhost.js --network localhost" --watch contracts
```

---

## ✅ Checklist

- [ ] Hardhat node running (Terminal 1)
- [ ] Contracts deployed (Terminal 2)
- [ ] `contracts.localhost.js` imported in frontend
- [ ] MetaMask connected to "Hardhat Local" (Chain ID: 31337)
- [ ] Test accounts imported to MetaMask
- [ ] Frontend running at http://localhost:3000
- [ ] Can switch between accounts
- [ ] Transactions completing instantly

**Status:** 🟢 **Ready to develop!**

---

## 📖 Additional Resources

- **Hardhat Network Docs:** https://hardhat.org/hardhat-network/
- **Hardhat Console:** https://hardhat.org/hardhat-runner/docs/guides/hardhat-console
- **MetaMask Development:** https://docs.metamask.io/wallet/how-to/use-test-network/

---

**Document Version:** 1.0  
**Date:** November 6, 2025  
**Status:** ✅ Ready to use
