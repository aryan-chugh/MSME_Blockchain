# Requirements for Complete Smart Contract Integration & Testing

## ✅ Status Overview

### Already Completed
- ✅ All smart contracts deployed on Sepolia testnet
- ✅ Contract addresses configured in `utils/contracts.js`
- ✅ Wallet connection utilities created (`utils/wallet.js`)
- ✅ App.js enhanced with network detection
- ✅ Public Sepolia RPC configured (no API key needed)
- ✅ Integration guide created (`BLOCKCHAIN_INTEGRATION.md`)
- ✅ Token minting script created (`scripts/mint-tokens.js`)
- ✅ Compilation errors fixed ✨

### What You Need to Provide

---

## 1. 🦊 Wallet Setup (REQUIRED)

### Install Wallet Extension
You need either **Rabby** or **MetaMask**:
- **Rabby** (Recommended): https://rabby.io/
- **MetaMask**: https://metamask.io/download/

### Add Sepolia Network
If using MetaMask, add Sepolia testnet manually:
1. Open MetaMask → Settings → Networks → Add Network
2. Enter:
   - **Network Name**: Sepolia
   - **RPC URL**: `https://rpc.sepolia.org`
   - **Chain ID**: `11155111`
   - **Currency Symbol**: ETH
   - **Block Explorer**: `https://sepolia.etherscan.io`

**Rabby auto-detects Sepolia** - no manual setup needed!

---

## 2. 💰 Get Sepolia ETH (REQUIRED)

You need testnet ETH for gas fees. Get it from any of these faucets:

### Option 1: Alchemy Sepolia Faucet (Easiest)
- URL: https://sepoliafaucet.com/
- Amount: 0.5 SepoliaETH
- Requirements: Just enter your wallet address
- Time: Instant

### Option 2: Infura Sepolia Faucet
- URL: https://www.infura.io/faucet/sepolia
- Amount: 0.5 SepoliaETH
- Requirements: Create free Infura account
- Time: ~1 minute

### Option 3: QuickNode Faucet
- URL: https://faucet.quicknode.com/ethereum/sepolia
- Amount: 0.1 SepoliaETH
- Requirements: Twitter account
- Time: ~2 minutes

### How to Get Your Wallet Address
1. Open Rabby/MetaMask
2. Click on your account name at the top
3. Click "Copy Address" 
4. Paste into faucet website

**Expected Result**: 0.1-0.5 SepoliaETH in your wallet

---

## 3. 🪙 Mint CIT Tokens (REQUIRED)

Once you have Sepolia ETH, mint Credit Impact Tokens for testing.

### Step 1: Update Hardhat Config
The deployer private key is already configured in `hardhat.config.js`. **Just verify you have the key for address:**
- Deployer Address: `0x4C7A8d194A36FDf53365490D1cAd92E59f648571`

If you need to use a different address, update the `PRIVATE_KEY` in `hardhat.config.js`.

### Step 2: Run Minting Script
Open a **new terminal** (keep React server running) and run:

```powershell
cd d:\blockchain
npx hardhat run scripts/mint-tokens.js --network sepolia
```

**Expected Output:**
```
Minting 1,000,000 CIT tokens to 0x4C7A8d194A36FDf53365490D1cAd92E59f648571...
✅ Minted successfully! 
Transaction: 0xabcd1234...
Balance: 1000000.0 CIT
```

### Step 3: Verify on Etherscan
Visit: https://sepolia.etherscan.io/address/0x4C7A8d194A36FDf53365490D1cAd92E59f648571

You should see:
- ETH Balance: ~0.5 SepoliaETH (minus gas from minting)
- Token Balance: 1,000,000 CIT

---

## 4. 🔌 Connect Wallet to App (REQUIRED)

### Step 1: Open the App
Your React app should already be running at: http://localhost:3000

If not, run:
```powershell
cd d:\blockchain\frontend
npm start
```

### Step 2: Connect Wallet
1. Click **"🦊 Connect Wallet"** button in the top-right
2. Rabby/MetaMask popup will appear
3. Click **"Next"** → **"Connect"**
4. If not on Sepolia, you'll see: **"🔴 Wrong Network"**
5. Click the Rabby/MetaMask icon → Switch to Sepolia

**Expected Result:**
- Top right shows: **"🟢 Sepolia"**
- Shows your wallet address: **"0x4C7A...8571"**

---

## 5. 📋 Optional (But Recommended)

### Infura API Key (Optional)
We're using a **public RPC** which works fine for testing. But if you experience slow response times, you can upgrade to Infura's free tier:

1. Create account: https://infura.io/
2. Create new project → Copy API Key
3. Update `frontend/.env`:
   ```
   REACT_APP_INFURA_KEY=your_actual_key_here
   ```
4. Update `utils/contracts.js` line 11:
   ```javascript
   rpcUrl: `https://sepolia.infura.io/v3/${process.env.REACT_APP_INFURA_KEY}`,
   ```
5. Restart React server

### Etherscan API Key (Optional)
Only needed if you want to verify contracts on Etherscan. Not required for testing.

---

## 6. ✅ Verification Checklist

Before starting integration, verify you have:

- [ ] Rabby or MetaMask installed
- [ ] Sepolia network added to wallet
- [ ] Wallet address copied
- [ ] 0.1+ SepoliaETH in wallet (check on Etherscan)
- [ ] 1,000,000 CIT tokens minted (run scripts/mint-tokens.js)
- [ ] React app running at localhost:3000
- [ ] Wallet connected to app (shows "🟢 Sepolia")
- [ ] No compilation errors in terminal

---

## 7. 🚀 Ready for Integration!

Once you've completed the checklist above, we can proceed with:

### Phase 1: Oracle Staking (Day 1)
- Stake CIT tokens
- Check oracle status on-chain
- Increase/withdraw stake
- **Why first?** Simplest contract interaction, good proof of concept

### Phase 2: Attestation Flow (Day 2)
- MSMEs request attestations
- Oracles verify documents
- Submit attestations on-chain
- Track reputation

### Phase 3: Loan Marketplace (Day 3)
- Create loan requests
- Display loans from blockchain
- Place sealed bids with deposits
- Reveal bids and select lender

### Phase 4: Error Handling (Day 4)
- Transaction failures
- Network switching
- Insufficient funds
- Loading states & notifications

### Phase 5: End-to-End Testing (Day 5)
- Complete MSME journey
- Complete Oracle journey
- Complete Lender journey
- Cross-component sync verification

---

## 8. 🆘 Troubleshooting

### "Failed to fetch" when connecting wallet
- **Cause**: Wrong network or no internet
- **Fix**: Switch to Sepolia in wallet, check internet connection

### "Insufficient funds for intrinsic transaction cost"
- **Cause**: No SepoliaETH for gas
- **Fix**: Use faucet to get more SepoliaETH

### "execution reverted" when staking
- **Cause**: Haven't approved tokens or insufficient CIT balance
- **Fix**: Run mint-tokens.js script, approve tokens first

### App shows "🔴 Wrong Network"
- **Cause**: Connected to Mainnet/Goerli/other network
- **Fix**: Open wallet → Switch to Sepolia

### Transactions stuck "pending"
- **Cause**: Sepolia congestion (rare)
- **Fix**: Wait 30 seconds or increase gas price

### Can't find CIT token in wallet
- **Cause**: Token not added to wallet's token list
- **Fix**: In Rabby/MetaMask → "Import Token" → Paste CIToken address:
  ```
  0xe3F25Cea590d87F3F49B535E04a4E4Da44Ace06E
  ```

---

## 9. 📞 What to Tell Me Next

Once you've completed the requirements, please confirm:

1. ✅ **"I have SepoliaETH in my wallet"**
2. ✅ **"I minted CIT tokens successfully"**
3. ✅ **"My wallet is connected and showing 🟢 Sepolia"**

Then I'll start integrating the components one by one with full error handling!

---

## 10. 📚 Additional Resources

- **Sepolia Etherscan**: https://sepolia.etherscan.io/
- **Contract Deployment Details**: `deployments/sepolia.json`
- **Integration Code Examples**: `BLOCKCHAIN_INTEGRATION.md`
- **Your Deployed Contracts**:
  - CIToken: https://sepolia.etherscan.io/address/0xe3F25Cea590d87F3F49B535E04a4E4Da44Ace06E
  - OracleStaking: https://sepolia.etherscan.io/address/0xB2c87BE405bF0D84d5E510F5f735c99129c7bEc6
  - AttestationRegistry: https://sepolia.etherscan.io/address/0xe584E15E3AaAD5d268540e0aA1532ee4E09a8e9E
  - LoanMarketplace: https://sepolia.etherscan.io/address/0x6acDAEb729A3F403178Da19e42eF022Ba9186D33
  - LoanAgreementRegistry: https://sepolia.etherscan.io/address/0x4B6668aa6f6A8E601813dB51A1A0afAa9A853DFE
  - PlatformGovernance: https://sepolia.etherscan.io/address/0xC3C97A674AB2D7Ad6FF6f92189F68B39b32740f9

---

**Let me know when you're ready, and we'll make this app fully blockchain-powered! 🚀**
