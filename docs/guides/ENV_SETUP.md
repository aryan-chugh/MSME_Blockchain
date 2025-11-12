# Quick Setup - .env Configuration

## Create .env File

Create a file named `.env` in `D:\blockchain\BWD_Project\` with the following content:

```env
# Sepolia RPC (Required for deployment)
SEPOLIA_RPC_URL=https://rpc.sepolia.org

# Your wallet private key (Required for deployment)
# WARNING: Never commit this file to git!
PRIVATE_KEY=your_private_key_here

# Etherscan API Key (Optional - only needed for verification)
# Get free key at: https://etherscan.io/myapikey
ETHERSCAN_API_KEY=

# Optional: Polygon (for future deployment)
POLYGON_RPC_URL=https://polygon-rpc.com
POLYGONSCAN_API_KEY=
```

## Important Notes

1. **Never commit .env to git!** (Already in .gitignore)
2. **ETHERSCAN_API_KEY** is only needed for contract verification
3. **Contract works without verification**

## To Get Etherscan API Key (Optional)

1. Visit: https://etherscan.io/register
2. Create free account
3. Go to: https://etherscan.io/myapikey
4. Click "Add" and create new API key
5. Copy and paste it into `.env` file

## Current Status

Your contract is **already deployed and working**:
- ✅ Address: `0x9980762a26b2e7d81204B0295c436808Dd233E79`
- ✅ Deployed to Sepolia
- ✅ Frontend configured
- ✅ Ready to test

Verification is just cosmetic - it makes the contract source code visible on Etherscan.

## Test Now, Verify Later!

**Recommended**: Start testing the contract functionality first:
```bash
cd frontend
npm start
```

**Then** get API key and verify when convenient.
