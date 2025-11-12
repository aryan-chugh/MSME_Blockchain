# Contract Verification Guide

## Option 1: Get Free Etherscan API Key (Recommended)

### Step 1: Register on Etherscan
1. Go to: https://etherscan.io/register
2. Create a free account
3. Verify your email

### Step 2: Generate API Key
1. Login to Etherscan
2. Go to: https://etherscan.io/myapikey
3. Click "Add" to create new API key
4. Name it: "Hardhat Verification"
5. Copy the API key

### Step 3: Add to .env File
1. Create `.env` file in `D:\blockchain\BWD_Project\` if it doesn't exist
2. Add this line:
   ```
   ETHERSCAN_API_KEY=YOUR_API_KEY_HERE
   ```

### Step 4: Run Verification
```bash
npx hardhat verify --network sepolia 0x9980762a26b2e7d81204B0295c436808Dd233E79 "0x78141b091Ca7a3bFB27FE071A11C708887cC7C1D" "0xAC6F626A6c58101cbc86AbEbD8dE428534D4a668"
```

---

## Option 2: Manual Verification on Etherscan

### Step 1: Go to Contract Page
Visit: https://sepolia.etherscan.io/address/0x9980762a26b2e7d81204B0295c436808Dd233E79#code

### Step 2: Verify & Publish
1. Click "Verify and Publish" button
2. Fill in the form:

**Contract Address**: `0x9980762a26b2e7d81204B0295c436808Dd233E79`

**Compiler Type**: `Solidity (Single file)`

**Compiler Version**: `v0.8.20+commit.a1b79de6`

**License Type**: `MIT License`

### Step 3: Optimization Settings
- **Optimization**: `Yes`
- **Runs**: `200`
- **Via IR**: `Yes` (if available, otherwise uncheck)

### Step 4: Contract Source Code

Copy the flattened contract:

```bash
cd D:\blockchain\BWD_Project
npx hardhat flatten contracts/AttestationRegistry.sol > AttestationRegistry-flattened.sol
```

Then paste the contents of `AttestationRegistry-flattened.sol` into Etherscan.

### Step 5: Constructor Arguments (ABI-encoded)

You need to provide the constructor arguments in ABI-encoded format:

**Arguments**:
- `_stakingContractAddress`: `0x78141b091Ca7a3bFB27FE071A11C708887cC7C1D`
- `_governance`: `0xAC6F626A6c58101cbc86AbEbD8dE428534D4a668`

**ABI-encoded** (paste this in Etherscan):
```
00000000000000000000000078141b091Ca7a3bFB27FE071A11C708887cC7C1D000000000000000000000000AC6F626A6c58101cbc86AbEbD8dE428534D4a668
```

---

## Option 3: Skip Verification (Contract Still Works!)

**Important**: Contract verification is **optional**. Your contract is already deployed and working!

### What Verification Gives You:
✅ **With Verification**:
- Users can read contract source code on Etherscan
- Can interact with contract directly from Etherscan UI
- Shows contract name and functions
- Better for transparency

❌ **Without Verification**:
- Contract still works perfectly
- Frontend can still interact with it
- Just shows as "Contract" on Etherscan (no source code visible)

### Current Status:
Your contract is:
- ✅ Deployed at: `0x9980762a26b2e7d81204B0295c436808Dd233E79`
- ✅ Working and callable
- ✅ Frontend connected
- ⏳ Not verified (but optional)

---

## Recommendation

**For Testing**: Skip verification for now, test the functionality first!

**For Production**: Get free Etherscan API key and verify using Option 1.

---

## Quick Test (Without Verification)

You can test your contract right away:

1. **Start Frontend**:
   ```bash
   cd frontend
   npm start
   ```

2. **Follow Testing Guide**:
   - Open `TESTING_GUIDE.md`
   - Test MSME → Oracle flow
   - Verify blockchain storage works

3. **Verify Later**:
   - Get Etherscan API key when convenient
   - Run verification command
   - Contract continues working either way!

---

## Already Deployed & Working ✅

Your AttestationRegistry contract is:
- ✅ Successfully deployed to Sepolia
- ✅ 6 schemas registered
- ✅ Frontend configured with correct address
- ✅ Ready to use immediately
- ⏳ Verification is just cosmetic (nice to have)

**Go ahead and test it! Verification can wait.**
