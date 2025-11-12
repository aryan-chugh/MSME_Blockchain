# 🗺️ Project Navigation Quick Reference

## ⚡ 30-Second Setup

```powershell
npm run node                    # Terminal 1
.\deploy-localhost.ps1          # Terminal 2
cd frontend && npm start        # Terminal 3
```

**Done!** Platform running at http://localhost:3000

---

## 📁 Where Is Everything?

### 🚀 Main Actions
| Action | Command/File |
|--------|--------------|
| **Deploy everything** | `.\deploy-localhost.ps1` |
| Run tests | `npm test` or `.\run-all-tests.ps1` |
| Start frontend | `cd frontend && npm start` |
| Quick start guide | `LOCALHOST_QUICKSTART.md` |

### 🔧 Scripts (Organized!)
| Category | Location | What's There |
|----------|----------|--------------|
| **Main Script** | `scripts/deploy-localhost.js` | ⭐ Does everything! |
| Deployment | `scripts/deployment/` | Deploy to networks (4 files) |
| Diagnostics | `scripts/diagnostics/` | Check status (13 files) |
| Testing | `scripts/testing/` | Test scripts (8 files) |
| Utilities | `scripts/utilities/` | Mint, stake, etc. (4 files) |
| Old/Archived | `scripts/deprecated/` | Old scripts (6 files) |

### 📚 Documentation
| Type | Location | Files |
|------|----------|-------|
| **Quick Start** | Root | `LOCALHOST_QUICKSTART.md` ⭐ |
| **Structure** | Root | `PROJECT_STRUCTURE_NEW.md` |
| User Guides | `docs/guides/` | 4 guides |
| Technical Docs | `docs/` | 25+ documents |
| Old Docs | `docs/archive/` | Archived |

### 📦 Key Directories
| Directory | Purpose |
|-----------|---------|
| `contracts/` | 11 Solidity contracts |
| `test/` | Test files |
| `frontend/` | React application |
| `oracle-service/` | Oracle service |
| `deployments/` | Deployment records |
| `scripts/` | **All scripts (organized!)** |
| `docs/` | **All documentation** |

---

## 🎯 Common Tasks

### Deploy & Start
```powershell
npm run node                    # Start blockchain
.\deploy-localhost.ps1          # Deploy everything
cd frontend && npm start        # Start UI
```

### Check Status
```powershell
# Schemas registered?
node scripts/diagnostics/check-schemas-localhost.js

# Oracles active?
node scripts/diagnostics/check-oracles.js

# Token balances?
node scripts/diagnostics/check-balances.js
```

### Test Platform
```powershell
npm test                                    # All tests
node scripts/testing/test-platform.js       # Platform test
node scripts/testing/test-attestation-request.js  # Attestations
```

### Utilities
```powershell
# Mint tokens
node scripts/utilities/mint-to-wallet.js <address> <amount>

# Stake oracle
node scripts/utilities/stake-oracle.js

# Accept request
node scripts/utilities/oracle-accept-request.js
```

---

## 📖 Documentation Flow

**Read in order:**

1. `LOCALHOST_QUICKSTART.md` → 3-command setup
2. `PROJECT_STRUCTURE_NEW.md` → Understand organization
3. `docs/guides/ONE_SCRIPT_DEPLOYMENT.md` → Deployment deep dive
4. `docs/guides/SCRIPTS_GUIDE.md` → All scripts reference
5. `docs/[topic].md` → Specific technical docs

---

## 🔍 Finding Scripts

### By Purpose

**Deploying?** → `scripts/deployment/`
- `deploy.js` (Sepolia)
- `register-schemas.js`
- `verify-deployment.js`

**Checking?** → `scripts/diagnostics/`
- `check-balances.js`
- `check-oracles.js`
- `check-schemas-localhost.js`
- `check-requests.js`
- etc. (13 total)

**Testing?** → `scripts/testing/`
- `test-platform.js`
- `test-attestation-request.js`
- `performanceTest.js`
- etc. (8 total)

**Need utility?** → `scripts/utilities/`
- `mint-to-wallet.js`
- `stake-oracle.js`
- `mint-tokens.js`
- `oracle-accept-request.js`

**Looking for old script?** → `scripts/deprecated/`

---

## 🆘 Quick Help

### "Where's the X script?"
1. Check `scripts/diagnostics/` for check-* scripts
2. Check `scripts/testing/` for test-* scripts
3. Check `scripts/utilities/` for mint-* and other utils
4. Check `scripts/deprecated/` for old scripts

### "How do I deploy?"
```powershell
.\deploy-localhost.ps1
```

### "How do I test?"
```powershell
npm test
```

### "Where's the documentation?"
- Quick start: `LOCALHOST_QUICKSTART.md`
- Guides: `docs/guides/`
- Technical: `docs/`

---

## 📊 Structure at a Glance

```
BWD_Project/
├── deploy-localhost.ps1              ⭐ DEPLOY HERE
├── LOCALHOST_QUICKSTART.md           ⭐ START HERE
├── PROJECT_STRUCTURE_NEW.md           📖 READ THIS
│
├── scripts/
│   ├── deploy-localhost.js           ⭐ MAIN SCRIPT
│   ├── deployment/                   📦 Deploy (4)
│   ├── diagnostics/                  🔍 Check (13)
│   ├── testing/                      🧪 Test (8)
│   ├── utilities/                    🛠️ Utils (4)
│   └── deprecated/                   📦 Old (6)
│
├── docs/
│   ├── guides/                       📖 Guides (4)
│   └── [technical]/                  📄 Docs (25+)
│
├── contracts/                        📝 Contracts (11)
├── frontend/                         🎨 React App
├── test/                             🧪 Tests
└── deployments/                      📤 Records
    └── localhost.json                ⭐ Current deploy
```

---

## ✨ Key Points

1. **ONE deployment script**: `scripts/deploy-localhost.js`
2. **ONE command to deploy**: `.\deploy-localhost.ps1`
3. **Scripts organized** into 6 categories
4. **Documentation organized** in `docs/guides/`
5. **Quick start** in 3 commands
6. **Everything easy to find**

---

**🎯 Bookmark this file for quick reference!**

*Last updated: November 11, 2025*
