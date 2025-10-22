// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./OracleStaking.sol";
import "./MSMEIdentity.sol";

/**
 * @title PlatformGovernance
 * @dev Manages critical platform functions and parameters
 */
contract PlatformGovernance is Ownable {
    using SafeERC20 for IERC20;

    // Contract references
    OracleStaking public oracleStaking;
    IERC20 public citToken;
    
    address public treasury;
    address public emergencyAdmin;
    
    // Platform parameters
    uint256 public platformFeeBP = 100;  // 1% default
    uint256 public minOracleStake;
    uint256 public slashingThreshold = 3; // Number of complaints before review
    
    // Emergency controls
    bool public paused = false;
    
    // Proposal system (simplified)
    struct Proposal {
        string description;
        address proposer;
        uint256 createdAt;
        uint256 votesFor;
        uint256 votesAgainst;
        bool executed;
        ProposalType proposalType;
        bytes proposalData;
    }
    
    enum ProposalType { 
        UpdateFees, 
        SlashOracle, 
        UpdateParameters,
        EmergencyAction
    }
    
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    uint256 public proposalCounter;
    
    // Oracle complaint tracking
    mapping(address => uint256) public oracleComplaints;
    mapping(address => mapping(address => bool)) public hasComplained;

    // Events
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event EmergencyAdminUpdated(address indexed oldAdmin, address indexed newAdmin);
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    event OracleSlashed(address indexed oracle, uint256 amount, string reason);
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, ProposalType proposalType);
    event ProposalVoted(uint256 indexed proposalId, address indexed voter, bool support);
    event ProposalExecuted(uint256 indexed proposalId);
    event PausedStatusChanged(bool isPaused);
    event ComplaintFiled(address indexed oracle, address indexed complainant);
    event FeesWithdrawn(address indexed token, uint256 amount, address indexed recipient);

    modifier whenNotPaused() {
        require(!paused, "Platform is paused");
        _;
    }

    modifier onlyEmergencyAdmin() {
        require(msg.sender == emergencyAdmin || msg.sender == owner(), "Not emergency admin");
        _;
    }

    /**
     * @dev Constructor
     * @param _treasury Treasury address for fees
     * @param _emergencyAdmin Emergency admin address
     */
    constructor(address _treasury, address _emergencyAdmin) Ownable(msg.sender) {
        require(_treasury != address(0), "Invalid treasury");
        require(_emergencyAdmin != address(0), "Invalid emergency admin");
        
        treasury = _treasury;
        emergencyAdmin = _emergencyAdmin;
    }

    /**
     * @dev Set the staking contract reference
     * @param _stakingContract Address of OracleStaking contract
     */
    function setStakingContract(address _stakingContract) external onlyOwner {
        require(_stakingContract != address(0), "Invalid staking contract");
        oracleStaking = OracleStaking(_stakingContract);
        minOracleStake = oracleStaking.MINIMUM_STAKE();
    }

    /**
     * @dev Set the CIT token reference
     * @param _citToken Address of CIT token contract
     */
    function setCITToken(address _citToken) external onlyOwner {
        require(_citToken != address(0), "Invalid token address");
        citToken = IERC20(_citToken);
    }

    /**
     * @dev Update treasury address
     * @param newTreasury New treasury address
     */
    function updateTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid address");
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    /**
     * @dev Update emergency admin
     * @param newAdmin New emergency admin address
     */
    function updateEmergencyAdmin(address newAdmin) external onlyOwner {
        require(newAdmin != address(0), "Invalid address");
        address oldAdmin = emergencyAdmin;
        emergencyAdmin = newAdmin;
        emit EmergencyAdminUpdated(oldAdmin, newAdmin);
    }

    /**
     * @dev Update platform fee
     * @param newFeeBP New fee in basis points
     */
    function updatePlatformFee(uint256 newFeeBP) external onlyOwner {
        require(newFeeBP <= 1000, "Fee too high"); // Max 10%
        uint256 oldFee = platformFeeBP;
        platformFeeBP = newFeeBP;
        emit PlatformFeeUpdated(oldFee, newFeeBP);
    }

    /**
     * @dev Execute slashing of a malicious oracle
     * @param maliciousOracle Oracle address to slash
     * @param amount Amount to slash
     * @param reason Reason for slashing
     */
    function executeSlash(
        address maliciousOracle,
        uint256 amount,
        string calldata reason
    ) external onlyOwner {
        require(address(oracleStaking) != address(0), "Staking contract not set");
        require(maliciousOracle != address(0), "Invalid oracle address");
        
        oracleStaking.slash(maliciousOracle, amount, reason);
        
        emit OracleSlashed(maliciousOracle, amount, reason);
    }

    /**
     * @dev File a complaint against an oracle
     * @param oracle Oracle address
     */
    function fileComplaint(address oracle) external {
        require(!hasComplained[oracle][msg.sender], "Already complained");
        require(oracle != address(0), "Invalid oracle");
        
        hasComplained[oracle][msg.sender] = true;
        oracleComplaints[oracle] += 1;
        
        emit ComplaintFiled(oracle, msg.sender);
        
        // Auto-trigger review if threshold reached
        if (oracleComplaints[oracle] >= slashingThreshold) {
            // In production, this would trigger a governance review process
            // For now, just emit an event for manual review
        }
    }

    /**
     * @dev Deploy a new MSME Identity contract
     * @param msmeOwner Owner of the new identity
     * @return address Address of deployed identity contract
     */
    function deployMSMEIdentity(address msmeOwner) external returns (address) {
        require(msmeOwner != address(0), "Invalid owner");
        
        MSMEIdentity identity = new MSMEIdentity(msmeOwner);
        
        return address(identity);
    }

    /**
     * @dev Withdraw accumulated fees
     * @param token Token address (use address(0) for ETH)
     * @param amount Amount to withdraw
     * @param recipient Recipient address
     */
    function withdrawFees(
        address token,
        uint256 amount,
        address recipient
    ) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Invalid amount");
        
        if (token == address(0)) {
            // Withdraw ETH
            (bool success, ) = recipient.call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            // Withdraw ERC20
            IERC20(token).safeTransfer(recipient, amount);
        }
        
        emit FeesWithdrawn(token, amount, recipient);
    }

    /**
     * @dev Emergency pause
     */
    function pause() external onlyEmergencyAdmin {
        paused = true;
        emit PausedStatusChanged(true);
    }

    /**
     * @dev Unpause
     */
    function unpause() external onlyOwner {
        paused = false;
        emit PausedStatusChanged(false);
    }

    /**
     * @dev Create a governance proposal
     * @param description Proposal description
     * @param proposalType Type of proposal
     * @param proposalData Encoded proposal data
     * @return proposalId Unique proposal ID
     */
    function createProposal(
        string calldata description,
        ProposalType proposalType,
        bytes calldata proposalData
    ) external returns (uint256) {
        uint256 proposalId = ++proposalCounter;
        
        proposals[proposalId] = Proposal({
            description: description,
            proposer: msg.sender,
            createdAt: block.timestamp,
            votesFor: 0,
            votesAgainst: 0,
            executed: false,
            proposalType: proposalType,
            proposalData: proposalData
        });
        
        emit ProposalCreated(proposalId, msg.sender, proposalType);
        
        return proposalId;
    }

    /**
     * @dev Vote on a proposal
     * @param proposalId ID of proposal
     * @param support True for yes, false for no
     */
    function vote(uint256 proposalId, bool support) external {
        require(!hasVoted[proposalId][msg.sender], "Already voted");
        require(!proposals[proposalId].executed, "Already executed");
        
        hasVoted[proposalId][msg.sender] = true;
        
        // In production, voting power would be based on CIT holdings
        uint256 votingPower = 1;
        
        if (support) {
            proposals[proposalId].votesFor += votingPower;
        } else {
            proposals[proposalId].votesAgainst += votingPower;
        }
        
        emit ProposalVoted(proposalId, msg.sender, support);
    }

    /**
     * @dev Execute a passed proposal (simplified)
     * @param proposalId ID of proposal
     */
    function executeProposal(uint256 proposalId) external onlyOwner {
        Proposal storage proposal = proposals[proposalId];
        
        require(!proposal.executed, "Already executed");
        require(proposal.votesFor > proposal.votesAgainst, "Not passed");
        
        proposal.executed = true;
        
        // Execute based on type
        // In production, this would decode proposalData and execute
        
        emit ProposalExecuted(proposalId);
    }

    /**
     * @dev Get proposal details
     * @param proposalId ID of proposal
     * @return Proposal struct
     */
    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return proposals[proposalId];
    }

    /**
     * @dev Get complaint count for an oracle
     * @param oracle Oracle address
     * @return uint256 Number of complaints
     */
    function getComplaintCount(address oracle) external view returns (uint256) {
        return oracleComplaints[oracle];
    }

    // Receive ETH
    receive() external payable {}
}
