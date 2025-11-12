// Quick script to check CIT balances
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n💰 Checking CIT Token Balances...\n");
  
  // Get latest deployment file
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  const files = fs.readdirSync(deploymentsDir)
    .filter(f => f.startsWith('deployment-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.error("❌ No deployment files found");
    process.exit(1);
  }

  const deployment = JSON.parse(
    fs.readFileSync(path.join(deploymentsDir, files[0]), 'utf8')
  );
  
  const citTokenAddress = deployment.contracts.CIToken;
  
  console.log("Network:", deployment.network);
  console.log("CIT Token Address:", citTokenAddress, "\n");
  
  // Get CIT Token contract
  const CIToken = await hre.ethers.getContractAt("CIToken", citTokenAddress);
  
  // Get signers (test accounts from hardhat node)
  const signers = await hre.ethers.getSigners();
  
  console.log("📊 Account Balances:\n");
  console.log("=".repeat(70));
  
  for (let i = 0; i < Math.min(5, signers.length); i++) {
    const address = signers[i].address;
    try {
      const balance = await CIToken.balanceOf(address);
      const formatted = hre.ethers.formatEther(balance);
      console.log(`Account ${i}     ${address}`);
      console.log(`               Balance: ${formatted} CIT`);
      console.log();
    } catch (error) {
      console.log(`Account ${i}     ${address}`);
      console.log(`               Error reading balance`);
      console.log();
    }
  }
  
  console.log("=".repeat(70));
  console.log("\n💡 Note: You need at least 100-1000 CIT to create attestation request");
  console.log("   depending on complexity (Simple/Medium/Complex/Critical)\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
