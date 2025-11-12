const hre = require("hardhat");

/**
 * Quick Oracle Staking Script for V3 Testing
 * Stakes your account as an oracle so you can test attestation requests
 */

async function main() {
    console.log("🔷 Quick Oracle Staking for V3 Testing\n");
    
    const [deployer] = await hre.ethers.getSigners();
    console.log("Staking account:", deployer.address);
    
    // Contract addresses
    const citTokenAddress = "0xb9ED4a38536BB4B3CbC3e24d5761E7E84D16634d";
    const oracleStakingAddress = "0xAA3a2F385374459fDebB35f6Bea87EFd4d18dBb9";
    
    // Get contract instances
    const citToken = await hre.ethers.getContractAt("CIToken", citTokenAddress);
    const oracleStaking = await hre.ethers.getContractAt("OracleStakingV3", oracleStakingAddress);
    
    // Check current balance
    const balance = await citToken.balanceOf(deployer.address);
    console.log("CIT Balance:", hre.ethers.formatEther(balance), "CIT");
    
    if (balance === 0n) {
        console.log("\n❌ No CIT tokens! You need CIT tokens to stake as an oracle.");
        console.log("Please mint some CIT tokens first.");
        return;
    }
    
    // Check if already staked
    const oracleInfo = await oracleStaking.getOracleInfo(deployer.address);
    const currentStake = oracleInfo[0]; // stakedAmount is first element
    
    if (currentStake > 0n) {
        console.log("\n✅ Already staked:", hre.ethers.formatEther(currentStake), "CIT");
        console.log("Reputation:", oracleInfo[1].toString());
        console.log("Attestation Count:", oracleInfo[2].toString());
        console.log("Active:", oracleInfo[5]);
        
        const tier = await oracleStaking.getOracleTier(deployer.address);
        console.log("Tier:", tier.toString());
        
        console.log("\n✅ You're ready to receive attestation requests!");
        return;
    }
    
    // Stake amount (50,000 CIT minimum for Bronze tier)
    const stakeAmount = hre.ethers.parseEther("50000");
    
    if (balance < stakeAmount) {
        console.log(`\n⚠️  Insufficient balance. Need ${hre.ethers.formatEther(stakeAmount)} CIT to stake.`);
        console.log(`You have: ${hre.ethers.formatEther(balance)} CIT`);
        
        // Stake whatever we have if it's more than 10K
        if (balance >= hre.ethers.parseEther("10000")) {
            const availableStake = balance;
            console.log(`\nStaking available balance: ${hre.ethers.formatEther(availableStake)} CIT`);
            
            console.log("\nStep 1/2: Approving OracleStaking to spend CIT...");
            const approveTx = await citToken.approve(oracleStakingAddress, availableStake);
            await approveTx.wait();
            console.log("✅ Approved");
            
            console.log("\nStep 2/2: Staking as oracle...");
            const stakeTx = await oracleStaking.stake(availableStake);
            console.log("Transaction:", stakeTx.hash);
            await stakeTx.wait();
            console.log("✅ Staked successfully!");
            
            console.log("\n🎉 You are now a registered oracle!");
            console.log("Staked Amount:", hre.ethers.formatEther(availableStake), "CIT");
        } else {
            console.log("\nYou need at least 10,000 CIT to stake as an oracle.");
        }
        return;
    }
    
    console.log(`\nStaking ${hre.ethers.formatEther(stakeAmount)} CIT...`);
    
    // Step 1: Approve
    console.log("\nStep 1/2: Approving OracleStaking to spend CIT...");
    const approveTx = await citToken.approve(oracleStakingAddress, stakeAmount);
    await approveTx.wait();
    console.log("✅ Approved");
    
    // Step 2: Stake
    console.log("\nStep 2/2: Staking as oracle...");
    const stakeTx = await oracleStaking.stake(stakeAmount);
    console.log("Transaction:", stakeTx.hash);
    const receipt = await stakeTx.wait();
    console.log("✅ Staked successfully!");
    
    // Get oracle info
    const newOracleInfo = await oracleStaking.getOracleInfo(deployer.address);
    const tier = await oracleStaking.getOracleTier(deployer.address);
    
    console.log("\n" + "=".repeat(50));
    console.log("🎉 ORACLE REGISTRATION SUCCESSFUL!");
    console.log("=".repeat(50));
    console.log("Address:", deployer.address);
    console.log("Staked Amount:", hre.ethers.formatEther(newOracleInfo[0]), "CIT");
    console.log("Reputation Score:", newOracleInfo[1].toString());
    console.log("Tier:", tier.toString(), "(0=Bronze, 1=Silver, 2=Gold, 3=Platinum)");
    console.log("Active:", newOracleInfo[5]);
    console.log("=".repeat(50));
    
    console.log("\n✅ You can now receive attestation requests!");
    console.log("\nNote: For multi-oracle consensus, you need at least 3 staked oracles.");
    console.log("Currently, only 1 oracle is staked (you).");
    console.log("\nTo test multi-oracle features:");
    console.log("1. Use additional wallets to stake as oracles, OR");
    console.log("2. Use 'forceSingleOracle' option in attestation request");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
