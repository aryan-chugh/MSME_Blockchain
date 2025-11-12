// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title LoanMarketplace
 * @dev Credit discovery marketplace using sealed-bid auctions
 * MSMEs create loan requests, lenders submit sealed bids, best bid wins
 */
contract LoanMarketplace is ReentrancyGuard, Pausable {
    
    address public governance;
    
    // Loan request status
    enum Status { Open, Reveal, Matched, Expired, Cancelled }

    // Loan request structure
    struct LoanRequest {
        address msme;
        uint256 amount;
        uint16 tenureMonths;
        uint256 commitDeadline;
        uint256 revealDeadline;
        Status status;
        string purpose;
        uint256 createdAt;
    }
    
    // Revealed bid structure
    struct RevealedBid {
        address lender;
        uint256 rateBP;        // Interest rate in basis points (100 BP = 1%)
        uint256 timestamp;
        bool withdrawn;
    }
    
    // Lender profile structure
    struct LenderProfile {
        string displayName;
        string businessName;
        string lenderType;          // e.g., "Individual", "Institution", "Fund"
        uint256 yearsExperience;
        uint256 fundingCapacity;
        string preferredIndustries; // Comma-separated list
        string bio;
        uint256 createdAt;
        uint256 updatedAt;
        bool exists;
    }

    // State variables
    mapping(uint256 => LoanRequest) public requests;
    mapping(uint256 => mapping(address => bytes32)) public commitments;
    mapping(uint256 => mapping(address => bool)) public hasRevealed; // Track if lender has revealed
    mapping(uint256 => RevealedBid[]) public revealedBids;
    mapping(uint256 => address) public winningLenders;
    mapping(uint256 => uint256) public winningRates;
    
    // Bid deposit system to prevent spam and ensure commitment
    mapping(uint256 => mapping(address => uint256)) public bidDeposits;
    uint256 public constant MIN_DEPOSIT_PERCENT = 5; // 5% of loan amount required as deposit
    
    // Track committed lenders for each request
    mapping(uint256 => address[]) public committedLenders;
    
    // Lender profiles
    mapping(address => LenderProfile) public lenderProfiles;
    
    uint256 public requestCounter;
    uint256 public constant MIN_COMMIT_PERIOD = 2 minutes; // Reduced for testing (was 1 hours)
    uint256 public constant MIN_REVEAL_PERIOD = 2 minutes; // Reduced for testing (was 1 hours)
    uint256 public constant MAX_COMMIT_PERIOD = 7 days;
    
    // Events
    event LoanRequestCreated(
        uint256 indexed requestId,
        address indexed msme,
        uint256 amount,
        uint16 tenure,
        string purpose
    );
    event BidCommitted(
        uint256 indexed requestId,
        address indexed lender,
        bytes32 commitment
    );
    event BidRevealed(
        uint256 indexed requestId,
        address indexed lender,
        uint256 rateBP
    );
    event LoanMatched(
        uint256 indexed requestId,
        address indexed msme,
        address indexed winningLender,
        uint256 rateBP
    );
    event LoanRequestCancelled(uint256 indexed requestId);
    event BidWithdrawn(uint256 indexed requestId, address indexed lender);
    event BidDepositPaid(uint256 indexed requestId, address indexed lender, uint256 amount);
    event BidDepositRefunded(uint256 indexed requestId, address indexed lender, uint256 amount);
    event BidDepositSlashed(uint256 indexed requestId, address indexed lender, uint256 amount);
    event LenderProfileUpdated(address indexed lender, uint256 timestamp);

    modifier onlyGovernance() {
        require(msg.sender == governance, "Only governance can call");
        _;
    }

    constructor(address _governance) {
        require(_governance != address(0), "Invalid governance address");
        governance = _governance;
    }

    /**
     * @dev Emergency pause (governance only)
     */
    function pause() external onlyGovernance {
        _pause();
    }

    /**
     * @dev Unpause (governance only)
     */
    function unpause() external onlyGovernance {
        _unpause();
    }

    /**
     * @dev Create a new loan request
     * @param amount Loan amount requested
     * @param tenure Loan tenure in months
     * @param purpose Purpose of the loan
     * @param commitPeriod Time period for lenders to commit bids
     * @param revealPeriod Time period for lenders to reveal bids
     * @return requestId Unique identifier for the loan request
     */
    function createLoanRequest(
        uint256 amount,
        uint16 tenure,
        string calldata purpose,
        uint256 commitPeriod,
        uint256 revealPeriod
    ) external whenNotPaused returns (uint256) {
        require(amount > 0, "Amount must be greater than 0");
        require(tenure > 0 && tenure <= 360, "Invalid tenure");
        require(bytes(purpose).length > 0, "Purpose required");
        require(
            commitPeriod >= MIN_COMMIT_PERIOD && commitPeriod <= MAX_COMMIT_PERIOD,
            "Invalid commit period"
        );
        require(
            revealPeriod >= MIN_REVEAL_PERIOD && revealPeriod <= MAX_COMMIT_PERIOD,
            "Invalid reveal period"
        );
        
        uint256 requestId = ++requestCounter;
        uint256 commitDeadline = block.timestamp + commitPeriod;
        uint256 revealDeadline = commitDeadline + revealPeriod;
        
        requests[requestId] = LoanRequest({
            msme: msg.sender,
            amount: amount,
            tenureMonths: tenure,
            commitDeadline: commitDeadline,
            revealDeadline: revealDeadline,
            status: Status.Open,
            purpose: purpose,
            createdAt: block.timestamp
        });
        
        emit LoanRequestCreated(requestId, msg.sender, amount, tenure, purpose);
        
        return requestId;
    }

    /**
     * @dev Commit a sealed bid (hash of rate + nonce)
     * @param requestId ID of the loan request
     * @param commitment Hash of (rateBP, nonce, lender address)
     */
    function commitBid(uint256 requestId, bytes32 commitment) external payable whenNotPaused {
        LoanRequest storage request = requests[requestId];
        
        require(request.msme != address(0), "Request does not exist");
        require(request.status == Status.Open, "Request not open");
        require(block.timestamp <= request.commitDeadline, "Commit period ended");
        require(commitments[requestId][msg.sender] == bytes32(0), "Already committed");
        require(commitment != bytes32(0), "Invalid commitment");
        
        // Require deposit (5% of loan amount)
        uint256 requiredDeposit = (request.amount * MIN_DEPOSIT_PERCENT) / 100;
        require(msg.value >= requiredDeposit, "Insufficient bid deposit");
        
        commitments[requestId][msg.sender] = commitment;
        bidDeposits[requestId][msg.sender] = msg.value;
        committedLenders[requestId].push(msg.sender);
        
        emit BidCommitted(requestId, msg.sender, commitment);
        emit BidDepositPaid(requestId, msg.sender, msg.value);
    }

    /**
     * @dev Reveal a previously committed bid
     * @param requestId ID of the loan request
     * @param rateBP Interest rate in basis points
     * @param nonce Random nonce used in commitment
     */
    function revealBid(
        uint256 requestId,
        uint256 rateBP,
        bytes32 nonce
    ) external {
        LoanRequest storage request = requests[requestId];
        
        require(request.msme != address(0), "Request does not exist");
        require(block.timestamp > request.commitDeadline, "Still in commit phase");
        require(block.timestamp <= request.revealDeadline, "Reveal period ended");
        require(commitments[requestId][msg.sender] != bytes32(0), "No commitment found");
        require(!hasRevealed[requestId][msg.sender], "Already revealed"); // PREVENT MULTIPLE REVEALS
        
        // Verify the commitment
        bytes32 computedHash = keccak256(abi.encodePacked(rateBP, nonce, msg.sender));
        require(computedHash == commitments[requestId][msg.sender], "Invalid reveal");
        
        // Mark as revealed
        hasRevealed[requestId][msg.sender] = true;
        
        // Update status to Reveal if this is the first reveal
        if (request.status == Status.Open) {
            request.status = Status.Reveal;
        }
        
        // Store the revealed bid
        revealedBids[requestId].push(RevealedBid({
            lender: msg.sender,
            rateBP: rateBP,
            timestamp: block.timestamp,
            withdrawn: false
        }));
        
        // Refund deposit for revealing (good behavior)
        uint256 deposit = bidDeposits[requestId][msg.sender];
        if (deposit > 0) {
            bidDeposits[requestId][msg.sender] = 0;
            (bool success, ) = payable(msg.sender).call{value: deposit}("");
            require(success, "Deposit refund failed");
            emit BidDepositRefunded(requestId, msg.sender, deposit);
        }
        
        emit BidRevealed(requestId, msg.sender, rateBP);
    }

    /**
     * @dev MSME selects the winning bid (lowest rate)
     * @param requestId ID of the loan request
     */
    function selectWinner(uint256 requestId) external nonReentrant {
        LoanRequest storage request = requests[requestId];
        
        require(msg.sender == request.msme, "Only MSME can select winner");
        require(request.status == Status.Reveal, "Not in reveal phase");
        require(block.timestamp > request.revealDeadline, "Reveal period not ended");
        
        RevealedBid[] storage bids = revealedBids[requestId];
        require(bids.length > 0, "No bids revealed");
        
        // Find the lowest rate bid
        uint256 lowestRate = type(uint256).max;
        address winner = address(0);
        
        for (uint256 i = 0; i < bids.length; i++) {
            if (!bids[i].withdrawn && bids[i].rateBP < lowestRate) {
                lowestRate = bids[i].rateBP;
                winner = bids[i].lender;
            }
        }
        
        require(winner != address(0), "No valid bids");
        
        // Set the winner
        winningLenders[requestId] = winner;
        winningRates[requestId] = lowestRate;
        request.status = Status.Matched;
        
        emit LoanMatched(requestId, request.msme, winner, lowestRate);
    }

    /**
     * @dev MSME manually selects a specific bid (by lender address)
     * @param requestId ID of the loan request
     * @param selectedLender Address of the chosen lender
     */
    function selectBid(uint256 requestId, address selectedLender) external nonReentrant {
        LoanRequest storage request = requests[requestId];
        
        require(msg.sender == request.msme, "Only MSME can select bid");
        require(request.status == Status.Reveal, "Not in reveal phase");
        require(block.timestamp > request.revealDeadline, "Reveal period not ended");
        
        RevealedBid[] storage bids = revealedBids[requestId];
        require(bids.length > 0, "No bids revealed");
        
        // Find the selected lender's bid
        bool found = false;
        uint256 selectedRate = 0;
        
        for (uint256 i = 0; i < bids.length; i++) {
            if (bids[i].lender == selectedLender && !bids[i].withdrawn) {
                found = true;
                selectedRate = bids[i].rateBP;
                break;
            }
        }
        
        require(found, "Selected lender bid not found or withdrawn");
        
        // Set the winner
        winningLenders[requestId] = selectedLender;
        winningRates[requestId] = selectedRate;
        request.status = Status.Matched;
        
        emit LoanMatched(requestId, request.msme, selectedLender, selectedRate);
    }

    /**
     * @dev Cancel a loan request (only by MSME before matching)
     * @param requestId ID of the loan request
     */
    function cancelLoanRequest(uint256 requestId) external {
        LoanRequest storage request = requests[requestId];
        
        require(msg.sender == request.msme, "Only MSME can cancel");
        require(
            request.status == Status.Open || request.status == Status.Reveal,
            "Cannot cancel"
        );
        
        request.status = Status.Cancelled;
        
        emit LoanRequestCancelled(requestId);
    }

    /**
     * @dev Mark request as expired if reveal period passed with no winner
     * @param requestId ID of the loan request
     */
    function markExpired(uint256 requestId) external {
        LoanRequest storage request = requests[requestId];
        
        require(
            request.status == Status.Open || request.status == Status.Reveal,
            "Already finalized"
        );
        require(block.timestamp > request.revealDeadline, "Not yet expired");
        
        request.status = Status.Expired;
    }

    /**
     * @dev Slash deposit for committed but unrevealed bids (called after reveal period)
     * @param requestId ID of the loan request
     * @param lender Address of lender who didn't reveal
     */
    function slashUnrevealedDeposit(uint256 requestId, address lender) external {
        LoanRequest storage request = requests[requestId];
        
        require(block.timestamp > request.revealDeadline, "Reveal period not ended");
        require(commitments[requestId][lender] != bytes32(0), "No commitment found");
        
        // Check if bid was revealed
        bool wasRevealed = false;
        RevealedBid[] storage bids = revealedBids[requestId];
        for (uint256 i = 0; i < bids.length; i++) {
            if (bids[i].lender == lender) {
                wasRevealed = true;
                break;
            }
        }
        
        require(!wasRevealed, "Bid was revealed");
        
        // Slash the deposit (send to MSME as compensation)
        uint256 deposit = bidDeposits[requestId][lender];
        require(deposit > 0, "No deposit to slash");
        
        bidDeposits[requestId][lender] = 0;
        (bool success, ) = payable(request.msme).call{value: deposit}("");
        require(success, "Deposit transfer failed");
        
        emit BidDepositSlashed(requestId, lender, deposit);
    }

    /**
     * @dev Get winner of a loan request
     * @param requestId ID of the loan request
     * @return address Winner's address
     */
    function getWinner(uint256 requestId) external view returns (address) {
        require(requests[requestId].status == Status.Matched, "Loan not matched");
        return winningLenders[requestId];
    }

    /**
     * @dev Get winning rate
     * @param requestId ID of the loan request
     * @return uint256 Winning rate in basis points
     */
    function getWinningRate(uint256 requestId) external view returns (uint256) {
        require(requests[requestId].status == Status.Matched, "Loan not matched");
        return winningRates[requestId];
    }

    /**
     * @dev Get all revealed bids for a request
     * @param requestId ID of the loan request
     * @return RevealedBid[] Array of revealed bids
     */
    function getRevealedBids(uint256 requestId) external view returns (RevealedBid[] memory) {
        return revealedBids[requestId];
    }

    /**
     * @dev Get loan request details
     * @param requestId ID of the loan request
     * @return LoanRequest struct
     */
    function getLoanRequest(uint256 requestId) external view returns (LoanRequest memory) {
        return requests[requestId];
    }

    /**
     * @dev Get all loan requests by an MSME
     * @param msme MSME address
     * @return uint256[] Array of request IDs
     */
    function getRequestsByMSME(address msme) external view returns (uint256[] memory) {
        uint256 count = 0;
        
        // Count matching requests
        for (uint256 i = 1; i <= requestCounter; i++) {
            if (requests[i].msme == msme) {
                count++;
            }
        }
        
        // Populate array
        uint256[] memory result = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= requestCounter; i++) {
            if (requests[i].msme == msme) {
                result[index] = i;
                index++;
            }
        }
        
        return result;
    }

    /**
     * @dev Get active (open/reveal) loan requests
     * @return uint256[] Array of active request IDs
     */
    function getActiveRequests() external view returns (uint256[] memory) {
        uint256 count = 0;
        
        for (uint256 i = 1; i <= requestCounter; i++) {
            if (requests[i].status == Status.Open || requests[i].status == Status.Reveal) {
                count++;
            }
        }
        
        uint256[] memory result = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= requestCounter; i++) {
            if (requests[i].status == Status.Open || requests[i].status == Status.Reveal) {
                result[index] = i;
                index++;
            }
        }
        
        return result;
    }

    /**
     * @dev Get all committed lenders for a request
     * @param requestId ID of the loan request
     * @return address[] Array of committed lender addresses
     */
    function getCommittedLenders(uint256 requestId) external view returns (address[] memory) {
        return committedLenders[requestId];
    }

    /**
     * @dev Get lenders who committed but didn't reveal (slashable)
     * @param requestId ID of the loan request
     * @return address[] Array of non-revealing lender addresses
     */
    function getNonRevealingLenders(uint256 requestId) external view returns (address[] memory) {
        address[] memory committed = committedLenders[requestId];
        uint256 nonRevealCount = 0;
        
        // Count non-revealing lenders
        for (uint256 i = 0; i < committed.length; i++) {
            if (!hasRevealed[requestId][committed[i]] && bidDeposits[requestId][committed[i]] > 0) {
                nonRevealCount++;
            }
        }
        
        // Build result array
        address[] memory nonRevealing = new address[](nonRevealCount);
        uint256 index = 0;
        for (uint256 i = 0; i < committed.length; i++) {
            if (!hasRevealed[requestId][committed[i]] && bidDeposits[requestId][committed[i]] > 0) {
                nonRevealing[index] = committed[i];
                index++;
            }
        }
        
        return nonRevealing;
    }

    /**
     * @dev Generate commitment hash (helper for off-chain)
     * @param rateBP Interest rate in basis points
     * @param nonce Random nonce
     * @param lender Lender address
     * @return bytes32 Commitment hash
     */
    function generateCommitment(
        uint256 rateBP,
        bytes32 nonce,
        address lender
    ) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(rateBP, nonce, lender));
    }

    /**
     * @dev Set or update lender profile
     * @param displayName Display name of the lender
     * @param businessName Business or organization name
     * @param lenderType Type of lender (e.g., "Individual", "Institution")
     * @param yearsExperience Years of lending experience
     * @param fundingCapacity Maximum funding capacity
     * @param preferredIndustries Comma-separated list of preferred industries
     * @param bio Biography or description
     */
    function setLenderProfile(
        string calldata displayName,
        string calldata businessName,
        string calldata lenderType,
        uint256 yearsExperience,
        uint256 fundingCapacity,
        string calldata preferredIndustries,
        string calldata bio
    ) external {
        require(bytes(displayName).length > 0, "Display name required");
        
        LenderProfile storage profile = lenderProfiles[msg.sender];
        
        profile.displayName = displayName;
        profile.businessName = businessName;
        profile.lenderType = lenderType;
        profile.yearsExperience = yearsExperience;
        profile.fundingCapacity = fundingCapacity;
        profile.preferredIndustries = preferredIndustries;
        profile.bio = bio;
        profile.updatedAt = block.timestamp;
        
        if (!profile.exists) {
            profile.createdAt = block.timestamp;
            profile.exists = true;
        }
        
        emit LenderProfileUpdated(msg.sender, block.timestamp);
    }

    /**
     * @dev Get lender profile
     * @param lender Address of the lender
     * @return LenderProfile struct
     */
    function getLenderProfile(address lender) external view returns (LenderProfile memory) {
        return lenderProfiles[lender];
    }

    /**
     * @dev Check if lender has a profile
     * @param lender Address of the lender
     * @return bool True if profile exists
     */
    function hasProfile(address lender) external view returns (bool) {
        return lenderProfiles[lender].exists;
    }
}

