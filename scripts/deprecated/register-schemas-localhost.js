const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('📋 Registering Attestation Schemas...\n');

  // Connect to localhost
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const wallet = new ethers.Wallet(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // Account #0 (deployer)
    provider
  );

  // Get latest deployment
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  const files = fs.readdirSync(deploymentsDir)
    .filter(f => f.startsWith('deployment-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.error('❌ No deployment files found!');
    process.exit(1);
  }

  const deployment = JSON.parse(
    fs.readFileSync(path.join(deploymentsDir, files[0]), 'utf8')
  );

  const attestationRegistryAddress = deployment.contracts.AttestationRegistry;
  console.log('AttestationRegistry:', attestationRegistryAddress);

  // Create contract instance
  const AttestationRegistry = new ethers.Contract(
    attestationRegistryAddress,
    [
      "function registerSchema(bytes32 schemaId, string calldata name, string calldata description) external",
      "function getSchema(bytes32 schemaId) external view returns (tuple(string name, string description, bool active, uint256 createdAt))"
    ],
    wallet
  );

  // Define schemas (matching deploy.js)
  const schemas = [
    {
      id: ethers.keccak256(ethers.toUtf8Bytes("gst-revenue")),
      name: "GST Revenue Verification",
      description: "Verified revenue data from GST returns"
    },
    {
      id: ethers.keccak256(ethers.toUtf8Bytes("bank-statements")),
      name: "Bank Statement Verification",
      description: "Verified bank account statements and cash flow"
    },
    {
      id: ethers.keccak256(ethers.toUtf8Bytes("kyc-basic")),
      name: "KYC Basic Verification",
      description: "Basic KYC verification including identity documents"
    },
    {
      id: ethers.keccak256(ethers.toUtf8Bytes("credit-score")),
      name: "Credit Score",
      description: "Credit bureau score attestation"
    }
  ];

  console.log('\n🔄 Registering schemas...\n');

  for (const schema of schemas) {
    try {
      console.log(`Registering: ${schema.name}`);
      const tx = await AttestationRegistry.registerSchema(
        schema.id,
        schema.name,
        schema.description
      );
      
      const receipt = await tx.wait();
      console.log(`  ✅ Registered! Tx: ${receipt.hash}\n`);
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}\n`);
    }
  }

  console.log('\n✅ Schema registration complete!');
  console.log('\n💡 Verify with: node scripts/check-schemas.js\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
