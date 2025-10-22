const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking Loan Status and Reveal Phase\n");

  const loanMarketplaceAddress = "0x67fcDa4FFee9f0Da9657b81DC88d168eE9f5eBBd";
  const LoanMarketplace = await ethers.getContractFactory("LoanMarketplace");
  const loanContract = LoanMarketplace.attach(loanMarketplaceAddress);

  const [signer] = await ethers.getSigners();
  console.log("Checking with account:", signer.address);

  const counter = await loanContract.requestCounter();
  const totalLoans = Number(counter);
  console.log("Total loans:", totalLoans, "\n");

  if (totalLoans === 0) {
    console.log("❌ No loans created yet. Please create a loan first.");
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  console.log("Current timestamp:", now);
  console.log("Current time:", new Date().toLocaleString(), "\n");

  for (let i = 1; i <= totalLoans; i++) {
    console.log("=".repeat(70));
    console.log(`Loan Request #${i}`);
    console.log("=".repeat(70));

    const request = await loanContract.requests(i);
    
    const statusMap = ['Open', 'Reveal', 'Matched', 'Expired', 'Cancelled'];
    const status = statusMap[request.status] || 'Unknown';
    
    console.log("MSME:", request.msme);
    console.log("Amount:", ethers.formatUnits(request.amount, 18), "tokens");
    console.log("Tenure:", Number(request.tenureMonths), "months");
    console.log("Purpose:", request.purpose);
    console.log("Status:", status, `(${request.status})`);
    
    const commitDeadline = Number(request.commitDeadline);
    const revealDeadline = Number(request.revealDeadline);
    
    console.log("\n⏰ TIMING:");
    console.log("Commit Deadline:", new Date(commitDeadline * 1000).toLocaleString());
    console.log("Reveal Deadline:", new Date(revealDeadline * 1000).toLocaleString());
    
    const commitRemaining = commitDeadline - now;
    const revealRemaining = revealDeadline - now;
    
    if (commitRemaining > 0) {
      const hours = Math.floor(commitRemaining / 3600);
      const minutes = Math.floor((commitRemaining % 3600) / 60);
      console.log(`\n🟢 COMMIT PHASE ACTIVE - ${hours}h ${minutes}m remaining`);
      console.log("   Status: Still accepting sealed bids");
    } else if (revealRemaining > 0) {
      const hours = Math.floor(revealRemaining / 3600);
      const minutes = Math.floor((revealRemaining % 3600) / 60);
      console.log(`\n🟡 REVEAL PHASE ACTIVE - ${hours}h ${minutes}m remaining`);
      console.log("   Status: Lenders should reveal their bids NOW!");
    } else {
      console.log("\n🔴 EXPIRED - Both phases ended");
    }
    
    // Check for commitments
    console.log("\n📋 COMMITMENTS:");
    const commitment = await loanContract.commitments(i, signer.address);
    if (commitment !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      console.log("✅ You have committed to this loan");
      console.log("   Commitment hash:", commitment);
      
      const deposit = await loanContract.bidDeposits(i, signer.address);
      console.log("   Deposit:", ethers.formatEther(deposit), "ETH");
      
      if (commitRemaining <= 0 && revealRemaining > 0) {
        console.log("\n   ⚠️  ACTION REQUIRED: GO TO LENDER DASHBOARD TO REVEAL!");
      }
    } else {
      console.log("❌ No commitment from your account");
    }
    
    console.log();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
