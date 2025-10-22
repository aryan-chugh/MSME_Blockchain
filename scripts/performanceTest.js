const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting Performance Test\n");
  
  const [deployer, ...accounts] = await ethers.getSigners();
  
  console.log("📝 Deploying contracts...");
  
  // Deploy CIT Token
  const CIToken = await ethers.getContractFactory("CIToken");
  const citToken = await CIToken.deploy(10_000_000);
  await citToken.waitForDeployment();
  console.log("  ✅ CIT Token deployed");
  
  // Deploy Oracle Staking
  const OracleStaking = await ethers.getContractFactory("OracleStaking");
  const oracleStaking = await OracleStaking.deploy(
    await citToken.getAddress(),
    deployer.address
  );
  await oracleStaking.waitForDeployment();
  console.log("  ✅ Oracle Staking deployed");
  
  // Deploy Attestation Registry
  const AttestationRegistry = await ethers.getContractFactory("AttestationRegistry");
  const attestationRegistry = await AttestationRegistry.deploy(
    await oracleStaking.getAddress()
  );
  await attestationRegistry.waitForDeployment();
  console.log("  ✅ Attestation Registry deployed");
  
  // Deploy Marketplace
  const LoanMarketplace = await ethers.getContractFactory("LoanMarketplace");
  const marketplace = await LoanMarketplace.deploy();
  await marketplace.waitForDeployment();
  console.log("  ✅ Loan Marketplace deployed\n");
  
  // Test 1: Loan Request Creation Performance
  console.log("📊 Test 1: Loan Request Creation Throughput");
  const iterations = 50;
  const msme = accounts[0];
  
  const startTime1 = Date.now();
  
  for (let i = 0; i < iterations; i++) {
    const tx = await marketplace.connect(msme).createLoanRequest(
      ethers.parseEther("100"),
      12,
      `Working capital ${i}`,
      3600,
      3600
    );
    await tx.wait();
    
    if ((i + 1) % 10 === 0) {
      console.log(`  Processed ${i + 1}/${iterations} requests`);
    }
  }
  
  const endTime1 = Date.now();
  const totalTime1 = (endTime1 - startTime1) / 1000;
  const tps1 = iterations / totalTime1;
  
  console.log(`\n  ✅ Results:`);
  console.log(`     Total Requests: ${iterations}`);
  console.log(`     Total Time: ${totalTime1.toFixed(2)}s`);
  console.log(`     Requests/Second: ${tps1.toFixed(2)}`);
  console.log(`     Average Time/Request: ${(totalTime1 / iterations * 1000).toFixed(2)}ms\n`);
  
  // Test 2: Oracle Staking Performance
  console.log("📊 Test 2: Oracle Staking Throughput");
  const oracleCount = 20;
  const stakeAmount = ethers.parseEther("50000");
  
  const startTime2 = Date.now();
  
  for (let i = 0; i < oracleCount; i++) {
    const oracle = accounts[i + 1];
    await citToken.transfer(oracle.address, stakeAmount);
    await citToken.connect(oracle).approve(await oracleStaking.getAddress(), stakeAmount);
    const tx = await oracleStaking.connect(oracle).stake(stakeAmount);
    await tx.wait();
    
    if ((i + 1) % 5 === 0) {
      console.log(`  Staked ${i + 1}/${oracleCount} oracles`);
    }
  }
  
  const endTime2 = Date.now();
  const totalTime2 = (endTime2 - startTime2) / 1000;
  
  console.log(`\n  ✅ Results:`);
  console.log(`     Total Oracles: ${oracleCount}`);
  console.log(`     Total Time: ${totalTime2.toFixed(2)}s`);
  console.log(`     Stakes/Second: ${(oracleCount / totalTime2).toFixed(2)}`);
  console.log(`     Average Time/Stake: ${(totalTime2 / oracleCount * 1000).toFixed(2)}ms\n`);
  
  // Test 3: Attestation Submission Performance
  console.log("📊 Test 3: Attestation Submission Throughput");
  const attestationCount = 30;
  const oracle = accounts[1];
  const targetMsme = accounts[0].address;
  
  const startTime3 = Date.now();
  
  for (let i = 0; i < attestationCount; i++) {
    const schemaId = ethers.keccak256(ethers.toUtf8Bytes(`schema-${i}`));
    const data = ethers.AbiCoder.defaultAbiCoder().encode(
      ["string", "uint256"],
      [`Data ${i}`, 1000 * (i + 1)]
    );
    
    const tx = await attestationRegistry.connect(oracle).submitAttestation(
      targetMsme,
      schemaId,
      data,
      31536000
    );
    await tx.wait();
    
    if ((i + 1) % 10 === 0) {
      console.log(`  Submitted ${i + 1}/${attestationCount} attestations`);
    }
  }
  
  const endTime3 = Date.now();
  const totalTime3 = (endTime3 - startTime3) / 1000;
  
  console.log(`\n  ✅ Results:`);
  console.log(`     Total Attestations: ${attestationCount}`);
  console.log(`     Total Time: ${totalTime3.toFixed(2)}s`);
  console.log(`     Attestations/Second: ${(attestationCount / totalTime3).toFixed(2)}`);
  console.log(`     Average Time/Attestation: ${(totalTime3 / attestationCount * 1000).toFixed(2)}ms\n`);
  
  // Test 4: Bid Commitment Performance
  console.log("📊 Test 4: Bid Commitment Throughput");
  const requestId = 1;
  const lenderCount = 15;
  
  const startTime4 = Date.now();
  
  for (let i = 0; i < lenderCount; i++) {
    const lender = accounts[i + 5];
    const rate = 1000 + (i * 50);
    const nonce = ethers.randomBytes(32);
    const commitment = ethers.keccak256(
      ethers.solidityPacked(["uint256", "bytes32"], [rate, nonce])
    );
    
    const tx = await marketplace.connect(lender).commitBid(requestId, commitment);
    await tx.wait();
    
    if ((i + 1) % 5 === 0) {
      console.log(`  Committed ${i + 1}/${lenderCount} bids`);
    }
  }
  
  const endTime4 = Date.now();
  const totalTime4 = (endTime4 - startTime4) / 1000;
  
  console.log(`\n  ✅ Results:`);
  console.log(`     Total Bids: ${lenderCount}`);
  console.log(`     Total Time: ${totalTime4.toFixed(2)}s`);
  console.log(`     Bids/Second: ${(lenderCount / totalTime4).toFixed(2)}`);
  console.log(`     Average Time/Bid: ${(totalTime4 / lenderCount * 1000).toFixed(2)}ms\n`);
  
  // Summary
  console.log("=" .repeat(60));
  console.log("📈 PERFORMANCE TEST SUMMARY");
  console.log("=" .repeat(60));
  console.log(`Loan Requests:       ${tps1.toFixed(2)} tx/s`);
  console.log(`Oracle Staking:      ${(oracleCount / totalTime2).toFixed(2)} tx/s`);
  console.log(`Attestations:        ${(attestationCount / totalTime3).toFixed(2)} tx/s`);
  console.log(`Bid Commitments:     ${(lenderCount / totalTime4).toFixed(2)} tx/s`);
  console.log("=" .repeat(60));
  console.log("\n✅ Performance Test Completed!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
