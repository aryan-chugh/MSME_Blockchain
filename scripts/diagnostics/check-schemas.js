// Check which schemas are registered
const hre = require("hardhat");

async function main() {
  console.log("\n📋 Checking Registered Schemas...\n");
  
  const deployment = require('../deployments/localhost.json');
  const attestationRegistryAddress = deployment.contracts.AttestationRegistry;
  
  const AttestationRegistry = await hre.ethers.getContractAt(
    "AttestationRegistryV3_1",
    attestationRegistryAddress
  );
  
  // Common schemas
  const commonSchemas = [
    { id: "gst-revenue", name: "GST Revenue" },
    { id: "bank-statement", name: "Bank Statement" },
    { id: "kyc", name: "KYC Verification" },
    { id: "credit-score", name: "Credit Score" },
    { id: "business-license", name: "Business License" },
    { id: "tax-returns", name: "Tax Returns" }
  ];
  
  console.log("Checking schemas...\n");
  console.log("=".repeat(70));
  
  let activeCount = 0;
  let activeSchemas = [];
  
  for (const schema of commonSchemas) {
    const schemaId = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(schema.id));
    
    try {
      const schemaInfo = await AttestationRegistry.schemas(schemaId);
      
      if (schemaInfo.active) {
        console.log(`✅ ACTIVE: ${schema.name}`);
        console.log(`   ID: ${schema.id}`);
        console.log(`   Hash: ${schemaId}`);
        console.log(`   Description: ${schemaInfo.description}`);
        console.log();
        activeCount++;
        activeSchemas.push({ ...schema, schemaId, info: schemaInfo });
      } else {
        console.log(`❌ INACTIVE: ${schema.name} (ID: ${schema.id})`);
        console.log();
      }
    } catch (error) {
      console.log(`❌ NOT FOUND: ${schema.name} (ID: ${schema.id})`);
      console.log();
    }
  }
  
  console.log("=".repeat(70));
  console.log(`\nTotal Active Schemas: ${activeCount}\n`);
  
  if (activeCount === 0) {
    console.log("⚠️  WARNING: No schemas are registered!");
    console.log("\n💡 To register schemas, run:");
    console.log("   npx hardhat run scripts/register-schemas.js --network localhost\n");
  } else {
    console.log("✅ Use one of the active schema IDs above in your frontend\n");
    console.log("Example schema IDs for frontend:");
    activeSchemas.forEach((s, i) => {
      console.log(`   ${i + 1}. "${s.id}"`);
    });
    console.log();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
