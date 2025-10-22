# MSME Credit Platform - Development Workflow

## Daily Development Workflow

### Starting the Development Environment

Open **4 separate PowerShell terminals**:

#### Terminal 1: Blockchain Node
```powershell
cd d:\blockchain
npm run node
```
Leave this running. It provides the local blockchain.

#### Terminal 2: Smart Contracts (for deployment/testing)
```powershell
cd d:\blockchain

# Deploy contracts (do this once or after changes)
npm run deploy:local

# Or run tests
npm test

# Or watch for changes and recompile
npx hardhat compile --watch
```

#### Terminal 3: Oracle Service
```powershell
cd d:\blockchain\oracle-service
npm start

# Or use nodemon for auto-reload during development
npm run dev
```

#### Terminal 4: Frontend
```powershell
cd d:\blockchain\frontend
npm start
```

Browser opens automatically at `http://localhost:3000`

---

## Making Changes

### Modifying Smart Contracts

1. Edit contract in `contracts/` folder
2. Recompile: `npm run compile`
3. Run tests: `npm test`
4. If tests pass, redeploy: `npm run deploy:local`
5. Update contract addresses in `.env` files
6. Restart frontend and oracle service

### Modifying Frontend

1. Edit files in `frontend/src/`
2. Changes auto-reload (Hot Module Replacement)
3. No restart needed

### Modifying Oracle Service

1. Edit `oracle-service/index.js`
2. If using `npm start`: Restart service
3. If using `npm run dev`: Auto-reloads

---

## Common Tasks

### Run All Tests
```powershell
npm test
```

### Run Tests with Coverage
```powershell
npm run test:coverage
```

### Check Gas Usage
```powershell
# Set in .env
REPORT_GAS=true

# Then run tests
npm test
```

### Deploy to Sepolia Testnet
```powershell
# 1. Get Sepolia ETH from faucet
# 2. Update .env with your private key and Alchemy URL
# 3. Deploy
npm run deploy:sepolia
```

### Verify Contracts on Etherscan
```powershell
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

---

## Debugging Tips

### Contract Issues
- Check events in Hardhat console
- Use `console.log()` in Solidity (Hardhat feature)
- Run specific test: `npx hardhat test test/CIToken.test.js`

### Frontend Issues
- Open browser DevTools (F12)
- Check Console for errors
- Verify MetaMask is connected
- Check contract addresses in `.env.local`

### Oracle Service Issues
- Check service logs in terminal
- Test endpoints with curl/Postman
- Verify contract addresses in `.env`

### Transaction Failures
- Check gas limit
- Verify you have enough ETH
- Check you're on the correct network
- Look at revert reason in console

---

## Code Quality Checks

### Run Linter
```powershell
npx hardhat check
```

### Format Code
```powershell
npx prettier --write contracts/**/*.sol
```

### Check Test Coverage
```powershell
npm run test:coverage
# Opens HTML report in coverage/index.html
```

---

## Git Workflow

```powershell
# Check status
git status

# Create feature branch
git checkout -b feature/new-feature

# Make changes, then:
git add .
git commit -m "Description of changes"

# Push to remote
git push origin feature/new-feature

# Create pull request on GitHub
```

### What NOT to Commit
- `node_modules/`
- `.env` files
- `cache/`
- `artifacts/`
- Private keys

These are already in `.gitignore`

---

## Performance Optimization

### Frontend
- Use React DevTools Profiler
- Lazy load components
- Memoize expensive calculations

### Contracts
- Minimize storage operations
- Use events for off-chain data
- Batch operations when possible
- Use `view`/`pure` for read-only functions

---

## Troubleshooting

### "Nonce too high" error
```powershell
# Reset MetaMask account
# Settings → Advanced → Reset Account
```

### "Cannot find module" error
```powershell
# Reinstall dependencies
rm -rf node_modules
npm install
```

### "Port already in use"
```powershell
# Find process using port
netstat -ano | findstr :8545
# Kill process
taskkill /PID <PID> /F
```

### Contracts not deploying
```powershell
# Clean and recompile
npx hardhat clean
npm run compile
npm run deploy:local
```

---

## Useful Commands

```powershell
# Hardhat console (interact with contracts)
npx hardhat console --network localhost

# Check Hardhat accounts
npx hardhat accounts

# Run specific test file
npx hardhat test test/CIToken.test.js

# Compile contracts
npm run compile

# Clean build artifacts
npx hardhat clean

# Get contract size
npx hardhat size-contracts
```

---

## Resources

- **Hardhat Docs**: https://hardhat.org/docs
- **ethers.js Docs**: https://docs.ethers.org/v6/
- **OpenZeppelin Docs**: https://docs.openzeppelin.com/
- **Solidity Docs**: https://docs.soliditylang.org/

---

## Support

For issues:
1. Check error messages carefully
2. Review documentation
3. Check existing tests for examples
4. Search GitHub issues
5. Ask in project discussions

Happy coding! 🎉
