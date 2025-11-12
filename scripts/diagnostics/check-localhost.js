const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n🔍 Network Diagnostics (Connecting to localhost:8545)...\n");

  // Force connection to localhost
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  
  // Get network info
  const network = await provider.getNetwork();
  console.log("Connected Network:");
  console.log("  Name:", network.name);
  console.log("  Chain ID:", network.chainId.toString());
  
  // Get block number
  const blockNumber = await provider.getBlockNumber();
  console.log("  Block Number:", blockNumber);
  
  if (blockNumber === 0) {
    console.log("\n❌ Block is 0 - No transactions yet!");
    console.log("   The node just started or was reset.\n");
    return;
  }
  
  // Get latest deployment
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  const files = fs.readdirSync(deploymentsDir)
    .filter(f => f.startsWith('deployment-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.log("\n❌ No deployment files found!");
    return;
  }

  const deployment = JSON.parse(
    fs.readFileSync(path.join(deploymentsDir, files[0]), 'utf8')
  );
  
  const citAddress = deployment.contracts.CIToken;
  
  console.log("\n📦 Checking Latest Deployed Contract...");
  console.log("  CIT Token Address:", citAddress);
  console.log("  Deployment Network:", deployment.network);
  console.log("  Deployment Time:", deployment.timestamp);
  
  const code = await provider.getCode(citAddress);
  console.log("\n  Has Code:", code !== "0x");
  console.log("  Code Length:", code.length, "characters");
  
  if (code === "0x") {
    console.log("\n❌ Contract NOT found at this address!");
    console.log("   Deployment happened on a different network or node instance.\n");
  } else {
    console.log("\n✅ Contract EXISTS!");
    
    // Try to read the contract
    const CIToken = new ethers.Contract(
      citAddress,
      ["function name() view returns (string)", "function symbol() view returns (string)", "function totalSupply() view returns (uint256)", "function balanceOf(address) view returns (uint256)"],
      provider
    );
    
    try {
      const name = await CIToken.name();
      const symbol = await CIToken.symbol();
      const totalSupply = await CIToken.totalSupply();
      
      console.log("  Name:", name);
      console.log("  Symbol:", symbol);
      console.log("  Total Supply:", ethers.formatEther(totalSupply), "CIT");
      
      // Check balance of MSME 1
      const msme1 = "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65";
      const balance = await CIToken.balanceOf(msme1);
      console.log("\n  MSME 1 Balance:", ethers.formatEther(balance), "CIT");
      
      if (balance > 0) {
        console.log("\n✅ Everything is working perfectly!\n");
      } else {
        console.log("\n⚠️  Balance is 0 - tokens might not be minted yet.\n");
      }
    } catch (error) {
      console.log("\n❌ Error reading contract:", error.message, "\n");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });
