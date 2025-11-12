const { ethers } = require("hardhat");

async function main() {
  console.log("\n🔍 Network Diagnostics...\n");

  // Force connection to localhost
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  
  // Get network info
  const network = await provider.getNetwork();
  console.log("Connected Network:");
  console.log("  Name:", network.name);
  console.log("  Chain ID:", network.chainId.toString());
  
  // Get block number
  const blockNumber = await ethers.provider.getBlockNumber();
  console.log("  Block Number:", blockNumber);
  
  // Get accounts
  const signers = await ethers.getSigners();
  console.log("  Available Accounts:", signers.length);
  console.log("  First Account:", signers[0].address);
  
  // Check balance
  const balance = await ethers.provider.getBalance(signers[0].address);
  console.log("  Balance:", ethers.formatEther(balance), "ETH");
  
  // Try to check code at the supposed CIT token address
  console.log("\n📦 Checking Contract Address...");
  const citAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  console.log("  Address:", citAddress);
  
  const code = await ethers.provider.getCode(citAddress);
  console.log("  Has Code:", code !== "0x");
  console.log("  Code Length:", code.length, "characters");
  
  if (code === "0x") {
    console.log("\n❌ No contract deployed at this address!");
    console.log("   This means either:");
    console.log("   1. The hardhat node restarted after deployment");
    console.log("   2. Deployment happened on a different network");
    console.log("   3. Deployment failed silently");
  } else {
    console.log("\n✅ Contract exists at this address!");
  }
  
  // Check recent blocks for deployment transactions
  console.log("\n🔍 Recent Transactions:");
  for (let i = Math.max(0, blockNumber - 5); i <= blockNumber; i++) {
    const block = await ethers.provider.getBlock(i);
    if (block && block.transactions.length > 0) {
      console.log(`  Block ${i}: ${block.transactions.length} transactions`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });
