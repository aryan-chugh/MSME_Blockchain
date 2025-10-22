# End-to-End Testing Guide
## Blockchain-Based MSME Credit Platform

This comprehensive guide provides step-by-step instructions for testing every component of the platform, from smart contracts to frontend integration and oracle services.

---

## 📋 Table of Contents

1. [Testing Environment Setup](#1-testing-environment-setup)
2. [Smart Contract Testing](#2-smart-contract-testing)
3. [Oracle Service Testing](#3-oracle-service-testing)
4. [Frontend Integration Testing](#4-frontend-integration-testing)
5. [End-to-End Workflow Testing](#5-end-to-end-workflow-testing)
6. [Security & Stress Testing](#6-security--stress-testing)
7. [Performance Testing](#7-performance-testing)
8. [Production Readiness Checklist](#8-production-readiness-checklist)

---

## 1. Testing Environment Setup

### 1.1 Prerequisites Installation

```powershell
# Verify Node.js installation (v18+ required)
node --version

# Verify npm
npm --version

# Install project dependencies
cd d:\blockchain
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

### 1.2 Configure Test Environment

Create `.env` file in root directory:
```bash
# Network Configuration
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
POLYGON_MUMBAI_RPC=https://polygon-mumbai.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=your_test_private_key_here

# API Keys
INFURA_API_KEY=your_infura_key
ETHERSCAN_API_KEY=your_etherscan_key
POLYGONSCAN_API_KEY=your_polygonscan_key

# Oracle Configuration
ORACLE_PRIVATE_KEY=your_oracle_private_key
ORACLE_PORT=3001

# Testing
REPORT_GAS=true
COINMARKETCAP_API_KEY=your_cmc_key
```

### 1.3 Start Local Blockchain

```powershell
# Terminal 1: Start Hardhat node
npx hardhat node

# This will:
# - Start a local Ethereum network on http://127.0.0.1:8545
# - Display 20 test accounts with 10,000 ETH each
# - Show account addresses and private keys
```

**Important:** Copy at least 5 account addresses and private keys for testing different roles:
- Account 0: Platform deployer/governance
- Account 1: Oracle 1
- Account 2: Oracle 2  
- Account 3: MSME
- Account 4: Lender

---

## 2. Smart Contract Testing

### 2.1 Unit Testing

#### Test 1: Deploy and Verify All Contracts

```powershell
# Terminal 2: Deploy contracts to local network
npx hardhat run scripts/deploy.js --network localhost
```

**Expected Output:**
```
Starting deployment...

Deploying contracts with account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Account balance: 10000.0 ETH

1. Deploying CIT Token...
   CIT Token deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
   Initial supply: 10000000 CIT

2. Deploying Oracle Staking...
   Oracle Staking deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
   Governance: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

3. Deploying Attestation Registry...
   Attestation Registry deployed to: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
   
[... additional deployments ...]

Deployment Summary saved to: deployments/deployment-TIMESTAMP.json
```

**Verification:**
```powershell
# Verify deployment file was created
ls deployments

# Check the deployment JSON contains all contract addresses
cat deployments/deployment-*.json | Select-String -Pattern "address"
```

#### Test 2: Run Comprehensive Unit Tests

```powershell
# Run all tests
npx hardhat test

# Run specific test suites
npx hardhat test test/CIToken.test.js
npx hardhat test test/OracleStaking.test.js
npx hardhat test test/LoanMarketplace.test.js

# Run with gas reporting
npx hardhat test --gas-report

# Run with coverage
npx hardhat coverage
```

**Expected Results:**
- ✅ All tests pass (should be 50+ tests)
- ✅ Coverage > 90% for all contracts
- ✅ Gas usage within acceptable limits

#### Test 3: Individual Contract Testing

##### CIToken Testing
```powershell
npx hardhat test test/CIToken.test.js --grep "CIToken"
```

**Key Test Cases:**
- ✅ Token deployment with correct initial supply
- ✅ Token transfers work correctly
- ✅ Approval and transferFrom mechanisms
- ✅ Only owner can mint (if applicable)

##### OracleStaking Testing
```powershell
npx hardhat test test/OracleStaking.test.js --grep "OracleStaking"
```

**Key Test Cases:**
- ✅ Oracle can stake tokens
- ✅ Minimum stake requirement enforced
- ✅ Reputation updates correctly
- ✅ Slashing mechanism works
- ✅ Unstaking with proper cooldown

##### MSMEIdentity Testing
```powershell
npx hardhat test test/MSMEIdentity.test.js --grep "MSMEIdentity"
```

**Key Test Cases:**
- ✅ Identity creation with correct owner
- ✅ Operator approval/revocation
- ✅ Data storage and retrieval
- ✅ Access control enforced

##### AttestationRegistry Testing
```powershell
npx hardhat test test/AttestationRegistry.test.js --grep "Attestation"
```

**Key Test Cases:**
- ✅ Only staked oracles can submit attestations
- ✅ Schema registration works
- ✅ Attestation data stored correctly
- ✅ Expiry time enforced
- ✅ Revocation mechanism

##### LoanMarketplace Testing
```powershell
npx hardhat test test/LoanMarketplace.test.js --grep "LoanMarketplace"
```

**Key Test Cases:**
- ✅ Loan request creation
- ✅ Bid commitment phase
- ✅ Bid reveal phase
- ✅ Winner selection
- ✅ Sealed-bid integrity (hash verification)
- ✅ Time-based state transitions

##### LoanAgreementRegistry Testing
```powershell
npx hardhat test test/LoanAgreementRegistry.test.js --grep "Agreement"
```

**Key Test Cases:**
- ✅ Agreement registration by winning lender
- ✅ Status updates
- ✅ Reputation calculation
- ✅ Dispute mechanism

##### PlatformGovernance Testing
```powershell
npx hardhat test test/PlatformGovernance.test.js --grep "Governance"
```

**Key Test Cases:**
- ✅ Parameter updates
- ✅ Oracle slashing
- ✅ Emergency pause
- ✅ Fee withdrawal

### 2.2 Integration Testing

Create and run `test/Integration.test.js`:

```javascript
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Full Integration Test", function () {
  let citToken, oracleStaking, attestationRegistry, marketplace, agreementRegistry;
  let deployer, oracle1, msme, lender;

  before(async function () {
    // Deploy all contracts
    [deployer, oracle1, msme, lender] = await ethers.getSigners();
    
    // Deploy CIT Token
    const CIToken = await ethers.getContractFactory("CIToken");
    citToken = await CIToken.deploy(10_000_000);
    
    // Deploy Oracle Staking
    const OracleStaking = await ethers.getContractFactory("OracleStaking");
    oracleStaking = await OracleStaking.deploy(await citToken.getAddress(), deployer.address);
    
    // Deploy Attestation Registry
    const AttestationRegistry = await ethers.getContractFactory("AttestationRegistry");
    attestationRegistry = await AttestationRegistry.deploy(await oracleStaking.getAddress());
    
    // Deploy Marketplace
    const LoanMarketplace = await ethers.getContractFactory("LoanMarketplace");
    marketplace = await LoanMarketplace.deploy();
    
    // Deploy Agreement Registry
    const LoanAgreementRegistry = await ethers.getContractFactory("LoanAgreementRegistry");
    agreementRegistry = await LoanAgreementRegistry.deploy(await marketplace.getAddress());
  });

  it("Complete workflow: Oracle staking → Attestation → Loan request → Matching", async function () {
    // Step 1: Oracle stakes tokens
    const stakeAmount = ethers.parseEther("50000");
    await citToken.transfer(oracle1.address, stakeAmount);
    await citToken.connect(oracle1).approve(await oracleStaking.getAddress(), stakeAmount);
    await oracleStaking.connect(oracle1).stake(stakeAmount);
    
    // Verify oracle is staked
    const oracleInfo = await oracleStaking.oracles(oracle1.address);
    expect(oracleInfo.stakedAmount).to.equal(stakeAmount);
    
    // Step 2: Oracle submits attestation for MSME
    const schemaId = ethers.keccak256(ethers.toUtf8Bytes("gst-revenue"));
    const data = ethers.AbiCoder.defaultAbiCoder().encode(
      ["string", "uint256"],
      ["27AABCU9603R1ZM", 5000000]
    );
    
    await attestationRegistry.connect(oracle1).submitAttestation(
      msme.address,
      schemaId,
      data,
      31536000 // 1 year validity
    );
    
    // Verify attestation
    const attestations = await attestationRegistry.getAttestations(msme.address);
    expect(attestations.length).to.equal(1);
    
    // Step 3: MSME creates loan request
    const amount = ethers.parseEther("100");
    const tx = await marketplace.connect(msme).createLoanRequest(
      amount,
      12,
      "Working capital",
      3600,
      3600
    );
    
    const receipt = await tx.wait();
    const requestId = 1;
    
    // Step 4: Lender commits bid
    const rateBP = 1200; // 12%
    const nonce = ethers.randomBytes(32);
    const commitment = ethers.keccak256(
      ethers.solidityPacked(["uint256", "bytes32"], [rateBP, nonce])
    );
    
    await marketplace.connect(lender).commitBid(requestId, commitment);
    
    // Fast forward time
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine");
    
    // Step 5: Lender reveals bid
    await marketplace.connect(lender).revealBid(requestId, rateBP, nonce);
    
    // Fast forward time
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine");
    
    // Step 6: MSME selects winner
    await marketplace.connect(msme).selectWinner(requestId);
    
    const winner = await marketplace.getWinner(requestId);
    expect(winner).to.equal(lender.address);
    
    // Step 7: Lender registers agreement
    const agreementHash = ethers.keccak256(ethers.toUtf8Bytes("Legal agreement content"));
    await agreementRegistry.connect(lender).registerAgreement(requestId, agreementHash);
    
    const record = await agreementRegistry.records(1);
    expect(record.lender).to.equal(lender.address);
    expect(record.msme).to.equal(msme.address);
  });
});
```

Run the integration test:
```powershell
npx hardhat test test/Integration.test.js
```

### 2.3 Edge Case Testing

Create `test/EdgeCases.test.js`:

```javascript
describe("Edge Cases and Attack Scenarios", function () {
  
  it("Should prevent double-spending of bids", async function () {
    // Test that same lender can't submit multiple bids with same commitment
  });
  
  it("Should prevent front-running in sealed-bid auction", async function () {
    // Test that commitment-reveal prevents front-running
  });
  
  it("Should handle expired loan requests correctly", async function () {
    // Test that expired requests can't be matched
  });
  
  it("Should prevent unauthorized attestations", async function () {
    // Test that non-staked addresses can't submit attestations
  });
  
  it("Should handle oracle slashing correctly", async function () {
    // Test full slashing workflow
  });
  
  it("Should prevent integer overflow/underflow", async function () {
    // Test with maximum uint256 values
  });
  
  it("Should handle zero-value transactions", async function () {
    // Test edge cases with zero amounts
  });
});
```

---

## 3. Oracle Service Testing

### 3.1 Setup Oracle Service

```powershell
# Terminal 3: Navigate to oracle service
cd oracle-service

# Create .env file
@"
ORACLE_PRIVATE_KEY=<Account_1_Private_Key>
RPC_URL=http://127.0.0.1:8545
ORACLE_PORT=3001
ATTESTATION_REGISTRY=<AttestationRegistry_Address_From_Deployment>
"@ | Out-File -FilePath .env -Encoding utf8

# Start oracle service
npm start
```

**Expected Output:**
```
Oracle Service Starting...
Oracle Address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Server listening on port 3001
```

### 3.2 Test Oracle API Endpoints

#### Test Health Check
```powershell
# Using Invoke-RestMethod
Invoke-RestMethod -Uri http://localhost:3001/health -Method Get

# Expected response:
# {
#   "status": "healthy",
#   "oracle": "0x70997...",
#   "walletConfigured": true,
#   "timestamp": "2025-10-21T..."
# }
```

#### Test GST Verification
```powershell
$body = @{
    msmeId = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
    gstNumber = "27AABCU9603R1ZM"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3001/api/verify/gst -Method Post -Body $body -ContentType "application/json"

# Expected response:
# {
#   "success": true,
#   "message": "GST verification completed",
#   "data": { ... },
#   "attestationId": <number>,
#   "txHash": "0x..."
# }
```

#### Test Bank Statement Verification
```powershell
$body = @{
    msmeId = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
    accountNumber = "1234567890"
    ifsc = "HDFC0001234"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3001/api/verify/bank -Method Post -Body $body -ContentType "application/json"
```

#### Test KYC Verification
```powershell
$body = @{
    msmeId = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
    pan = "ABCDE1234F"
    aadhaar = "1234-5678-9012"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3001/api/verify/kyc -Method Post -Body $body -ContentType "application/json"
```

### 3.3 Test Oracle Staking Integration

Create `test/OracleIntegration.test.js`:

```javascript
const { expect } = require("chai");
const { ethers } = require("hardhat");
const axios = require("axios");

describe("Oracle Service Integration", function () {
  
  it("Oracle can submit attestation after staking", async function () {
    // 1. Deploy contracts (use fixture)
    // 2. Stake tokens for oracle
    // 3. Call oracle service API
    // 4. Verify attestation appears on-chain
  });
  
  it("Oracle service correctly encodes attestation data", async function () {
    // Test that encoding matches contract expectations
  });
});
```

---

## 4. Frontend Integration Testing

### 4.1 Setup Frontend

```powershell
# Terminal 4: Navigate to frontend
cd frontend

# Update contract addresses in src/utils/contracts.js
# Use addresses from deployments/deployment-*.json

# Start development server
npm start
```

**Expected:** Browser opens at http://localhost:3000

### 4.2 Manual UI Testing

#### Test 1: Wallet Connection
1. Open http://localhost:3000
2. Click "Connect Wallet"
3. Select MetaMask
4. Verify:
   - ✅ Wallet address displayed
   - ✅ Network ID shown (31337 for localhost)
   - ✅ Balance displayed

#### Test 2: MSME Dashboard
1. Navigate to "MSME Dashboard"
2. Connect with Account 3 (MSME account)
3. Click "Create Identity"
4. Verify:
   - ✅ Transaction sent
   - ✅ Identity address displayed
   - ✅ Success message shown

#### Test 3: Request Attestation
1. In MSME Dashboard, click "Request Attestation"
2. Select "GST Verification"
3. Enter GST number: 27AABCU9603R1ZM
4. Click "Submit Request"
5. Verify:
   - ✅ Oracle service called
   - ✅ Attestation appears in "My Attestations"
   - ✅ Timestamp and oracle address shown

#### Test 4: Create Loan Request
1. In MSME Dashboard, click "Create Loan Request"
2. Fill form:
   - Amount: 100 (ETH equivalent)
   - Tenure: 12 months
   - Purpose: "Working capital for expansion"
   - Commit Period: 1 hour
   - Reveal Period: 1 hour
3. Click "Submit"
4. Verify:
   - ✅ Transaction confirmed
   - ✅ Request appears in Marketplace
   - ✅ Status shows "Open"

#### Test 5: Lender Bidding Flow
1. Navigate to "Lender Dashboard"
2. Connect with Account 4 (Lender account)
3. View loan request from Test 4
4. Click "Place Bid"
5. Enter interest rate: 12%
6. Click "Commit Bid"
7. Verify:
   - ✅ Bid commitment transaction sent
   - ✅ Cannot reveal yet (time lock)

8. Fast forward time (in Hardhat console):
```javascript
await network.provider.send("evm_increaseTime", [3601]);
await network.provider.send("evm_mine");
```

9. Click "Reveal Bid"
10. Verify:
    - ✅ Bid revealed successfully
    - ✅ Bid appears in "Revealed Bids" section

#### Test 6: Winner Selection
1. Switch back to MSME account
2. In Marketplace, view your loan request
3. Click "Select Winner"
4. Verify:
   - ✅ Best bid automatically selected
   - ✅ Status changes to "Matched"
   - ✅ Winner's address displayed

#### Test 7: Agreement Registration
1. Switch to Lender account
2. In "Lender Dashboard", view matched loan
3. Click "Register Agreement"
4. Upload agreement document (hash will be calculated)
5. Verify:
   - ✅ Agreement registered on-chain
   - ✅ Record ID displayed
   - ✅ Status shows "Active"

### 4.3 Automated Frontend Testing

Create `frontend/src/tests/App.test.js`:

```javascript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';

// Mock ethers
jest.mock('ethers');

describe('App Component', () => {
  
  test('renders home page', () => {
    render(<BrowserRouter><App /></BrowserRouter>);
    expect(screen.getByText(/Blockchain MSME Credit Platform/i)).toBeInTheDocument();
  });
  
  test('wallet connection flow', async () => {
    // Mock window.ethereum
    global.window.ethereum = {
      request: jest.fn().mockResolvedValue(['0x123...'])
    };
    
    render(<BrowserRouter><App /></BrowserRouter>);
    
    const connectButton = screen.getByText(/Connect Wallet/i);
    fireEvent.click(connectButton);
    
    await waitFor(() => {
      expect(screen.getByText(/0x123/i)).toBeInTheDocument();
    });
  });
});
```

Run frontend tests:
```powershell
cd frontend
npm test
```

---

## 5. End-to-End Workflow Testing

### 5.1 Complete Platform Workflow

This test simulates the entire lifecycle from MSME onboarding to loan repayment.

Create `test/E2E.test.js`:

```javascript
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("End-to-End Platform Workflow", function () {
  this.timeout(120000); // 2 minutes

  let citToken, oracleStaking, attestationRegistry, marketplace, agreementRegistry, governance;
  let deployer, oracle1, oracle2, msme1, lender1, lender2;

  before(async function () {
    [deployer, oracle1, oracle2, msme1, lender1, lender2] = await ethers.getSigners();
    
    console.log("\n🚀 Starting E2E Test...\n");
    
    // Deploy all contracts
    console.log("📝 Deploying contracts...");
    
    const CIToken = await ethers.getContractFactory("CIToken");
    citToken = await CIToken.deploy(10_000_000);
    console.log("  ✅ CIT Token deployed");
    
    const OracleStaking = await ethers.getContractFactory("OracleStaking");
    oracleStaking = await OracleStaking.deploy(await citToken.getAddress(), deployer.address);
    console.log("  ✅ Oracle Staking deployed");
    
    const AttestationRegistry = await ethers.getContractFactory("AttestationRegistry");
    attestationRegistry = await AttestationRegistry.deploy(await oracleStaking.getAddress());
    console.log("  ✅ Attestation Registry deployed");
    
    const LoanMarketplace = await ethers.getContractFactory("LoanMarketplace");
    marketplace = await LoanMarketplace.deploy();
    console.log("  ✅ Loan Marketplace deployed");
    
    const LoanAgreementRegistry = await ethers.getContractFactory("LoanAgreementRegistry");
    agreementRegistry = await LoanAgreementRegistry.deploy(await marketplace.getAddress());
    console.log("  ✅ Loan Agreement Registry deployed");
    
    const PlatformGovernance = await ethers.getContractFactory("PlatformGovernance");
    governance = await PlatformGovernance.deploy(deployer.address, deployer.address);
    console.log("  ✅ Platform Governance deployed\n");
  });

  it("Complete workflow: Onboarding → Attestation → Loan → Repayment", async function () {
    
    console.log("👥 Phase 1: Oracle Onboarding");
    console.log("  → Oracle 1 staking tokens...");
    const stakeAmount = ethers.parseEther("100000");
    await citToken.transfer(oracle1.address, stakeAmount);
    await citToken.connect(oracle1).approve(await oracleStaking.getAddress(), stakeAmount);
    await oracleStaking.connect(oracle1).stake(stakeAmount);
    expect((await oracleStaking.oracles(oracle1.address)).isActive).to.be.true;
    console.log("  ✅ Oracle 1 active\n");
    
    console.log("  → Oracle 2 staking tokens...");
    await citToken.transfer(oracle2.address, stakeAmount);
    await citToken.connect(oracle2).approve(await oracleStaking.getAddress(), stakeAmount);
    await oracleStaking.connect(oracle2).stake(stakeAmount);
    console.log("  ✅ Oracle 2 active\n");
    
    console.log("🏢 Phase 2: MSME Identity & Profile Building");
    console.log("  → Creating MSMEIdentity contract...");
    const MSMEIdentity = await ethers.getContractFactory("MSMEIdentity");
    const msmeIdentity = await MSMEIdentity.deploy(msme1.address);
    console.log("  ✅ MSME Identity created:", await msmeIdentity.getAddress());
    
    console.log("  → Approving Attestation Registry...");
    await msmeIdentity.connect(msme1).approveOperator(await attestationRegistry.getAddress());
    console.log("  ✅ Operator approved\n");
    
    console.log("📋 Phase 3: Oracle Attestations");
    
    // GST Attestation
    console.log("  → Oracle 1 submitting GST attestation...");
    const gstSchema = ethers.keccak256(ethers.toUtf8Bytes("gst-revenue"));
    const gstData = ethers.AbiCoder.defaultAbiCoder().encode(
      ["string", "uint256", "string"],
      ["27AABCU9603R1ZM", 5000000, "Active"]
    );
    await attestationRegistry.connect(oracle1).submitAttestation(
      msme1.address,
      gstSchema,
      gstData,
      31536000
    );
    console.log("  ✅ GST attestation submitted");
    
    // Bank Statement Attestation
    console.log("  → Oracle 2 submitting bank attestation...");
    const bankSchema = ethers.keccak256(ethers.toUtf8Bytes("bank-statement"));
    const bankData = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "uint256"],
      [500000, 90] // Average balance, period in days
    );
    await attestationRegistry.connect(oracle2).submitAttestation(
      msme1.address,
      bankSchema,
      bankData,
      31536000
    );
    console.log("  ✅ Bank attestation submitted\n");
    
    console.log("💼 Phase 4: Loan Request Creation");
    const loanAmount = ethers.parseEther("100");
    console.log("  → MSME requesting loan:", ethers.formatEther(loanAmount), "ETH");
    const createTx = await marketplace.connect(msme1).createLoanRequest(
      loanAmount,
      12,
      "Working capital for inventory expansion",
      7200, // 2 hours commit
      3600  // 1 hour reveal
    );
    await createTx.wait();
    const requestId = 1;
    console.log("  ✅ Loan request created (ID:", requestId, ")\n");
    
    console.log("💰 Phase 5: Lender Bidding");
    
    // Lender 1 commits bid at 12%
    console.log("  → Lender 1 committing bid (12% rate)...");
    const rate1 = 1200;
    const nonce1 = ethers.randomBytes(32);
    const commitment1 = ethers.keccak256(
      ethers.solidityPacked(["uint256", "bytes32"], [rate1, nonce1])
    );
    await marketplace.connect(lender1).commitBid(requestId, commitment1);
    console.log("  ✅ Bid committed");
    
    // Lender 2 commits bid at 10%
    console.log("  → Lender 2 committing bid (10% rate)...");
    const rate2 = 1000;
    const nonce2 = ethers.randomBytes(32);
    const commitment2 = ethers.keccak256(
      ethers.solidityPacked(["uint256", "bytes32"], [rate2, nonce2])
    );
    await marketplace.connect(lender2).commitBid(requestId, commitment2);
    console.log("  ✅ Bid committed\n");
    
    console.log("⏰ Fast-forwarding time to reveal period...");
    await time.increase(7201);
    
    console.log("🎭 Phase 6: Bid Reveal");
    console.log("  → Lender 1 revealing bid...");
    await marketplace.connect(lender1).revealBid(requestId, rate1, nonce1);
    console.log("  ✅ Revealed: 12%");
    
    console.log("  → Lender 2 revealing bid...");
    await marketplace.connect(lender2).revealBid(requestId, rate2, nonce2);
    console.log("  ✅ Revealed: 10%\n");
    
    console.log("⏰ Fast-forwarding time past reveal deadline...");
    await time.increase(3601);
    
    console.log("🏆 Phase 7: Winner Selection");
    console.log("  → MSME selecting winner...");
    const selectTx = await marketplace.connect(msme1).selectWinner(requestId);
    await selectTx.wait();
    
    const winner = await marketplace.getWinner(requestId);
    const winningRate = await marketplace.winningRates(requestId);
    
    expect(winner).to.equal(lender2.address);
    expect(winningRate).to.equal(1000);
    console.log("  ✅ Winner selected:", winner);
    console.log("  ✅ Winning rate: 10%\n");
    
    console.log("📜 Phase 8: Agreement Registration");
    console.log("  → Lender registering legal agreement...");
    const agreementHash = ethers.keccak256(
      ethers.toUtf8Bytes("Legal loan agreement between MSME and Lender")
    );
    const regTx = await agreementRegistry.connect(lender2).registerAgreement(
      requestId,
      agreementHash
    );
    await regTx.wait();
    console.log("  ✅ Agreement registered\n");
    
    const recordId = 1;
    const record = await agreementRegistry.records(recordId);
    expect(record.msme).to.equal(msme1.address);
    expect(record.lender).to.equal(lender2.address);
    
    console.log("💵 Phase 9: Loan Disbursement");
    console.log("  → Lender marking loan as disbursed...");
    await agreementRegistry.connect(lender2).markDisbursed(recordId);
    console.log("  ✅ Loan disbursed\n");
    
    console.log("✅ Phase 10: Loan Repayment");
    console.log("  → Lender marking loan as repaid...");
    await agreementRegistry.connect(lender2).updateStatus(recordId, 1); // Status.Repaid
    console.log("  ✅ Loan repaid\n");
    
    console.log("📊 Phase 11: Reputation Update");
    const reputation = await agreementRegistry.reputations(msme1.address);
    console.log("  MSME Reputation:");
    console.log("    - Total Loans:", reputation.totalLoans.toString());
    console.log("    - Repaid Loans:", reputation.repaidLoans.toString());
    console.log("    - Reputation Score:", reputation.reputationScore.toString());
    
    expect(reputation.totalLoans).to.equal(1);
    expect(reputation.repaidLoans).to.equal(1);
    console.log("  ✅ Reputation updated successfully\n");
    
    console.log("🎉 E2E Test Completed Successfully!\n");
  });
});
```

Run the E2E test:
```powershell
npx hardhat test test/E2E.test.js
```

**Expected Output:**
```
🚀 Starting E2E Test...

📝 Deploying contracts...
  ✅ CIT Token deployed
  ✅ Oracle Staking deployed
  [... all deployments ...]

👥 Phase 1: Oracle Onboarding
  ✅ Oracle 1 active
  ✅ Oracle 2 active

[... all phases complete ...]

🎉 E2E Test Completed Successfully!

  ✔ Complete workflow: Onboarding → Attestation → Loan → Repayment (5234ms)

  1 passing (5s)
```

---

## 6. Security & Stress Testing

### 6.1 Attack Scenario Testing

Create `test/SecurityTests.test.js`:

```javascript
describe("Security Attack Scenarios", function () {
  
  describe("Reentrancy Attacks", function () {
    it("Should prevent reentrancy in unstake function", async function () {
      // Create malicious contract that tries to re-enter
      const MaliciousContract = await ethers.getContractFactory("ReentrancyAttacker");
      const attacker = await MaliciousContract.deploy(oracleStakingAddress);
      
      // Attempt attack
      await expect(attacker.attack()).to.be.reverted;
    });
  });
  
  describe("Front-Running Attacks", function () {
    it("Should prevent front-running through sealed bids", async function () {
      // Test that commitment-reveal prevents front-running
      // Attacker sees pending transaction and tries to submit better bid
      // Should fail due to commitment phase
    });
  });
  
  describe("Oracle Collusion", function () {
    it("Should detect and flag suspicious oracle patterns", async function () {
      // Submit multiple attestations from same oracle pair
      // System should flag as suspicious
    });
    
    it("Should slash colluding oracles", async function () {
      // Simulate proven collusion
      // Verify both oracles are slashed
    });
  });
  
  describe("Sybil Attacks", function () {
    it("Should prevent fake identities through KYC requirements", async function () {
      // Test that non-KYC verified accounts can't participate
    });
    
    it("Should require minimum stake for attestations", async function () {
      // Test that low-stake oracles can't attest for high-value loans
    });
  });
  
  describe("Time Manipulation", function () {
    it("Should be resistant to timestamp manipulation", async function () {
      // Test with various block.timestamp scenarios
    });
  });
});
```

### 6.2 Stress Testing

Create `test/StressTest.test.js`:

```javascript
describe("Platform Stress Tests", function () {
  
  it("Should handle 100 concurrent loan requests", async function () {
    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(
        marketplace.createLoanRequest(
          ethers.parseEther("100"),
          12,
          `Purpose ${i}`,
          3600,
          3600
        )
      );
    }
    
    await Promise.all(promises);
    expect(await marketplace.requestCounter()).to.equal(100);
  });
  
  it("Should handle 50 oracles staking simultaneously", async function () {
    // Test concurrent staking
  });
  
  it("Should handle 1000 attestations for single MSME", async function () {
    // Test large-scale attestation storage
  });
  
  it("Should maintain performance with 10,000 loan records", async function () {
    // Test reputation calculation at scale
  });
});
```

Run security tests:
```powershell
npx hardhat test test/SecurityTests.test.js
npx hardhat test test/StressTest.test.js
```

### 6.3 Gas Optimization Verification

```powershell
# Run tests with gas reporter
npx hardhat test --gas-report

# Expected output should show gas usage for each function
# Compare against benchmarks:
# - createLoanRequest: < 200,000 gas
# - submitAttestation: < 150,000 gas
# - revealBid: < 100,000 gas
```

---

## 7. Performance Testing

### 7.1 Transaction Speed Testing

Create `scripts/performanceTest.js`:

```javascript
const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting Performance Test\n");
  
  const [deployer, msme] = await ethers.getSigners();
  
  // Deploy marketplace
  const LoanMarketplace = await ethers.getContractFactory("LoanMarketplace");
  const marketplace = await LoanMarketplace.deploy();
  await marketplace.waitForDeployment();
  
  console.log("📊 Testing transaction throughput...\n");
  
  const startTime = Date.now();
  const iterations = 100;
  
  for (let i = 0; i < iterations; i++) {
    const tx = await marketplace.connect(msme).createLoanRequest(
      ethers.parseEther("100"),
      12,
      `Purpose ${i}`,
      3600,
      3600
    );
    await tx.wait();
    
    if (i % 10 === 0) {
      console.log(`  Processed ${i + 1}/${iterations} transactions`);
    }
  }
  
  const endTime = Date.now();
  const totalTime = (endTime - startTime) / 1000;
  const tps = iterations / totalTime;
  
  console.log(`\n✅ Performance Results:`);
  console.log(`   Total Transactions: ${iterations}`);
  console.log(`   Total Time: ${totalTime.toFixed(2)}s`);
  console.log(`   Transactions/Second: ${tps.toFixed(2)}`);
  console.log(`   Average Time/Transaction: ${(totalTime / iterations * 1000).toFixed(2)}ms\n`);
}

main();
```

Run performance test:
```powershell
npx hardhat run scripts/performanceTest.js --network localhost
```

### 7.2 Query Performance Testing

```javascript
// Test large-scale data retrieval
async function testQueryPerformance() {
  console.log("Testing query performance...");
  
  // Retrieve 1000 attestations
  const start = Date.now();
  const attestations = await attestationRegistry.getAttestations(msme.address);
  const end = Date.now();
  
  console.log(`Retrieved ${attestations.length} attestations in ${end - start}ms`);
}
```

---

## 8. Production Readiness Checklist

### 8.1 Pre-Deployment Verification

```powershell
# Create checklist script
$checklist = @"
BLOCKCHAIN MSME PLATFORM - PRODUCTION READINESS CHECKLIST

□ Smart Contracts
  □ All unit tests passing (>95% coverage)
  □ Integration tests passing
  □ Security tests passing
  □ Gas optimization verified
  □ External audit completed
  □ No critical/high severity issues

□ Oracle Service
  □ API endpoints tested
  □ Error handling verified
  □ Rate limiting implemented
  □ Monitoring configured
  □ Backup oracle configured

□ Frontend
  □ All UI flows tested
  □ Wallet integration working
  □ Error messages user-friendly
  □ Mobile responsive
  □ Performance optimized

□ Documentation
  □ User guides complete
  □ API documentation updated
  □ Deployment guide ready
  □ Troubleshooting guide available

□ Infrastructure
  □ RPC endpoints configured
  □ Backup RPC available
  □ Monitoring dashboards setup
  □ Alert system configured
  □ Backup & recovery tested

□ Security
  □ Private keys secured
  □ Access controls verified
  □ Rate limiting enabled
  □ DDoS protection active
  □ Bug bounty program live

□ Compliance
  □ Legal review completed
  □ Privacy policy updated
  □ Terms of service finalized
  □ KYC/AML compliance verified
  □ Data protection audit done

□ Testing
  □ Testnet deployment successful
  □ Beta user testing completed
  □ Load testing passed
  □ Disaster recovery tested
  □ Rollback procedure verified
"@

Write-Host $checklist
```

### 8.2 Testnet Deployment Testing

```powershell
# Deploy to Sepolia testnet
npx hardhat run scripts/deploy.js --network sepolia

# Verify contracts
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>

# Run smoke tests
npx hardhat test test/SmokeTests.test.js --network sepolia
```

### 8.3 Monitoring Setup

Create `monitoring/healthCheck.js`:

```javascript
const { ethers } = require("ethers");
const axios = require("axios");

const CONTRACTS = {
  marketplace: "0x...",
  attestationRegistry: "0x...",
  oracleStaking: "0x..."
};

async function runHealthChecks() {
  console.log("🏥 Running Health Checks...\n");
  
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  
  // Check 1: RPC connectivity
  try {
    const blockNumber = await provider.getBlockNumber();
    console.log("✅ RPC connected (Block:", blockNumber, ")");
  } catch (error) {
    console.error("❌ RPC connection failed:", error.message);
    return false;
  }
  
  // Check 2: Contract accessibility
  for (const [name, address] of Object.entries(CONTRACTS)) {
    try {
      const code = await provider.getCode(address);
      if (code === "0x") {
        console.error(`❌ ${name} contract not found at ${address}`);
        return false;
      }
      console.log(`✅ ${name} contract accessible`);
    } catch (error) {
      console.error(`❌ ${name} contract check failed:`, error.message);
      return false;
    }
  }
  
  // Check 3: Oracle service
  try {
    const response = await axios.get("http://localhost:3001/health");
    console.log("✅ Oracle service healthy");
  } catch (error) {
    console.error("❌ Oracle service unreachable");
    return false;
  }
  
  // Check 4: Frontend
  try {
    const response = await axios.get("http://localhost:3000");
    console.log("✅ Frontend accessible");
  } catch (error) {
    console.error("❌ Frontend unreachable");
    return false;
  }
  
  console.log("\n✅ All health checks passed!\n");
  return true;
}

// Run every 5 minutes
setInterval(runHealthChecks, 5 * 60 * 1000);
runHealthChecks();
```

Run health checks:
```powershell
node monitoring/healthCheck.js
```

---

## 📈 Test Coverage Report

After running all tests, generate coverage report:

```powershell
npx hardhat coverage

# Expected output:
# File                        | % Stmts | % Branch | % Funcs | % Lines |
# ----------------------------|---------|----------|---------|---------|
# contracts/                  |         |          |         |         |
#   CIToken.sol               |  100.00 |   100.00 |  100.00 |  100.00 |
#   MSMEIdentity.sol          |   95.00 |    90.00 |   95.00 |   95.00 |
#   OracleStaking.sol         |   92.00 |    88.00 |   92.00 |   92.00 |
#   AttestationRegistry.sol   |   94.00 |    90.00 |   94.00 |   94.00 |
#   LoanMarketplace.sol       |   96.00 |    92.00 |   96.00 |   96.00 |
#   LoanAgreementRegistry.sol |   93.00 |    89.00 |   93.00 |   93.00 |
#   PlatformGovernance.sol    |   90.00 |    85.00 |   90.00 |   90.00 |
# ----------------------------|---------|----------|---------|---------|
# All files                   |   94.29 |    90.57 |   94.29 |   94.29 |
```

---

## 🎯 Summary

This E2E testing guide provides:
- ✅ **Complete test coverage** from unit to integration
- ✅ **Security validation** against common attacks
- ✅ **Performance benchmarking** for production readiness
- ✅ **Automated testing** pipelines
- ✅ **Monitoring** and health checks
- ✅ **Production deployment** verification

### Final Testing Workflow:

```powershell
# 1. Start local blockchain
npx hardhat node

# 2. Deploy contracts (new terminal)
npx hardhat run scripts/deploy.js --network localhost

# 3. Run all tests
npx hardhat test

# 4. Generate coverage
npx hardhat coverage

# 5. Start oracle service
cd oracle-service; npm start

# 6. Start frontend
cd frontend; npm start

# 7. Manual UI testing
# Navigate to http://localhost:3000 and test all flows

# 8. Run E2E tests
npx hardhat test test/E2E.test.js

# 9. Performance testing
npx hardhat run scripts/performanceTest.js

# 10. Health checks
node monitoring/healthCheck.js
```

**All tests should pass before production deployment! 🚀**
