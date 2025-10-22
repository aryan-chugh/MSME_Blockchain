const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("LoanMarketplace", function () {
  async function deployMarketplaceFixture() {
    const [owner, msme, lender1, lender2, lender3] = await ethers.getSigners();

    const LoanMarketplace = await ethers.getContractFactory("LoanMarketplace");
    const marketplace = await LoanMarketplace.deploy(owner.address); // governance

    return { marketplace, owner, msme, lender1, lender2, lender3 };
  }

  describe("Loan Request Creation", function () {
    it("Should create a loan request successfully", async function () {
      const { marketplace, msme } = await loadFixture(deployMarketplaceFixture);
      
      const amount = ethers.parseEther("100");
      const tenure = 12;
      const purpose = "Working capital";
      const commitPeriod = 3600; // 1 hour
      const revealPeriod = 3600; // 1 hour
      
      await expect(marketplace.connect(msme).createLoanRequest(
        amount, tenure, purpose, commitPeriod, revealPeriod
      )).to.emit(marketplace, "LoanRequestCreated");
      
      const request = await marketplace.getLoanRequest(1);
      expect(request.msme).to.equal(msme.address);
      expect(request.amount).to.equal(amount);
      expect(request.tenureMonths).to.equal(tenure);
      expect(request.purpose).to.equal(purpose);
      expect(request.status).to.equal(0); // Status.Open
    });

    it("Should revert with zero amount", async function () {
      const { marketplace, msme } = await loadFixture(deployMarketplaceFixture);
      
      await expect(
        marketplace.connect(msme).createLoanRequest(0, 12, "purpose", 3600, 3600)
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should revert with invalid tenure", async function () {
      const { marketplace, msme } = await loadFixture(deployMarketplaceFixture);
      
      await expect(
        marketplace.connect(msme).createLoanRequest(
          ethers.parseEther("100"), 0, "purpose", 3600, 3600
        )
      ).to.be.revertedWith("Invalid tenure");
    });
  });

  describe("Bid Commitment", function () {
    it("Should allow lender to commit a bid", async function () {
      const { marketplace, msme, lender1 } = await loadFixture(deployMarketplaceFixture);
      
      // Create loan request
      await marketplace.connect(msme).createLoanRequest(
        ethers.parseEther("100"), 12, "Working capital", 3600, 3600
      );
      
      const rateBP = 1200; // 12%
      const nonce = ethers.encodeBytes32String("random123");
      const commitment = await marketplace.generateCommitment(rateBP, nonce, lender1.address);
      
      // Calculate required deposit (5% of 100 ETH = 5 ETH)
      const deposit = ethers.parseEther("5");
      
      await expect(marketplace.connect(lender1).commitBid(1, commitment, { value: deposit }))
        .to.emit(marketplace, "BidCommitted")
        .withArgs(1, lender1.address, commitment);
    });

    it("Should not allow committing after deadline", async function () {
      const { marketplace, msme, lender1 } = await loadFixture(deployMarketplaceFixture);
      
      await marketplace.connect(msme).createLoanRequest(
        ethers.parseEther("100"), 12, "Working capital", 3600, 3600
      );
      
      // Fast forward past commit deadline
      await time.increase(3601);
      
      const commitment = ethers.keccak256(ethers.toUtf8Bytes("test"));
      
      await expect(
        marketplace.connect(lender1).commitBid(1, commitment)
      ).to.be.revertedWith("Commit period ended");
    });

    it("Should not allow double commitment", async function () {
      const { marketplace, msme, lender1 } = await loadFixture(deployMarketplaceFixture);
      
      await marketplace.connect(msme).createLoanRequest(
        ethers.parseEther("100"), 12, "Working capital", 3600, 3600
      );
      
      const rateBP = 1200;
      const nonce = ethers.encodeBytes32String("random123");
      const commitment = await marketplace.generateCommitment(rateBP, nonce, lender1.address);
      const deposit = ethers.parseEther("5");
      
      await marketplace.connect(lender1).commitBid(1, commitment, { value: deposit });
      
      await expect(
        marketplace.connect(lender1).commitBid(1, commitment, { value: deposit })
      ).to.be.revertedWith("Already committed");
    });
  });

  describe("Bid Reveal", function () {
    async function setupBidsFixture() {
      const { marketplace, msme, lender1, lender2, lender3 } = await loadFixture(deployMarketplaceFixture);
      
      await marketplace.connect(msme).createLoanRequest(
        ethers.parseEther("100"), 12, "Working capital", 3600, 3600
      );
      
      const deposit = ethers.parseEther("5"); // 5% of 100 ETH
      
      // Lender 1: 12%
      const rate1 = 1200;
      const nonce1 = ethers.encodeBytes32String("nonce1");
      const commitment1 = await marketplace.generateCommitment(rate1, nonce1, lender1.address);
      await marketplace.connect(lender1).commitBid(1, commitment1, { value: deposit });
      
      // Lender 2: 10% (best)
      const rate2 = 1000;
      const nonce2 = ethers.encodeBytes32String("nonce2");
      const commitment2 = await marketplace.generateCommitment(rate2, nonce2, lender2.address);
      await marketplace.connect(lender2).commitBid(1, commitment2, { value: deposit });
      
      // Lender 3: 15%
      const rate3 = 1500;
      const nonce3 = ethers.encodeBytes32String("nonce3");
      const commitment3 = await marketplace.generateCommitment(rate3, nonce3, lender3.address);
      await marketplace.connect(lender3).commitBid(1, commitment3, { value: deposit });
      
      // Fast forward past commit deadline
      await time.increase(3601);
      
      return { marketplace, msme, lender1, lender2, lender3, rate1, rate2, rate3, nonce1, nonce2, nonce3 };
    }

    it("Should allow revealing a committed bid", async function () {
      const { marketplace, lender1, rate1, nonce1 } = await loadFixture(setupBidsFixture);
      
      await expect(marketplace.connect(lender1).revealBid(1, rate1, nonce1))
        .to.emit(marketplace, "BidRevealed")
        .withArgs(1, lender1.address, rate1);
    });

    it("Should not allow revealing before commit period ends", async function () {
      const { marketplace, msme, lender1 } = await loadFixture(deployMarketplaceFixture);
      
      await marketplace.connect(msme).createLoanRequest(
        ethers.parseEther("100"), 12, "Working capital", 7200, 3600
      );
      
      const rate = 1200;
      const nonce = ethers.encodeBytes32String("nonce");
      const commitment = await marketplace.generateCommitment(rate, nonce, lender1.address);
      const deposit = ethers.parseEther("5");
      await marketplace.connect(lender1).commitBid(1, commitment, { value: deposit });
      
      await expect(
        marketplace.connect(lender1).revealBid(1, rate, nonce)
      ).to.be.revertedWith("Still in commit phase");
    });

    it("Should not allow revealing with wrong parameters", async function () {
      const { marketplace, lender1, rate1, nonce1 } = await loadFixture(setupBidsFixture);
      
      const wrongRate = 999;
      
      await expect(
        marketplace.connect(lender1).revealBid(1, wrongRate, nonce1)
      ).to.be.revertedWith("Invalid reveal");
    });

    it("Should not allow revealing after reveal period", async function () {
      const { marketplace, lender1, rate1, nonce1 } = await loadFixture(setupBidsFixture);
      
      // Fast forward past reveal deadline
      await time.increase(3601);
      
      await expect(
        marketplace.connect(lender1).revealBid(1, rate1, nonce1)
      ).to.be.revertedWith("Reveal period ended");
    });
  });

  describe("Winner Selection", function () {
    async function setupRevealedBidsFixture() {
      const fixture = await setupBidsFixture();
      const { marketplace, lender1, lender2, lender3, rate1, rate2, rate3, nonce1, nonce2, nonce3 } = fixture;
      
      // Reveal all bids
      await marketplace.connect(lender1).revealBid(1, rate1, nonce1);
      await marketplace.connect(lender2).revealBid(1, rate2, nonce2);
      await marketplace.connect(lender3).revealBid(1, rate3, nonce3);
      
      // Fast forward past reveal deadline
      await time.increase(3601);
      
      return fixture;
    }

    it("Should select the lowest rate bid as winner", async function () {
      const { marketplace, msme, lender2, rate2 } = await loadFixture(setupRevealedBidsFixture);
      
      await expect(marketplace.connect(msme).selectWinner(1))
        .to.emit(marketplace, "LoanMatched")
        .withArgs(1, msme.address, lender2.address, rate2);
      
      expect(await marketplace.getWinner(1)).to.equal(lender2.address);
      expect(await marketplace.getWinningRate(1)).to.equal(rate2);
    });

    it("Should not allow non-MSME to select winner", async function () {
      const { marketplace, lender1 } = await loadFixture(setupRevealedBidsFixture);
      
      await expect(
        marketplace.connect(lender1).selectWinner(1)
      ).to.be.revertedWith("Only MSME can select winner");
    });

    it("Should not allow selecting winner before reveal period ends", async function () {
      const fixture = await setupBidsFixture();
      const { marketplace, msme, lender1, rate1, nonce1 } = fixture;
      
      await marketplace.connect(lender1).revealBid(1, rate1, nonce1);
      
      await expect(
        marketplace.connect(msme).selectWinner(1)
      ).to.be.revertedWith("Reveal period not ended");
    });
  });

  describe("Request Management", function () {
    it("Should allow MSME to cancel request", async function () {
      const { marketplace, msme } = await loadFixture(deployMarketplaceFixture);
      
      await marketplace.connect(msme).createLoanRequest(
        ethers.parseEther("100"), 12, "Working capital", 3600, 3600
      );
      
      await expect(marketplace.connect(msme).cancelLoanRequest(1))
        .to.emit(marketplace, "LoanRequestCancelled")
        .withArgs(1);
      
      const request = await marketplace.getLoanRequest(1);
      expect(request.status).to.equal(4); // Status.Cancelled
    });

    it("Should not allow non-MSME to cancel", async function () {
      const { marketplace, msme, lender1 } = await loadFixture(deployMarketplaceFixture);
      
      await marketplace.connect(msme).createLoanRequest(
        ethers.parseEther("100"), 12, "Working capital", 3600, 3600
      );
      
      await expect(
        marketplace.connect(lender1).cancelLoanRequest(1)
      ).to.be.revertedWith("Only MSME can cancel");
    });

    it("Should get active requests", async function () {
      const { marketplace, msme } = await loadFixture(deployMarketplaceFixture);
      
      await marketplace.connect(msme).createLoanRequest(
        ethers.parseEther("100"), 12, "WC", 3600, 3600
      );
      await marketplace.connect(msme).createLoanRequest(
        ethers.parseEther("200"), 24, "Expansion", 3600, 3600
      );
      
      const activeRequests = await marketplace.getActiveRequests();
      expect(activeRequests.length).to.equal(2);
    });

    it("Should get requests by MSME", async function () {
      const { marketplace, msme, owner } = await loadFixture(deployMarketplaceFixture);
      
      await marketplace.connect(msme).createLoanRequest(
        ethers.parseEther("100"), 12, "WC", 3600, 3600
      );
      await marketplace.connect(owner).createLoanRequest(
        ethers.parseEther("200"), 24, "Expansion", 3600, 3600
      );
      await marketplace.connect(msme).createLoanRequest(
        ethers.parseEther("150"), 18, "Equipment", 3600, 3600
      );
      
      const msmeRequests = await marketplace.getRequestsByMSME(msme.address);
      expect(msmeRequests.length).to.equal(2);
    });
  });

  async function setupBidsFixture() {
    const { marketplace, msme, lender1, lender2, lender3 } = await loadFixture(deployMarketplaceFixture);
    
    await marketplace.connect(msme).createLoanRequest(
      ethers.parseEther("100"), 12, "Working capital", 3600, 3600
    );
    
    const deposit = ethers.parseEther("5");
    
    const rate1 = 1200;
    const nonce1 = ethers.encodeBytes32String("nonce1");
    const commitment1 = await marketplace.generateCommitment(rate1, nonce1, lender1.address);
    await marketplace.connect(lender1).commitBid(1, commitment1, { value: deposit });
    
    const rate2 = 1000;
    const nonce2 = ethers.encodeBytes32String("nonce2");
    const commitment2 = await marketplace.generateCommitment(rate2, nonce2, lender2.address);
    await marketplace.connect(lender2).commitBid(1, commitment2, { value: deposit });
    
    const rate3 = 1500;
    const nonce3 = ethers.encodeBytes32String("nonce3");
    const commitment3 = await marketplace.generateCommitment(rate3, nonce3, lender3.address);
    await marketplace.connect(lender3).commitBid(1, commitment3, { value: deposit });
    
    await time.increase(3601);
    
    return { marketplace, msme, lender1, lender2, lender3, rate1, rate2, rate3, nonce1, nonce2, nonce3 };
  }
});
