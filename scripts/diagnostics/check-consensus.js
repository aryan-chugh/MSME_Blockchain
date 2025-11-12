const { ethers } = require("hardhat");

async function main() {
  const attestationRegistryAddress = "0xFD0B899Dc9f6d3184c0276c061a1fd866f20B779";
  
  // Load V3.1 ABI
  const V3_1_ABI = require("../artifacts/contracts/AttestationRegistryV3_1.sol/AttestationRegistry.json");
  
  const AttestationRegistry = new ethers.Contract(
    attestationRegistryAddress,
    V3_1_ABI.abi,
    await ethers.provider
  );

  console.log("\n🔍 Checking Consensus Results for Request #4...\n");

  const requestId = 4;
  
  // Get request details
  const request = await AttestationRegistry.getRequestDetails(requestId);
  console.log("📋 Request Details:");
  console.log("   MSME:", request.msme);
  console.log("   Fee:", ethers.formatUnits(request.feePaid, 18), "CIT");
  console.log("   Status:", request.status);
  console.log("   Assigned Oracles:", request.assignedOracles);
  
  // Get consensus results
  const consensus = await AttestationRegistry.consensusResults(requestId);
  console.log("\n✅ Consensus Results:");
  console.log("   Majority Oracles:", consensus.majorityOracles);
  console.log("   Minority Oracles:", consensus.minorityOracles);
  console.log("   Majority Count:", consensus.majorityCount.toString());
  console.log("   Total Oracles:", consensus.totalOracles.toString());
  console.log("   Consensus Reached:", consensus.consensusReached);
  
  // Check each oracle's commitment
  console.log("\n🔐 Oracle Commitments:");
  for (const oracle of request.assignedOracles) {
    const commitment = await AttestationRegistry.commitments(requestId, oracle);
    console.log(`\n   Oracle: ${oracle}`);
    console.log(`   - Committed: ${commitment.hasCommitted}`);
    console.log(`   - Revealed: ${commitment.hasRevealed}`);
    if (commitment.hasRevealed) {
      // Decode attestation data
      const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
        ['bool', 'string'],
        commitment.attestationData
      );
      console.log(`   - Decision: ${decoded[0] ? 'APPROVED' : 'REJECTED'}`);
      console.log(`   - Reason: ${decoded[1]}`);
    }
  }
  
  // Calculate expected earnings
  if (consensus.consensusReached && consensus.majorityOracles.length > 0) {
    const totalFee = Number(ethers.formatUnits(request.feePaid, 18));
    const oracleFee = (totalFee * 0.9) / consensus.majorityOracles.length;
    console.log("\n💰 Fee Distribution:");
    console.log(`   Total Fee: ${totalFee} CIT`);
    console.log(`   Oracle Share (90%): ${totalFee * 0.9} CIT`);
    console.log(`   Per Oracle: ${oracleFee} CIT`);
    console.log(`   Platform Fee (10%): ${totalFee * 0.1} CIT`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
