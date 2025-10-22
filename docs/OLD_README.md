# MSME Credit Platform

Blockchain-based credit platform for MSMEs with self-sovereign identity, oracle attestations, and sealed-bid loan marketplace.

## 🚀 Quick Start

**Ready to deploy to Sepolia testnet!**

### 📖 Read This First:
→ **[START_TESTING.md](./START_TESTING.md)** - Deploy and test on Sepolia NOW

### 📚 Other Guides:
- **[QUICKSTART.md](./QUICKSTART.md)** - Local development
- **[TESTNET_DEPLOYMENT_GUIDE.md](./TESTNET_DEPLOYMENT_GUIDE.md)** - Complete testnet guide
- **[PROJECT_COMPLETE.md](./PROJECT_COMPLETE.md)** - Full project overview

---

## ✅ What's Included

**7 Smart Contracts (49/49 features complete):**
- CIToken.sol - ERC-20 utility token
- MSMEIdentity.sol - Self-sovereign identity
- OracleStaking.sol - Oracle registration & staking
- AttestationRegistry.sol - Verifiable credentials
- LoanMarketplace.sol - Sealed-bid auctions
- LoanAgreementRegistry.sol - Loan tracking
- PlatformGovernance.sol - Admin & slashing

**React Frontend:**
- 5 dashboards (Home, MSME, Lender, Oracle, Marketplace)
- Wallet integration (Rabby/MetaMask)

**Oracle Service:**
- Node.js + Express API
- 6 endpoints for verification

**Complete Tests:**
- 4 test files covering all contracts

---

## 🎯 Your Next Steps

```powershell
# 1. Export private key from Rabby wallet

# 2. Update .env file
cd d:\blockchain
notepad .env
# Add: PRIVATE_KEY=0xYOUR_KEY_HERE
#      SEPOLIA_RPC_URL=https://rpc.ankr.com/eth_sepolia

# 3. Deploy to Sepolia
npm run deploy -- --network sepolia

# 4. Start testing!
```

**See [START_TESTING.md](./START_TESTING.md) for detailed instructions.**

---

## 📊 Status

- ✅ All contracts implemented (1,400+ lines)
- ✅ Complete test coverage
- ✅ Frontend ready
- ✅ Oracle service ready
- ✅ 0.8 SepoliaETH ready for deployment
- ✅ Documentation complete

**Ready to deploy!** 🚀
