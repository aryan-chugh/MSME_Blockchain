// Test Platform - Interactive Testing Script
const { ethers } = require("hardhat");

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("🎯 BLOCKCHAIN MSME PLATFORM - TESTING");
  console.log("=".repeat(60));

  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("\n📍 Your Account:", signer.address);
  
  const balance = await ethers.provider.getBalance(signer.address);
  console.log("💰 ETH Balance:", ethers.formatEther(balance), "ETH");

  // Contract addresses from deployment
  const addresses = {
    citToken: "0xeFFC0B02F576DaE67ab88934075E3448bB2B5ECe",
    oracleStaking: "0x8CE33491BFadeee6589131fB53855ac41c3Fb021",
    attestationRegistry: "0xafC385E1DED3f464E1346C48Af5c230924c08e82",
    loanMarketplace: "0x3EBFE1570cb333D46D6249D056db88eada7483F3",
    loanAgreementRegistry: "0xDD748157911E1FE05b7D42cAb96cb4cdD8EB97E0",
    platformGovernance: "0xE8570F418E71b1378184d9D6AF52dBd44DA75A84"
  };

  console.log("\n" + "=".repeat(60));
  console.log("STEP 1: Health Check");
  console.log("=".repeat(60));

  // Connect to contracts
  const citToken = await ethers.getContractAt("CIToken", addresses.citToken);
  const governance = await ethers.getContractAt("PlatformGovernance", addresses.platformGovernance);
  const oracleStaking = await ethers.getContractAt("OracleStaking", addresses.oracleStaking);

  console.log("\n✅ CIT Token:", await citToken.name());
  console.log("   Symbol:", await citToken.symbol());
  console.log("   Total Supply:", ethers.formatEther(await citToken.totalSupply()));

  console.log("\n✅ Platform Governance Connected");
  console.log("   Owner:", await governance.owner());

  console.log("\n" + "=".repeat(60));
  console.log("STEP 2: Create MSME Identity");
  console.log("=".repeat(60));

  console.log("\n⏳ Deploying MSME Identity contract...");
  
  // Use staticCall to get the return value first
  const identityAddress = await governance.deployMSMEIdentity.staticCall(signer.address);
  console.log("🔍 Identity will be deployed at:", identityAddress);
  
  // Now send the actual transaction
  const tx1 = await governance.deployMSMEIdentity(signer.address);
  console.log("📤 Transaction sent:", tx1.hash);
  console.log("⏳ Waiting for confirmation (15-20 seconds)...");
  
  const receipt1 = await tx1.wait();
  console.log("✅ Transaction confirmed!");

  console.log("\n🎉 MSME Identity Created!");
  console.log("📍 Address:", identityAddress);
  console.log("🔗 View on Etherscan:");
  console.log("   https://sepolia.etherscan.io/address/" + identityAddress);

  console.log("\n" + "=".repeat(60));
  console.log("STEP 3: Add Business Data");
  console.log("=".repeat(60));

  const MSMEIdentity = await ethers.getContractFactory("MSMEIdentity");
  const identity = MSMEIdentity.attach(identityAddress);

  console.log("\n⏳ Adding business name...");
  const nameKey = ethers.keccak256(ethers.toUtf8Bytes("businessName"));
  const nameValue = ethers.toUtf8Bytes("Test Company Pvt Ltd");
  const tx2 = await identity.setData(nameKey, nameValue);
  await tx2.wait();
  console.log("✅ Business name added");

  console.log("⏳ Adding GST number...");
  const gstKey = ethers.keccak256(ethers.toUtf8Bytes("gstNumber"));
  const gstValue = ethers.toUtf8Bytes("27AABCU9603R1ZV");
  const tx3 = await identity.setData(gstKey, gstValue);
  await tx3.wait();
  console.log("✅ GST number added");

  console.log("⏳ Adding industry...");
  const industryKey = ethers.keccak256(ethers.toUtf8Bytes("industry"));
  const industryValue = ethers.toUtf8Bytes("Manufacturing");
  const tx4 = await identity.setData(industryKey, industryValue);
  await tx4.wait();
  console.log("✅ Industry added");

  // Verify data
  console.log("\n📊 Verifying stored data:");
  const storedName = await identity.getData(nameKey);
  const storedGst = await identity.getData(gstKey);
  const storedIndustry = await identity.getData(industryKey);

  console.log("   Business Name:", ethers.toUtf8String(storedName));
  console.log("   GST Number:", ethers.toUtf8String(storedGst));
  console.log("   Industry:", ethers.toUtf8String(storedIndustry));

  console.log("\n" + "=".repeat(60));
  console.log("STEP 4: Register as Oracle");
  console.log("=".repeat(60));

  console.log("\n⏳ Minting CIT tokens...");
  const mintAmount = ethers.parseEther("100000");
  const tx5 = await citToken.mint(signer.address, mintAmount);
  await tx5.wait();
  console.log("✅ Minted 100,000 CIT tokens");

  const citBalance = await citToken.balanceOf(signer.address);
  console.log("   Your CIT balance:", ethers.formatEther(citBalance));

  console.log("\n⏳ Approving staking contract...");
  const stakeAmount = ethers.parseEther("50000");
  const tx6 = await citToken.approve(addresses.oracleStaking, stakeAmount);
  await tx6.wait();
  console.log("✅ Approved");

  console.log("⏳ Staking tokens to become oracle...");
  const tx7 = await oracleStaking.stake(stakeAmount);
  await tx7.wait();
  console.log("✅ Staked 50,000 CIT tokens");

  const oracleInfo = await oracleStaking.getOracleInfo(signer.address);
  const tier = await oracleStaking.getOracleTier(signer.address);
  
  console.log("\n🎉 Oracle Registration Complete!");
  console.log("   Staked Amount:", ethers.formatEther(oracleInfo.stakedAmount), "CIT");
  console.log("   Tier:", tier.toString());

  console.log("\n" + "=".repeat(60));
  console.log("STEP 5: Submit Attestation");
  console.log("=".repeat(60));

  const attestationRegistry = await ethers.getContractAt("AttestationRegistry", addresses.attestationRegistry);

  console.log("\n⏳ Preparing attestation data...");
  const schemaId = ethers.keccak256(ethers.toUtf8Bytes("gst-revenue"));
  const attestationData = ethers.AbiCoder.defaultAbiCoder().encode(
    ['string', 'string', 'uint256', 'string', 'bool'],
    [
      '27AABCU9603R1ZV',
      'Test Company Pvt Ltd',
      ethers.parseEther("50000000"),
      'Active',
      true
    ]
  );

  console.log("⏳ Submitting attestation...");
  const validityPeriod = 365 * 24 * 60 * 60;
  const tx8 = await attestationRegistry.submitAttestation(
    identityAddress,
    schemaId,
    attestationData,
    validityPeriod
  );
  await tx8.wait();
  console.log("✅ Attestation submitted");

  const attestations = await attestationRegistry.getAttestations(identityAddress);
  console.log("   Total attestations for MSME:", attestations.length);

  console.log("\n" + "=".repeat(60));
  console.log("STEP 6: Create Loan Request");
  console.log("=".repeat(60));

  const loanMarketplace = await ethers.getContractAt("LoanMarketplace", addresses.loanMarketplace);

  console.log("\n⏳ Creating loan request...");
  const tx9 = await loanMarketplace.createLoanRequest(
    ethers.parseEther("1"),        // 1 ETH loan amount
    12,                            // 12 months tenure
    "Working capital for expansion", // purpose
    24 * 60 * 60,                  // 24 hour commit period
    24 * 60 * 60                   // 24 hour reveal period
  );
  console.log("📤 Transaction sent:", tx9.hash);
  await tx9.wait();
  console.log("✅ Loan request created");

  // Get request ID from event
  const receipt9 = await ethers.provider.getTransactionReceipt(tx9.hash);
  let requestId = 1n;
  for (const log of receipt9.logs) {
    try {
      const parsed = loanMarketplace.interface.parseLog(log);
      if (parsed.name === "LoanRequestCreated") {
        requestId = parsed.args.requestId;
        break;
      }
    } catch (e) {}
  }

  console.log("   Loan Request ID:", requestId.toString());

  try {
    const request = await loanMarketplace.getLoanRequest(requestId);
    console.log("\n📊 Loan Request Details:");
    console.log("   Borrower:", request.borrower);
    console.log("   Amount:", ethers.formatEther(request.amount), "ETH");
    console.log("   Tenure:", request.tenure, "months");
    console.log("   Purpose:", request.purpose);
  } catch (e) {
    console.log("\n📊 Loan request created successfully!");
    console.log("   View on marketplace contract");
  }

  console.log("\n" + "=".repeat(60));
  console.log("🎉 ALL TESTS COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(60));

  console.log("\n📊 SUMMARY:");
  console.log("   ✅ Health check passed");
  console.log("   ✅ MSME Identity created:", identityAddress);
  console.log("   ✅ Business data added (3 fields)");
  console.log("   ✅ Oracle registered (Tier", tier.toString() + ")");
  console.log("   ✅ Attestation submitted");
  console.log("   ✅ Loan request created (ID:", requestId.toString() + ")");

  const finalBalance = await ethers.provider.getBalance(signer.address);
  console.log("\n💰 Final ETH Balance:", ethers.formatEther(finalBalance), "ETH");
  console.log("💎 Final CIT Balance:", ethers.formatEther(await citToken.balanceOf(signer.address)));

  console.log("\n🔗 Important Addresses:");
  console.log("   Your Identity:", identityAddress);
  console.log("   Etherscan:", "https://sepolia.etherscan.io/address/" + identityAddress);

  console.log("\n🎯 Next Steps:");
  console.log("   1. Test frontend: cd frontend && npm start");
  console.log("   2. View on Etherscan: Check all transactions");
  console.log("   3. Test loan bidding (see NEXT_STEPS.md)");

  console.log("\n" + "=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });
