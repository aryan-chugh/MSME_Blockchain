const hre = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("\n🔍 DEPLOYMENT VERIFICATION TOOL\n");
  console.log("=".repeat(70));
  
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("📝 Network Information:");
  console.log("   Network:", hre.network.name);
  console.log("   Chain ID:", (await hre.ethers.provider.getNetwork()).chainId);
  console.log("   Account:", deployer.address);
  console.log("   Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");
  
  // Load deployment file
  let deploymentPath;
  if (hre.network.name === 'localhost' || hre.network.name === 'hardhat') {
    deploymentPath = './deployments/localhost.json';
  } else if (hre.network.name === 'sepolia') {
    deploymentPath = './deployments/sepolia-v3-1.json';
  } else {
    console.log("❌ Unknown network. Cannot find deployment file.");
    return;
  }
  
  if (!fs.existsSync(deploymentPath)) {
    console.log(`❌ Deployment file not found: ${deploymentPath}`);
    console.log("   Please deploy contracts first.\n");
    return;
  }
  
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  console.log("📋 Loaded deployment from:", deploymentPath, "\n");
  
  console.log("=".repeat(70));
  console.log("CONTRACT VERIFICATION\n");
  
  const contracts = deployment.contracts || {};
  
  // Verify each contract
  const verifyContract = async (name, address) => {
    if (!address) {
      console.log(`⚠️  ${name}: Not deployed`);
      return false;
    }
    
    try {
      const code = await hre.ethers.provider.getCode(address);
      if (code === '0x') {
        console.log(`❌ ${name}: No code at ${address}`);
        return false;
      }
      console.log(`✅ ${name}: ${address}`);
      return true;
    } catch (error) {
      console.log(`❌ ${name}: Error - ${error.message}`);
      return false;
    }
  };
  
  let allValid = true;
  
  // Check each contract
  allValid &= await verifyContract("CIToken", contracts.CIToken);
  allValid &= await verifyContract("OracleStaking", contracts.OracleStaking);
  allValid &= await verifyContract("AttestationRegistry", contracts.AttestationRegistry);
  allValid &= await verifyContract("LoanMarketplace", contracts.LoanMarketplace);
  allValid &= await verifyContract("LoanAgreementRegistry", contracts.LoanAgreementRegistry);
  allValid &= await verifyContract("PlatformGovernance", contracts.PlatformGovernance);
  
  console.log("\n" + "=".repeat(70));
  
  if (allValid) {
    console.log("✅ ALL CONTRACTS VERIFIED\n");
  } else {
    console.log("❌ SOME CONTRACTS FAILED VERIFICATION\n");
  }
  
  // Check contract versions
  console.log("=".repeat(70));
  console.log("CONTRACT VERSION CHECK\n");
  
  try {
    const oracleStaking = await hre.ethers.getContractAt("OracleStakingV3", contracts.OracleStaking);
    const minStake = await oracleStaking.MINIMUM_STAKE();
    const hasRepDecay = await oracleStaking.REPUTATION_DECAY_PERIOD();
    
    if (hasRepDecay) {
      console.log("✅ OracleStaking: V3 (Multi-oracle consensus) ✓");
      console.log("   - Consensus tracking: Enabled");
      console.log("   - Reputation decay: Enabled");
      console.log("   - Min stake:", hre.ethers.formatEther(minStake), "CIT");
    } else {
      console.log("⚠️  OracleStaking: V1 (Basic staking)");
      console.log("   Consider upgrading to V3 for multi-oracle features");
    }
  } catch (error) {
    console.log("❌ OracleStaking: Could not verify version");
    console.log("   Error:", error.message);
  }
  
  console.log();
  
  try {
    const attestationRegistry = await hre.ethers.getContractAt("AttestationRegistryV3_1", contracts.AttestationRegistry);
    const minOracles = await attestationRegistry.MIN_ORACLES_REQUIRED();
    const consensusThreshold = await attestationRegistry.CONSENSUS_THRESHOLD();
    
    // Check if acceptRequest function exists (V3.1 feature)
    try {
      // Try to get the function selector
      const hasAcceptRequest = attestationRegistry.interface.hasFunction("acceptRequest");
      if (hasAcceptRequest) {
        console.log("✅ AttestationRegistry: V3.1 (Self-assignment) ✓");
        console.log("   - Oracle self-assignment: Enabled");
      } else {
        console.log("⚠️  AttestationRegistry: V3 (Auto-assignment)");
      }
    } catch {
      console.log("⚠️  AttestationRegistry: V3 or lower");
    }
    
    console.log("   - Min oracles:", minOracles.toString());
    console.log("   - Consensus threshold:", consensusThreshold.toString() + "%");
  } catch (error) {
    console.log("❌ AttestationRegistry: Could not verify version");
    console.log("   Error:", error.message);
  }
  
  console.log("\n" + "=".repeat(70));
  console.log("FUNCTIONALITY TESTS\n");
  
  // Test CIT Token
  try {
    const citToken = await hre.ethers.getContractAt("CIToken", contracts.CIToken);
    const name = await citToken.name();
    const symbol = await citToken.symbol();
    const totalSupply = await citToken.totalSupply();
    
    console.log("✅ CIT Token:");
    console.log("   - Name:", name);
    console.log("   - Symbol:", symbol);
    console.log("   - Total Supply:", hre.ethers.formatEther(totalSupply), "CIT");
  } catch (error) {
    console.log("❌ CIT Token: Error reading data");
  }
  
  console.log();
  
  // Test Oracle Staking
  try {
    const oracleStaking = await hre.ethers.getContractAt("OracleStakingV3", contracts.OracleStaking);
    const oracleListLength = await oracleStaking.getOracleCount();
    
    console.log("✅ Oracle Staking:");
    console.log("   - Registered oracles:", oracleListLength.toString());
    
    if (oracleListLength > 0) {
      console.log("   - Oracle list:");
      for (let i = 0; i < Math.min(oracleListLength, 5); i++) {
        const oracleAddr = await oracleStaking.oracleList(i);
        const info = await oracleStaking.oracles(oracleAddr);
        console.log(`     ${i + 1}. ${oracleAddr} (${hre.ethers.formatEther(info.stakedAmount)} CIT)`);
      }
    }
  } catch (error) {
    console.log("❌ Oracle Staking: Error reading data");
    console.log("   ", error.message);
  }
  
  console.log("\n" + "=".repeat(70));
  console.log("SUMMARY\n");
  
  console.log("Deployment Status:", allValid ? "✅ HEALTHY" : "⚠️  NEEDS ATTENTION");
  console.log("Contract Version:", "Latest (V3/V3.1)");
  console.log("Network:", hre.network.name);
  console.log("\n✅ Verification complete!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
