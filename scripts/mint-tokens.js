const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("🪙 Minting CIT Tokens...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Minting to:", deployer.address);

  // Load deployment info
  const deployment = require('../deployments/sepolia.json');
  const ciTokenAddress = deployment.contracts.CIToken;

  console.log("CIT Token:", ciTokenAddress);

  // Get contract instance
  const CIToken = await ethers.getContractAt("CIToken", ciTokenAddress);

  // Mint 1 million CIT tokens to deployer
  const amount = ethers.parseUnits("1000000", 18);
  
  console.log("\nMinting 1,000,000 CIT tokens...");
  const tx = await CIToken.mint(deployer.address, amount);
  console.log("Transaction hash:", tx.hash);
  
  await tx.wait();
  console.log("✅ Tokens minted!");

  // Check balance
  const balance = await CIToken.balanceOf(deployer.address);
  console.log("\nYour CIT balance:", ethers.formatUnits(balance, 18), "CIT");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
