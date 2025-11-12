const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n🔍 Testing CIT Token Contract...\n");

  // Get latest deployment
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  const files = fs.readdirSync(deploymentsDir)
    .filter(f => f.startsWith('deployment-') && f.endsWith('.json'))
    .sort()
    .reverse();

  const deployment = JSON.parse(
    fs.readFileSync(path.join(deploymentsDir, files[0]), 'utf8')
  );

  const ciTokenAddress = deployment.contracts.CIToken;
  console.log("CIT Token Address:", ciTokenAddress);

  // Get contract
  const CIToken = await hre.ethers.getContractAt("CIToken", ciTokenAddress);

  // Test 1: Check if contract exists
  console.log("\nTest 1: Contract exists");
  try {
    const name = await CIToken.name();
    const symbol = await CIToken.symbol();
    console.log("✅ Contract found!");
    console.log("   Name:", name);
    console.log("   Symbol:", symbol);
  } catch (error) {
    console.log("❌ Contract not found or not responding");
    console.log("   Error:", error.message);
    return;
  }

  // Test 2: Check total supply
  console.log("\nTest 2: Total Supply");
  try {
    const totalSupply = await CIToken.totalSupply();
    console.log("✅ Total Supply:", hre.ethers.formatEther(totalSupply), "CIT");
  } catch (error) {
    console.log("❌ Error:", error.message);
  }

  // Test 3: Check specific balances
  console.log("\nTest 3: Account Balances");
  const testAccounts = [
    { name: "Admin", address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" },
    { name: "Oracle 1", address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" },
    { name: "MSME 1", address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65" },
  ];

  for (const account of testAccounts) {
    try {
      const balance = await CIToken.balanceOf(account.address);
      console.log(`✅ ${account.name}: ${hre.ethers.formatEther(balance)} CIT`);
    } catch (error) {
      console.log(`❌ ${account.name}: Error - ${error.message}`);
    }
  }

  // Test 4: Check owner
  console.log("\nTest 4: Contract Owner");
  try {
    const owner = await CIToken.owner();
    console.log("✅ Owner:", owner);
  } catch (error) {
    console.log("❌ Error:", error.message);
  }

  console.log("\n✅ Testing complete!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
