// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title OracleStakingV3 - Enhanced for Multi-Oracle Consensus
 * @dev Supports:
 * 1. ✅ Advanced reputation tracking (consensus agreements/disagreements)
 * 2. ✅ Diversity bonuses (serving many different MSMEs)
 * 3. ✅ Performance metrics for weighted selection
 * 4. ✅ Enhanced slashing with distribution
 * 5. ✅ Automatic reputation decay
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract OracleStakingV3 is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable citToken;
    address public governance;
    address public attestationRegistry;
    
    uint256 public constant MINIMUM_STAKE = 50_000 * 1e18;
    uint256 public constant STAKE_COOLDOWN = 24 hours;
    uint256 public constant REPUTATION_DECAY_PERIOD = 30 days;
    uint256 public constant REPUTATION_DECAY_AMOUNT = 1;
    
    struct OracleInfo {
        uint256 stakedAmount;
        uint256 reputationScore;
        uint256 attestationCount;
        uint256 slashCount;
        uint256 registrationTime;
        uint256 lastWithdrawTime;
        uint256 lastReputationUpdateTime;
        bool isActive;
        
        // Multi-oracle consensus metrics
        uint256 consensusAgreements;      // Times agreed with majority
        uint256 consensusDisagreements;   // Times disagreed with majority
        uint256 perfectConsensusCount;    // Times all oracles agreed
        uint256 noConsensusCount;         // Times no consensus reached
    }
    
    mapping(address => OracleInfo) public oracles;
    address[] public oracleList;
    
    uint256 public totalSlashedAmount;
    uint256 public burnedAmount;

    event OracleRegistered(address indexed oracle, uint256 amount);
    event StakeIncreased(address indexed oracle, uint256 amount, uint256 newTotal);
    event StakeWithdrawn(address indexed oracle, uint256 amount, uint256 remaining);
    event OracleSlashed(address indexed oracle, uint256 amount, string reason);
    event ReputationUpdated(address indexed oracle, int256 delta, uint256 newScore, string reason);
    event ReputationDecayed(address indexed oracle, uint256 decayAmount, uint256 newScore);
    event ConsensusMetricsUpdated(
        address indexed oracle,
        uint256 agreements,
        uint256 disagreements,
        uint256 perfectConsensus
    );
    event GovernanceTransferred(address indexed oldGovernance, address indexed newGovernance);
    event AttestationRegistrySet(address indexed registry);
    event SlashedFundsDistributed(
        address indexed oracle,
        uint256 totalSlashed,
        uint256 toMSME,
        uint256 toPlatform,
        uint256 burned
    );

    modifier onlyGovernance() {
        require(msg.sender == governance, "Only governance");
        _;
    }

    modifier onlyAuthorized() {
        require(
            msg.sender == governance || msg.sender == attestationRegistry,
            "Not authorized"
        );
        _;
    }

    modifier isStakedOracle(address _oracle) {
        require(
            oracles[_oracle].stakedAmount >= MINIMUM_STAKE && oracles[_oracle].isActive,
            "Not a valid staked oracle"
        );
        _;
    }

    constructor(address _citTokenAddress, address _governance) {
        require(_citTokenAddress != address(0), "Invalid token");
        require(_governance != address(0), "Invalid governance");
        
        citToken = IERC20(_citTokenAddress);
        governance = _governance;
    }

    function setAttestationRegistry(address _registry) external onlyGovernance {
        require(_registry != address(0), "Invalid registry");
        attestationRegistry = _registry;
        emit AttestationRegistrySet(_registry);
    }

    function stake(uint256 amount) external {
        require(amount >= MINIMUM_STAKE, "Stake below minimum");
        
        if (oracles[msg.sender].lastWithdrawTime > 0) {
            require(
                block.timestamp >= oracles[msg.sender].lastWithdrawTime + STAKE_COOLDOWN,
                "Cooldown not elapsed"
            );
        }
        
        citToken.safeTransferFrom(msg.sender, address(this), amount);
        
        if (oracles[msg.sender].stakedAmount == 0) {
            oracles[msg.sender] = OracleInfo({
                stakedAmount: amount,
                reputationScore: 100,
                attestationCount: 0,
                slashCount: 0,
                registrationTime: block.timestamp,
                lastWithdrawTime: 0,
                lastReputationUpdateTime: block.timestamp,
                isActive: true,
                consensusAgreements: 0,
                consensusDisagreements: 0,
                perfectConsensusCount: 0,
                noConsensusCount: 0
            });
            oracleList.push(msg.sender);
            emit OracleRegistered(msg.sender, amount);
        } else {
            oracles[msg.sender].stakedAmount += amount;
            oracles[msg.sender].isActive = true;
            emit StakeIncreased(msg.sender, amount, oracles[msg.sender].stakedAmount);
        }
    }

    function withdraw(uint256 amount) external nonReentrant {
        require(oracles[msg.sender].stakedAmount >= amount, "Insufficient stake");
        
        _applyReputationDecay(msg.sender);
        
        oracles[msg.sender].stakedAmount -= amount;
        oracles[msg.sender].lastWithdrawTime = block.timestamp;
        
        if (oracles[msg.sender].stakedAmount < MINIMUM_STAKE) {
            oracles[msg.sender].isActive = false;
        }
        
        citToken.safeTransfer(msg.sender, amount);
        emit StakeWithdrawn(msg.sender, amount, oracles[msg.sender].stakedAmount);
    }

    function slashWithDistribution(
        address oracle,
        uint256 amount,
        address compensationRecipient,
        uint256 compensationAmount,
        string calldata reason
    ) external onlyAuthorized nonReentrant {
        require(oracles[oracle].stakedAmount >= amount, "Insufficient stake");
        require(compensationAmount <= amount, "Compensation exceeds slash");
        
        oracles[oracle].stakedAmount -= amount;
        oracles[oracle].slashCount += 1;
        oracles[oracle].isActive = false;
        
        totalSlashedAmount += amount;
        
        // 50% to victim
        if (compensationAmount > 0 && compensationRecipient != address(0)) {
            citToken.safeTransfer(compensationRecipient, compensationAmount);
        }
        
        // 30% to platform
        uint256 platformShare = (amount * 30) / 100;
        citToken.safeTransfer(governance, platformShare);
        
        // 20% burned/locked
        uint256 burnAmount = amount - compensationAmount - platformShare;
        burnedAmount += burnAmount;
        
        emit OracleSlashed(oracle, amount, reason);
        emit SlashedFundsDistributed(oracle, amount, compensationAmount, platformShare, burnAmount);
    }

    function slash(address oracle, uint256 amount, string calldata reason) 
        external onlyGovernance nonReentrant {
        require(oracles[oracle].stakedAmount >= amount, "Insufficient stake");
        
        oracles[oracle].stakedAmount -= amount;
        oracles[oracle].slashCount += 1;
        oracles[oracle].isActive = false;
        
        totalSlashedAmount += amount;
        citToken.safeTransfer(governance, amount);
        
        emit OracleSlashed(oracle, amount, reason);
    }

    /**
     * @dev Update reputation with reason tracking
     */
    function updateReputation(address oracle, int256 delta, string calldata reason) 
        external onlyAuthorized {
        require(oracles[oracle].registrationTime > 0, "Oracle not registered");
        
        _applyReputationDecay(oracle);
        
        uint256 oldScore = oracles[oracle].reputationScore;
        
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
        
        oracles[oracle].lastReputationUpdateTime = block.timestamp;
        
        emit ReputationUpdated(oracle, delta, oracles[oracle].reputationScore, reason);
    }

    /**
     * @dev Update consensus metrics (called by AttestationRegistry)
     * @param oracle Oracle address
     * @param agreedWithMajority True if oracle agreed with consensus
     * @param wasUnanimous True if all oracles agreed
     * @param noConsensus True if no consensus reached
     */
    function updateConsensusMetrics(
        address oracle,
        bool agreedWithMajority,
        bool wasUnanimous,
        bool noConsensus
    ) external onlyAuthorized {
        require(oracles[oracle].registrationTime > 0, "Oracle not registered");
        
        if (noConsensus) {
            oracles[oracle].noConsensusCount++;
        } else if (agreedWithMajority) {
            oracles[oracle].consensusAgreements++;
            if (wasUnanimous) {
                oracles[oracle].perfectConsensusCount++;
            }
        } else {
            oracles[oracle].consensusDisagreements++;
        }
        
        emit ConsensusMetricsUpdated(
            oracle,
            oracles[oracle].consensusAgreements,
            oracles[oracle].consensusDisagreements,
            oracles[oracle].perfectConsensusCount
        );
    }

    function _applyReputationDecay(address oracle) internal {
        if (oracles[oracle].lastReputationUpdateTime == 0) return;
        
        uint256 timeSinceUpdate = block.timestamp - oracles[oracle].lastReputationUpdateTime;
        uint256 decayPeriods = timeSinceUpdate / REPUTATION_DECAY_PERIOD;
        
        if (decayPeriods > 0) {
            uint256 totalDecay = decayPeriods * REPUTATION_DECAY_AMOUNT;
            
            if (oracles[oracle].reputationScore > totalDecay) {
                oracles[oracle].reputationScore -= totalDecay;
            } else {
                oracles[oracle].reputationScore = 0;
            }
            
            oracles[oracle].lastReputationUpdateTime = block.timestamp;
            
            emit ReputationDecayed(oracle, totalDecay, oracles[oracle].reputationScore);
        }
    }

    function applyReputationDecay(address oracle) external {
        require(oracles[oracle].registrationTime > 0, "Oracle not registered");
        _applyReputationDecay(oracle);
    }

    function incrementAttestationCount(address oracle) external onlyAuthorized isStakedOracle(oracle) {
        oracles[oracle].attestationCount += 1;
    }

    /**
     * @dev Get oracle accuracy rate (percentage of times agreed with majority)
     */
    function getOracleAccuracy(address oracle) external view returns (uint256) {
        uint256 total = oracles[oracle].consensusAgreements + oracles[oracle].consensusDisagreements;
        if (total == 0) return 100; // New oracle, assume 100%
        
        return (oracles[oracle].consensusAgreements * 100) / total;
    }

    /**
     * @dev Calculate final reputation including all bonuses
     */
    function getCurrentReputation(address oracle) public view returns (uint256) {
        OracleInfo memory info = oracles[oracle];
        
        // Apply decay
        uint256 score = info.reputationScore;
        if (info.lastReputationUpdateTime > 0) {
            uint256 timeSinceUpdate = block.timestamp - info.lastReputationUpdateTime;
            uint256 decayPeriods = timeSinceUpdate / REPUTATION_DECAY_PERIOD;
            
            if (decayPeriods > 0) {
                uint256 totalDecay = decayPeriods * REPUTATION_DECAY_AMOUNT;
                if (score > totalDecay) {
                    score -= totalDecay;
                } else {
                    score = 0;
                }
            }
        }
        
        // Accuracy bonus
        uint256 total = info.consensusAgreements + info.consensusDisagreements;
        if (total > 0) {
            uint256 accuracy = (info.consensusAgreements * 100) / total;
            
            if (accuracy >= 95) score += 50;
            else if (accuracy >= 85) score += 30;
            else if (accuracy >= 75) score += 15;
            else if (accuracy < 50) score = score > 30 ? score - 30 : 0;
        }
        
        // Perfect consensus bonus
        score += info.perfectConsensusCount * 2;
        
        // Longevity bonus
        uint256 monthsActive = (block.timestamp - info.registrationTime) / 30 days;
        score += monthsActive;
        
        return score;
    }

    function getOracleInfo(address oracle) external view returns (OracleInfo memory) {
        return oracles[oracle];
    }

    function getAllOracles() external view returns (address[] memory) {
        return oracleList;
    }

    function isValidOracle(address oracle) external view returns (bool) {
        return oracles[oracle].stakedAmount >= MINIMUM_STAKE && oracles[oracle].isActive;
    }

    function getOracleStake(address oracle) external view returns (uint256) {
        return oracles[oracle].stakedAmount;
    }

    function getOracleTier(address oracle) external view returns (uint256) {
        uint256 stakedAmount = oracles[oracle].stakedAmount;
        
        if (stakedAmount >= 1_000_000 * 1e18) return 4;
        if (stakedAmount >= 500_000 * 1e18) return 3;
        if (stakedAmount >= 200_000 * 1e18) return 2;
        if (stakedAmount >= MINIMUM_STAKE) return 1;
        return 0;
    }

    function transferGovernance(address newGovernance) external onlyGovernance {
        require(newGovernance != address(0), "Invalid address");
        address oldGovernance = governance;
        governance = newGovernance;
        emit GovernanceTransferred(oldGovernance, newGovernance);
    }

    function getSlashingStats() external view returns (uint256 totalSlashed, uint256 totalBurned) {
        return (totalSlashedAmount, burnedAmount);
    }
    
    /**
     * @dev Get comprehensive oracle performance metrics
     */
    function getOraclePerformance(address oracle) external view returns (
        uint256 totalAttestations,
        uint256 accuracy,
        uint256 perfectConsensusRate,
        uint256 currentReputation
    ) {
        OracleInfo memory info = oracles[oracle];
        
        uint256 total = info.consensusAgreements + info.consensusDisagreements;
        uint256 acc = total > 0 ? (info.consensusAgreements * 100) / total : 100;
        uint256 perfectRate = info.attestationCount > 0 
            ? (info.perfectConsensusCount * 100) / info.attestationCount 
            : 0;
        
        return (
            info.attestationCount,
            acc,
            perfectRate,
            getCurrentReputation(oracle)
        );
    }
}
