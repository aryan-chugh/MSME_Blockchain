const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking Oracle Stake Status...\n");

  // Get the address to check from environment variable
  const addressToCheck = process.env.CHECK_ADDRESS;
  
  if (!addressToCheck) {
    console.error("❌ Please provide CHECK_ADDRESS environment variable");
    console.log("\nUsage: $env:CHECK_ADDRESS='0x...'; npx hardhat run scripts/check-stake.js --network sepolia");
    process.exit(1);
  }

  console.log("Checking address:", addressToCheck);

  // V3 Multi-Oracle contract address (hardcoded)
  const stakingAddress = "0xAA3a2F385374459fDebB35f6Bea87EFd4d18dBb9";

  console.log("OracleStaking contract:", stakingAddress);

  // Get contract instance
  const OracleStaking = await ethers.getContractAt("OracleStakingV3", stakingAddress);

  // Get oracle info
  console.log("\nQuerying oracle info...");
  const oracleInfo = await OracleStaking.getOracleInfo(addressToCheck);
  
  console.log("\n📊 Oracle Information:");
  console.log("├─ Staked Amount:", ethers.formatUnits(oracleInfo[0], 18), "CIT");
  console.log("├─ Reputation Score:", oracleInfo[1].toString());
  console.log("├─ Attestation Count:", oracleInfo[2].toString());
  console.log("├─ Slash Count:", oracleInfo[3].toString());
  console.log("├─ Registration Time:", new Date(Number(oracleInfo[4]) * 1000).toLocaleString());
  console.log("└─ Is Active:", oracleInfo[5]);

  // Calculate tier
  const stakedAmount = oracleInfo[0];
  let tier = "None";
  if (stakedAmount >= ethers.parseUnits("500000", 18)) {
    tier = "Platinum (4)";
  } else if (stakedAmount >= ethers.parseUnits("250000", 18)) {
    tier = "Gold (3)";
  } else if (stakedAmount >= ethers.parseUnits("100000", 18)) {
    tier = "Silver (2)";
  } else if (stakedAmount >= ethers.parseUnits("50000", 18)) {
    tier = "Bronze (1)";
  }

  console.log("\n🏆 Oracle Tier:", tier);

  if (stakedAmount === 0n) {
    console.log("\n⚠️  This address has NO stake!");
  } else {
    console.log("\n✅ This address is a staked oracle!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
