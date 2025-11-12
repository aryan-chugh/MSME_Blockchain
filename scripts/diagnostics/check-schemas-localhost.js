const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('\n📋 Checking Registered Schemas (Localhost)...\n');

  // Connect to localhost
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

  // Get latest deployment
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  const localhostDeployment = path.join(deploymentsDir, 'localhost.json');
  
  if (!fs.existsSync(localhostDeployment)) {
    console.log('❌ No localhost.json found. Run deployment first:');
    console.log('   npm run deploy\n');
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(localhostDeployment, 'utf8'));

  const attestationRegistryAddress = deployment.contracts.AttestationRegistry;
  console.log('AttestationRegistry:', attestationRegistryAddress, '\n');

  // Create contract instance
  const AttestationRegistry = new ethers.Contract(
    attestationRegistryAddress,
    [
      "function schemas(bytes32) view returns (string name, string description, bool active, uint256 createdAt)"
    ],
    provider
  );

  // Check the exact schemas we registered (matching deploy.js and register-schemas-localhost.js)
  const schemasToCheck = [
    { id: "gst-revenue", name: "GST Revenue Verification" },
    { id: "bank-statements", name: "Bank Statement Verification" },
    { id: "kyc-basic", name: "KYC Basic Verification" },
    { id: "credit-score", name: "Credit Score" }
  ];

  console.log('='.repeat(70));

  let activeCount = 0;

  for (const schema of schemasToCheck) {
    const schemaId = ethers.keccak256(ethers.toUtf8Bytes(schema.id));
    
    try {
      const schemaInfo = await AttestationRegistry.schemas(schemaId);
      
      if (schemaInfo.active) {
        console.log(`✅ ACTIVE: ${schemaInfo.name}`);
        console.log(`   String ID: ${schema.id}`);
        console.log(`   Hash: ${schemaId}`);
        console.log(`   Description: ${schemaInfo.description}`);
        console.log(`   Created: ${new Date(Number(schemaInfo.createdAt) * 1000).toLocaleString()}`);
        console.log();
        activeCount++;
      } else {
        console.log(`❌ INACTIVE: ${schema.name} (ID: ${schema.id})`);
        console.log();
      }
    } catch (error) {
      console.log(`❌ ERROR checking ${schema.name}: ${error.message}`);
      console.log();
    }
  }

  console.log('='.repeat(70));
  console.log(`\nTotal Active Schemas: ${activeCount} / ${schemasToCheck.length}\n`);

  if (activeCount > 0) {
    console.log('✅ Schemas are registered! You can now create attestation requests.\n');
  } else {
    console.log('⚠️  No schemas found. Run: node scripts/register-schemas-localhost.js\n');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
