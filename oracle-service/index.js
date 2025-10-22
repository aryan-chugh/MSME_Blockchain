const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
require('dotenv').config();

const app = express();
const PORT = process.env.ORACLE_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Contract ABIs (simplified - in production, import full ABIs)
const ATTESTATION_REGISTRY_ABI = [
  "function submitAttestation(address msmeId, bytes32 schemaId, bytes calldata data, uint256 validityPeriod) external"
];

// Initialize provider
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://localhost:8545');

// Validate and initialize wallet
let wallet = null;
const privateKey = process.env.ORACLE_PRIVATE_KEY;

// Check if private key is valid (64 hex characters, optionally prefixed with 0x)
if (privateKey && privateKey.replace('0x', '').length === 64 && /^(0x)?[0-9a-fA-F]{64}$/.test(privateKey)) {
  try {
    wallet = new ethers.Wallet(privateKey, provider);
    console.log('Oracle Service Starting...');
    console.log('Oracle Address:', wallet.address);
  } catch (error) {
    console.error('Failed to initialize wallet with provided private key:', error.message);
  }
} else {
  console.warn('⚠️  WARNING: No valid ORACLE_PRIVATE_KEY found in .env file');
  console.warn('⚠️  The oracle service will run in READ-ONLY mode');
  console.warn('⚠️  To enable blockchain transactions:');
  console.warn('   1. Deploy contracts: npm run deploy:local (in root directory)');
  console.warn('   2. Copy a private key from Hardhat test accounts');
  console.warn('   3. Add it to oracle-service/.env: ORACLE_PRIVATE_KEY=0x...');
  console.warn('   4. Restart the oracle service');
}

// Contract address (update after deployment)
const ATTESTATION_REGISTRY_ADDRESS = process.env.ATTESTATION_REGISTRY || '';

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    oracle: wallet ? wallet.address : 'Not configured (read-only mode)',
    walletConfigured: !!wallet,
    timestamp: new Date().toISOString()
  });
});

// Verify GST data (simulated)
app.post('/api/verify/gst', async (req, res) => {
  try {
    const { msmeId, gstNumber } = req.body;
    
    if (!msmeId || !gstNumber) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`Verifying GST for MSME: ${msmeId}`);
    
    // Simulate GST verification (in production, call actual GST API)
    const gstData = {
      gstNumber: gstNumber,
      businessName: 'ABC Manufacturing Pvt Ltd',
      annualRevenue: 50000000, // ₹5 Crore
      registrationDate: '2018-04-01',
      status: 'Active',
      verified: true
    };

    // Encode attestation data
    const encodedData = ethers.AbiCoder.defaultAbiCoder().encode(
      ['string', 'string', 'uint256', 'string', 'bool'],
      [gstData.gstNumber, gstData.businessName, gstData.annualRevenue, gstData.status, gstData.verified]
    );

    // In production, submit to blockchain
    // const schemaId = ethers.keccak256(ethers.toUtf8Bytes('gst-revenue'));
    // const contract = new ethers.Contract(ATTESTATION_REGISTRY_ADDRESS, ATTESTATION_REGISTRY_ABI, wallet);
    // const tx = await contract.submitAttestation(msmeId, schemaId, encodedData, 31536000); // 1 year validity
    // await tx.wait();

    res.json({
      success: true,
      message: 'GST verification completed',
      data: gstData,
      attestationId: Math.floor(Math.random() * 10000),
      txHash: '0x' + Math.random().toString(16).substring(2, 66)
    });

  } catch (error) {
    console.error('GST verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify bank statements (simulated)
app.post('/api/verify/bank', async (req, res) => {
  try {
    const { msmeId, accountNumber, ifsc } = req.body;
    
    if (!msmeId || !accountNumber || !ifsc) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`Verifying bank statements for MSME: ${msmeId}`);
    
    // Simulate bank verification (in production, use Account Aggregator APIs)
    const bankData = {
      accountNumber: accountNumber.replace(/.(?=.{4})/g, '*'),
      ifsc: ifsc,
      averageBalance: 2500000, // ₹25 Lakh
      monthlyCredits: 8000000, // ₹80 Lakh
      accountAge: 36, // months
      verified: true
    };

    const encodedData = ethers.AbiCoder.defaultAbiCoder().encode(
      ['string', 'string', 'uint256', 'uint256', 'uint256', 'bool'],
      [bankData.accountNumber, bankData.ifsc, bankData.averageBalance, bankData.monthlyCredits, bankData.accountAge, bankData.verified]
    );

    res.json({
      success: true,
      message: 'Bank verification completed',
      data: bankData,
      attestationId: Math.floor(Math.random() * 10000),
      txHash: '0x' + Math.random().toString(16).substring(2, 66)
    });

  } catch (error) {
    console.error('Bank verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify KYC (simulated)
app.post('/api/verify/kyc', async (req, res) => {
  try {
    const { msmeId, panNumber, aadhaarNumber } = req.body;
    
    if (!msmeId || !panNumber) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`Verifying KYC for MSME: ${msmeId}`);
    
    // Simulate KYC verification
    const kycData = {
      panNumber: panNumber.replace(/.(?=.{4})/g, '*'),
      aadhaarVerified: !!aadhaarNumber,
      nameMatch: true,
      addressVerified: true,
      kycLevel: 'Enhanced',
      verified: true
    };

    const encodedData = ethers.AbiCoder.defaultAbiCoder().encode(
      ['string', 'bool', 'bool', 'bool', 'string', 'bool'],
      [kycData.panNumber, kycData.aadhaarVerified, kycData.nameMatch, kycData.addressVerified, kycData.kycLevel, kycData.verified]
    );

    res.json({
      success: true,
      message: 'KYC verification completed',
      data: kycData,
      attestationId: Math.floor(Math.random() * 10000),
      txHash: '0x' + Math.random().toString(16).substring(2, 66)
    });

  } catch (error) {
    console.error('KYC verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get credit score (simulated)
app.post('/api/verify/credit-score', async (req, res) => {
  try {
    const { msmeId, bureauConsent } = req.body;
    
    if (!msmeId || !bureauConsent) {
      return res.status(400).json({ error: 'Missing consent or MSME ID' });
    }

    console.log(`Fetching credit score for MSME: ${msmeId}`);
    
    // Simulate credit bureau check
    const creditData = {
      score: 720,
      range: '300-900',
      rating: 'Good',
      enquiries: 2,
      defaultCount: 0,
      bureauName: 'CIBIL',
      verified: true
    };

    const encodedData = ethers.AbiCoder.defaultAbiCoder().encode(
      ['uint256', 'string', 'string', 'uint256', 'uint256', 'string', 'bool'],
      [creditData.score, creditData.range, creditData.rating, creditData.enquiries, creditData.defaultCount, creditData.bureauName, creditData.verified]
    );

    res.json({
      success: true,
      message: 'Credit score fetched successfully',
      data: creditData,
      attestationId: Math.floor(Math.random() * 10000),
      txHash: '0x' + Math.random().toString(16).substring(2, 66)
    });

  } catch (error) {
    console.error('Credit score error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get oracle info
app.get('/api/oracle/info', (req, res) => {
  res.json({
    address: wallet ? wallet.address : 'Not configured',
    walletConfigured: !!wallet,
    status: wallet ? 'active' : 'read-only',
    supportedVerifications: [
      { type: 'gst', name: 'GST Revenue Verification', fee: '100 CIT' },
      { type: 'bank', name: 'Bank Statement Verification', fee: '150 CIT' },
      { type: 'kyc', name: 'KYC Verification', fee: '80 CIT' },
      { type: 'credit-score', name: 'Credit Score', fee: '120 CIT' }
    ],
    uptime: '99.9%',
    attestationsProvided: Math.floor(Math.random() * 1000)
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Oracle Service running on port ${PORT}`);
  console.log(`RPC URL: ${process.env.RPC_URL || 'http://localhost:8545'}`);
  if (wallet) {
    console.log(`Oracle Address: ${wallet.address}`);
  } else {
    console.log('Running in READ-ONLY mode - configure ORACLE_PRIVATE_KEY to enable transactions');
  }
  console.log('');
  console.log('Available endpoints:');
  console.log(`  GET  http://localhost:${PORT}/health`);
  console.log(`  GET  http://localhost:${PORT}/api/oracle/info`);
  console.log(`  POST http://localhost:${PORT}/api/verify/gst`);
  console.log(`  POST http://localhost:${PORT}/api/verify/bank`);
  console.log(`  POST http://localhost:${PORT}/api/verify/kyc`);
  console.log(`  POST http://localhost:${PORT}/api/verify/credit-score`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});
