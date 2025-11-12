const fs = require('fs');
const path = require('path');

console.log('\n🔄 Updating Frontend Contract Addresses...\n');

// Find the latest deployment file
const deploymentsDir = path.join(__dirname, '../deployments');
const files = fs.readdirSync(deploymentsDir)
  .filter(f => f.startsWith('deployment-') && f.endsWith('.json'))
  .sort()
  .reverse();

if (files.length === 0) {
  console.log('❌ Error: No deployment files found!');
  console.log('   Please deploy contracts first:');
  console.log('   npx hardhat run scripts/deploy.js --network localhost\n');
  process.exit(1);
}

const latestDeployment = files[0];
const deploymentPath = path.join(deploymentsDir, latestDeployment);
const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

console.log('✅ Loaded deployment from:', latestDeployment);
console.log('   Timestamp:', deployment.timestamp);
console.log('   Network:', deployment.network);
console.log('   Chain ID:', deployment.chainId, '\n');

// Read current frontend config
const frontendConfigPath = path.join(__dirname, '../frontend/src/utils/contracts.js');
let currentConfig = fs.readFileSync(frontendConfigPath, 'utf8');

// Extract contract addresses from deployment
const addresses = deployment.contracts;

console.log('📋 Contract Addresses:\n');
Object.entries(addresses).forEach(([name, address]) => {
  console.log(`   ${name}: ${address}`);
});

// Update the contract addresses section
const newAddressesSection = `export const CONTRACT_ADDRESSES = {
  CIToken: '${addresses.CIToken}',
  OracleStaking: '${addresses.OracleStaking}',
  AttestationRegistry: '${addresses.AttestationRegistry}',
  LoanMarketplace: '${addresses.LoanMarketplace}',
  LoanAgreementRegistry: '${addresses.LoanAgreementRegistry}',
  PlatformGovernance: '${addresses.PlatformGovernance}',
  MSMEIdentity: '${addresses.SampleMSMEIdentity || addresses.MSMEIdentity}'
};`;

// Update test accounts section
const newAccountsSection = `export const TEST_ACCOUNTS = {
  deployer: '${accounts.deployer}',
  oracle1: '${accounts.oracle1}',
  oracle2: '${accounts.oracle2}',
  oracle3: '${accounts.oracle3}',
  msme1: '${accounts.msme1}',
  msme2: '${accounts.msme2}',
  lender1: '${accounts.lender1}'
};`;

// Replace in config file
currentConfig = currentConfig.replace(
  /export const CONTRACT_ADDRESSES = \{[\s\S]*?\};/,
  newAddressesSection
);

currentConfig = currentConfig.replace(
  /export const TEST_ACCOUNTS = \{[\s\S]*?\};/,
  newAccountsSection
);

// Add generation comment at top
const timestamp = new Date().toISOString();
const header = `// Localhost configuration - Auto-updated
// Generated: ${timestamp}\n\n`;

currentConfig = currentConfig.replace(/^\/\/.*\n\/\/.*\n\n/, header);

// Write updated config
fs.writeFileSync(frontendConfigPath, currentConfig, 'utf8');

console.log('\n✅ Frontend configuration updated successfully!\n');
console.log('📝 Updated file:', frontendConfigPath);
console.log('\n🚀 Next steps:');
console.log('   1. If frontend is running, refresh the browser');
console.log('   2. If not running, start it:');
console.log('      cd frontend');
console.log('      npm start');
console.log('\n✨ Done!\n');
