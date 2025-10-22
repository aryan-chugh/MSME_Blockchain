const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('📋 Registering Attestation Schemas on Sepolia...\n');

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, '../deployments/sepolia.json');
  if (!fs.existsSync(deploymentPath)) {
    throw new Error('Sepolia deployment file not found. Please deploy contracts first.');
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  const attestationRegistryAddress = deployment.contracts.AttestationRegistry;

  console.log('AttestationRegistry:', attestationRegistryAddress);

  // Get contract instance
  const AttestationRegistry = await ethers.getContractAt('AttestationRegistry', attestationRegistryAddress);

  // Define common schemas
  const schemas = [
    {
      name: 'GST Revenue',
      description: 'GST returns and revenue verification for MSMEs'
    },
    {
      name: 'Bank Statements',
      description: 'Bank account statements and transaction history'
    },
    {
      name: 'KYC Verification',
      description: 'Know Your Customer identity verification documents'
    },
    {
      name: 'Credit Score',
      description: 'Credit bureau scores and financial health reports'
    },
    {
      name: 'Business License',
      description: 'Business registration and licensing documents'
    },
    {
      name: 'Tax Returns',
      description: 'Income tax returns and compliance certificates'
    }
  ];

  console.log(`\n📝 Registering ${schemas.length} schemas...\n`);

  for (const schema of schemas) {
    // Generate schema ID (keccak256 of schema name)
    const schemaId = ethers.keccak256(ethers.toUtf8Bytes(schema.name));
    
    console.log(`Registering: ${schema.name}`);
    console.log(`Schema ID: ${schemaId}`);

    try {
      // Check if schema already exists
      const existingSchema = await AttestationRegistry.getSchema(schemaId);
      
      if (existingSchema.createdAt > 0) {
        console.log(`✅ Schema "${schema.name}" already registered`);
        console.log(`   Active: ${existingSchema.active}`);
        console.log(`   Created: ${new Date(Number(existingSchema.createdAt) * 1000).toLocaleString()}\n`);
        continue;
      }
    } catch (error) {
      // Schema doesn't exist, proceed with registration
    }

    try {
      // Register the schema
      const tx = await AttestationRegistry.registerSchema(
        schemaId,
        schema.name,
        schema.description
      );

      console.log(`Transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();
      
      console.log(`✅ Schema registered successfully!`);
      console.log(`   Gas used: ${receipt.gasUsed.toString()}\n`);
      
    } catch (error) {
      console.error(`❌ Error registering schema "${schema.name}":`, error.message, '\n');
    }
  }

  console.log('\n🎉 Schema registration complete!\n');

  // Display all registered schemas
  console.log('📋 Registered Schemas Summary:\n');
  for (const schema of schemas) {
    const schemaId = ethers.keccak256(ethers.toUtf8Bytes(schema.name));
    try {
      const schemaData = await AttestationRegistry.getSchema(schemaId);
      if (schemaData.createdAt > 0) {
        console.log(`✓ ${schema.name}`);
        console.log(`  ID: ${schemaId}`);
        console.log(`  Active: ${schemaData.active}`);
        console.log(`  Description: ${schemaData.description}\n`);
      }
    } catch (error) {
      console.log(`✗ ${schema.name} - Not registered\n`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
