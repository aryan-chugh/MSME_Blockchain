/**
 * 🚀 Complete Localhost Deployment Script
 * 
 * This script handles EVERYTHING needed to get the platform running:
 * 1. ✅ Deploys all smart contracts
 * 2. ✅ Registers attestation schemas
 * 3. ✅ Mints tokens to all test accounts
 * 4. ✅ Verifies deployment
 * 5. ✅ Updates frontend configuration
 * 6. ✅ Displays complete setup summary
 * 
 * Usage: npx hardhat run scripts/deploy-localhost.js --network localhost
 */

const { ethers } = require("hardhat");
const fs = require('fs');

// Test accounts for localhost
const TEST_ACCOUNTS = {
  'Admin/Deployer': '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  'Oracle 1': '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  'Oracle 2': '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
  'Oracle 3': '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
  'MSME 1': '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
  'MSME 2': '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
  'Lender 1': '0x976EA74026E726554dB657fA54763abd0C3a0aa9',
  'Lender 2': '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955'
};

const MINT_AMOUNT = 100_000; // 100,000 CIT per account

// Attestation schemas to register
const SCHEMAS = [
  {
    id: 'gst-revenue',
    name: 'GST Revenue Verification',
    description: 'Verified revenue data from GST returns'
  },
  {
    id: 'bank-statements',
    name: 'Bank Statement Verification',
    description: 'Verified bank account statements and cash flow'
  },
  {
    id: 'kyc-basic',
    name: 'KYC Basic Verification',
    description: 'Basic KYC verification including identity documents'
  },
  {
    id: 'credit-score',
    name: 'Credit Score',
    description: 'Credit bureau score attestation'
  }
];

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("🚀 COMPLETE LOCALHOST DEPLOYMENT");
  console.log("═══════════════════════════════════════════════════════════\n");

  // Get deployer
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("📊 Network Information:");
  console.log("   Network:", network.name);
  console.log("   Chain ID:", network.chainId.toString());
  console.log("   Deployer:", deployer.address);
  console.log("   Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // ═══════════════════════════════════════════════════════════
  // STEP 1: DEPLOY ALL CONTRACTS
  // ═══════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════════════");
  console.log("📦 STEP 1: DEPLOYING SMART CONTRACTS");
  console.log("═══════════════════════════════════════════════════════════\n");

  // 1. Deploy CIT Token
  console.log("1️⃣  Deploying CIT Token...");
  const CIToken = await ethers.getContractFactory("CIToken");
  const initialSupply = 10_000_000;
  const citToken = await CIToken.deploy(initialSupply);
  await citToken.waitForDeployment();
  const citTokenAddress = await citToken.getAddress();
  console.log("   ✅ CIT Token:", citTokenAddress);
  console.log("   💰 Initial supply:", initialSupply.toLocaleString(), "CIT\n");

  // 2. Deploy OracleStakingV3
  console.log("2️⃣  Deploying Oracle Staking V3...");
  const OracleStaking = await ethers.getContractFactory("OracleStakingV3");
  const governanceAddress = deployer.address;
  const oracleStaking = await OracleStaking.deploy(citTokenAddress, governanceAddress);
  await oracleStaking.waitForDeployment();
  const oracleStakingAddress = await oracleStaking.getAddress();
  console.log("   ✅ Oracle Staking V3:", oracleStakingAddress);
  console.log("   👑 Governance:", governanceAddress, "\n");

  // 3. Deploy AttestationRegistryV3_1
  console.log("3️⃣  Deploying Attestation Registry V3.1...");
  const AttestationRegistry = await ethers.getContractFactory("AttestationRegistryV3_1");
  const attestationRegistry = await AttestationRegistry.deploy(oracleStakingAddress, citTokenAddress);
  await attestationRegistry.waitForDeployment();
  const attestationRegistryAddress = await attestationRegistry.getAddress();
  console.log("   ✅ Attestation Registry V3.1:", attestationRegistryAddress, "\n");

  // 3b. Configure OracleStaking
  console.log("3️⃣b Configuring Oracle Staking...");
  await oracleStaking.setAttestationRegistry(attestationRegistryAddress);
  console.log("   ✅ Attestation registry linked\n");

  // 4. Deploy LoanMarketplace
  console.log("4️⃣  Deploying Loan Marketplace...");
  const LoanMarketplace = await ethers.getContractFactory("LoanMarketplace");
  const loanMarketplace = await LoanMarketplace.deploy(governanceAddress);
  await loanMarketplace.waitForDeployment();
  const loanMarketplaceAddress = await loanMarketplace.getAddress();
  console.log("   ✅ Loan Marketplace:", loanMarketplaceAddress, "\n");

  // 5. Deploy LoanAgreementRegistry
  console.log("5️⃣  Deploying Loan Agreement Registry...");
  const LoanAgreementRegistry = await ethers.getContractFactory("LoanAgreementRegistry");
  const loanAgreementRegistry = await LoanAgreementRegistry.deploy(loanMarketplaceAddress, governanceAddress);
  await loanAgreementRegistry.waitForDeployment();
  const loanAgreementRegistryAddress = await loanAgreementRegistry.getAddress();
  console.log("   ✅ Loan Agreement Registry:", loanAgreementRegistryAddress, "\n");

  // 6. Deploy PlatformGovernance
  console.log("6️⃣  Deploying Platform Governance...");
  const PlatformGovernance = await ethers.getContractFactory("PlatformGovernance");
  const platformGovernance = await PlatformGovernance.deploy(deployer.address, deployer.address); // treasury and emergencyAdmin
  await platformGovernance.waitForDeployment();
  const platformGovernanceAddress = await platformGovernance.getAddress();
  console.log("   ✅ Platform Governance:", platformGovernanceAddress, "\n");

  // 7. Deploy other contracts (optional but complete)
  console.log("7️⃣  Deploying Additional Contracts...");
  
  const MSMEIdentity = await ethers.getContractFactory("MSMEIdentity");
  const msmeIdentity = await MSMEIdentity.deploy(deployer.address); // initialOwner
  await msmeIdentity.waitForDeployment();
  const msmeIdentityAddress = await msmeIdentity.getAddress();
  console.log("   ✅ MSME Identity:", msmeIdentityAddress);

  const DynamicCreditScore = await ethers.getContractFactory("DynamicCreditScore");
  const dynamicCreditScore = await DynamicCreditScore.deploy(attestationRegistryAddress, loanAgreementRegistryAddress);
  await dynamicCreditScore.waitForDeployment();
  const dynamicCreditScoreAddress = await dynamicCreditScore.getAddress();
  console.log("   ✅ Dynamic Credit Score:", dynamicCreditScoreAddress);

  const FlashAssessment = await ethers.getContractFactory("FlashAssessment");
  const flashAssessment = await FlashAssessment.deploy();
  await flashAssessment.waitForDeployment();
  const flashAssessmentAddress = await flashAssessment.getAddress();
  console.log("   ✅ Flash Assessment:", flashAssessmentAddress);

  const SocialCreditSystem = await ethers.getContractFactory("SocialCreditSystem");
  const socialCreditSystem = await SocialCreditSystem.deploy();
  await socialCreditSystem.waitForDeployment();
  const socialCreditSystemAddress = await socialCreditSystem.getAddress();
  console.log("   ✅ Social Credit System:", socialCreditSystemAddress);

  const PredictiveAnalyticsOracle = await ethers.getContractFactory("PredictiveAnalyticsOracle");
  const predictiveAnalyticsOracle = await PredictiveAnalyticsOracle.deploy();
  await predictiveAnalyticsOracle.waitForDeployment();
  const predictiveAnalyticsOracleAddress = await predictiveAnalyticsOracle.getAddress();
  console.log("   ✅ Predictive Analytics Oracle:", predictiveAnalyticsOracleAddress, "\n");

  // ═══════════════════════════════════════════════════════════
  // STEP 2: REGISTER ATTESTATION SCHEMAS
  // ═══════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════════════");
  console.log("📋 STEP 2: REGISTERING ATTESTATION SCHEMAS");
  console.log("═══════════════════════════════════════════════════════════\n");

  const registeredSchemas = [];
  for (const schema of SCHEMAS) {
    try {
      const schemaIdHash = ethers.keccak256(ethers.toUtf8Bytes(schema.id));
      
      console.log(`📝 Registering: ${schema.name}`);
      console.log(`   String ID: ${schema.id}`);
      console.log(`   Hash: ${schemaIdHash}`);
      
      const tx = await attestationRegistry.registerSchema(
        schemaIdHash,
        schema.name,
        schema.description
      );
      await tx.wait();
      
      console.log(`   ✅ Registered successfully\n`);
      
      registeredSchemas.push({
        ...schema,
        hash: schemaIdHash
      });
    } catch (error) {
      if (error.message.includes("Schema already exists")) {
        console.log(`   ℹ️  Schema already exists (skipping)\n`);
        registeredSchemas.push({
          ...schema,
          hash: ethers.keccak256(ethers.toUtf8Bytes(schema.id))
        });
      } else {
        console.log(`   ❌ Error: ${error.message}\n`);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 3: MINT TOKENS TO TEST ACCOUNTS
  // ═══════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════════════");
  console.log("💰 STEP 3: MINTING TOKENS TO TEST ACCOUNTS");
  console.log("═══════════════════════════════════════════════════════════\n");

  const mintResults = [];
  for (const [role, address] of Object.entries(TEST_ACCOUNTS)) {
    try {
      console.log(`🪙 Minting ${MINT_AMOUNT.toLocaleString()} CIT to ${role}...`);
      console.log(`   Address: ${address}`);
      
      const tx = await citToken.mint(address, ethers.parseUnits(MINT_AMOUNT.toString(), 18));
      await tx.wait();
      
      const balance = await citToken.balanceOf(address);
      const balanceFormatted = ethers.formatUnits(balance, 18);
      
      console.log(`   ✅ Minted! Balance: ${parseFloat(balanceFormatted).toLocaleString()} CIT\n`);
      
      mintResults.push({
        role,
        address,
        balance: balanceFormatted,
        success: true
      });
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
      mintResults.push({
        role,
        address,
        balance: '0',
        success: false,
        error: error.message
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 4: VERIFY DEPLOYMENT
  // ═══════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════════════");
  console.log("🔍 STEP 4: VERIFYING DEPLOYMENT");
  console.log("═══════════════════════════════════════════════════════════\n");

  // Check contract code
  console.log("📦 Verifying contract deployments...");
  const citTokenCode = await ethers.provider.getCode(citTokenAddress);
  const registryCode = await ethers.provider.getCode(attestationRegistryAddress);
  const stakingCode = await ethers.provider.getCode(oracleStakingAddress);
  const marketplaceCode = await ethers.provider.getCode(loanMarketplaceAddress);

  console.log(`   CIT Token: ${citTokenCode.length > 2 ? '✅' : '❌'} (${citTokenCode.length} bytes)`);
  console.log(`   Attestation Registry: ${registryCode.length > 2 ? '✅' : '❌'} (${registryCode.length} bytes)`);
  console.log(`   Oracle Staking: ${stakingCode.length > 2 ? '✅' : '❌'} (${stakingCode.length} bytes)`);
  console.log(`   Loan Marketplace: ${marketplaceCode.length > 2 ? '✅' : '❌'} (${marketplaceCode.length} bytes)\n`);

  // Verify schemas
  console.log("📋 Verifying schemas...");
  let schemasVerified = 0;
  for (const schema of registeredSchemas) {
    try {
      const schemaData = await attestationRegistry.schemas(schema.hash);
      if (schemaData.isActive) {
        schemasVerified++;
        console.log(`   ✅ ${schema.name}`);
      } else {
        console.log(`   ❌ ${schema.name} (not active)`);
      }
    } catch (error) {
      console.log(`   ❌ ${schema.name} (error: ${error.message})`);
    }
  }
  console.log(`\n   Total: ${schemasVerified}/${SCHEMAS.length} schemas active\n`);

  // Verify token balances
  console.log("💰 Verifying token balances...");
  let accountsVerified = 0;
  for (const result of mintResults) {
    if (result.success && parseFloat(result.balance) >= MINT_AMOUNT) {
      accountsVerified++;
      console.log(`   ✅ ${result.role}: ${parseFloat(result.balance).toLocaleString()} CIT`);
    } else {
      console.log(`   ❌ ${result.role}: ${result.balance} CIT`);
    }
  }
  console.log(`\n   Total: ${accountsVerified}/${Object.keys(TEST_ACCOUNTS).length} accounts funded\n`);

  // Check total supply
  const totalSupply = await citToken.totalSupply();
  const expectedSupply = initialSupply + (MINT_AMOUNT * Object.keys(TEST_ACCOUNTS).length);
  console.log("📊 Token Supply:");
  console.log(`   Initial: ${initialSupply.toLocaleString()} CIT`);
  console.log(`   Minted: ${(MINT_AMOUNT * Object.keys(TEST_ACCOUNTS).length).toLocaleString()} CIT`);
  console.log(`   Total: ${parseFloat(ethers.formatUnits(totalSupply, 18)).toLocaleString()} CIT`);
  console.log(`   Expected: ${expectedSupply.toLocaleString()} CIT`);
  console.log(`   Status: ${parseFloat(ethers.formatUnits(totalSupply, 18)) === expectedSupply ? '✅' : '❌'}\n`);

  // ═══════════════════════════════════════════════════════════
  // STEP 5: SAVE DEPLOYMENT INFO
  // ═══════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════════════");
  console.log("💾 STEP 5: SAVING DEPLOYMENT INFORMATION");
  console.log("═══════════════════════════════════════════════════════════\n");

  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      CIToken: citTokenAddress,
      OracleStaking: oracleStakingAddress,
      AttestationRegistry: attestationRegistryAddress,
      LoanMarketplace: loanMarketplaceAddress,
      LoanAgreementRegistry: loanAgreementRegistryAddress,
      PlatformGovernance: platformGovernanceAddress,
      MSMEIdentity: msmeIdentityAddress,
      DynamicCreditScore: dynamicCreditScoreAddress,
      FlashAssessment: flashAssessmentAddress,
      SocialCreditSystem: socialCreditSystemAddress,
      PredictiveAnalyticsOracle: predictiveAnalyticsOracleAddress
    },
    schemas: registeredSchemas,
    testAccounts: mintResults,
    verification: {
      contractsDeployed: 11,
      schemasRegistered: schemasVerified,
      accountsFunded: accountsVerified,
      totalSupply: ethers.formatUnits(totalSupply, 18)
    }
  };

  // Save to deployments directory
  const deploymentPath = './deployments';
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath);
  }

  // Save localhost.json (main reference)
  fs.writeFileSync(
    `${deploymentPath}/localhost.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("✅ Saved: deployments/localhost.json");

  // Save timestamped backup
  fs.writeFileSync(
    `${deploymentPath}/localhost-${Date.now()}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("✅ Saved: timestamped backup\n");

  // ═══════════════════════════════════════════════════════════
  // STEP 6: UPDATE FRONTEND CONFIGURATION
  // ═══════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════════════");
  console.log("🔄 STEP 6: UPDATING FRONTEND CONFIGURATION");
  console.log("═══════════════════════════════════════════════════════════\n");

  const frontendConfigPath = './frontend/src/utils/contracts.js';
  
  try {
    let frontendConfig = fs.readFileSync(frontendConfigPath, 'utf8');
    
    const newAddresses = `export const CONTRACT_ADDRESSES = {
  CIToken: '${citTokenAddress}',
  OracleStaking: '${oracleStakingAddress}',
  AttestationRegistry: '${attestationRegistryAddress}',
  LoanMarketplace: '${loanMarketplaceAddress}',
  LoanAgreementRegistry: '${loanAgreementRegistryAddress}',
  PlatformGovernance: '${platformGovernanceAddress}',
  MSMEIdentity: '${msmeIdentityAddress}'
};`;
    
    frontendConfig = frontendConfig.replace(
      /export const CONTRACT_ADDRESSES = \{[^}]+\};/s,
      newAddresses
    );
    
    fs.writeFileSync(frontendConfigPath, frontendConfig);
    console.log("✅ Frontend contract addresses updated");
    console.log("   File: frontend/src/utils/contracts.js\n");
  } catch (error) {
    console.log("⚠️  Could not auto-update frontend:", error.message);
    console.log("   You may need to update manually\n");
  }

  // ═══════════════════════════════════════════════════════════
  // DEPLOYMENT COMPLETE - SUMMARY
  // ═══════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════════════");
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("═══════════════════════════════════════════════════════════\n");

  console.log("📊 DEPLOYMENT SUMMARY:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`✅ Contracts Deployed: 11/11`);
  console.log(`✅ Schemas Registered: ${schemasVerified}/${SCHEMAS.length}`);
  console.log(`✅ Accounts Funded: ${accountsVerified}/${Object.keys(TEST_ACCOUNTS).length}`);
  console.log(`✅ Total Supply: ${parseFloat(ethers.formatUnits(totalSupply, 18)).toLocaleString()} CIT`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("🔑 KEY CONTRACTS:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`   CIT Token:            ${citTokenAddress}`);
  console.log(`   Attestation Registry: ${attestationRegistryAddress}`);
  console.log(`   Oracle Staking:       ${oracleStakingAddress}`);
  console.log(`   Loan Marketplace:     ${loanMarketplaceAddress}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("📋 REGISTERED SCHEMAS:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  registeredSchemas.forEach(schema => {
    console.log(`   ✅ ${schema.name}`);
    console.log(`      ID: ${schema.id}`);
    console.log(`      Hash: ${schema.hash}\n`);
  });
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("💰 FUNDED ACCOUNTS:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  mintResults.forEach(result => {
    if (result.success) {
      console.log(`   ✅ ${result.role.padEnd(15)} ${parseFloat(result.balance).toLocaleString()} CIT`);
      console.log(`      ${result.address}`);
    }
  });
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("🚀 NEXT STEPS:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   1. Start frontend: cd frontend && npm start");
  console.log("   2. Open http://localhost:3000");
  console.log("   3. Connect MetaMask to localhost:8545 (Chain ID: 31337)");
  console.log("   4. Import test accounts using private keys from hardhat node");
  console.log("   5. Test oracle staking → attestation → loan workflow");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("📚 DOCUMENTATION:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   Setup Guide:    READY_TO_USE.md");
  console.log("   Deployment:     DEPLOYMENT_GUIDE.md");
  console.log("   Scripts:        SCRIPTS_GUIDE.md");
  console.log("   Testing:        docs/E2E_TESTING_GUIDE.md");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("✨ Platform is ready to use! ✨\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ DEPLOYMENT FAILED:");
    console.error(error);
    process.exit(1);
  });
