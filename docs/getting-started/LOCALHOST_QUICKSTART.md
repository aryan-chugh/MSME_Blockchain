# 🏠 Localhost Development - Quick Reference

## TL;DR - 3 Commands to Get Everything Running

**Terminal 1 - Start Blockchain:**
```powershell
npm run node
```

**Terminal 2 - Deploy Everything:**
```powershell
.\deploy-localhost.ps1
# OR
npm run deploy
```

**Terminal 3 - Start Frontend:**
```powershell
cd frontend
npm start
```

**That's it!** The single deployment script handles:
- ✅ Deploys all 11 contracts
- ✅ Registers 4 attestation schemas
- ✅ Mints tokens to 8 test accounts
- ✅ Verifies everything works
- ✅ Updates frontend configuration

---

## What Gets Deployed

### 📦 Smart Contracts (11 total)
- **CIToken**: ERC20 token (10M initial supply)
- **AttestationRegistry**: Commit-reveal attestations
- **OracleStaking**: Multi-oracle consensus
- **LoanMarketplace**: P2P lending
- And 7 more supporting contracts...

### Terminal 3 - Start Frontend
```powershell
cd frontend
npm start
```

---

## MetaMask Quick Setup

### Add Network
- **Network Name:** Hardhat Local
- **RPC URL:** `http://127.0.0.1:8545`
- **Chain ID:** `31337`
- **Currency:** ETH

### Import Accounts (Private Keys)

Copy-paste these into MetaMask → Import Account:

```
Admin:    0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
Oracle1:  0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
Oracle2:  0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
MSME1:    0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6
MSME2:    0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a
Lender:   0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba
```

⚠️ **These are PUBLIC test keys - NEVER use on mainnet!**

---

## 🎯 Why Localhost?

| Feature | Localhost | Sepolia |
|---------|-----------|---------|
| RPC Limits | **∞ Unlimited** | 600/min |
| Speed | **Instant** | 12-15s |
| Cost | **Free** | Need testnet ETH |
| Reset | **Anytime** | Permanent |

---

## 🔄 Reset Everything

Stop Hardhat node (Ctrl+C) and run:

```powershell
.\start-localhost.ps1
```

Fresh blockchain, fresh contracts, fresh start!

---

## 📁 Important Files

- `scripts/deploy-localhost.js` - Deployment script
- `deployments/localhost.json` - Contract addresses
- `frontend/src/utils/contracts.localhost.js` - Frontend config
- `docs/LOCALHOST_DEPLOYMENT.md` - Full guide

---

## ✅ Checklist

- [ ] Run `.\start-localhost.ps1`
- [ ] Add Hardhat network to MetaMask
- [ ] Import test accounts
- [ ] Switch MetaMask to "Hardhat Local"
- [ ] Frontend at http://localhost:3000
- [ ] Test instant transactions! ⚡

---

## 🐛 Common Issues

**"Network Error"**
→ Make sure Hardhat node is running

**"Invalid Nonce"**
→ MetaMask → Settings → Advanced → Reset Account

**"Contract Not Found"**
→ Re-run: `npx hardhat run scripts/deploy-localhost.js --network localhost`

---

**Quick Start Guide** | v1.0 | Nov 6, 2025
