const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Creating Test Loan with Short Deadlines\n");
  console.log("This will create a loan you can test the reveal feature with!\n");

  const addresses = {
    citToken: "0xf92e9e05D816962F856b8e0EaA3De4f57e2e5E3f",
    loanMarketplace: "0x67fcDa4FFee9f0Da9657b81DC88d168eE9f5eBBd",
    msmeIdentity: "0x9EA06d085DA5055f407d3eA0586C5B3EEca3C17E"
  };

  const [deployer] = await ethers.getSigners();
  console.log("MSME Account:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Connect to contracts
  const CIToken = await ethers.getContractFactory("CIToken");
  const citToken = CIToken.attach(addresses.citToken);

  const LoanMarketplace = await ethers.getContractFactory("LoanMarketplace");
  const loanMarketplace = LoanMarketplace.attach(addresses.loanMarketplace);

  // Check CIT balance
  const balance = await citToken.balanceOf(deployer.address);
  console.log("Your CIT Token balance:", ethers.formatUnits(balance, 18), "CIT\n");

  if (balance === 0n) {
    console.log("❌ You need CIT tokens first!");
    console.log("💡 Minting 1000 CIT tokens to your account...\n");
    
    const mintTx = await citToken.mint(deployer.address, ethers.parseUnits("1000", 18));
    await mintTx.wait();
    console.log("✅ Minted 1000 CIT tokens\n");
  }

  // Approve tokens
  console.log("📝 Approving LoanMarketplace to spend tokens...");
  const approveTx = await citToken.approve(
    addresses.loanMarketplace,
    ethers.parseUnits("1", 18)
  );
  await approveTx.wait();
  console.log("✅ Approval complete\n");

  // Create loan with minimum allowed periods for testing
  const commitPeriod = 3600; // 1 hour (minimum allowed)
  const revealPeriod = 3600; // 1 hour after commit (minimum allowed)

  const now = Math.floor(Date.now() / 1000);
  const commitDeadline = now + commitPeriod;
  const revealDeadline = commitDeadline + revealPeriod;

  console.log("⏰ Timeline:");
  console.log("  Now:", new Date().toLocaleString());
  console.log("  Commit ends:", new Date(commitDeadline * 1000).toLocaleString(), "(1 hour)");
  console.log("  Reveal ends:", new Date(revealDeadline * 1000).toLocaleString(), "(2 hours)\n");

  console.log("📋 Creating loan request...");
  const createTx = await loanMarketplace.createLoanRequest(
    ethers.parseUnits("0.01", 18), // 0.01 tokens
    12, // 12 months tenure
    "Test loan for reveal feature",
    commitPeriod, // 10 minutes to commit
    revealPeriod  // 10 minutes to reveal
  );

  console.log("⏳ Transaction sent:", createTx.hash);
  const receipt = await createTx.wait();
  console.log("✅ Loan created!\n");

  // Get the loan ID
  const counter = await loanMarketplace.requestCounter();
  const loanId = Number(counter);

  console.log("=".repeat(70));
  console.log("✅ SUCCESS - Loan Created!");
  console.log("=".repeat(70));
  console.log("Loan ID:", loanId);
  console.log("Amount: 0.01 CIT tokens");
  console.log("Max Rate: 12%");
  console.log("Tenure: 12 months");
  console.log("\n🎯 NEXT STEPS:");
  console.log("1. Switch to LENDER wallet (0x786...) in MetaMask");
  console.log("2. Go to Marketplace in frontend");
  console.log("3. Place a bid (commit phase - 1 hour)");
  console.log("4. Wait 1 hour for commit phase to end");
  console.log("5. Go to Lender Dashboard - REVEAL BUTTON will appear!");
  console.log("6. Click 'Reveal My Bid' button");
  console.log("\n⏰ Important: Complete steps 1-3 within 1 hour!");
  console.log("=".repeat(70));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
