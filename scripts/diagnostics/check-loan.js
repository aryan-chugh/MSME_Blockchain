const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("Checking with account:", signer.address);

  // Load deployment
  const deployment = require("../deployments/sepolia.json");
  
  // Get LoanMarketplace contract
  const LoanMarketplace = await hre.ethers.getContractAt(
    "LoanMarketplace",
    deployment.contracts.LoanMarketplace
  );

  console.log("\n=== NEW Contract Address:", deployment.contracts.LoanMarketplace);
  
  // Check if contract is paused (this should work now)
  try {
    const paused = await LoanMarketplace.paused();
    console.log("Contract Paused:", paused);
    console.log("✅ Pausable function working correctly!");
  } catch (error) {
    console.log("❌ Error checking paused state:", error.message);
  }
  
  // Check request counter
  const counter = await LoanMarketplace.requestCounter();
  console.log("\nTotal loan requests:", counter.toString());
  
  if (counter > 0n) {
    console.log("\n=== Checking Loan Request #1 ===");
    const request = await LoanMarketplace.requests(1);
    console.log("MSME:", request.msme);
    console.log("Amount:", hre.ethers.formatUnits(request.amount, 18), "tokens");
    console.log("Tenure:", request.tenureMonths.toString(), "months");
    console.log("Status:", request.status);
  } else {
    console.log("\n✅ No loan requests yet - ready for fresh testing!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
