# 🚀 Smart Contract Integration Guide

## Overview
Your frontend is now configured to connect to your deployed smart contracts on Sepolia testnet. This guide shows you how to integrate real blockchain functionality.

## ✅ What's Already Set Up

### 1. Contract Addresses (Sepolia)
All your deployed contract addresses are configured in `src/utils/contracts.js`:
- **CIToken**: `0xe3F25Cea590d87F3F49B535E04a4E4Da44Ace06E`
- **OracleStaking**: `0xB2c87BE405bF0D84d5E510F5f735c99129c7bEc6`
- **AttestationRegistry**: `0xe584E15E3AaAD5d268540e0aA1532ee4E09a8e9E`
- **LoanMarketplace**: `0x6acDAEb729A3F403178Da19e42eF022Ba9186D33`
- **LoanAgreementRegistry**: `0x4B6668aa6f6A8E601813dB51A1A0afAa9A853DFE`
- **PlatformGovernance**: `0xC3C97A674AB2D7Ad6FF6f92189F68B39b32740f9`

### 2. Wallet Connection
- Real wallet integration with Rabby/MetaMask
- Network detection (Sepolia testnet)
- Automatic network switching
- Account change listening

### 3. Contract ABIs
Essential contract functions are defined in `src/utils/contracts.js`

## 🔧 Integration Steps

### Step 1: Get Sepolia ETH
You need Sepolia ETH for gas fees:
1. Go to [Sepolia Faucet](https://sepoliafaucet.com/)
2. Or [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
3. Enter your wallet address
4. Receive 0.5 SepoliaETH

### Step 2: Get CIT Tokens
You need CIT tokens to interact with the platform:

**Option A: Mint from Contract (if you're the owner)**
```javascript
// In your terminal
npx hardhat run scripts/mint-tokens.js --network sepolia
```

**Option B: Add minting functionality to frontend**
See example in `MSMEDashboard` section below.

### Step 3: Update Components with Real Contract Calls

## 📝 Component Integration Examples

### MSMEDashboard.js - Real Identity Registration

Replace the mock `registerIdentity` function:

```javascript
import { getContractInstance, parseTokens } from '../utils/contracts';

const registerIdentity = async (e) => {
  e.preventDefault();
  
  if (!signer) {
    alert('Please connect your wallet');
    return;
  }

  try {
    setRegistering(true);
    
    // This would be your MSMEIdentity contract (needs deployment)
    const msmeContract = getContractInstance('MSMEIdentity', signer);
    
    // Create profile data
    const profileData = {
      businessName: identity.businessName,
      industry: identity.industry,
      gstNumber: identity.gstNumber,
      panNumber: identity.panNumber,
      registrationYear: identity.registrationYear,
      annualRevenue: identity.annualRevenue,
      employeeCount: identity.employeeCount,
      businessAddress: identity.businessAddress
    };
    
    // Call smart contract
    const tx = await msmeContract.registerIdentity(
      JSON.stringify(profileData)
    );
    
    await tx.wait();
    
    setIsRegistered(true);
    alert('✅ Identity registered on blockchain!');
    
  } catch (error) {
    console.error('Error registering identity:', error);
    alert('Error: ' + error.message);
  } finally {
    setRegistering(false);
  }
};
```

### MSMEDashboard.js - Real Attestation Request

```javascript
const submitAttestationRequest = async (e) => {
  e.preventDefault();
  
  try {
    setSubmitting(true);
    
    // Get contract instance
    const attestationContract = getContractInstance('AttestationRegistry', signer);
    
    // Create document hash
    const documentHash = ethers.keccak256(ethers.toUtf8Bytes(attestation.documentHash));
    
    // Submit attestation request
    const tx = await attestationContract.requestAttestation(
      documentHash,
      attestation.documentURL,
      attestation.additionalData
    );
    
    const receipt = await tx.wait();
    
    // Get request ID from event
    const event = receipt.logs.find(log => 
      log.topics[0] === ethers.id('AttestationRequested(uint256,address,bytes32)')
    );
    
    const requestId = ethers.decodeEventLog(
      'AttestationRequested',
      event.data,
      event.topics
    )[0];
    
    alert(`✅ Attestation requested! Request ID: ${requestId}`);
    
  } catch (error) {
    console.error('Error submitting attestation:', error);
    alert('Error: ' + error.message);
  } finally {
    setSubmitting(false);
  }
};
```

### MSMEDashboard.js - Real Loan Request

```javascript
const createLoanRequest = async (e) => {
  e.preventDefault();
  
  try {
    setCreating(true);
    
    // Get contract instance
    const marketplaceContract = getContractInstance('LoanMarketplace', signer);
    
    // Convert amount to Wei
    const amountWei = ethers.parseEther(loanRequest.amount);
    
    // Create loan request
    const tx = await marketplaceContract.createLoanRequest(
      amountWei,
      parseInt(loanRequest.tenure),
      parseInt(loanRequest.expectedRate) * 100, // Convert to basis points
      7 * 24 * 60 * 60, // 7 days commitment period
      3 * 24 * 60 * 60, // 3 days reveal period
      loanRequest.purpose,
      loanRequest.category
    );
    
    const receipt = await tx.wait();
    
    // Get loan ID from event
    const event = receipt.logs.find(log => 
      log.topics[0] === ethers.id('LoanRequestCreated(uint256,address,uint256,uint256)')
    );
    
    const loanId = ethers.decodeEventLog(
      'LoanRequestCreated',
      event.data,
      event.topics
    )[0];
    
    alert(`✅ Loan request created! Loan ID: ${loanId}`);
    
  } catch (error) {
    console.error('Error creating loan:', error);
    alert('Error: ' + error.message);
  } finally {
    setCreating(false);
  }
};
```

### OracleDashboard.js - Real Staking

```javascript
const stakeTokens = async (e) => {
  e.preventDefault();
  
  if (!stakeAmount || parseFloat(stakeAmount) < 50000) {
    alert('Minimum stake is 50,000 CIT tokens');
    return;
  }

  try {
    setStaking(true);
    
    // Get contract instances
    const tokenContract = getContractInstance('CIToken', signer);
    const stakingContract = getContractInstance('OracleStaking', signer);
    
    const amount = parseTokens(stakeAmount, 18);
    
    // Step 1: Approve tokens
    console.log('Approving tokens...');
    const approveTx = await tokenContract.approve(
      CONTRACT_ADDRESSES.OracleStaking,
      amount
    );
    await approveTx.wait();
    
    // Step 2: Stake tokens
    console.log('Staking tokens...');
    const stakeTx = await stakingContract.stake(amount);
    const receipt = await stakeTx.wait();
    
    // Get oracle info from contract
    const oracleInfo = await stakingContract.getOracleInfo(account);
    
    setIsOracle(true);
    setOracleInfo({
      stakedAmount: ethers.formatUnits(oracleInfo.stakedAmount, 18),
      reputation: oracleInfo.reputation.toString(),
      tier: oracleInfo.tier,
      attestations: oracleInfo.totalAttestations.toString()
    });
    
    // Save to localStorage for persistence
    localStorage.setItem('oracleStatus', JSON.stringify({
      address: account,
      info: oracleInfo
    }));
    
    alert('✅ Successfully staked! You are now an oracle.');
    
  } catch (error) {
    console.error('Error staking:', error);
    alert('Error: ' + error.message);
  } finally {
    setStaking(false);
  }
};
```

### OracleDashboard.js - Real Attestation Verification

```javascript
const verifyAndAttest = async (requestId) => {
  try {
    const attestationContract = getContractInstance('AttestationRegistry', signer);
    
    // Submit attestation
    const tx = await attestationContract.submitAttestation(
      requestId,
      true, // approved
      "Document verified"
    );
    
    await tx.wait();
    
    alert('✅ Attestation submitted on blockchain!');
    
    // Update UI
    setPendingRequests(prev => prev.filter(req => req.id !== requestId));
    setSelectedRequest(null);
    
  } catch (error) {
    console.error('Error submitting attestation:', error);
    alert('Error: ' + error.message);
  }
};
```

### Marketplace.js - Load Real Loan Requests

```javascript
import { getContractInstance } from '../utils/contracts';

useEffect(() => {
  const loadLoanRequests = async () => {
    if (!provider) return;
    
    try {
      const marketplaceContract = getContractInstance('LoanMarketplace', provider);
      
      // Get total number of loans
      const loanCount = await marketplaceContract.getLoanCount();
      
      const loans = [];
      for (let i = 0; i < loanCount; i++) {
        const loan = await marketplaceContract.getLoanRequest(i);
        
        loans.push({
          id: i,
          msme: loan.msme,
          amount: ethers.formatEther(loan.amount),
          tenure: loan.tenureMonths.toString(),
          expectedRate: (loan.expectedRate / 100).toFixed(2),
          purpose: loan.purpose,
          category: loan.category,
          status: ['Commitment', 'Reveal', 'Completed', 'Cancelled'][loan.status],
          bids: 0 // Count from events
        });
      }
      
      setLoanRequests(loans);
      
    } catch (error) {
      console.error('Error loading loans:', error);
    }
  };
  
  loadLoanRequests();
  const interval = setInterval(loadLoanRequests, 15000); // Every 15 seconds
  return () => clearInterval(interval);
}, [provider]);
```

### Marketplace.js - Real Bid Placement

```javascript
const placeBid = async (loanId, amount) => {
  if (!bidRate) {
    alert('Please enter an interest rate');
    return;
  }

  try {
    setPlacingBid(true);
    
    const marketplaceContract = getContractInstance('LoanMarketplace', signer);
    
    // Calculate deposit (5% of loan amount)
    const depositRequired = ethers.parseEther((parseFloat(amount) * 0.05).toString());
    
    // Generate random nonce
    const nonce = ethers.hexlify(ethers.randomBytes(32));
    
    // Create commitment hash
    const rate = parseInt(parseFloat(bidRate) * 100); // Convert to basis points
    const commitment = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint256', 'bytes32'],
        [rate, nonce]
      )
    );
    
    // Store nonce for reveal phase (in localStorage or database)
    localStorage.setItem(`bid_nonce_${loanId}`, nonce);
    localStorage.setItem(`bid_rate_${loanId}`, rate.toString());
    
    // Submit commitment
    const tx = await marketplaceContract.submitCommitment(loanId, commitment, {
      value: depositRequired
    });
    
    await tx.wait();
    
    alert(`✅ Bid committed!\n\nYour bid is sealed. Remember to reveal it during the reveal period.`);
    
    setBidRate('');
    setSelectedLoanForBid(null);
    
  } catch (error) {
    console.error('Error placing bid:', error);
    alert('Error: ' + error.message);
  } finally {
    setPlacingBid(false);
  }
};
```

### Dashboard.js - Real Contract Statistics

```javascript
useEffect(() => {
  const loadStats = async () => {
    if (!provider) return;
    
    try {
      const stakingContract = getContractInstance('OracleStaking', provider);
      const attestationContract = getContractInstance('AttestationRegistry', provider);
      const marketplaceContract = getContractInstance('LoanMarketplace', provider);
      
      // Get oracle count from events
      const stakeFilter = stakingContract.filters.Staked();
      const stakeEvents = await stakingContract.queryFilter(stakeFilter);
      const uniqueOracles = [...new Set(stakeEvents.map(e => e.args[0]))];
      
      // Get attestation count
      const attestationFilter = attestationContract.filters.AttestationSubmitted();
      const attestationEvents = await attestationContract.queryFilter(attestationFilter);
      
      // Get loan count
      const loanCount = await marketplaceContract.getLoanCount();
      
      setStats({
        totalMSMEs: stakeEvents.length, // Approximate
        totalLoans: loanCount.toString(),
        activeOracles: uniqueOracles.length,
        totalAttestations: attestationEvents.length,
        // ... more stats
      });
      
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };
  
  loadStats();
  const interval = setInterval(loadStats, 30000);
  return () => clearInterval(interval);
}, [provider]);
```

## 🔑 Environment Variables

Create `.env` file in `/frontend`:

```env
REACT_APP_CIT_TOKEN=0xe3F25Cea590d87F3F49B535E04a4E4Da44Ace06E
REACT_APP_ORACLE_STAKING=0xB2c87BE405bF0D84d5E510F5f735c99129c7bEc6
REACT_APP_ATTESTATION_REGISTRY=0xe584E15E3AaAD5d268540e0aA1532ee4E09a8e9E
REACT_APP_LOAN_MARKETPLACE=0x6acDAEb729A3F403178Da19e42eF022Ba9186D33
REACT_APP_LOAN_AGREEMENT_REGISTRY=0x4B6668aa6f6A8E601813dB51A1A0afAa9A853DFE
REACT_APP_PLATFORM_GOVERNANCE=0xC3C97A674AB2D7Ad6FF6f92189F68B39b32740f9
REACT_APP_INFURA_KEY=your_infura_project_id
```

## 📦 Next Steps

### 1. Test on Sepolia
- Connect your wallet to Sepolia
- Get test ETH from faucet
- Test each function individually

### 2. Deploy Missing Contract
You still need to deploy `MSMEIdentity` contract for identity registration.

### 3. Add Error Handling
- Transaction failed
- Insufficient gas
- User rejected
- Network errors

### 4. Add Loading States
- Show transaction pending
- Display tx hash
- Show confirmation

### 5. Event Listening
- Listen for contract events
- Update UI in real-time
- Show notifications

## 🐛 Common Issues

### Issue: "User rejected transaction"
**Solution**: User clicked reject in wallet. Let them retry.

### Issue: "Insufficient funds"
**Solution**: Need more SepoliaETH for gas fees.

### Issue: "Wrong network"
**Solution**: App will auto-prompt to switch to Sepolia.

### Issue: "Contract not deployed"
**Solution**: Verify contract addresses in `contracts.js`.

## 🎯 Testing Checklist

- [ ] Wallet connects to Sepolia
- [ ] Network indicator shows green
- [ ] CIT token balance displays
- [ ] Oracle staking works
- [ ] Attestation request submits
- [ ] Loan request creates
- [ ] Marketplace shows real loans
- [ ] Bid placement works
- [ ] Events are captured
- [ ] UI updates after transactions

## 📚 Resources

- [Ethers.js Docs](https://docs.ethers.org/v6/)
- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Sepolia Explorer](https://sepolia.etherscan.io/)
- Your contracts on Sepolia:
  - [CIToken](https://sepolia.etherscan.io/address/0xe3F25Cea590d87F3F49B535E04a4E4Da44Ace06E)
  - [OracleStaking](https://sepolia.etherscan.io/address/0xB2c87BE405bF0D84d5E510F5f735c99129c7bEc6)
  - [Marketplace](https://sepolia.etherscan.io/address/0x6acDAEb729A3F403178Da19e42eF022Ba9186D33)

---

**Ready to go!** Start with simple read operations (viewing data), then progress to write operations (transactions). Test each component individually before integrating everything together.
