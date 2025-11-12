const hre = require("hardhat");

async function main() {
  console.log("\n🔍 Detailed Schema Diagnostics...\n");
  
  const deployment = require('../deployments/localhost.json');
  console.log("📍 AttestationRegistry:", deployment.contracts.AttestationRegistry);
  
  try {
    const AttestationRegistry = await hre.ethers.getContractAt(
      "AttestationRegistryV3_1",
      deployment.contracts.AttestationRegistry
    );
    
    console.log("✅ Contract connected successfully\n");
    
    // Test with the first schema
    const schemaId = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("gst-revenue"));
    console.log("Testing schema: gst-revenue");
    console.log("Schema Hash:", schemaId);
    
    console.log("\nCalling schemas()...");
    const result = await AttestationRegistry.schemas(schemaId);
    console.log("Result:", result);
    console.log("Name:", result.name);
    console.log("Description:", result.description);
    console.log("Active:", result.active);
    console.log("Registered At:", result.registeredAt ? result.registeredAt.toString() : "N/A");
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error("\nFull error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
