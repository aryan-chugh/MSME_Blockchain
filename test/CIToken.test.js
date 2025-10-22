const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("CIToken", function () {
  async function deployCITokenFixture() {
    const [owner, user1, user2] = await ethers.getSigners();

    const initialSupply = 1000000; // 1 million tokens
    const CIToken = await ethers.getContractFactory("CIToken");
    const token = await CIToken.deploy(initialSupply);

    return { token, owner, user1, user2, initialSupply };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { token, owner } = await loadFixture(deployCITokenFixture);
      expect(await token.owner()).to.equal(owner.address);
    });

    it("Should assign the total supply of tokens to the owner", async function () {
      const { token, owner, initialSupply } = await loadFixture(deployCITokenFixture);
      const ownerBalance = await token.balanceOf(owner.address);
      expect(await token.totalSupply()).to.equal(ownerBalance);
      expect(ownerBalance).to.equal(ethers.parseUnits(initialSupply.toString(), 18));
    });

    it("Should have correct token name and symbol", async function () {
      const { token } = await loadFixture(deployCITokenFixture);
      expect(await token.name()).to.equal("Credit Intelligence Token");
      expect(await token.symbol()).to.equal("CIT");
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint new tokens", async function () {
      const { token, owner, user1 } = await loadFixture(deployCITokenFixture);
      const mintAmount = ethers.parseUnits("1000", 18);
      
      await expect(token.mint(user1.address, mintAmount))
        .to.emit(token, "TokensMinted")
        .withArgs(user1.address, mintAmount);
      
      expect(await token.balanceOf(user1.address)).to.equal(mintAmount);
    });

    it("Should not allow non-owner to mint", async function () {
      const { token, user1 } = await loadFixture(deployCITokenFixture);
      const mintAmount = ethers.parseUnits("1000", 18);
      
      await expect(
        token.connect(user1).mint(user1.address, mintAmount)
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });
  });

  describe("Burning", function () {
    it("Should allow users to burn their own tokens", async function () {
      const { token, owner } = await loadFixture(deployCITokenFixture);
      const burnAmount = ethers.parseUnits("100", 18);
      const initialBalance = await token.balanceOf(owner.address);
      
      await expect(token.burn(burnAmount))
        .to.emit(token, "TokensBurned")
        .withArgs(owner.address, burnAmount);
      
      expect(await token.balanceOf(owner.address)).to.equal(initialBalance - burnAmount);
    });

    it("Should allow burning from approved address", async function () {
      const { token, owner, user1 } = await loadFixture(deployCITokenFixture);
      const transferAmount = ethers.parseUnits("1000", 18);
      const burnAmount = ethers.parseUnits("500", 18);
      
      // Transfer tokens to user1
      await token.transfer(user1.address, transferAmount);
      
      // User1 approves owner to burn tokens
      await token.connect(user1).approve(owner.address, burnAmount);
      
      // Owner burns tokens from user1
      await expect(token.burnFrom(user1.address, burnAmount))
        .to.emit(token, "TokensBurned")
        .withArgs(user1.address, burnAmount);
      
      expect(await token.balanceOf(user1.address)).to.equal(transferAmount - burnAmount);
    });
  });

  describe("Transfers", function () {
    it("Should transfer tokens between accounts", async function () {
      const { token, owner, user1, user2 } = await loadFixture(deployCITokenFixture);
      const transferAmount = ethers.parseUnits("100", 18);
      
      // Transfer from owner to user1
      await expect(token.transfer(user1.address, transferAmount))
        .to.changeTokenBalances(token, [owner, user1], [-transferAmount, transferAmount]);
      
      // Transfer from user1 to user2
      await expect(token.connect(user1).transfer(user2.address, transferAmount))
        .to.changeTokenBalances(token, [user1, user2], [-transferAmount, transferAmount]);
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const { token, owner, user1 } = await loadFixture(deployCITokenFixture);
      const initialOwnerBalance = await token.balanceOf(owner.address);
      
      await expect(
        token.connect(user1).transfer(owner.address, 1)
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
      
      expect(await token.balanceOf(owner.address)).to.equal(initialOwnerBalance);
    });
  });
});
