const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Direct Contract Query Test\n");

  const loanMarketplaceAddress = "0x67fcDa4FFee9f0Da9657b81DC88d168eE9f5eBBd";
  
  // Create provider
  const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia.publicnode.com");
  
  // Minimal ABI
  const abi = [
    "function requestCounter() view returns (uint256)",
    "function requests(uint256 requestId) view returns (address msme, uint256 amount, uint16 tenureMonths, uint256 commitDeadline, uint256 revealDeadline, uint8 status, string purpose, uint256 createdAt)"
  ];
  
  const contract = new ethers.Contract(loanMarketplaceAddress, abi, provider);
  
  console.log("📋 Querying contract:", loanMarketplaceAddress);
  console.log("🌐 RPC:", "https://ethereum-sepolia.publicnode.com");
  
  try {
    // Get counter
    const counter = await contract.requestCounter();
    console.log("\n✅ Request Counter:", counter.toString());
    
    const total = Number(counter);
    
    if (total === 0) {
      console.log("\n❌ No loans found!");
      console.log("This means either:");
      console.log("  1. Wrong contract address");
      console.log("  2. Loans are on different deployment");
      return;
    }
    
    // Get each loan
    for (let i = 1; i <= total; i++) {
      console.log(`\n--- Loan #${i} ---`);
      const request = await contract.requests(i);
      console.log("MSME:", request.msme);
      console.log("Amount:", ethers.formatUnits(request.amount, 18), "tokens");
      console.log("Tenure:", Number(request.tenureMonths), "months");
      console.log("Purpose:", request.purpose);
      console.log("Status:", Number(request.status));
      console.log("Created:", new Date(Number(request.createdAt) * 1000).toLocaleString());
    }
    
    console.log("\n✅ Contract is working correctly!");
    console.log("If frontend shows 0, it's a frontend issue, not blockchain.");
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.log("\nThis suggests the contract address is wrong or not deployed.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
