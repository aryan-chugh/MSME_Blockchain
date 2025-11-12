const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("🪙 Minting CIT Tokens...\n");

  const [deployer] = await ethers.getSigners();
  
  // Get target address from environment variable or use deployer
  const targetAddress = process.env.TARGET_ADDRESS || deployer.address;
  
  // Validate address
  if (!ethers.isAddress(targetAddress)) {
    console.error("❌ Invalid address:", targetAddress);
    console.log("\nUsage: $env:TARGET_ADDRESS='0x123...'; npx hardhat run scripts/mint-tokens.js --network sepolia");
    console.log("Or with amount: $env:TARGET_ADDRESS='0x123...'; $env:MINT_AMOUNT='5000000'; npx hardhat run scripts/mint-tokens.js --network sepolia");
    process.exit(1);
  }
  
  // Get amount from environment variable or use default 1 million
  const amountInput = process.env.MINT_AMOUNT || "1000000";
  const amount = ethers.parseUnits(amountInput, 18);
  
  console.log("Minting from:", deployer.address);
  console.log("Minting to:", targetAddress);
  console.log("Amount:", ethers.formatUnits(amount, 18), "CIT");

  // Load deployment info
  const deployment = require('../deployments/sepolia.json');
  const ciTokenAddress = deployment.contracts.CIToken;

  console.log("CIT Token:", ciTokenAddress);

  // Get contract instance
  const CIToken = await ethers.getContractAt("CIToken", ciTokenAddress);

  console.log("\nMinting tokens...");
  const tx = await CIToken.mint(targetAddress, amount);
  console.log("Transaction hash:", tx.hash);
  
  await tx.wait();
  console.log("✅ Tokens minted!");

  // Check balance
  const balance = await CIToken.balanceOf(targetAddress);
  console.log("\nBalance of", targetAddress + ":", ethers.formatUnits(balance, 18), "CIT");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
