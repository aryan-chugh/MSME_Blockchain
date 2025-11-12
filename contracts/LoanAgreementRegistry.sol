// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./LoanMarketplace.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title LoanAgreementRegistry
 * @dev Immutable registry of off-chain loan agreements
 * Tracks loan lifecycle and MSME reputation
 */
contract LoanAgreementRegistry is ReentrancyGuard, Pausable {
    
    address public governance;
    
    // Loan status enum
    enum LoanStatus { Active, Repaid, Defaulted, Disputed, Restructured }
    
    // Issue status enum
    enum IssueStatus { Open, UnderReview, Resolved, Rejected }
    
    // Loan record structure
    struct LoanRecord {
        uint256 marketplaceId;
        bytes32 agreementHash;      // Hash of off-chain legal agreement
        address msme;
        address lender;
        uint256 amount;
        uint256 rateBP;
        uint16 tenureMonths;
        LoanStatus status;
        uint256 disbursementDate;
        uint256 expectedRepaymentDate;
        uint256 actualRepaymentDate;
        uint256 createdAt;
        string documentHash;        // IPFS hash or document hash for disbursement proof
    }
    
    // MSME reputation structure
    struct MSMEReputation {
        uint256 totalLoans;
        uint256 repaidLoans;
        uint256 defaultedLoans;
        uint256 activeLoans;
        uint256 totalAmountBorrowed;
        uint256 totalAmountRepaid;
        uint256 averageRepaymentTime;  // In days
        uint256 reputationScore;       // 0-1000
    }
    
    // Issue structure for dispute tracking (off-chain resolution)
    struct Issue {
        uint256 issueId;
        uint256 recordId;
        address raiser;           // Who raised the issue (MSME or Lender)
        string reason;
        string evidenceHash;      // IPFS hash of evidence
        IssueStatus status;
        uint256 createdAt;
        uint256 resolvedAt;
        address resolvedBy;       // Governance/DAO member who marked as resolved
        string resolutionDetails; // IPFS hash of court order/resolution document
        address penalizedParty;   // Party that was found at fault (if any)
        uint256 penaltyAmount;    // Penalty imposed (reputation points)
    }

    // State variables
    LoanMarketplace public immutable marketplace;
    
    mapping(uint256 => LoanRecord) public records;
    mapping(uint256 => mapping(address => string)) public disputeReasons; // recordId => party => reason
    mapping(address => MSMEReputation) public reputations;
    mapping(address => uint256[]) public msmeLoans;
    mapping(address => uint256[]) public lenderLoans;
    
    // Issue tracking
    mapping(uint256 => Issue) public issues;
    uint256 public issueCounter;
    
    // Governance (can be DAO contract address or multi-sig)
    address public governanceContract;
    mapping(address => bool) public isGovernanceMember;
    
    uint256 public recordCounter;

    // Events
    event AgreementRegistered(
        uint256 indexed recordId,
        uint256 indexed marketplaceId,
        address indexed msme,
        address lender,
        bytes32 agreementHash
    );
    event LoanDisbursed(uint256 indexed recordId, uint256 disbursementDate);
    event StatusUpdated(
        uint256 indexed recordId,
        LoanStatus oldStatus,
        LoanStatus newStatus
    );
    event DisputeRaised(
        uint256 indexed recordId,
        address indexed party,
        string reason
    );
    event ReputationUpdated(address indexed msme, uint256 newScore);
    event IssueRaised(
        uint256 indexed issueId,
        uint256 indexed recordId,
        address indexed raiser,
        string reason
    );
    event IssueStatusUpdated(uint256 indexed issueId, IssueStatus newStatus);
    event IssueResolved(
        uint256 indexed issueId,
        address resolvedBy,
        address penalizedParty,
        uint256 penaltyAmount,
        string resolutionDetails
    );
    event GovernanceMemberAdded(address indexed member);
    event GovernanceMemberRemoved(address indexed member);

    modifier onlyGovernance() {
        require(msg.sender == governance, "Only governance can call");
        _;
    }
    
    modifier onlyGovernanceMember() {
        require(
            msg.sender == governance || 
            msg.sender == governanceContract || 
            isGovernanceMember[msg.sender],
            "Only governance members can call"
        );
        _;
    }

    /**
     * @dev Constructor
     * @param _marketplaceAddress Address of the LoanMarketplace contract
     * @param _governance Address of governance
     */
    constructor(address _marketplaceAddress, address _governance) {
        require(_marketplaceAddress != address(0), "Invalid marketplace address");
        require(_governance != address(0), "Invalid governance address");
        marketplace = LoanMarketplace(_marketplaceAddress);
        governance = _governance;
        governanceContract = _governance; // Initially same, can be updated to DAO
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
     * @dev Register a new loan agreement (only winning lender can call)
     * @param marketplaceRequestId ID from the marketplace
     * @param agreementHash Hash of the legal agreement document
     * @return recordId Unique record ID
     */
    function registerAgreement(
        uint256 marketplaceRequestId,
        bytes32 agreementHash
    ) external whenNotPaused returns (uint256) {
        require(agreementHash != bytes32(0), "Invalid agreement hash");
        
        // Verify caller is the winning lender
        address winningLender = marketplace.getWinner(marketplaceRequestId);
        require(msg.sender == winningLender, "Caller is not the winning lender");
        
        // Get loan request details
        LoanMarketplace.LoanRequest memory request = marketplace.getLoanRequest(marketplaceRequestId);
        uint256 winningRate = marketplace.getWinningRate(marketplaceRequestId);
        
        uint256 recordId = ++recordCounter;
        
        records[recordId] = LoanRecord({
            marketplaceId: marketplaceRequestId,
            agreementHash: agreementHash,
            msme: request.msme,
            lender: msg.sender,
            amount: request.amount,
            rateBP: winningRate,
            tenureMonths: request.tenureMonths,
            status: LoanStatus.Active,
            disbursementDate: 0,
            expectedRepaymentDate: 0,
            actualRepaymentDate: 0,
            createdAt: block.timestamp,
            documentHash: "" // Will be set during disbursement
        });
        
        // Track loans
        msmeLoans[request.msme].push(recordId);
        lenderLoans[msg.sender].push(recordId);
        
        // Update MSME reputation
        MSMEReputation storage rep = reputations[request.msme];
        
        // Initialize reputation score to 500 for first loan
        if (rep.totalLoans == 0) {
            rep.reputationScore = 500;
        }
        
        rep.totalLoans += 1;
        rep.activeLoans += 1;
        rep.totalAmountBorrowed += request.amount;
        
        emit AgreementRegistered(
            recordId,
            marketplaceRequestId,
            request.msme,
            msg.sender,
            agreementHash
        );
        
        return recordId;
    }

    /**
     * @dev Record loan disbursement (only lender)
     * @param recordId Loan record ID
     * @param expectedRepaymentDate Expected repayment timestamp
     * @param documentHash IPFS hash or document hash for disbursement proof
     */
    function recordDisbursement(
        uint256 recordId,
        uint256 expectedRepaymentDate,
        string calldata documentHash
    ) external whenNotPaused {
        LoanRecord storage record = records[recordId];
        
        require(msg.sender == record.lender, "Only lender can record disbursement");
        require(record.status == LoanStatus.Active, "Invalid status");
        require(record.disbursementDate == 0, "Already disbursed");
        require(expectedRepaymentDate > block.timestamp, "Invalid repayment date");
        require(bytes(documentHash).length > 0, "Document hash required");
        
        record.disbursementDate = block.timestamp;
        record.expectedRepaymentDate = expectedRepaymentDate;
        record.documentHash = documentHash;
        
        emit LoanDisbursed(recordId, block.timestamp);
    }

    /**
     * @dev Record loan repayment by MSME with proof
     * @param recordId Loan record ID
     * @param repaymentProofHash IPFS hash or document hash proving repayment
     */
    function recordRepayment(
        uint256 recordId,
        string calldata repaymentProofHash
    ) external nonReentrant whenNotPaused {
        LoanRecord storage record = records[recordId];
        
        require(msg.sender == record.msme, "Only MSME can record repayment");
        require(record.status == LoanStatus.Active, "Loan not active");
        require(record.disbursementDate > 0, "Loan not disbursed yet");
        require(bytes(repaymentProofHash).length > 0, "Repayment proof required");
        
        LoanStatus oldStatus = record.status;
        record.status = LoanStatus.Repaid;
        record.actualRepaymentDate = block.timestamp;
        
        // Update reputation based on repayment timing
        MSMEReputation storage rep = reputations[record.msme];
        rep.repaidLoans += 1;
        rep.activeLoans -= 1;
        rep.totalAmountRepaid += record.amount;
        
        // Calculate repayment time
        if (record.disbursementDate > 0) {
            uint256 repaymentDays = (block.timestamp - record.disbursementDate) / 1 days;
            
            // Update average repayment time
            if (rep.averageRepaymentTime == 0) {
                rep.averageRepaymentTime = repaymentDays;
            } else {
                rep.averageRepaymentTime = 
                    (rep.averageRepaymentTime * (rep.repaidLoans - 1) + repaymentDays) / rep.repaidLoans;
            }
        }
        
        // Enhanced reputation scoring based on timing
        if (block.timestamp <= record.expectedRepaymentDate) {
            // On-time or early repayment
            uint256 daysEarly = (record.expectedRepaymentDate - block.timestamp) / 1 days;
            if (daysEarly > 30) {
                _updateReputationScore(record.msme, 100); // Very early: +100 points
            } else if (daysEarly > 7) {
                _updateReputationScore(record.msme, 75); // Early: +75 points
            } else {
                _updateReputationScore(record.msme, 50); // On time: +50 points
            }
        } else {
            // Late repayment
            uint256 daysLate = (block.timestamp - record.expectedRepaymentDate) / 1 days;
            if (daysLate > 90) {
                _updateReputationScore(record.msme, -150); // Very late: -150 points
            } else if (daysLate > 30) {
                _updateReputationScore(record.msme, -100); // Late: -100 points
            } else {
                _updateReputationScore(record.msme, -50); // Slightly late: -50 points
            }
        }
        
        emit StatusUpdated(recordId, oldStatus, LoanStatus.Repaid);
    }

    /**
     * @dev Update loan status (for lender, legacy function for defaults/disputes)
     * @param recordId Loan record ID
     * @param newStatus New status
     */
    function updateStatus(uint256 recordId, LoanStatus newStatus) external nonReentrant {
        LoanRecord storage record = records[recordId];
        
        require(msg.sender == record.lender, "Only lender can update status");
        require(record.status != newStatus, "Status unchanged");
        require(newStatus != LoanStatus.Repaid, "Use recordRepayment for repayment");
        
        LoanStatus oldStatus = record.status;
        record.status = newStatus;
        
        // Update reputation based on status change
        MSMEReputation storage rep = reputations[record.msme];
        
        if (newStatus == LoanStatus.Defaulted) {
            rep.defaultedLoans += 1;
            rep.activeLoans -= 1;
            
            // Severe reputation penalty
            _updateReputationScore(record.msme, -200); // -200 points
        }
        
        emit StatusUpdated(recordId, oldStatus, newStatus);
    }

    /**
     * @dev Raise a dispute on a loan
     * @param recordId Loan record ID
     * @param reason Reason for dispute
     */
    function raiseDispute(uint256 recordId, string calldata reason) external {
        LoanRecord storage record = records[recordId];
        
        require(
            msg.sender == record.msme || msg.sender == record.lender,
            "Not a party to the loan"
        );
        require(bytes(reason).length > 0, "Reason required");
        
        disputeReasons[recordId][msg.sender] = reason;
        
        if (record.status != LoanStatus.Disputed) {
            record.status = LoanStatus.Disputed;
            emit StatusUpdated(recordId, record.status, LoanStatus.Disputed);
        }
        
        emit DisputeRaised(recordId, msg.sender, reason);
    }

    /**
     * @dev Get loan record details
     * @param recordId Loan record ID
     * @return LoanRecord struct
     */
    function getLoanRecord(uint256 recordId) external view returns (LoanRecord memory) {
        return records[recordId];
    }

    /**
     * @dev Get MSME reputation
     * @param msme MSME address
     * @return MSMEReputation struct
     */
    function getReputation(address msme) external view returns (MSMEReputation memory) {
        return reputations[msme];
    }

    /**
     * @dev Get all loans for an MSME
     * @param msme MSME address
     * @return uint256[] Array of loan record IDs
     */
    function getMSMELoans(address msme) external view returns (uint256[] memory) {
        return msmeLoans[msme];
    }

    /**
     * @dev Get all loans issued by a lender
     * @param lender Lender address
     * @return uint256[] Array of loan record IDs
     */
    function getLenderLoans(address lender) external view returns (uint256[] memory) {
        return lenderLoans[lender];
    }

    /**
     * @dev Calculate reputation score based on loan history
     * @param msme MSME address
     * @return uint256 Reputation score (0-1000)
     */
    function calculateReputationScore(address msme) public view returns (uint256) {
        MSMEReputation memory rep = reputations[msme];
        
        if (rep.totalLoans == 0) {
            return 500; // Neutral score for new MSMEs
        }
        
        uint256 score = 500; // Start with neutral
        
        // Repayment ratio (max +300)
        if (rep.repaidLoans > 0) {
            score += (rep.repaidLoans * 300) / rep.totalLoans;
        }
        
        // Default penalty (max -400)
        if (rep.defaultedLoans > 0) {
            uint256 penalty = (rep.defaultedLoans * 400) / rep.totalLoans;
            score = score > penalty ? score - penalty : 0;
        }
        
        // Volume bonus (max +100)
        if (rep.totalAmountRepaid > rep.totalAmountBorrowed / 2) {
            score += 100;
        }
        
        // Cap at 1000
        return score > 1000 ? 1000 : score;
    }

    /**
     * @dev Internal function to update reputation score
     * @param msme MSME address
     * @param delta Change in score (can be negative)
     */
    function _updateReputationScore(address msme, int256 delta) private {
        uint256 currentScore = reputations[msme].reputationScore;
        
        if (delta > 0) {
            currentScore += uint256(delta);
            if (currentScore > 1000) currentScore = 1000;
        } else if (delta < 0) {
            uint256 decrease = uint256(-delta);
            currentScore = currentScore > decrease ? currentScore - decrease : 0;
        }
        
        reputations[msme].reputationScore = currentScore;
        
        emit ReputationUpdated(msme, currentScore);
    }

    /**
     * @dev Get loan performance metrics
     * @param msme MSME address
     * @return totalLoans Total number of loans
     * @return repaymentRate Percentage of loans repaid (in basis points)
     * @return defaultRate Percentage of loans defaulted (in basis points)
     */
    function getLoanMetrics(address msme) external view returns (
        uint256 totalLoans,
        uint256 repaymentRate,
        uint256 defaultRate
    ) {
        MSMEReputation memory rep = reputations[msme];
        
        totalLoans = rep.totalLoans;
        
        if (totalLoans > 0) {
            repaymentRate = (rep.repaidLoans * 10000) / totalLoans; // In BP
            defaultRate = (rep.defaultedLoans * 10000) / totalLoans;
        } else {
            repaymentRate = 0;
            defaultRate = 0;
        }
    }

    // ========== ISSUE MANAGEMENT ==========
    // Issues are logged on-chain for transparency, but resolved off-chain (courts, arbitration)

    /**
     * @dev Add a governance member (governance only)
     * @param member Address of the governance member
     */
    function addGovernanceMember(address member) external onlyGovernance {
        require(member != address(0), "Invalid member address");
        isGovernanceMember[member] = true;
        emit GovernanceMemberAdded(member);
    }

    /**
     * @dev Remove a governance member (governance only)
     * @param member Address of the governance member to remove
     */
    function removeGovernanceMember(address member) external onlyGovernance {
        isGovernanceMember[member] = false;
        emit GovernanceMemberRemoved(member);
    }
    
    /**
     * @dev Update governance contract address (for DAO migration)
     * @param newGovernance New governance contract address
     */
    function updateGovernanceContract(address newGovernance) external onlyGovernance {
        require(newGovernance != address(0), "Invalid address");
        governanceContract = newGovernance;
    }

    /**
     * @dev Raise an issue on a loan agreement
     * @param recordId Loan record ID
     * @param reason Reason for the issue
     * @param evidenceHash IPFS hash of supporting evidence
     * @return issueId The ID of the created issue
     */
    function raiseIssue(
        uint256 recordId,
        string calldata reason,
        string calldata evidenceHash
    ) external returns (uint256) {
        LoanRecord storage record = records[recordId];
        
        require(
            msg.sender == record.msme || msg.sender == record.lender,
            "Only loan parties can raise issues"
        );
        require(bytes(reason).length > 0, "Reason required");
        require(bytes(evidenceHash).length > 0, "Evidence required");
        
        uint256 issueId = ++issueCounter;
        
        issues[issueId] = Issue({
            issueId: issueId,
            recordId: recordId,
            raiser: msg.sender,
            reason: reason,
            evidenceHash: evidenceHash,
            status: IssueStatus.Open,
            createdAt: block.timestamp,
            resolvedAt: 0,
            resolvedBy: address(0),
            resolutionDetails: "",
            penalizedParty: address(0),
            penaltyAmount: 0
        });
        
        // Update loan status to Disputed
        if (record.status != LoanStatus.Disputed) {
            LoanStatus oldStatus = record.status;
            record.status = LoanStatus.Disputed;
            emit StatusUpdated(recordId, oldStatus, LoanStatus.Disputed);
        }
        
        emit IssueRaised(issueId, recordId, msg.sender, reason);
        
        return issueId;
    }
    
    /**
     * @dev Update issue status (governance only)
     * @param issueId Issue ID
     * @param newStatus New status
     */
    function updateIssueStatus(uint256 issueId, IssueStatus newStatus) external onlyGovernanceMember {
        Issue storage issue = issues[issueId];
        require(issue.issueId != 0, "Issue does not exist");
        
        issue.status = newStatus;
        emit IssueStatusUpdated(issueId, newStatus);
    }

    /**
     * @dev Record resolution of an issue (after off-chain resolution)
     * @param issueId Issue ID
     * @param resolutionDetailsHash IPFS hash of court order/arbitration result
     * @param penalizedParty Address of party found at fault (address(0) if none)
     * @param penaltyAmount Reputation penalty points (0 if none)
     */
    function recordIssueResolution(
        uint256 issueId,
        string calldata resolutionDetailsHash,
        address penalizedParty,
        uint256 penaltyAmount
    ) external onlyGovernanceMember {
        Issue storage issue = issues[issueId];
        LoanRecord storage record = records[issue.recordId];
        
        require(issue.issueId != 0, "Issue does not exist");
        require(issue.status == IssueStatus.Open || issue.status == IssueStatus.UnderReview, "Issue already resolved");
        require(bytes(resolutionDetailsHash).length > 0, "Resolution details required");
        
        // Validate penalized party is one of the loan parties
        if (penalizedParty != address(0)) {
            require(
                penalizedParty == record.msme || penalizedParty == record.lender,
                "Penalized party must be a loan party"
            );
        }
        
        issue.status = IssueStatus.Resolved;
        issue.resolvedAt = block.timestamp;
        issue.resolvedBy = msg.sender;
        issue.resolutionDetails = resolutionDetailsHash;
        issue.penalizedParty = penalizedParty;
        issue.penaltyAmount = penaltyAmount;
        
        // Apply reputation penalty if applicable
        if (penalizedParty != address(0) && penaltyAmount > 0) {
            if (penalizedParty == record.msme) {
                _updateReputationScore(penalizedParty, -int256(penaltyAmount));
            }
            // Note: Lender penalties could be tracked separately or via oracle staking
        }
        
        // Update loan status if it was disputed
        if (record.status == LoanStatus.Disputed) {
            // Can be manually updated based on resolution
            // record.status = LoanStatus.Active; // Or other appropriate status
        }
        
        emit IssueResolved(issueId, msg.sender, penalizedParty, penaltyAmount, resolutionDetailsHash);
    }

    /**
     * @dev Get issue details
     * @param issueId Issue ID
     * @return Issue struct
     */
    function getIssue(uint256 issueId) external view returns (Issue memory) {
        return issues[issueId];
    }

    /**
     * @dev Get all issues for a loan record
     * @param recordId Loan record ID
     * @return uint256[] Array of issue IDs
     */
    function getIssuesForRecord(uint256 recordId) external view returns (uint256[] memory) {
        uint256 count = 0;
        
        // Count issues for this record
        for (uint256 i = 1; i <= issueCounter; i++) {
            if (issues[i].recordId == recordId) {
                count++;
            }
        }
        
        // Build array
        uint256[] memory issueIds = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= issueCounter; i++) {
            if (issues[i].recordId == recordId) {
                issueIds[index] = i;
                index++;
            }
        }
        
        return issueIds;
    }
    
    /**
     * @dev Get all issues (paginated)
     * @param offset Starting index
     * @param limit Number of issues to return
     * @return uint256[] Array of issue IDs
     */
    function getAllIssues(uint256 offset, uint256 limit) external view returns (uint256[] memory) {
        uint256 total = issueCounter;
        if (offset >= total) {
            return new uint256[](0);
        }
        
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        
        uint256 resultLength = end - offset;
        uint256[] memory issueIds = new uint256[](resultLength);
        
        for (uint256 i = 0; i < resultLength; i++) {
            issueIds[i] = offset + i + 1; // Issue IDs start from 1
        }
        
        return issueIds;
    }
    
    /**
     * @dev Check if address is a governance member
     * @param member Address to check
     * @return bool True if member is authorized
     */
    function isGovernanceMemberCheck(address member) external view returns (bool) {
        return msg.sender == governance || 
               msg.sender == governanceContract || 
               isGovernanceMember[member];
    }
}
