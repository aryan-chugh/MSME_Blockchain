const hre = require("hardhat");

async function main() {
  console.log('\n🤝 Oracles Accepting Requests...\n');

  const deployment = require('../deployments/localhost.json');
  const attestationRegistryAddress = deployment.contracts.AttestationRegistry;

  const AttestationRegistry = await hre.ethers.getContractAt('AttestationRegistryV3_1', attestationRegistryAddress);

  // Get signers (oracles are accounts 1, 2, 3)
  const [deployer, oracle1, oracle2, oracle3] = await hre.ethers.getSigners();

  const oracles = [oracle1, oracle2, oracle3];
  const requestId = 2; // Request #2 (needs 3 oracles)

  console.log('Request ID:', requestId);
  console.log('Oracles:', oracles.map(o => o.address));
  console.log();

  // Each oracle accepts the request
  for (let i = 0; i < oracles.length; i++) {
    const oracle = oracles[i];
    console.log(`\n🤝 Oracle ${i + 1} (${oracle.address}) accepting request...`);
    
    try {
      const tx = await AttestationRegistry.connect(oracle).acceptRequest(requestId);
      console.log(`   Transaction: ${tx.hash}`);
      await tx.wait();
      console.log(`   ✅ Accepted!`);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n✅ All oracles attempted to accept the request!\n');
  console.log('Now checking request status...\n');

  const details = await AttestationRegistry.getRequestDetails(requestId);
  console.log(`Request #${requestId} Status:`);
  console.log(`   Assigned Oracles: ${details.assignedOracles.length}/${details.requiredOracles}`);
  console.log(`   Status: ${details.status} (1 = OraclesAssigned)`);
  console.log(`   Oracle List:`);
  details.assignedOracles.forEach((oracle, idx) => {
    console.log(`      ${idx + 1}. ${oracle}`);
  });

  if (details.assignedOracles.length >= details.requiredOracles) {
    console.log('\n🎉 Request is fully assigned! Oracles can now commit their verifications.\n');
  } else {
    console.log(`\n⚠️  Need ${Number(details.requiredOracles) - details.assignedOracles.length} more oracles to accept.\n`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
