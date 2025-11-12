// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title OracleStaking
 * @dev Manages oracle staking, reputation, and slashing
 * Oracles must stake CIT tokens to provide attestations
 */
contract OracleStaking is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // State variables
    IERC20 public immutable citToken;
    address public governance;
    
    // Minimum stake required to become an oracle
    uint256 public constant MINIMUM_STAKE = 50_000 * 1e18; // 50,000 CIT
    
    // Time-lock: minimum cooldown between withdraw and stake (24 hours)
    uint256 public constant STAKE_COOLDOWN = 24 hours;
    
    // Oracle information
    struct OracleInfo {
        uint256 stakedAmount;
        uint256 reputationScore;
        uint256 attestationCount;
        uint256 slashCount;
        uint256 registrationTime;
        uint256 lastWithdrawTime;
        bool isActive;
    }
    
    // Collusion tracking
    struct CollusionRecord {
        address oracle1;
        address oracle2;
        uint256 similarVotes;
        uint256 totalOpportunities;
        uint256 lastChecked;
        bool flaggedForReview;
    }
    
    mapping(address => OracleInfo) public oracles;
    address[] public oracleList;
    
    // Track oracle votes on requests for collusion detection
    mapping(uint256 => mapping(address => int8)) public oracleVotes; // requestId => oracle => vote (-1, 0, 1)
    mapping(uint256 => address[]) public requestVoters; // requestId => list of oracles who voted
    
    // Collusion tracking
    mapping(bytes32 => CollusionRecord) public collusionPairs; // hash(oracle1, oracle2) => record
    uint256 public constant COLLUSION_THRESHOLD = 80; // 80% similarity triggers flag
    uint256 public constant MIN_VOTES_FOR_DETECTION = 5; // Minimum votes to check collusion

    // Events
    event OracleRegistered(address indexed oracle, uint256 amount);
    event StakeIncreased(address indexed oracle, uint256 amount, uint256 newTotal);
    event StakeWithdrawn(address indexed oracle, uint256 amount, uint256 remaining);
    event OracleSlashed(address indexed oracle, uint256 amount, string reason);
    event ReputationUpdated(address indexed oracle, uint256 newScore);
    event GovernanceTransferred(address indexed oldGovernance, address indexed newGovernance);
    event CollusionDetected(address indexed oracle1, address indexed oracle2, uint256 similarityPercent);
    event OracleVoteRecorded(uint256 indexed requestId, address indexed oracle, int8 vote);

    // Modifiers
    modifier onlyGovernance() {
        require(msg.sender == governance, "Only governance can call");
        _;
    }

    modifier isStakedOracle(address _oracle) {
        require(
            oracles[_oracle].stakedAmount >= MINIMUM_STAKE && oracles[_oracle].isActive,
            "Not a valid staked oracle"
        );
        _;
    }

    /**
     * @dev Constructor
     * @param _citTokenAddress Address of the CIT token contract
     * @param _governance Address of governance/admin
     */
    constructor(address _citTokenAddress, address _governance) {
        require(_citTokenAddress != address(0), "Invalid token address");
        require(_governance != address(0), "Invalid governance address");
        
        citToken = IERC20(_citTokenAddress);
        governance = _governance;
    }

    /**
     * @dev Stake tokens to become an oracle
     * @param amount Amount of CIT tokens to stake
     */
    function stake(uint256 amount) external {
        require(amount >= MINIMUM_STAKE, "Stake below minimum");
        
        // Time-lock: prevent rapid stake after withdraw (anti-manipulation)
        if (oracles[msg.sender].lastWithdrawTime > 0) {
            require(
                block.timestamp >= oracles[msg.sender].lastWithdrawTime + STAKE_COOLDOWN,
                "Stake cooldown period not elapsed"
            );
        }
        
        citToken.safeTransferFrom(msg.sender, address(this), amount);
        
        if (oracles[msg.sender].stakedAmount == 0) {
            // New oracle registration
            oracles[msg.sender] = OracleInfo({
                stakedAmount: amount,
                reputationScore: 100, // Start with base reputation
                attestationCount: 0,
                slashCount: 0,
                registrationTime: block.timestamp,
                lastWithdrawTime: 0,
                isActive: true
            });
            oracleList.push(msg.sender);
            emit OracleRegistered(msg.sender, amount);
        } else {
            // Increase existing stake
            oracles[msg.sender].stakedAmount += amount;
            oracles[msg.sender].isActive = true;
            emit StakeIncreased(msg.sender, amount, oracles[msg.sender].stakedAmount);
        }
    }

    /**
     * @dev Withdraw staked tokens (must maintain minimum if active)
     * @param amount Amount to withdraw
     */
    function withdraw(uint256 amount) external nonReentrant {
        require(oracles[msg.sender].stakedAmount >= amount, "Insufficient stake");
        
        oracles[msg.sender].stakedAmount -= amount;
        oracles[msg.sender].lastWithdrawTime = block.timestamp; // Set cooldown timer
        
        // If below minimum, mark as inactive
        if (oracles[msg.sender].stakedAmount < MINIMUM_STAKE) {
            oracles[msg.sender].isActive = false;
        }
        
        citToken.safeTransfer(msg.sender, amount);
        emit StakeWithdrawn(msg.sender, amount, oracles[msg.sender].stakedAmount);
    }

    /**
     * @dev Slash an oracle's stake (governance only)
     * @param oracle Address of oracle to slash
     * @param amount Amount to slash
     * @param reason Reason for slashing
     */
    function slash(address oracle, uint256 amount, string calldata reason) external onlyGovernance nonReentrant {
        require(oracles[oracle].stakedAmount >= amount, "Insufficient stake to slash");
        
        oracles[oracle].stakedAmount -= amount;
        oracles[oracle].slashCount += 1;
        oracles[oracle].isActive = false;
        
        // Slashed tokens go to governance treasury
        citToken.safeTransfer(governance, amount);
        
        emit OracleSlashed(oracle, amount, reason);
    }

    /**
     * @dev Update oracle reputation (called by AttestationRegistry)
     * @param oracle Address of oracle
     * @param delta Change in reputation (can be negative)
     */
    function updateReputation(address oracle, int256 delta) external {
        // In production, this should be restricted to authorized contracts
        require(oracles[oracle].isActive, "Oracle not active");
        
        if (delta > 0) {
            oracles[oracle].reputationScore += uint256(delta);
        } else if (delta < 0) {
            uint256 decrease = uint256(-delta);
            if (oracles[oracle].reputationScore > decrease) {
                oracles[oracle].reputationScore -= decrease;
            } else {
                oracles[oracle].reputationScore = 0;
            }
        }
        
        emit ReputationUpdated(oracle, oracles[oracle].reputationScore);
    }

    /**
     * @dev Increment attestation count (called by AttestationRegistry)
     * @param oracle Address of oracle
     */
    function incrementAttestationCount(address oracle) external isStakedOracle(oracle) {
        oracles[oracle].attestationCount += 1;
    }

    /**
     * @dev Get oracle information
     * @param oracle Address of oracle
     * @return OracleInfo struct
     */
    function getOracleInfo(address oracle) external view returns (OracleInfo memory) {
        return oracles[oracle];
    }

    /**
     * @dev Get all registered oracles
     * @return address[] Array of oracle addresses
     */
    function getAllOracles() external view returns (address[] memory) {
        return oracleList;
    }

    /**
     * @dev Check if address is a valid staked oracle
     * @param oracle Address to check
     * @return bool True if oracle is valid and active
     */
    function isValidOracle(address oracle) external view returns (bool) {
        return oracles[oracle].stakedAmount >= MINIMUM_STAKE && oracles[oracle].isActive;
    }

    /**
     * @dev Transfer governance to new address
     * @param newGovernance New governance address
     */
    function transferGovernance(address newGovernance) external onlyGovernance {
        require(newGovernance != address(0), "Invalid address");
        address oldGovernance = governance;
        governance = newGovernance;
        emit GovernanceTransferred(oldGovernance, newGovernance);
    }

    /**
     * @dev Get oracle tier based on stake amount
     * @param oracle Address of oracle
     * @return uint256 Tier level (0-4)
     */
    function getOracleTier(address oracle) external view returns (uint256) {
        uint256 stakedAmount = oracles[oracle].stakedAmount;
        
        if (stakedAmount >= 1_000_000 * 1e18) return 4; // Tier 4: 1M+ CIT
        if (stakedAmount >= 500_000 * 1e18) return 3;   // Tier 3: 500K+ CIT
        if (stakedAmount >= 200_000 * 1e18) return 2;   // Tier 2: 200K+ CIT
        if (stakedAmount >= MINIMUM_STAKE) return 1;    // Tier 1: 50K+ CIT
        return 0; // Not qualified
    }

    // ========== COLLUSION DETECTION ==========

    /**
     * @dev Record an oracle's vote on a request (called by external contracts)
     * @param requestId The ID of the request/assessment
     * @param oracle Address of the oracle
     * @param vote Vote value: -1 (reject), 0 (abstain), 1 (approve)
     */
    function recordOracleVote(uint256 requestId, address oracle, int8 vote) external {
        require(vote >= -1 && vote <= 1, "Invalid vote value");
        require(oracles[oracle].isActive, "Oracle not active");
        
        oracleVotes[requestId][oracle] = vote;
        requestVoters[requestId].push(oracle);
        
        oracles[oracle].attestationCount += 1;
        
        emit OracleVoteRecorded(requestId, oracle, vote);
    }

    /**
     * @dev Check for collusion between oracles based on voting patterns
     * @param oracle1 First oracle address
     * @param oracle2 Second oracle address
     * @return bool True if collusion is suspected
     * @return uint256 Similarity percentage
     */
    function checkCollusion(address oracle1, address oracle2) public view returns (bool, uint256) {
        require(oracle1 != oracle2, "Cannot check same oracle");
        
        bytes32 pairHash = _getPairHash(oracle1, oracle2);
        CollusionRecord memory record = collusionPairs[pairHash];
        
        if (record.totalOpportunities < MIN_VOTES_FOR_DETECTION) {
            return (false, 0);
        }
        
        uint256 similarityPercent = (record.similarVotes * 100) / record.totalOpportunities;
        bool isSuspicious = similarityPercent >= COLLUSION_THRESHOLD;
        
        return (isSuspicious, similarityPercent);
    }

    /**
     * @dev Analyze voting patterns after a request is completed
     * @param requestId The request ID to analyze
     */
    function analyzeVotingPatterns(uint256 requestId) external {
        address[] memory voters = requestVoters[requestId];
        require(voters.length >= 2, "Not enough voters to analyze");
        
        // Compare each pair of oracles
        for (uint256 i = 0; i < voters.length; i++) {
            for (uint256 j = i + 1; j < voters.length; j++) {
                address oracle1 = voters[i];
                address oracle2 = voters[j];
                
                bytes32 pairHash = _getPairHash(oracle1, oracle2);
                CollusionRecord storage record = collusionPairs[pairHash];
                
                // Initialize if first time
                if (record.oracle1 == address(0)) {
                    record.oracle1 = oracle1;
                    record.oracle2 = oracle2;
                }
                
                record.totalOpportunities += 1;
                
                // Check if votes are similar
                int8 vote1 = oracleVotes[requestId][oracle1];
                int8 vote2 = oracleVotes[requestId][oracle2];
                
                if (vote1 == vote2) {
                    record.similarVotes += 1;
                }
                
                record.lastChecked = block.timestamp;
                
                // Check if threshold exceeded
                if (record.totalOpportunities >= MIN_VOTES_FOR_DETECTION) {
                    uint256 similarityPercent = (record.similarVotes * 100) / record.totalOpportunities;
                    
                    if (similarityPercent >= COLLUSION_THRESHOLD && !record.flaggedForReview) {
                        record.flaggedForReview = true;
                        emit CollusionDetected(oracle1, oracle2, similarityPercent);
                    }
                }
            }
        }
    }

    /**
     * @dev Punish oracles detected for collusion (governance only)
     * @param oracle1 First oracle address
     * @param oracle2 Second oracle address
     */
    function punishCollusion(address oracle1, address oracle2) external onlyGovernance {
        bytes32 pairHash = _getPairHash(oracle1, oracle2);
        CollusionRecord storage record = collusionPairs[pairHash];
        
        require(record.flaggedForReview, "Not flagged for collusion");
        
        (bool isSuspicious, uint256 similarityPercent) = checkCollusion(oracle1, oracle2);
        require(isSuspicious, "Collusion not confirmed");
        
        // Slash both oracles
        uint256 slashAmount1 = oracles[oracle1].stakedAmount / 4; // 25% slash
        uint256 slashAmount2 = oracles[oracle2].stakedAmount / 4;
        
        _slashOracle(oracle1, slashAmount1, "Collusion detected");
        _slashOracle(oracle2, slashAmount2, "Collusion detected");
        
        // Reduce reputation significantly
        if (oracles[oracle1].reputationScore >= 200) {
            oracles[oracle1].reputationScore -= 200;
        } else {
            oracles[oracle1].reputationScore = 0;
        }
        
        if (oracles[oracle2].reputationScore >= 200) {
            oracles[oracle2].reputationScore -= 200;
        } else {
            oracles[oracle2].reputationScore = 0;
        }
        
        // Reset flagged status
        record.flaggedForReview = false;
    }

    /**
     * @dev Get collusion record for a pair of oracles
     * @param oracle1 First oracle address
     * @param oracle2 Second oracle address
     * @return CollusionRecord struct
     */
    function getCollusionRecord(address oracle1, address oracle2) external view returns (CollusionRecord memory) {
        bytes32 pairHash = _getPairHash(oracle1, oracle2);
        return collusionPairs[pairHash];
    }

    /**
     * @dev Get voters for a specific request
     * @param requestId The request ID
     * @return address[] Array of oracle addresses who voted
     */
    function getRequestVoters(uint256 requestId) external view returns (address[] memory) {
        return requestVoters[requestId];
    }

    /**
     * @dev Internal function to get consistent hash for oracle pair
     * @param oracle1 First oracle address
     * @param oracle2 Second oracle address
     * @return bytes32 Hash of the pair (sorted)
     */
    function _getPairHash(address oracle1, address oracle2) private pure returns (bytes32) {
        // Sort addresses to ensure consistent hash regardless of order
        if (oracle1 < oracle2) {
            return keccak256(abi.encodePacked(oracle1, oracle2));
        } else {
            return keccak256(abi.encodePacked(oracle2, oracle1));
        }
    }

    /**
     * @dev Internal slash function
     * @param oracle Oracle address
     * @param amount Amount to slash
     * @param reason Reason for slashing
     */
    function _slashOracle(address oracle, uint256 amount, string memory reason) private {
        OracleInfo storage info = oracles[oracle];
        
        if (amount > info.stakedAmount) {
            amount = info.stakedAmount;
        }
        
        info.stakedAmount -= amount;
        info.slashCount += 1;
        
        // Transfer slashed amount to governance (could be burned or redistributed)
        citToken.safeTransfer(governance, amount);
        
        emit OracleSlashed(oracle, amount, reason);
    }
}
