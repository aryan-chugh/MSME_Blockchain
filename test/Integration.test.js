const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("Full Integration Test", function () {
  async function deployAllContractsFixture() {
    const [deployer, oracle1, msme, lender] = await ethers.getSigners();
    
    // Deploy CIT Token
    const CIToken = await ethers.getContractFactory("CIToken");
    const citToken = await CIToken.deploy(10_000_000);
    await citToken.waitForDeployment();
    
    // Deploy Oracle Staking
    const OracleStaking = await ethers.getContractFactory("OracleStaking");
    const oracleStaking = await OracleStaking.deploy(
      await citToken.getAddress(),
      deployer.address
    );
    await oracleStaking.waitForDeployment();
    
    // Deploy Attestation Registry
    const AttestationRegistry = await ethers.getContractFactory("AttestationRegistry");
    const attestationRegistry = await AttestationRegistry.deploy(
      await oracleStaking.getAddress(),
      deployer.address // governance
    );
    await attestationRegistry.waitForDeployment();
    
    // Deploy Marketplace
    const LoanMarketplace = await ethers.getContractFactory("LoanMarketplace");
    const marketplace = await LoanMarketplace.deploy(deployer.address); // governance
    await marketplace.waitForDeployment();
    
    // Deploy Agreement Registry
    const LoanAgreementRegistry = await ethers.getContractFactory("LoanAgreementRegistry");
    const agreementRegistry = await LoanAgreementRegistry.deploy(
      await marketplace.getAddress(),
      deployer.address // governance
    );
    await agreementRegistry.waitForDeployment();
    
    return {
      citToken,
      oracleStaking,
      attestationRegistry,
      marketplace,
      agreementRegistry,
      deployer,
      oracle1,
      msme,
      lender
    };
  }

  it("Complete workflow: Oracle staking → Attestation → Loan request → Matching", async function () {
    const {
      citToken,
      oracleStaking,
      attestationRegistry,
      marketplace,
      agreementRegistry,
      oracle1,
      msme,
      lender
    } = await loadFixture(deployAllContractsFixture);
    
    // Step 1: Oracle stakes tokens
    const stakeAmount = ethers.parseEther("50000");
    await citToken.transfer(oracle1.address, stakeAmount);
    await citToken.connect(oracle1).approve(await oracleStaking.getAddress(), stakeAmount);
    await oracleStaking.connect(oracle1).stake(stakeAmount);
    
    // Verify oracle is staked
    const oracleInfo = await oracleStaking.oracles(oracle1.address);
    expect(oracleInfo.stakedAmount).to.equal(stakeAmount);
    expect(oracleInfo.isActive).to.be.true;
    
    // Step 2: Register schema
    const schemaId = ethers.keccak256(ethers.toUtf8Bytes("gst-revenue"));
    await attestationRegistry.registerSchema(
      schemaId,
      "GST Revenue",
      "GST revenue verification"
    );
    
    // Step 3: Oracle submits attestation for MSME
    const data = ethers.AbiCoder.defaultAbiCoder().encode(
      ["string", "uint256"],
      ["27AABCU9603R1ZM", 5000000]
    );
    
    await attestationRegistry.connect(oracle1).submitAttestation(
      msme.address,
      schemaId,
      data,
      31536000 // 1 year validity
    );
    
    // Verify attestation
    const attestations = await attestationRegistry.getAttestations(msme.address);
    expect(attestations.length).to.equal(1);
    expect(attestations[0].issuer).to.equal(oracle1.address);
    
    // Step 4: MSME creates loan request
    const amount = ethers.parseEther("100");
    const tx = await marketplace.connect(msme).createLoanRequest(
      amount,
      12,
      "Working capital",
      3600,
      3600
    );
    
    await tx.wait();
    const requestId = 1;
    
    const request = await marketplace.getLoanRequest(requestId);
    expect(request.msme).to.equal(msme.address);
    expect(request.amount).to.equal(amount);
    
    // Step 5: Lender commits bid
    const rateBP = 1200; // 12%
    const nonce = ethers.randomBytes(32);
    const commitment = ethers.keccak256(
      ethers.solidityPacked(["uint256", "bytes32", "address"], [rateBP, nonce, lender.address])
    );
    
    // Calculate required deposit (5% of 100 ETH)
    const deposit = (amount * BigInt(5)) / BigInt(100);
    await marketplace.connect(lender).commitBid(requestId, commitment, { value: deposit });
    
    // Fast forward time past commit deadline
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine");
    
    // Step 6: Lender reveals bid
    await marketplace.connect(lender).revealBid(requestId, rateBP, nonce);
    
    // Fast forward time past reveal deadline
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine");
    
    // Step 7: MSME selects winner
    await marketplace.connect(msme).selectWinner(requestId);
    
    const winner = await marketplace.getWinner(requestId);
    expect(winner).to.equal(lender.address);
    
    // Step 8: Lender registers agreement
    const agreementHash = ethers.keccak256(ethers.toUtf8Bytes("Legal agreement content"));
    await agreementRegistry.connect(lender).registerAgreement(requestId, agreementHash);
    
    const record = await agreementRegistry.records(1);
    expect(record.lender).to.equal(lender.address);
    expect(record.msme).to.equal(msme.address);
    expect(record.agreementHash).to.equal(agreementHash);
  });

  it("Should handle multiple concurrent loan requests", async function () {
    const { marketplace, msme } = await loadFixture(deployAllContractsFixture);
    
    // Create 5 loan requests
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        marketplace.connect(msme).createLoanRequest(
          ethers.parseEther("100"),
          12,
          `Purpose ${i}`,
          3600,
          3600
        )
      );
    }
    
    await Promise.all(promises);
    
    // Verify all requests were created
    const counter = await marketplace.requestCounter();
    expect(counter).to.equal(5);
  });

  it("Should handle multiple attestations from different oracles", async function () {
    const { citToken, oracleStaking, attestationRegistry, deployer, msme } = 
      await loadFixture(deployAllContractsFixture);
    
    // Get additional signers for oracles
    const signers = await ethers.getSigners();
    const oracle1 = signers[1];
    const oracle2 = signers[2];
    const oracle3 = signers[3];
    
    const stakeAmount = ethers.parseEther("50000");
    
    // Stake for 3 oracles
    for (const oracle of [oracle1, oracle2, oracle3]) {
      await citToken.transfer(oracle.address, stakeAmount);
      await citToken.connect(oracle).approve(await oracleStaking.getAddress(), stakeAmount);
      await oracleStaking.connect(oracle).stake(stakeAmount);
    }
    
    // Register schemas first
    const schemas = [
      ethers.keccak256(ethers.toUtf8Bytes("gst-revenue")),
      ethers.keccak256(ethers.toUtf8Bytes("bank-statement")),
      ethers.keccak256(ethers.toUtf8Bytes("kyc-verification"))
    ];
    
    await attestationRegistry.registerSchema(schemas[0], "GST Revenue", "GST revenue verification");
    await attestationRegistry.registerSchema(schemas[1], "Bank Statement", "Bank statement verification");
    await attestationRegistry.registerSchema(schemas[2], "KYC Verification", "KYC verification");
    
    // Each oracle submits different attestation
    for (let i = 0; i < 3; i++) {
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["string", "uint256"],
        [`Data ${i}`, 1000 * (i + 1)]
      );
      
      await attestationRegistry.connect([oracle1, oracle2, oracle3][i]).submitAttestation(
        msme.address,
        schemas[i],
        data,
        31536000
      );
    }
    
    // Verify all attestations were recorded
    const attestations = await attestationRegistry.getAttestations(msme.address);
    expect(attestations.length).to.equal(3);
  });
});
