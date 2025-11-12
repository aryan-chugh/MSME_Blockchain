const fs = require('fs');
const path = require('path');

console.log('🔄 Updating Frontend ABIs...\n');

// Read the compiled ABIs
const attestationArtifact = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../artifacts/contracts/AttestationRegistryV3_1.sol/AttestationRegistryV3_1.json'),
    'utf8'
  )
);

const oracleStakingArtifact = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../artifacts/contracts/OracleStakingV3.sol/OracleStakingV3.json'),
    'utf8'
  )
);

const loanMarketplaceArtifact = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../artifacts/contracts/LoanMarketplace.sol/LoanMarketplace.json'),
    'utf8'
  )
);

const loanAgreementArtifact = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../artifacts/contracts/LoanAgreementRegistry.sol/LoanAgreementRegistry.json'),
    'utf8'
  )
);

const attestationAbi = attestationArtifact.abi;
const oracleStakingAbi = oracleStakingArtifact.abi;
const loanMarketplaceAbi = loanMarketplaceArtifact.abi;
const loanAgreementAbi = loanAgreementArtifact.abi;

// Helper function to replace ABI in contracts.js
function replaceAbi(contractsJs, contractName, newAbi) {
  // Look for the pattern: ContractName: [ ... ],
  const abiStartPattern = new RegExp(`${contractName}:\\s*\\[`);
  const abiStartMatch = contractsJs.match(abiStartPattern);

  if (!abiStartMatch) {
    console.error(`❌ Could not find ${contractName} ABI in contracts.js`);
    process.exit(1);
  }

  const startIndex = abiStartMatch.index;
  let depth = 0;
  let endIndex = startIndex;
  let inArray = false;

  // Find the end of the ABI array
  for (let i = startIndex; i < contractsJs.length; i++) {
    const char = contractsJs[i];
    
    if (char === '[') {
      depth++;
      inArray = true;
    } else if (char === ']') {
      depth--;
      if (depth === 0 && inArray) {
        endIndex = i + 1;
        // Skip to the comma after the array
        while (contractsJs[endIndex] === ' ' || contractsJs[endIndex] === '\n') {
          endIndex++;
        }
        if (contractsJs[endIndex] === ',') {
          endIndex++;
        }
        break;
      }
    }
  }

  if (endIndex === startIndex) {
    console.error(`❌ Could not find the end of ${contractName} ABI`);
    process.exit(1);
  }

  // Replace the old ABI with the new one
  const before = contractsJs.substring(0, startIndex);
  const after = contractsJs.substring(endIndex);
  const newAbiString = `${contractName}: ${JSON.stringify(newAbi, null, 2)},`;

  return before + newAbiString + after;
}

// Read the current contracts.js
const contractsJsPath = path.join(__dirname, '../frontend/src/utils/contracts.js');
let contractsJs = fs.readFileSync(contractsJsPath, 'utf8');

console.log('📦 Updating AttestationRegistry ABI...');
// Find and replace the AttestationRegistry ABI
contractsJs = replaceAbi(contractsJs, 'AttestationRegistry', attestationAbi);

console.log('📦 Updating OracleStaking ABI...');
// Find and replace the OracleStaking ABI
contractsJs = replaceAbi(contractsJs, 'OracleStaking', oracleStakingAbi);

console.log('📦 Updating LoanMarketplace ABI...');
// Find and replace the LoanMarketplace ABI
contractsJs = replaceAbi(contractsJs, 'LoanMarketplace', loanMarketplaceAbi);

console.log('📦 Updating LoanAgreementRegistry ABI...');
// Find and replace the LoanAgreementRegistry ABI
contractsJs = replaceAbi(contractsJs, 'LoanAgreementRegistry', loanAgreementAbi);

// Write back to file
fs.writeFileSync(contractsJsPath, contractsJs);

console.log('\n✅ ABIs updated successfully!');
console.log(`\n📊 AttestationRegistry ABI:`);
console.log(`   Functions: ${attestationAbi.filter(item => item.type === 'function').length}`);
console.log(`   Events: ${attestationAbi.filter(item => item.type === 'event').length}`);
console.log(`   getOracleCommitment: ${attestationAbi.some(item => item.type === 'function' && item.name === 'getOracleCommitment') ? '✅' : '❌'}`);
console.log(`   getConsensusResult: ${attestationAbi.some(item => item.type === 'function' && item.name === 'getConsensusResult') ? '✅' : '❌'}`);

console.log(`\n📊 LoanMarketplace ABI:`);
console.log(`   Functions: ${loanMarketplaceAbi.filter(item => item.type === 'function').length}`);
console.log(`   Events: ${loanMarketplaceAbi.filter(item => item.type === 'event').length}`);
console.log(`   getRevealedBids: ${loanMarketplaceAbi.some(item => item.type === 'function' && item.name === 'getRevealedBids') ? '✅' : '❌'}`);
console.log(`   bidDeposits mapping: ${loanMarketplaceAbi.some(item => item.type === 'function' && item.name === 'bidDeposits') ? '✅' : '❌'}`);

console.log(`\n📊 LoanAgreementRegistry ABI:`);
console.log(`   Functions: ${loanAgreementAbi.filter(item => item.type === 'function').length}`);
console.log(`   Events: ${loanAgreementAbi.filter(item => item.type === 'event').length}`);
console.log(`   registerAgreement: ${loanAgreementAbi.some(item => item.type === 'function' && item.name === 'registerAgreement') ? '✅' : '❌'}`);

console.log(`\n📊 OracleStaking ABI:`);
console.log(`   Functions: ${oracleStakingAbi.filter(item => item.type === 'function').length}`);
console.log(`   Events: ${oracleStakingAbi.filter(item => item.type === 'event').length}`);
console.log(`   OracleSlashed event: ${oracleStakingAbi.some(item => item.type === 'event' && item.name === 'OracleSlashed') ? '✅' : '❌'}`);

console.log('\n✨ Frontend ABI update complete!');
