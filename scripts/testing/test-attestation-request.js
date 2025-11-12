const hre = require("hardhat");

async function main() {
  console.log('\n🔍 Testing Attestation Request (Simulating Frontend)...\n');

  // Load deployment
  const deployment = require('../deployments/localhost.json');
  
  const ciTokenAddress = deployment.contracts.CIToken;
  const attestationRegistryAddress = deployment.contracts.AttestationRegistry;
  const msme1Address = deployment.accounts.msme1;

  console.log('Contract Addresses:');
  console.log('  CIToken:', ciTokenAddress);
  console.log('  AttestationRegistry:', attestationRegistryAddress);
  console.log('  MSME1:', msme1Address);
  console.log();

  // Get signers
  const [deployer, oracle1, oracle2, oracle3, msme1] = await hre.ethers.getSigners();
  
  console.log('Using MSME1 account:', msme1.address);
  console.log();

  // Get contract instances
  const CIToken = await hre.ethers.getContractAt('CIToken', ciTokenAddress);
  const AttestationRegistry = await hre.ethers.getContractAt('AttestationRegistryV3_1', attestationRegistryAddress);

  // Test parameters (matching frontend)
  const selectedSchema = 'gst-revenue';
  const schemaId = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(selectedSchema));
  const documentHash = 'QmTest123';
  const documentUrl = 'ipfs://QmTest123';
  const feeAmount = hre.ethers.parseEther('1000'); // 1000 CIT
  const validityPeriod = 365 * 86400; // 365 days in seconds
  const additionalData = '0x'; // empty bytes
  const forceSingleOracle = false;

  console.log('Request Parameters:');
  console.log('  Schema:', selectedSchema);
  console.log('  Schema ID:', schemaId);
  console.log('  Document Hash:', documentHash);
  console.log('  Document URL:', documentUrl);
  console.log('  Fee:', hre.ethers.formatEther(feeAmount), 'CIT');
  console.log('  Validity Period:', validityPeriod / 86400, 'days');
  console.log('  Force Single Oracle:', forceSingleOracle);
  console.log();

  try {
    // Step 1: Check schema is registered
    console.log('Step 1: Checking schema registration...');
    const schema = await AttestationRegistry.schemas(schemaId);
    console.log('  Schema Name:', schema.name);
    console.log('  Schema Active:', schema.active);
    console.log('  Schema Description:', schema.description);
    
    if (!schema.active) {
      console.log('❌ ERROR: Schema is not active!');
      return;
    }
    console.log('✅ Schema is active\n');

    // Step 2: Check CIT balance
    console.log('Step 2: Checking CIT balance...');
    const balance = await CIToken.balanceOf(msme1.address);
    console.log('  Balance:', hre.ethers.formatEther(balance), 'CIT');
    
    if (balance < feeAmount) {
      console.log('❌ ERROR: Insufficient balance!');
      return;
    }
    console.log('✅ Sufficient balance\n');

    // Step 3: Approve CIT tokens
    console.log('Step 3: Approving CIT tokens...');
    const approveTx = await CIToken.connect(msme1).approve(attestationRegistryAddress, feeAmount);
    console.log('  Transaction hash:', approveTx.hash);
    await approveTx.wait();
    console.log('✅ Approval confirmed\n');

    // Step 4: Check allowance
    console.log('Step 4: Verifying allowance...');
    const allowance = await CIToken.allowance(msme1.address, attestationRegistryAddress);
    console.log('  Allowance:', hre.ethers.formatEther(allowance), 'CIT');
    console.log('✅ Allowance set correctly\n');

    // Step 5: Try to estimate gas (this will fail if parameters are invalid)
    console.log('Step 5: Estimating gas for requestAttestation...');
    try {
      const gasEstimate = await AttestationRegistry.connect(msme1).requestAttestation.estimateGas(
        schemaId,
        documentHash,
        documentUrl,
        additionalData,
        feeAmount,
        validityPeriod,
        forceSingleOracle
      );
      console.log('  Gas estimate:', gasEstimate.toString());
      console.log('✅ Gas estimation successful\n');
    } catch (estimateError) {
      console.log('❌ Gas estimation failed!');
      console.log('Error:', estimateError.message);
      if (estimateError.data) {
        console.log('Error data:', estimateError.data);
      }
      console.log('\nThis means the transaction would revert. Trying to decode error...\n');
      
      // Try to call it as a view to get better error
      try {
        await AttestationRegistry.connect(msme1).requestAttestation.staticCall(
          schemaId,
          documentHash,
          documentUrl,
          additionalData,
          feeAmount,
          validityPeriod,
          forceSingleOracle
        );
      } catch (staticError) {
        console.log('Revert reason:', staticError.message);
      }
      return;
    }

    // Step 6: Create attestation request
    console.log('Step 6: Creating attestation request...');
    const requestTx = await AttestationRegistry.connect(msme1).requestAttestation(
      schemaId,
      documentHash,
      documentUrl,
      additionalData,
      feeAmount,
      validityPeriod,
      forceSingleOracle
    );
    
    console.log('  Transaction hash:', requestTx.hash);
    const receipt = await requestTx.wait();
    console.log('  Block:', receipt.blockNumber);
    console.log('  Gas used:', receipt.gasUsed.toString());
    
    // Find the event
    const event = receipt.logs.find(log => {
      try {
        const parsed = AttestationRegistry.interface.parseLog(log);
        return parsed && parsed.name === 'AttestationRequested';
      } catch {
        return false;
      }
    });
    
    if (event) {
      const parsed = AttestationRegistry.interface.parseLog(event);
      console.log('  Request ID:', parsed.args.requestId.toString());
      console.log('  Complexity:', parsed.args.complexity);
      console.log('  Required Oracles:', parsed.args.requiredOracles.toString());
    }
    
    console.log('\n✅ SUCCESS! Attestation request created!\n');

  } catch (error) {
    console.log('\n❌ ERROR:', error.message);
    if (error.data) {
      console.log('Error data:', error.data);
    }
    console.error('\nFull error:', error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
