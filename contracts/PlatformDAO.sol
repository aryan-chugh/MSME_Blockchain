// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title PlatformDAO
 * @dev Simple DAO for platform governance
 * Token holders can propose and vote on governance actions
 */
contract PlatformDAO {
    
    IERC20 public immutable governanceToken;
    
    uint256 public proposalCounter;
    uint256 public constant VOTING_PERIOD = 3 days;
    uint256 public constant PROPOSAL_THRESHOLD = 10000 * 1e18; // 10,000 tokens to propose
    uint256 public constant QUORUM_PERCENTAGE = 10; // 10% of total supply needed
    
    enum ProposalType { AddGovernanceMember, RemoveGovernanceMember, UpdateParameter }
    enum ProposalStatus { Active, Passed, Failed, Executed }
    
    struct Proposal {
        uint256 proposalId;
        address proposer;
        ProposalType proposalType;
        address targetAddress;
        uint256 targetValue;
        string description;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 startTime;
        uint256 endTime;
        ProposalStatus status;
        bool executed;
    }
    
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => uint256)) public votes; // proposalId => voter => amount
    
    // Multi-sig members (can execute passed proposals)
    mapping(address => bool) public executors;
    uint256 public executorCount;
    
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        ProposalType proposalType,
        string description
    );
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 weight
    );
    event ProposalExecuted(uint256 indexed proposalId);
    event ExecutorAdded(address indexed executor);
    event ExecutorRemoved(address indexed executor);
    
    modifier onlyExecutor() {
        require(executors[msg.sender], "Not an executor");
        _;
    }
    
    /**
     * @dev Constructor
     * @param _governanceToken Address of the governance token (CIT)
     * @param _initialExecutors Array of initial executor addresses
     */
    constructor(address _governanceToken, address[] memory _initialExecutors) {
        require(_governanceToken != address(0), "Invalid token address");
        governanceToken = IERC20(_governanceToken);
        
        // Add initial executors
        for (uint256 i = 0; i < _initialExecutors.length; i++) {
            if (_initialExecutors[i] != address(0)) {
                executors[_initialExecutors[i]] = true;
                executorCount++;
                emit ExecutorAdded(_initialExecutors[i]);
            }
        }
    }
    
    /**
     * @dev Create a new proposal
     * @param proposalType Type of proposal
     * @param targetAddress Target address for the action
     * @param targetValue Target value (if applicable)
     * @param description Description of the proposal
     */
    function createProposal(
        ProposalType proposalType,
        address targetAddress,
        uint256 targetValue,
        string calldata description
    ) external returns (uint256) {
        require(
            governanceToken.balanceOf(msg.sender) >= PROPOSAL_THRESHOLD,
            "Insufficient tokens to propose"
        );
        require(bytes(description).length > 0, "Description required");
        
        uint256 proposalId = ++proposalCounter;
        uint256 endTime = block.timestamp + VOTING_PERIOD;
        
        proposals[proposalId] = Proposal({
            proposalId: proposalId,
            proposer: msg.sender,
            proposalType: proposalType,
            targetAddress: targetAddress,
            targetValue: targetValue,
            description: description,
            forVotes: 0,
            againstVotes: 0,
            startTime: block.timestamp,
            endTime: endTime,
            status: ProposalStatus.Active,
            executed: false
        });
        
        emit ProposalCreated(proposalId, msg.sender, proposalType, description);
        
        return proposalId;
    }
    
    /**
     * @dev Vote on a proposal
     * @param proposalId Proposal ID
     * @param support True to vote for, false to vote against
     */
    function vote(uint256 proposalId, bool support) external {
        Proposal storage proposal = proposals[proposalId];
        
        require(proposal.proposalId != 0, "Proposal does not exist");
        require(proposal.status == ProposalStatus.Active, "Proposal not active");
        require(block.timestamp <= proposal.endTime, "Voting period ended");
        require(!hasVoted[proposalId][msg.sender], "Already voted");
        
        uint256 weight = governanceToken.balanceOf(msg.sender);
        require(weight > 0, "No voting power");
        
        hasVoted[proposalId][msg.sender] = true;
        votes[proposalId][msg.sender] = weight;
        
        if (support) {
            proposal.forVotes += weight;
        } else {
            proposal.againstVotes += weight;
        }
        
        emit VoteCast(proposalId, msg.sender, support, weight);
    }
    
    /**
     * @dev Finalize a proposal after voting period
     * @param proposalId Proposal ID
     */
    function finalizeProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        
        require(proposal.proposalId != 0, "Proposal does not exist");
        require(proposal.status == ProposalStatus.Active, "Proposal not active");
        require(block.timestamp > proposal.endTime, "Voting period not ended");
        
        uint256 totalSupply = governanceToken.totalSupply();
        uint256 quorum = (totalSupply * QUORUM_PERCENTAGE) / 100;
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
        
        if (totalVotes >= quorum && proposal.forVotes > proposal.againstVotes) {
            proposal.status = ProposalStatus.Passed;
        } else {
            proposal.status = ProposalStatus.Failed;
        }
    }
    
    /**
     * @dev Execute a passed proposal (executors only)
     * @param proposalId Proposal ID
     */
    function executeProposal(uint256 proposalId) external onlyExecutor {
        Proposal storage proposal = proposals[proposalId];
        
        require(proposal.proposalId != 0, "Proposal does not exist");
        require(proposal.status == ProposalStatus.Passed, "Proposal not passed");
        require(!proposal.executed, "Already executed");
        
        proposal.executed = true;
        proposal.status = ProposalStatus.Executed;
        
        // Note: Actual execution would call the target contract
        // This would be implemented based on proposal type
        
        emit ProposalExecuted(proposalId);
    }
    
    /**
     * @dev Add an executor (existing executors only)
     * @param executor Address to add
     */
    function addExecutor(address executor) external onlyExecutor {
        require(executor != address(0), "Invalid address");
        require(!executors[executor], "Already an executor");
        
        executors[executor] = true;
        executorCount++;
        emit ExecutorAdded(executor);
    }
    
    /**
     * @dev Remove an executor (existing executors only)
     * @param executor Address to remove
     */
    function removeExecutor(address executor) external onlyExecutor {
        require(executors[executor], "Not an executor");
        require(executorCount > 1, "Cannot remove last executor");
        
        executors[executor] = false;
        executorCount--;
        emit ExecutorRemoved(executor);
    }
    
    /**
     * @dev Get proposal details
     * @param proposalId Proposal ID
     * @return Proposal struct
     */
    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return proposals[proposalId];
    }
    
    /**
     * @dev Check if proposal has reached quorum
     * @param proposalId Proposal ID
     * @return bool True if quorum reached
     */
    function hasQuorum(uint256 proposalId) external view returns (bool) {
        Proposal memory proposal = proposals[proposalId];
        uint256 totalSupply = governanceToken.totalSupply();
        uint256 quorum = (totalSupply * QUORUM_PERCENTAGE) / 100;
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
        
        return totalVotes >= quorum;
    }
    
    /**
     * @dev Get voting power of an address
     * @param account Address to check
     * @return uint256 Voting power (token balance)
     */
    function getVotingPower(address account) external view returns (uint256) {
        return governanceToken.balanceOf(account);
    }
}
