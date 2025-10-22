const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("OracleStaking", function () {
  async function deployOracleStakingFixture() {
    const [owner, governance, oracle1, oracle2, user] = await ethers.getSigners();

    // Deploy CIT Token
    const CIToken = await ethers.getContractFactory("CIToken");
    const token = await CIToken.deploy(10000000); // 10M tokens

    // Deploy OracleStaking
    const OracleStaking = await ethers.getContractFactory("OracleStaking");
    const staking = await OracleStaking.deploy(await token.getAddress(), governance.address);

    // Transfer tokens to oracles for staking
    const minimumStake = await staking.MINIMUM_STAKE();
    await token.transfer(oracle1.address, minimumStake * 5n);
    await token.transfer(oracle2.address, minimumStake * 3n);

    return { token, staking, owner, governance, oracle1, oracle2, user, minimumStake };
  }

  describe("Deployment", function () {
    it("Should set correct governance address", async function () {
      const { staking, governance } = await loadFixture(deployOracleStakingFixture);
      expect(await staking.governance()).to.equal(governance.address);
    });

    it("Should set correct CIT token address", async function () {
      const { token, staking } = await loadFixture(deployOracleStakingFixture);
      expect(await staking.citToken()).to.equal(await token.getAddress());
    });

    it("Should have correct minimum stake", async function () {
      const { staking } = await loadFixture(deployOracleStakingFixture);
      expect(await staking.MINIMUM_STAKE()).to.equal(ethers.parseUnits("50000", 18));
    });
  });

  describe("Staking", function () {
    it("Should allow oracle to stake tokens", async function () {
      const { token, staking, oracle1, minimumStake } = await loadFixture(deployOracleStakingFixture);
      
      await token.connect(oracle1).approve(await staking.getAddress(), minimumStake);
      
      await expect(staking.connect(oracle1).stake(minimumStake))
        .to.emit(staking, "OracleRegistered")
        .withArgs(oracle1.address, minimumStake);
      
      const oracleInfo = await staking.getOracleInfo(oracle1.address);
      expect(oracleInfo.stakedAmount).to.equal(minimumStake);
      expect(oracleInfo.isActive).to.be.true;
      expect(oracleInfo.reputationScore).to.equal(100);
    });

    it("Should not allow staking below minimum", async function () {
      const { token, staking, oracle1, minimumStake } = await loadFixture(deployOracleStakingFixture);
      
      const lowAmount = minimumStake - 1n;
      await token.connect(oracle1).approve(await staking.getAddress(), lowAmount);
      
      await expect(
        staking.connect(oracle1).stake(lowAmount)
      ).to.be.revertedWith("Stake below minimum");
    });

    it("Should allow increasing stake", async function () {
      const { token, staking, oracle1, minimumStake } = await loadFixture(deployOracleStakingFixture);
      
      await token.connect(oracle1).approve(await staking.getAddress(), minimumStake * 2n);
      await staking.connect(oracle1).stake(minimumStake);
      
      await expect(staking.connect(oracle1).stake(minimumStake))
        .to.emit(staking, "StakeIncreased")
        .withArgs(oracle1.address, minimumStake, minimumStake * 2n);
      
      const oracleInfo = await staking.getOracleInfo(oracle1.address);
      expect(oracleInfo.stakedAmount).to.equal(minimumStake * 2n);
    });

    it("Should add oracle to oracle list on first stake", async function () {
      const { token, staking, oracle1, minimumStake } = await loadFixture(deployOracleStakingFixture);
      
      await token.connect(oracle1).approve(await staking.getAddress(), minimumStake);
      await staking.connect(oracle1).stake(minimumStake);
      
      const oracleList = await staking.getAllOracles();
      expect(oracleList).to.include(oracle1.address);
    });
  });

  describe("Withdrawing", function () {
    it("Should allow oracle to withdraw staked tokens", async function () {
      const { token, staking, oracle1, minimumStake } = await loadFixture(deployOracleStakingFixture);
      
      await token.connect(oracle1).approve(await staking.getAddress(), minimumStake);
      await staking.connect(oracle1).stake(minimumStake);
      
      const withdrawAmount = minimumStake / 2n;
      
      await expect(staking.connect(oracle1).withdraw(withdrawAmount))
        .to.emit(staking, "StakeWithdrawn")
        .withArgs(oracle1.address, withdrawAmount, minimumStake - withdrawAmount);
      
      const oracleInfo = await staking.getOracleInfo(oracle1.address);
      expect(oracleInfo.stakedAmount).to.equal(minimumStake - withdrawAmount);
    });

    it("Should mark oracle as inactive if below minimum after withdrawal", async function () {
      const { token, staking, oracle1, minimumStake } = await loadFixture(deployOracleStakingFixture);
      
      await token.connect(oracle1).approve(await staking.getAddress(), minimumStake);
      await staking.connect(oracle1).stake(minimumStake);
      
      await staking.connect(oracle1).withdraw(minimumStake);
      
      const oracleInfo = await staking.getOracleInfo(oracle1.address);
      expect(oracleInfo.isActive).to.be.false;
    });

    it("Should not allow withdrawing more than staked", async function () {
      const { token, staking, oracle1, minimumStake } = await loadFixture(deployOracleStakingFixture);
      
      await token.connect(oracle1).approve(await staking.getAddress(), minimumStake);
      await staking.connect(oracle1).stake(minimumStake);
      
      await expect(
        staking.connect(oracle1).withdraw(minimumStake + 1n)
      ).to.be.revertedWith("Insufficient stake");
    });
  });

  describe("Slashing", function () {
    it("Should allow governance to slash oracle", async function () {
      const { token, staking, governance, oracle1, minimumStake } = await loadFixture(deployOracleStakingFixture);
      
      await token.connect(oracle1).approve(await staking.getAddress(), minimumStake);
      await staking.connect(oracle1).stake(minimumStake);
      
      const slashAmount = minimumStake / 2n;
      const reason = "Fraudulent attestation";
      
      await expect(staking.connect(governance).slash(oracle1.address, slashAmount, reason))
        .to.emit(staking, "OracleSlashed")
        .withArgs(oracle1.address, slashAmount, reason);
      
      const oracleInfo = await staking.getOracleInfo(oracle1.address);
      expect(oracleInfo.stakedAmount).to.equal(minimumStake - slashAmount);
      expect(oracleInfo.slashCount).to.equal(1);
      expect(oracleInfo.isActive).to.be.false;
    });

    it("Should not allow non-governance to slash", async function () {
      const { token, staking, oracle1, user, minimumStake } = await loadFixture(deployOracleStakingFixture);
      
      await token.connect(oracle1).approve(await staking.getAddress(), minimumStake);
      await staking.connect(oracle1).stake(minimumStake);
      
      await expect(
        staking.connect(user).slash(oracle1.address, minimumStake / 2n, "reason")
      ).to.be.revertedWith("Only governance can call");
    });

    it("Should transfer slashed tokens to governance", async function () {
      const { token, staking, governance, oracle1, minimumStake } = await loadFixture(deployOracleStakingFixture);
      
      await token.connect(oracle1).approve(await staking.getAddress(), minimumStake);
      await staking.connect(oracle1).stake(minimumStake);
      
      const slashAmount = minimumStake / 2n;
      const initialBalance = await token.balanceOf(governance.address);
      
      await staking.connect(governance).slash(oracle1.address, slashAmount, "reason");
      
      expect(await token.balanceOf(governance.address)).to.equal(initialBalance + slashAmount);
    });
  });

  describe("Oracle Tiers", function () {
    it("Should return correct tier for oracle stake", async function () {
      const { token, staking, oracle1 } = await loadFixture(deployOracleStakingFixture);
      
      // Tier 1: 50K CIT
      const tier1 = ethers.parseUnits("50000", 18);
      await token.connect(oracle1).approve(await staking.getAddress(), tier1);
      await staking.connect(oracle1).stake(tier1);
      expect(await staking.getOracleTier(oracle1.address)).to.equal(1);
      
      // Tier 2: 200K CIT
      const tier2Additional = ethers.parseUnits("150000", 18);
      await token.transfer(oracle1.address, tier2Additional);
      await token.connect(oracle1).approve(await staking.getAddress(), tier2Additional);
      await staking.connect(oracle1).stake(tier2Additional);
      expect(await staking.getOracleTier(oracle1.address)).to.equal(2);
    });

    it("Should return tier 0 for unstaked address", async function () {
      const { staking, user } = await loadFixture(deployOracleStakingFixture);
      expect(await staking.getOracleTier(user.address)).to.equal(0);
    });
  });

  describe("Governance Transfer", function () {
    it("Should allow governance to transfer", async function () {
      const { staking, governance, user } = await loadFixture(deployOracleStakingFixture);
      
      await expect(staking.connect(governance).transferGovernance(user.address))
        .to.emit(staking, "GovernanceTransferred")
        .withArgs(governance.address, user.address);
      
      expect(await staking.governance()).to.equal(user.address);
    });

    it("Should not allow non-governance to transfer", async function () {
      const { staking, user, oracle1 } = await loadFixture(deployOracleStakingFixture);
      
      await expect(
        staking.connect(user).transferGovernance(oracle1.address)
      ).to.be.revertedWith("Only governance can call");
    });
  });

  describe("Validation", function () {
    it("Should correctly identify valid oracle", async function () {
      const { token, staking, oracle1, minimumStake } = await loadFixture(deployOracleStakingFixture);
      
      expect(await staking.isValidOracle(oracle1.address)).to.be.false;
      
      await token.connect(oracle1).approve(await staking.getAddress(), minimumStake);
      await staking.connect(oracle1).stake(minimumStake);
      
      expect(await staking.isValidOracle(oracle1.address)).to.be.true;
    });
  });
});
