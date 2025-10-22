# Oracle Service Setup Guide

## Current Status

✅ **Oracle Service is Running!**

The oracle service is currently running in **READ-ONLY mode** on port 3001.

### What This Means:
- ✅ All API endpoints are accessible
- ✅ GST, Bank, KYC, and Credit Score verification endpoints work
- ✅ Returns simulated verification data
- ⚠️ Cannot submit attestations to the blockchain (no wallet configured)

---

## How to Enable Full Functionality

To enable blockchain transactions, follow these steps:

### Step 1: Deploy Contracts

In the **root directory** (D:\blockchain), deploy the smart contracts:

```powershell
# Make sure Hardhat node is running first (in another terminal):
npm run node

# Then deploy contracts:
npm run deploy:local
```

This will:
- Deploy all 7 smart contracts
- Create a `deployments/localhost.json` file with contract addresses
- Display 20 Hardhat test accounts with private keys

### Step 2: Copy a Private Key

After deployment, you'll see output like:

```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH)
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
...
```

**Copy one of these private keys** (any account from #0 to #19 will work).

### Step 3: Update Oracle Environment File

Edit `oracle-service/.env` and replace the placeholder:

```env
# Before:
ORACLE_PRIVATE_KEY=0xyour_oracle_private_key_here

# After (example with Account #5):
ORACLE_PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

Also update the contract addresses from the deployment:

```env
ATTESTATION_REGISTRY=0x... # Copy from deployments/localhost.json
ORACLE_STAKING=0x...       # Copy from deployments/localhost.json
RPC_URL=http://localhost:8545
ORACLE_PORT=3001
```

### Step 4: Restart the Oracle Service

```powershell
# Stop the current oracle service (Ctrl+C)
# Then restart:
npm start
```

You should now see:

```
Oracle Service Starting...
Oracle Address: 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc
Oracle Service running on port 3001
RPC URL: http://localhost:8545
Oracle Address: 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc
```

---

## Testing the Oracle Service

### Health Check
```powershell
curl http://localhost:3001/health
```

**Response (READ-ONLY mode):**
```json
{
  "status": "healthy",
  "oracle": "Not configured (read-only mode)",
  "walletConfigured": false,
  "timestamp": "2025-10-19T12:00:00.000Z"
}
```

**Response (After configuration):**
```json
{
  "status": "healthy",
  "oracle": "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
  "walletConfigured": true,
  "timestamp": "2025-10-19T12:00:00.000Z"
}
```

### Oracle Info
```powershell
curl http://localhost:3001/api/oracle/info
```

### GST Verification (works in both modes)
```powershell
curl -X POST http://localhost:3001/api/verify/gst -H "Content-Type: application/json" -d "{\"msmeId\":\"0x123\",\"gstNumber\":\"27AABCU9603R1ZV\"}"
```

---

## Available Endpoints

| Endpoint | Method | Purpose | Works in READ-ONLY? |
|----------|--------|---------|---------------------|
| `/health` | GET | Health check | ✅ Yes |
| `/api/oracle/info` | GET | Oracle information | ✅ Yes |
| `/api/verify/gst` | POST | GST verification | ✅ Yes (simulated) |
| `/api/verify/bank` | POST | Bank verification | ✅ Yes (simulated) |
| `/api/verify/kyc` | POST | KYC verification | ✅ Yes (simulated) |
| `/api/verify/credit-score` | POST | Credit score | ✅ Yes (simulated) |

---

## Understanding the Modes

### READ-ONLY Mode (Current)
- API returns simulated verification data
- No blockchain transactions
- Useful for frontend development and testing
- No gas fees or wallet needed

### Full Mode (After configuration)
- Can submit attestations to blockchain
- Oracle can stake tokens
- Real transactions with gas fees
- Required for production use

---

## Quick Reference

### Current Setup Status:
```
✅ Root dependencies installed
✅ Oracle dependencies installed  
✅ Oracle service running on port 3001
⚠️  Oracle private key NOT configured (READ-ONLY mode)
⏳ Contracts NOT deployed yet
⏳ Frontend NOT started yet
```

### Next Steps:
1. **Deploy contracts:** `npm run deploy:local` (in root directory)
2. **Configure oracle wallet:** Update `oracle-service/.env`
3. **Restart oracle service:** `npm start`
4. **Start frontend:** `cd frontend && npm start`

---

## Troubleshooting

### Oracle service won't start
- Check if port 3001 is available
- Verify `node_modules` installed in `oracle-service/`
- Check `.env` file exists in `oracle-service/`

### "Invalid BytesLike value" error
- This error is now fixed
- Service runs in READ-ONLY mode with invalid/missing private key
- To enable full mode, add a valid 64-character hex private key

### Cannot connect to blockchain
- Ensure Hardhat node is running: `npm run node`
- Check RPC_URL in `.env` is `http://localhost:8545`
- Verify blockchain is accessible

---

**Oracle service is ready to use!** 🎉

For now, it works in READ-ONLY mode which is perfect for testing the API endpoints and developing the frontend.
