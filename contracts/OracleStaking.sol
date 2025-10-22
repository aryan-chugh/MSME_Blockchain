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
    
    mapping(address => OracleInfo) public oracles;
    address[] public oracleList;

    // Events
    event OracleRegistered(address indexed oracle, uint256 amount);
    event StakeIncreased(address indexed oracle, uint256 amount, uint256 newTotal);
    event StakeWithdrawn(address indexed oracle, uint256 amount, uint256 remaining);
    event OracleSlashed(address indexed oracle, uint256 amount, string reason);
    event ReputationUpdated(address indexed oracle, uint256 newScore);
    event GovernanceTransferred(address indexed oldGovernance, address indexed newGovernance);

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
}
