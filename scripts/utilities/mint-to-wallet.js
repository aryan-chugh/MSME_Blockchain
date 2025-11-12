const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🪙 Minting CIT Tokens...\n");

  // Connect to localhost explicitly
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const wallet = new ethers.Wallet(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // Account #0 (deployer)
    provider
  );

  // Get target address from command line or use default
  const targetAddress = process.argv[2];
  const mintAmount = process.argv[3] || "10000";
  
  if (!targetAddress) {
    console.error("❌ Error: Please provide a wallet address");
    console.log("\nUsage: node scripts/mint-to-wallet.js <address> [amount]");
    console.log("Example: node scripts/mint-to-wallet.js 0x1234... 100000");
    process.exit(1);
  }

  console.log("Target address:", targetAddress);
  console.log("Amount to mint:", mintAmount, "CIT");

  // Get latest deployment file
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  const files = fs.readdirSync(deploymentsDir)
    .filter(f => f.startsWith('deployment-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.error("❌ No deployment files found. Please deploy contracts first:");
    console.log("   npx hardhat run scripts/deploy.js --network localhost");
    process.exit(1);
  }

  const latestDeployment = JSON.parse(
    fs.readFileSync(path.join(deploymentsDir, files[0]), 'utf8')
  );

  const ciTokenAddress = latestDeployment.contracts.CIToken;
  const network = latestDeployment.network;

  console.log("Network:", network);
  console.log("CIT Token address:", ciTokenAddress);

  // Get contract instance with wallet (signer)
  const CIToken = new ethers.Contract(
    ciTokenAddress,
    ["function mint(address,uint256)", "function balanceOf(address) view returns (uint256)"],
    wallet
  );

  // Mint tokens
  const amount = ethers.parseUnits(mintAmount, 18);
  
  console.log("\n💰 Minting tokens...");
  const tx = await CIToken.mint(targetAddress, amount);
  console.log("📡 Transaction hash:", tx.hash);
  
  console.log("\n⏳ Waiting for confirmation...");
  await tx.wait();
  console.log("✅ Tokens minted successfully!");

  // Check balance with error handling
  try {
    const balance = await CIToken.balanceOf(targetAddress);
    console.log("\n💎 Balance:", ethers.formatUnits(balance, 18), "CIT");
  } catch (error) {
    console.log("\n⚠️  Could not read balance (but minting succeeded!)");
    console.log("   This is normal on localhost. Check balance in frontend.");
  }
  
  console.log("\n✨ You can now:");
  console.log("   - Pay attestation fees");
  console.log("   - Create loan requests");
  console.log("   - Stake as oracle (min 1000 CIT)");
  console.log("\n🔄 Refresh your frontend to see the updated balance!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
