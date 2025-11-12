const hre = require("hardhat");

async function main() {
  console.log('\n🔍 Testing CIToken Balance Function...\n');

  // Load deployment addresses
  const deployment = require('../deployments/localhost.json');
  const ciTokenAddress = deployment.contracts.CIToken;
  const msme1 = deployment.accounts.msme1;

  console.log('CIToken Address:', ciTokenAddress);
  console.log('MSME1 Address:', msme1);
  console.log();

  try {
    // Get contract instance
    const CIToken = await hre.ethers.getContractAt('CIToken', ciTokenAddress);
    
    // Test balanceOf
    console.log('📞 Calling balanceOf...');
    const balance = await CIToken.balanceOf(msme1);
    console.log('✅ Balance:', hre.ethers.formatEther(balance), 'CIT');
    
    // Test other functions
    console.log('\n📞 Calling name...');
    const name = await CIToken.name();
    console.log('✅ Name:', name);
    
    console.log('\n📞 Calling symbol...');
    const symbol = await CIToken.symbol();
    console.log('✅ Symbol:', symbol);
    
    console.log('\n📞 Calling decimals...');
    const decimals = await CIToken.decimals();
    console.log('✅ Decimals:', decimals.toString());
    
    console.log('\n✅ All CIToken functions working correctly!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
