# ⚡ Quick Reference# 🚀 Quick Start Guide



**Fast commands for common tasks**Complete guide to get the MSME Credit Platform up and running in minutes.



## 🚀 Installation## Prerequisites



```bash- Node.js v18+ installed

npm install- MetaMask browser extension

cd frontend && npm install && cd ..- Basic understanding of blockchain/Ethereum

```

## Step 1: Clone & Install

## 🎯 Start Frontend

```powershell

```bash# Navigate to project directory

cd frontendcd d:\blockchain

npm start

# Opens http://localhost:3000# Install root dependencies

```npm install



## 🧪 Testing# Install frontend dependencies

cd frontend

```bashnpm install

# Run all testscd ..

npx hardhat test

# Install oracle service dependencies

# Run specific testcd oracle-service

npx hardhat test test/LoanMarketplace.test.jsnpm install

cd ..

# Test with coverage```

npx hardhat coverage

## Step 2: Set Up Environment

# Create test loan

node scripts/create-test-loan.js```powershell

# Copy environment templates

# Check loan statuscopy .env.example .env

node scripts/check-loan-status.jscopy frontend\.env.local.example frontend\.env.local

```copy oracle-service\.env.example oracle-service\.env

```

## 📝 Compile Contracts

## Step 3: Start Local Blockchain

```bash

npx hardhat compileOpen a new PowerShell terminal:

npx hardhat clean && npx hardhat compile  # Full rebuild

``````powershell

cd d:\blockchain

## 🌐 Deploy to Sepolianpm run node

```

```bash

npx hardhat run scripts/deploy.js --network sepoliaThis starts a local Hardhat network on `http://localhost:8545`

```

## Step 4: Deploy Contracts

## 🔍 Verify on Etherscan

Open another PowerShell terminal:

```bash

npx hardhat verify --network sepolia <CONTRACT_ADDRESS>```powershell

```cd d:\blockchain

npm run deploy:local

## 📊 Contract Addresses (Sepolia)```



```**Important**: Copy the deployed contract addresses and update:

CIT Token:          0xf92e9e05D816962F856b8e0EaA3De4f57e2e5E3f- `frontend\.env.local`

Loan Marketplace:   0x67fcDa4FFee9f0Da9657b81DC88d168eE9f5eBBd- `oracle-service\.env`

Oracle Staking:     0x27193be71b8D84dB1fCd57D9A8D917155C71a574

Attestation:        0xf931D540fFB875ea6A5952dCf00c83260e94bE9f## Step 5: Start Oracle Service

```

Open a new terminal:

## 🦊 MetaMask Setup

```powershell

**Sepolia Network:**cd d:\blockchain\oracle-service

- Network Name: `Sepolia`npm start

- RPC URL: `https://ethereum-sepolia.publicnode.com````

- Chain ID: `11155111`

- Currency: `ETH`Oracle service runs on `http://localhost:3001`



**Get Testnet ETH:**## Step 6: Start Frontend

- https://sepoliafaucet.com/

- https://www.infura.io/faucet/sepoliaOpen another terminal:



## 📚 Documentation```powershell

cd d:\blockchain\frontend

- **Setup Guide**: [STARTUP_GUIDE.md](STARTUP_GUIDE.md)npm start

- **Project Structure**: [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)```

- **README**: [README.md](README.md)

- **Old Docs**: [docs/](docs/)Frontend opens at `http://localhost:3000`



## 🛠️ Development## Step 7: Connect MetaMask



```bash1. Open MetaMask

# Install dependencies2. Add Network:

npm install   - **Network Name**: Localhost 8545

   - **RPC URL**: http://localhost:8545

# Compile contracts   - **Chain ID**: 31337

npx hardhat compile   - **Currency**: ETH



# Run tests3. Import Test Account:

npx hardhat test   - Use one of the private keys from Hardhat node output

   - You'll have 10,000 test ETH

# Start frontend

cd frontend && npm start## Step 8: Test the Platform



# Create test data### As an MSME:

node scripts/create-test-loan.js

```1. Go to "MSME Dashboard"

2. Click "Create MSME Identity"

## 🔧 Troubleshooting3. Navigate to "Attestations" tab

4. Request verifications (GST, Bank, KYC)

**Wrong Network:**5. Navigate to "Loan Requests" tab

```6. Create a new loan request

Switch MetaMask to Sepolia Test Network

```### As a Lender:



**Need Sepolia ETH:**1. Go to "Lender Dashboard"

```2. View available loan requests

Get from faucets (see above)3. Review MSME profiles

```4. Place sealed bids



**Frontend shows zeros:**### As an Oracle:

```bash

cd frontend1. Go to "Oracle Dashboard"

rm -rf node_modules/.cache2. Stake CIT tokens (minimum 50,000)

npm start3. View attestation requests

```4. Provide verifications



**Clear browser cache:**## Running Tests

```

Ctrl+Shift+Delete → Clear cache → Hard refresh (Ctrl+Shift+R)```powershell

```# Run all tests

npm test

## 📦 Project Structure

# Run with coverage

```npm run test:coverage

blockchain/```

├── contracts/       # Smart contracts

├── frontend/        # React app## Common Issues & Solutions

├── scripts/         # Deployment scripts

├── test/            # Tests### Issue: "Cannot connect to network"

└── docs/            # Documentation**Solution**: Ensure Hardhat node is running on port 8545

```

### Issue: "Transaction reverted"

## 🎯 Common Tasks**Solution**: Check MetaMask is connected to correct network (Localhost 8545)



### Create MSME Identity### Issue: "Insufficient funds"

1. Go to MSME Dashboard**Solution**: Import a Hardhat test account with ETH

2. Click "Create MSME Identity"

3. Fill form and submit### Issue: "Contract not found"

**Solution**: Redeploy contracts and update addresses in .env files

### Create Loan Request

1. Go to MSME Dashboard## Next Steps

2. Scroll to "Create Loan Request"

3. Enter amount, tenure, purpose1. **Explore the Marketplace**: View all loan requests and bidding activity

4. Set commit/reveal periods (min 1 hour each)2. **Test Sealed Bids**: Experience the commit-reveal auction process

5. Submit transaction3. **Build Reputation**: Complete loan cycles to build on-chain reputation

4. **Customize**: Modify contracts or UI to fit your needs

### Place Bid

1. Go to Marketplace## Development Workflow

2. Find loan in "Commit" phase

3. Click "Place Bid"```powershell

4. Enter interest rate and amount# Terminal 1: Local blockchain

5. Submit (bid saved to localStorage)npm run node



### Reveal Bid# Terminal 2: Deploy contracts

1. Go to Lender Dashboardnpm run deploy:local

2. Wait for "Reveal Phase"

3. Click "🔓 Reveal My Bid"# Terminal 3: Oracle service

4. Submit transactioncd oracle-service && npm start



### Register as Oracle# Terminal 4: Frontend

1. Go to Oracle Dashboardcd frontend && npm start

2. Click "Register as Oracle"

3. Choose tier (1/2/3)# Terminal 5: Run tests

4. Approve and stake CIT tokensnpm test

5. Submit transaction```



## 💡 Tips## Production Deployment



- **Commit/Reveal**: Must use same browser for commit → revealFor deploying to testnet (Sepolia):

- **Test Loans**: Use small amounts (0.01-0.1 CIT)

- **Time Periods**: Minimum 1 hour for commit and reveal1. Get Sepolia ETH from faucet

- **Sepolia ETH**: Keep ~0.1 ETH for gas fees2. Update `.env` with:

   - Your private key

## 🚀 Quick Start   - Alchemy/Infura RPC URL

   - Etherscan API key

```bash3. Run: `npm run deploy:sepolia`

# Three commands to get started:

npm install && cd frontend && npm install && npm start## Security Reminders

```

⚠️ **Never commit**:

That's it! 🎉- Private keys

- API keys
- `.env` files

✅ **Always**:
- Use `.env.example` templates
- Test thoroughly before mainnet
- Conduct security audits for production

## Support & Resources

- **Documentation**: See `/docs` folder
- **Contract ABIs**: Check `/artifacts/contracts` after compilation
- **Deployment Records**: Saved in `/deployments` folder

## Have Fun Building! 🎉

You now have a complete blockchain-based MSME credit platform running locally!
