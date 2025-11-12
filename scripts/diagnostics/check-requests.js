const hre = require("hardhat");

async function main() {
  console.log('\n🔍 Checking Attestation Requests...\n');

  const deployment = require('../deployments/localhost.json');
  const attestationRegistryAddress = deployment.contracts.AttestationRegistry;

  console.log('AttestationRegistry:', attestationRegistryAddress);
  console.log();

  const AttestationRegistry = await hre.ethers.getContractAt('AttestationRegistryV3_1', attestationRegistryAddress);

  // Get request counter
  const requestCounter = await AttestationRegistry.requestCounter();
  console.log(`📊 Total Requests: ${requestCounter}\n`);

  if (requestCounter == 0n) {
    console.log('❌ No requests found!\n');
    return;
  }

  console.log('='.repeat(70));

  // Get details for each request
  for (let i = 1; i <= requestCounter; i++) {
    console.log(`\n📋 Request #${i}:`);
    
    try {
      const details = await AttestationRegistry.getRequestDetails(i);
      
      const statusLabels = [
        'Pending', 'OraclesAssigned', 'Committing', 'Revealing',
        'ConsensusReached', 'NoConsensus', 'Completed', 'Rejected', 
        'Cancelled', 'Disputed'
      ];
      
      console.log(`   MSME: ${details.msme}`);
      console.log(`   Schema ID: ${details.schemaId}`);
      console.log(`   Document Hash: ${details.documentHash}`);
      console.log(`   Document URL: ${details.documentUrl}`);
      console.log(`   Fee Paid: ${hre.ethers.formatEther(details.feePaid)} CIT`);
      console.log(`   Status: ${statusLabels[details.status]} (${details.status})`);
      console.log(`   Complexity: ${details.complexity}`);
      console.log(`   Required Oracles: ${details.requiredOracles}`);
      console.log(`   Assigned Oracles: ${details.assignedOracles.length}`);
      
      if (details.assignedOracles.length > 0) {
        console.log(`   Oracle List:`);
        details.assignedOracles.forEach((oracle, idx) => {
          console.log(`      ${idx + 1}. ${oracle}`);
        });
      } else {
        console.log(`   ⚠️  No oracles assigned yet (waiting for manual acceptance)`);
      }
      
      console.log(`   Assignment Deadline: ${new Date(Number(details.assignmentDeadline) * 1000).toLocaleString()}`);
      console.log(`   Verification Deadline: ${new Date(Number(details.verificationDeadline) * 1000).toLocaleString()}`);
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n💡 Next Steps:');
  console.log('   1. Oracles need to MANUALLY ACCEPT the request');
  console.log('   2. Switch to Oracle Dashboard in frontend');
  console.log('   3. Click "Accept Assignment" button');
  console.log('   4. First 3-7 oracles (depending on complexity) to accept will be assigned\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
