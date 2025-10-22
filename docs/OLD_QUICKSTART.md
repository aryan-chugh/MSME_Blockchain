# 🚀 Quick Start Guide

Complete guide to get the MSME Credit Platform up and running in minutes.

## Prerequisites

- Node.js v18+ installed
- MetaMask browser extension
- Basic understanding of blockchain/Ethereum

## Step 1: Clone & Install

```powershell
# Navigate to project directory
cd d:\blockchain

# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..

# Install oracle service dependencies
cd oracle-service
npm install
cd ..
```

## Step 2: Set Up Environment

```powershell
# Copy environment templates
copy .env.example .env
copy frontend\.env.local.example frontend\.env.local
copy oracle-service\.env.example oracle-service\.env
```

## Step 3: Start Local Blockchain

Open a new PowerShell terminal:

```powershell
cd d:\blockchain
npm run node
```

This starts a local Hardhat network on `http://localhost:8545`

## Step 4: Deploy Contracts

Open another PowerShell terminal:

```powershell
cd d:\blockchain
npm run deploy:local
```

**Important**: Copy the deployed contract addresses and update:
- `frontend\.env.local`
- `oracle-service\.env`

## Step 5: Start Oracle Service

Open a new terminal:

```powershell
cd d:\blockchain\oracle-service
npm start
```

Oracle service runs on `http://localhost:3001`

## Step 6: Start Frontend

Open another terminal:

```powershell
cd d:\blockchain\frontend
npm start
```

Frontend opens at `http://localhost:3000`

## Step 7: Connect MetaMask

1. Open MetaMask
2. Add Network:
   - **Network Name**: Localhost 8545
   - **RPC URL**: http://localhost:8545
   - **Chain ID**: 31337
   - **Currency**: ETH

3. Import Test Account:
   - Use one of the private keys from Hardhat node output
   - You'll have 10,000 test ETH

## Step 8: Test the Platform

### As an MSME:

1. Go to "MSME Dashboard"
2. Click "Create MSME Identity"
3. Navigate to "Attestations" tab
4. Request verifications (GST, Bank, KYC)
5. Navigate to "Loan Requests" tab
6. Create a new loan request

### As a Lender:

1. Go to "Lender Dashboard"
2. View available loan requests
3. Review MSME profiles
4. Place sealed bids

### As an Oracle:

1. Go to "Oracle Dashboard"
2. Stake CIT tokens (minimum 50,000)
3. View attestation requests
4. Provide verifications

## Running Tests

```powershell
# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

## Common Issues & Solutions

### Issue: "Cannot connect to network"
**Solution**: Ensure Hardhat node is running on port 8545

### Issue: "Transaction reverted"
**Solution**: Check MetaMask is connected to correct network (Localhost 8545)

### Issue: "Insufficient funds"
**Solution**: Import a Hardhat test account with ETH

### Issue: "Contract not found"
**Solution**: Redeploy contracts and update addresses in .env files

## Next Steps

1. **Explore the Marketplace**: View all loan requests and bidding activity
2. **Test Sealed Bids**: Experience the commit-reveal auction process
3. **Build Reputation**: Complete loan cycles to build on-chain reputation
4. **Customize**: Modify contracts or UI to fit your needs

## Development Workflow

```powershell
# Terminal 1: Local blockchain
npm run node

# Terminal 2: Deploy contracts
npm run deploy:local

# Terminal 3: Oracle service
cd oracle-service && npm start

# Terminal 4: Frontend
cd frontend && npm start

# Terminal 5: Run tests
npm test
```

## Production Deployment

For deploying to testnet (Sepolia):

1. Get Sepolia ETH from faucet
2. Update `.env` with:
   - Your private key
   - Alchemy/Infura RPC URL
   - Etherscan API key
3. Run: `npm run deploy:sepolia`

## Security Reminders

⚠️ **Never commit**:
- Private keys
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
