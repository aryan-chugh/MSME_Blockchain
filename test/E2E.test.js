const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("End-to-End Platform Workflow", function () {
  this.timeout(120000); // 2 minutes

  let citToken, oracleStaking, attestationRegistry, marketplace, agreementRegistry, governance;
  let deployer, oracle1, oracle2, msme1, lender1, lender2;

  before(async function () {
    [deployer, oracle1, oracle2, msme1, lender1, lender2] = await ethers.getSigners();
    
    console.log("\n🚀 Starting E2E Test...\n");
    
    // Deploy all contracts
    console.log("📝 Deploying contracts...");
    
    const CIToken = await ethers.getContractFactory("CIToken");
    citToken = await CIToken.deploy(10_000_000);
    await citToken.waitForDeployment();
    console.log("  ✅ CIT Token deployed");
    
    const OracleStaking = await ethers.getContractFactory("OracleStaking");
    oracleStaking = await OracleStaking.deploy(
      await citToken.getAddress(),
      deployer.address
    );
    await oracleStaking.waitForDeployment();
    console.log("  ✅ Oracle Staking deployed");
    
    const AttestationRegistry = await ethers.getContractFactory("AttestationRegistry");
    attestationRegistry = await AttestationRegistry.deploy(
      await oracleStaking.getAddress(),
      deployer.address // governance
    );
    await attestationRegistry.waitForDeployment();
    console.log("  ✅ Attestation Registry deployed");
    
    const LoanMarketplace = await ethers.getContractFactory("LoanMarketplace");
    marketplace = await LoanMarketplace.deploy(deployer.address); // governance
    await marketplace.waitForDeployment();
    console.log("  ✅ Loan Marketplace deployed");
    
    const LoanAgreementRegistry = await ethers.getContractFactory("LoanAgreementRegistry");
    agreementRegistry = await LoanAgreementRegistry.deploy(
      await marketplace.getAddress(),
      deployer.address // governance
    );
    await agreementRegistry.waitForDeployment();
    console.log("  ✅ Loan Agreement Registry deployed");
    
    const PlatformGovernance = await ethers.getContractFactory("PlatformGovernance");
    governance = await PlatformGovernance.deploy(deployer.address, deployer.address);
    await governance.waitForDeployment();
    console.log("  ✅ Platform Governance deployed\n");
  });

  it("Complete workflow: Onboarding → Attestation → Loan → Repayment", async function () {
    
    console.log("👥 Phase 1: Oracle Onboarding");
    console.log("  → Oracle 1 staking tokens...");
    const stakeAmount = ethers.parseEther("100000");
    await citToken.transfer(oracle1.address, stakeAmount);
    await citToken.connect(oracle1).approve(await oracleStaking.getAddress(), stakeAmount);
    await oracleStaking.connect(oracle1).stake(stakeAmount);
    expect((await oracleStaking.oracles(oracle1.address)).isActive).to.be.true;
    console.log("  ✅ Oracle 1 active");
    
    console.log("  → Oracle 2 staking tokens...");
    await citToken.transfer(oracle2.address, stakeAmount);
    await citToken.connect(oracle2).approve(await oracleStaking.getAddress(), stakeAmount);
    await oracleStaking.connect(oracle2).stake(stakeAmount);
    console.log("  ✅ Oracle 2 active\n");
    
    console.log("🏢 Phase 2: MSME Identity & Profile Building");
    console.log("  → Creating MSMEIdentity contract...");
    const MSMEIdentity = await ethers.getContractFactory("MSMEIdentity");
    const msmeIdentity = await MSMEIdentity.deploy(msme1.address);
    await msmeIdentity.waitForDeployment();
    console.log("  ✅ MSME Identity created:", await msmeIdentity.getAddress());
    
    console.log("  → Approving Attestation Registry...");
    await msmeIdentity.connect(msme1).approveOperator(await attestationRegistry.getAddress());
    console.log("  ✅ Operator approved\n");
    
    console.log("📋 Phase 3: Register Attestation Schemas");
    
    // Register GST schema first
    console.log("  → Registering GST schema...");
    const gstSchema = ethers.keccak256(ethers.toUtf8Bytes("gst-revenue"));
    await attestationRegistry.registerSchema(
      gstSchema,
      "GST Revenue Verification",
      "Verifies GST number and annual revenue from GSTN"
    );
    console.log("  ✅ GST schema registered");
    
    // Register Bank schema
    console.log("  → Registering Bank schema...");
    const bankSchema = ethers.keccak256(ethers.toUtf8Bytes("bank-statement"));
    await attestationRegistry.registerSchema(
      bankSchema,
      "Bank Statement Verification",
      "Verifies average balance and transaction history"
    );
    console.log("  ✅ Bank schema registered\n");
    
    console.log("📋 Phase 4: Oracle Attestations");
    
    // GST Attestation
    console.log("  → Oracle 1 submitting GST attestation...");
    const gstData = ethers.AbiCoder.defaultAbiCoder().encode(
      ["string", "uint256", "string"],
      ["27AABCU9603R1ZM", 5000000, "Active"]
    );
    await attestationRegistry.connect(oracle1).submitAttestation(
      msme1.address,
      gstSchema,
      gstData,
      31536000
    );
    console.log("  ✅ GST attestation submitted");
    
    // Bank Statement Attestation
    console.log("  → Oracle 2 submitting bank attestation...");
    const bankData = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "uint256"],
      [500000, 90] // Average balance, period in days
    );
    await attestationRegistry.connect(oracle2).submitAttestation(
      msme1.address,
      bankSchema,
      bankData,
      31536000
    );
    console.log("  ✅ Bank attestation submitted\n");
    
    console.log("💼 Phase 5: Loan Request Creation");
    const loanAmount = ethers.parseEther("100");
    console.log("  → MSME requesting loan:", ethers.formatEther(loanAmount), "ETH equivalent");
    const createTx = await marketplace.connect(msme1).createLoanRequest(
      loanAmount,
      12,
      "Working capital for inventory expansion",
      7200, // 2 hours commit
      3600  // 1 hour reveal
    );
    await createTx.wait();
    const requestId = 1;
    console.log("  ✅ Loan request created (ID:", requestId, ")\n");
    
    console.log("💰 Phase 6: Lender Bidding");
    
    // Calculate required deposit (5% of loan amount)
    const deposit = (loanAmount * BigInt(5)) / BigInt(100); // 5 ETH
    
    // Lender 1 commits bid at 12%
    console.log("  → Lender 1 committing bid (12% rate)...");
    const rate1 = 1200;
    const nonce1 = ethers.randomBytes(32);
    const commitment1 = ethers.keccak256(
      ethers.solidityPacked(["uint256", "bytes32", "address"], [rate1, nonce1, lender1.address])
    );
    await marketplace.connect(lender1).commitBid(requestId, commitment1, { value: deposit });
    console.log("  ✅ Bid committed");
    
    // Lender 2 commits bid at 10%
    console.log("  → Lender 2 committing bid (10% rate)...");
    const rate2 = 1000;
    const nonce2 = ethers.randomBytes(32);
    const commitment2 = ethers.keccak256(
      ethers.solidityPacked(["uint256", "bytes32", "address"], [rate2, nonce2, lender2.address])
    );
    await marketplace.connect(lender2).commitBid(requestId, commitment2, { value: deposit });
    console.log("  ✅ Bid committed\n");
    
    console.log("⏰ Fast-forwarding time to reveal period...");
    await time.increase(7201);
    
    console.log("🎭 Phase 7: Bid Reveal");
    console.log("  → Lender 1 revealing bid...");
    await marketplace.connect(lender1).revealBid(requestId, rate1, nonce1);
    console.log("  ✅ Revealed: 12%");
    
    console.log("  → Lender 2 revealing bid...");
    await marketplace.connect(lender2).revealBid(requestId, rate2, nonce2);
    console.log("  ✅ Revealed: 10%\n");
    
    console.log("⏰ Fast-forwarding time past reveal deadline...");
    await time.increase(3601);
    
    console.log("🏆 Phase 8: Winner Selection");
    console.log("  → MSME selecting winner...");
    const selectTx = await marketplace.connect(msme1).selectWinner(requestId);
    await selectTx.wait();
    
    const winner = await marketplace.getWinner(requestId);
    const winningRate = await marketplace.winningRates(requestId);
    
    expect(winner).to.equal(lender2.address);
    expect(winningRate).to.equal(1000);
    console.log("  ✅ Winner selected:", winner);
    console.log("  ✅ Winning rate: 10%\n");
    
    console.log("📜 Phase 9: Agreement Registration");
    console.log("  → Lender registering legal agreement...");
    const agreementHash = ethers.keccak256(
      ethers.toUtf8Bytes("Legal loan agreement between MSME and Lender")
    );
    const regTx = await agreementRegistry.connect(lender2).registerAgreement(
      requestId,
      agreementHash
    );
    await regTx.wait();
    console.log("  ✅ Agreement registered\n");
    
    const recordId = 1;
    const record = await agreementRegistry.records(recordId);
    expect(record.msme).to.equal(msme1.address);
    expect(record.lender).to.equal(lender2.address);
    
    console.log("💵 Phase 10: Loan Disbursement");
    console.log("  → Lender recording loan disbursement...");
    const expectedRepaymentDate = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60); // 1 year from now
    await agreementRegistry.connect(lender2).recordDisbursement(recordId, expectedRepaymentDate);
    console.log("  ✅ Loan disbursed\n");
    
    console.log("✅ Phase 11: Loan Repayment");
    console.log("  → Lender marking loan as repaid...");
    await agreementRegistry.connect(lender2).updateStatus(recordId, 1); // Status.Repaid
    console.log("  ✅ Loan repaid\n");
    
    console.log("📊 Phase 12: Reputation Update");
    const reputation = await agreementRegistry.reputations(msme1.address);
    console.log("  MSME Reputation:");
    console.log("    - Total Loans:", reputation.totalLoans.toString());
    console.log("    - Repaid Loans:", reputation.repaidLoans.toString());
    console.log("    - Reputation Score:", reputation.reputationScore.toString());
    
    expect(reputation.totalLoans).to.equal(1);
    expect(reputation.repaidLoans).to.equal(1);
    console.log("  ✅ Reputation updated successfully\n");
    
    console.log("🎉 E2E Test Completed Successfully!\n");
  });

  it("Should handle loan default scenario", async function () {
    console.log("\n⚠️  Testing Default Scenario...\n");
    
    // Create another loan request
    const loanAmount = ethers.parseEther("50");
    await marketplace.connect(msme1).createLoanRequest(
      loanAmount,
      6,
      "Equipment purchase",
      3600,
      3600
    );
    
    const requestId = 2;
    
    // Calculate required deposit (5% of 50 ETH = 2.5 ETH)
    const deposit2 = (loanAmount * BigInt(5)) / BigInt(100);
    
    // Lender commits and reveals bid
    const rate = 1500;
    const nonce = ethers.randomBytes(32);
    const commitment = ethers.keccak256(
      ethers.solidityPacked(["uint256", "bytes32", "address"], [rate, nonce, lender1.address])
    );
    
    await marketplace.connect(lender1).commitBid(requestId, commitment, { value: deposit2 });
    await time.increase(3601);
    await marketplace.connect(lender1).revealBid(requestId, rate, nonce);
    await time.increase(3601);
    await marketplace.connect(msme1).selectWinner(requestId);
    
    // Register and disburse
    const agreementHash = ethers.keccak256(ethers.toUtf8Bytes("Agreement 2"));
    await agreementRegistry.connect(lender1).registerAgreement(requestId, agreementHash);
    const expectedRepaymentDate = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60); // 1 year
    await agreementRegistry.connect(lender1).recordDisbursement(2, expectedRepaymentDate);
    
    // Mark as defaulted
    await agreementRegistry.connect(lender1).updateStatus(2, 2); // Status.Defaulted
    
    const reputation = await agreementRegistry.reputations(msme1.address);
    expect(reputation.defaultedLoans).to.equal(1);
    
    console.log("  ✅ Default scenario handled correctly\n");
  });
});
