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

    // State variables
    LoanMarketplace public immutable marketplace;
    
    mapping(uint256 => LoanRecord) public records;
    mapping(uint256 => mapping(address => string)) public disputeReasons; // recordId => party => reason
    mapping(address => MSMEReputation) public reputations;
    mapping(address => uint256[]) public msmeLoans;
    mapping(address => uint256[]) public lenderLoans;
    
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

    modifier onlyGovernance() {
        require(msg.sender == governance, "Only governance can call");
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
            createdAt: block.timestamp
        });
        
        // Track loans
        msmeLoans[request.msme].push(recordId);
        lenderLoans[msg.sender].push(recordId);
        
        // Update MSME reputation
        MSMEReputation storage rep = reputations[request.msme];
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
     */
    function recordDisbursement(
        uint256 recordId,
        uint256 expectedRepaymentDate
    ) external whenNotPaused {
        LoanRecord storage record = records[recordId];
        
        require(msg.sender == record.lender, "Only lender can record disbursement");
        require(record.status == LoanStatus.Active, "Invalid status");
        require(record.disbursementDate == 0, "Already disbursed");
        require(expectedRepaymentDate > block.timestamp, "Invalid repayment date");
        
        record.disbursementDate = block.timestamp;
        record.expectedRepaymentDate = expectedRepaymentDate;
        
        emit LoanDisbursed(recordId, block.timestamp);
    }

    /**
     * @dev Update loan status (repayment, default, etc.)
     * @param recordId Loan record ID
     * @param newStatus New status
     */
    function updateStatus(uint256 recordId, LoanStatus newStatus) external nonReentrant {
        LoanRecord storage record = records[recordId];
        
        require(msg.sender == record.lender, "Only lender can update status");
        require(record.status != newStatus, "Status unchanged");
        
        LoanStatus oldStatus = record.status;
        record.status = newStatus;
        
        // Update reputation based on status change
        MSMEReputation storage rep = reputations[record.msme];
        
        if (newStatus == LoanStatus.Repaid) {
            require(oldStatus == LoanStatus.Active, "Invalid status transition");
            
            record.actualRepaymentDate = block.timestamp;
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
            
            // Boost reputation for timely repayment
            if (block.timestamp <= record.expectedRepaymentDate) {
                _updateReputationScore(record.msme, 50); // +50 points
            }
            
        } else if (newStatus == LoanStatus.Defaulted) {
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
}
