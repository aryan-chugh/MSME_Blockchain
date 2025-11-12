const hre = require("hardhat");

async function main() {
  console.log('\n🔍 Checking Oracle Status...\n');

  const deployment = require('../deployments/localhost.json');
  const oracleStakingAddress = deployment.contracts.OracleStaking;

  console.log('OracleStaking Address:', oracleStakingAddress);
  console.log();

  const OracleStaking = await hre.ethers.getContractAt('OracleStakingV3', oracleStakingAddress);

  // Check all 3 oracles
  const oracles = [
    deployment.accounts.oracle1,
    deployment.accounts.oracle2,
    deployment.accounts.oracle3
  ];

  console.log('📊 Oracle Status:\n');
  console.log('='.repeat(70));

  for (let i = 0; i < oracles.length; i++) {
    const oracleAddress = oracles[i];
    console.log(`\nOracle ${i + 1}: ${oracleAddress}`);
    
    try {
      const isValid = await OracleStaking.isValidOracle(oracleAddress);
      console.log(`  Valid Oracle: ${isValid ? '✅ YES' : '❌ NO'}`);
      
      const info = await OracleStaking.oracles(oracleAddress);
      console.log(`  Staked Amount: ${hre.ethers.formatEther(info.stakedAmount)} CIT`);
      console.log(`  Active: ${info.isActive ? '✅ YES' : '❌ NO'}`);
      console.log(`  Reputation: ${info.reputationScore.toString()}`);
      console.log(`  Attestations: ${info.attestationCount.toString()}`);
    } catch (error) {
      console.log(`  Error: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  
  // Count valid oracles
  let validCount = 0;
  for (const oracle of oracles) {
    const isValid = await OracleStaking.isValidOracle(oracle);
    if (isValid) validCount++;
  }
  
  console.log(`\n✅ Total Valid Oracles: ${validCount}`);
  console.log(`   Minimum Required: 3`);
  
  if (validCount < 3) {
    console.log('\n❌ WARNING: Not enough active oracles!');
    console.log('   Attestation requests require at least 3 active oracles.');
  } else {
    console.log('\n✅ Sufficient oracles available for attestation requests!\n');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
