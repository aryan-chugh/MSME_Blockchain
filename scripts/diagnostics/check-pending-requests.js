const hre = require("hardhat");

async function main() {
  console.log("\n🔍 Checking V3.1 Contract Status...\n");

  const registryAddress = "0xFD0B899Dc9f6d3184c0276c061a1fd866f20B779"; // V3.1 with Reputation
  
  const AttestationRegistry = await hre.ethers.getContractAt(
    "AttestationRegistryV3_1",
    registryAddress
  );

  // Get request counter
  const counter = await AttestationRegistry.requestCounter();
  console.log(`� Total Requests Created: ${counter}\n`);
  
  if (counter === 0n) {
    console.log("❌ No requests have been created yet!");
    console.log("\n💡 To create a test request:");
    console.log("   1. Go to MSME Dashboard (frontend)");
    console.log("   2. Create attestation request with 300 CIT fee");
    console.log("   3. This will require 3 oracles to accept");
    console.log("\n");
    return;
  }
  
  // Get details for each request
  for (let i = 1; i <= Number(counter); i++) {
    const id = i;
    const details = await AttestationRegistry.getRequestDetails(id);
    
    console.log(`📄 Request #${id}:`);
    console.log(`   MSME: ${details.msme}`);
    console.log(`   Schema: ${hre.ethers.decodeBytes32String(details.schemaId)}`);
    console.log(`   Fee: ${hre.ethers.formatUnits(details.feePaid, 18)} CIT`);
    console.log(`   Status: ${details.status} (0=Pending, 1=OraclesAssigned)`);
    console.log(`   Assigned Oracles: ${details.assignedOracles.length}/${details.requiredOracles}`);
    console.log(`   Oracles: ${details.assignedOracles.join(', ') || 'None yet'}`);
    console.log(`   Created: ${new Date(Number(details.timestamp) * 1000).toLocaleString()}`);
    console.log();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
