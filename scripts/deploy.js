const { ethers } = require("hardhat");

async function main() {
  console.log("Starting deployment...\n");

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // 1. Deploy CIT Token
  console.log("1. Deploying CIT Token...");
  const CIToken = await ethers.getContractFactory("CIToken");
  const initialSupply = 10_000_000; // 10 million tokens
  const citToken = await CIToken.deploy(initialSupply);
  await citToken.waitForDeployment();
  const citTokenAddress = await citToken.getAddress();
  console.log("   CIT Token deployed to:", citTokenAddress);
  console.log("   Initial supply:", initialSupply, "CIT\n");

  // 2. Deploy OracleStaking
  console.log("2. Deploying Oracle Staking...");
  const OracleStaking = await ethers.getContractFactory("OracleStaking");
  const governanceAddress = deployer.address; // For demo, deployer is governance
  const oracleStaking = await OracleStaking.deploy(citTokenAddress, governanceAddress);
  await oracleStaking.waitForDeployment();
  const oracleStakingAddress = await oracleStaking.getAddress();
  console.log("   Oracle Staking deployed to:", oracleStakingAddress);
  console.log("   Governance:", governanceAddress, "\n");

  // 3. Deploy AttestationRegistry
  console.log("3. Deploying Attestation Registry...");
  const AttestationRegistry = await ethers.getContractFactory("AttestationRegistry");
  const attestationRegistry = await AttestationRegistry.deploy(oracleStakingAddress, governanceAddress);
  await attestationRegistry.waitForDeployment();
  const attestationRegistryAddress = await attestationRegistry.getAddress();
  console.log("   Attestation Registry deployed to:", attestationRegistryAddress, "\n");

  // 4. Deploy LoanMarketplace
  console.log("4. Deploying Loan Marketplace...");
  const LoanMarketplace = await ethers.getContractFactory("LoanMarketplace");
  const loanMarketplace = await LoanMarketplace.deploy(governanceAddress);
  await loanMarketplace.waitForDeployment();
  const loanMarketplaceAddress = await loanMarketplace.getAddress();
  console.log("   Loan Marketplace deployed to:", loanMarketplaceAddress, "\n");

  // 5. Deploy LoanAgreementRegistry
  console.log("5. Deploying Loan Agreement Registry...");
  const LoanAgreementRegistry = await ethers.getContractFactory("LoanAgreementRegistry");
  const loanAgreementRegistry = await LoanAgreementRegistry.deploy(loanMarketplaceAddress, governanceAddress);
  await loanAgreementRegistry.waitForDeployment();
  const loanAgreementRegistryAddress = await loanAgreementRegistry.getAddress();
  console.log("   Loan Agreement Registry deployed to:", loanAgreementRegistryAddress, "\n");

  // 6. Deploy PlatformGovernance
  console.log("6. Deploying Platform Governance...");
  const PlatformGovernance = await ethers.getContractFactory("PlatformGovernance");
  const treasuryAddress = deployer.address; // For demo, deployer is treasury
  const emergencyAdminAddress = deployer.address; // For demo, deployer is emergency admin
  const platformGovernance = await PlatformGovernance.deploy(treasuryAddress, emergencyAdminAddress);
  await platformGovernance.waitForDeployment();
  const platformGovernanceAddress = await platformGovernance.getAddress();
  console.log("   Platform Governance deployed to:", platformGovernanceAddress);
  console.log("   Treasury:", treasuryAddress);
  console.log("   Emergency Admin:", emergencyAdminAddress, "\n");

  // 7. Configure Platform Governance
  console.log("7. Configuring Platform Governance...");
  
  // Wait a bit for nonce to sync
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const tx1 = await platformGovernance.setStakingContract(oracleStakingAddress);
  await tx1.wait();
  console.log("   Staking contract set");
  
  // Wait between transactions
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const tx2 = await platformGovernance.setCITToken(citTokenAddress);
  await tx2.wait();
  console.log("   CIT Token set\n");

  // 8. Register some sample schemas in AttestationRegistry
  console.log("8. Registering sample attestation schemas...");
  
  const schemas = [
    {
      id: ethers.keccak256(ethers.toUtf8Bytes("gst-revenue")),
      name: "GST Revenue Verification",
      description: "Verified revenue data from GST returns"
    },
    {
      id: ethers.keccak256(ethers.toUtf8Bytes("bank-statements")),
      name: "Bank Statement Verification",
      description: "Verified bank account statements and cash flow"
    },
    {
      id: ethers.keccak256(ethers.toUtf8Bytes("kyc-basic")),
      name: "KYC Basic Verification",
      description: "Basic KYC verification including identity documents"
    },
    {
      id: ethers.keccak256(ethers.toUtf8Bytes("credit-score")),
      name: "Credit Score",
      description: "Credit bureau score attestation"
    }
  ];

  for (const schema of schemas) {
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds between schemas
    const tx = await attestationRegistry.registerSchema(schema.id, schema.name, schema.description);
    await tx.wait();
    console.log(`   Registered schema: ${schema.name}`);
  }
  console.log();

  // 9. Deploy a sample MSME Identity
  console.log("9. Deploying sample MSME Identity...");
  const MSMEIdentity = await ethers.getContractFactory("MSMEIdentity");
  const sampleMSMEIdentity = await MSMEIdentity.deploy(deployer.address);
  await sampleMSMEIdentity.waitForDeployment();
  const sampleMSMEIdentityAddress = await sampleMSMEIdentity.getAddress();
  console.log("   Sample MSME Identity deployed to:", sampleMSMEIdentityAddress, "\n");

  // 10. Deploy DynamicCreditScore (Revolutionary!)
  console.log("10. Deploying Dynamic Credit Score...");
  const DynamicCreditScore = await ethers.getContractFactory("DynamicCreditScore");
  const dynamicCreditScore = await DynamicCreditScore.deploy(
    attestationRegistryAddress,
    loanAgreementRegistryAddress
  );
  await dynamicCreditScore.waitForDeployment();
  const dynamicCreditScoreAddress = await dynamicCreditScore.getAddress();
  console.log("   ✨ Dynamic Credit Score deployed to:", dynamicCreditScoreAddress);
  console.log("   Features: Multi-dimensional, Real-time, Transparent\n");

  // 11. Deploy SocialCreditSystem (Revolutionary!)
  console.log("11. Deploying Social Credit System...");
  const SocialCreditSystem = await ethers.getContractFactory("SocialCreditSystem");
  const socialCreditSystem = await SocialCreditSystem.deploy();
  await socialCreditSystem.waitForDeployment();
  const socialCreditSystemAddress = await socialCreditSystem.getAddress();
  console.log("   🤝 Social Credit System deployed to:", socialCreditSystemAddress);
  console.log("   Features: Endorsements, Reviews, Community vouching\n");

  // 12. Deploy FlashAssessment (Revolutionary!)
  console.log("12. Deploying Flash Assessment...");
  const FlashAssessment = await ethers.getContractFactory("FlashAssessment");
  const flashAssessment = await FlashAssessment.deploy();
  await flashAssessment.waitForDeployment();
  const flashAssessmentAddress = await flashAssessment.getAddress();
  console.log("   ⚡ Flash Assessment deployed to:", flashAssessmentAddress);
  console.log("   Features: ZK proofs, Instant approval, Privacy-preserving\n");

  // Summary
  console.log("=".repeat(70));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(70));
  console.log("\n📦 CORE CONTRACTS:");
  console.log("CIT Token:                ", citTokenAddress);
  console.log("Oracle Staking:           ", oracleStakingAddress);
  console.log("Attestation Registry:     ", attestationRegistryAddress);
  console.log("Loan Marketplace:         ", loanMarketplaceAddress);
  console.log("Loan Agreement Registry:  ", loanAgreementRegistryAddress);
  console.log("Platform Governance:      ", platformGovernanceAddress);
  console.log("Sample MSME Identity:     ", sampleMSMEIdentityAddress);
  
  console.log("\n🚀 REVOLUTIONARY CONTRACTS (Better than CIBIL!):");
  console.log("Dynamic Credit Score:     ", dynamicCreditScoreAddress);
  console.log("Social Credit System:     ", socialCreditSystemAddress);
  console.log("Flash Assessment:         ", flashAssessmentAddress);
  console.log("=".repeat(70));

  // Save deployment addresses to file
  const fs = require('fs');
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      CIToken: citTokenAddress,
      OracleStaking: oracleStakingAddress,
      AttestationRegistry: attestationRegistryAddress,
      LoanMarketplace: loanMarketplaceAddress,
      LoanAgreementRegistry: loanAgreementRegistryAddress,
      PlatformGovernance: platformGovernanceAddress,
      SampleMSMEIdentity: sampleMSMEIdentityAddress,
      DynamicCreditScore: dynamicCreditScoreAddress,
      SocialCreditSystem: socialCreditSystemAddress,
      FlashAssessment: flashAssessmentAddress
    }
  };

  const deploymentPath = './deployments';
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath);
  }

  fs.writeFileSync(
    `${deploymentPath}/deployment-${Date.now()}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\nDeployment info saved to deployments directory");
  console.log("\nDeployment complete! ✅");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
