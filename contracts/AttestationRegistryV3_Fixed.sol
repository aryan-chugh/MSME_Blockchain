// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AttestationRegistryV3_Fixed - FIXED Multi-Oracle Consensus System
 * @dev Fixed commit-reveal implementation with:
 * 
 * ✅ FIXES IMPLEMENTED:
 * 1. ✅ Participation deposits - Oracles must deposit to participate
 * 2. ✅ Automatic slashing of non-revealing oracles
 * 3. ✅ Partial consensus - Can finalize with subset of oracles
 * 4. ✅ Deadline enforcement - Auto-triggers consensus after reveal deadline
 * 5. ✅ Minimum commitment time - Prevents front-running
 * 6. ✅ Grace period mechanism - Handles stragglers gracefully
 * 7. ✅ Emergency finalization - Governance can force-close stuck requests
 * 8. ✅ Proper state machine - Clear transitions with enforcement
 * 
 * PREVIOUS FLAWS FIXED:
 * ❌ No punishment for non-revealing → ✅ Auto-slash + deposit forfeiture
 * ❌ Requires ALL oracles → ✅ Partial consensus with minimum threshold
 * ❌ Passive deadlines → ✅ Active enforcement via public trigger functions
 * ❌ Front-running possible → ✅ Minimum commit duration enforced
 * ❌ No partial consensus → ✅ Can finalize with 66%+ of assigned oracles
 * ❌ Inconsistent states → ✅ Strict state machine with modifiers
 * ❌ No oracle deposit → ✅ Required deposit per assignment
 */

import "./OracleStakingV3.sol";
import "./CIToken.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract AttestationRegistryV3_Fixed is Pausable {
    using SafeERC20 for IERC20;
    
    OracleStakingV3 public immutable oracleStaking;
    IERC20 public immutable citToken;
    address public governance;
    
    // Consensus parameters
    uint256 public constant MIN_ORACLES_REQUIRED = 3;
    uint256 public constant MAX_ORACLES_ALLOWED = 7;
    uint256 public constant CONSENSUS_THRESHOLD = 66; // 66% agreement required
    uint256 public constant MIN_PARTICIPATION_THRESHOLD = 66; // 66% must reveal
    
    // NEW: Timing parameters with enforcement
    uint256 public constant ASSIGNMENT_PERIOD = 2 hours;
    uint256 public constant COMMIT_PERIOD = 12 hours;
    uint256 public constant MIN_COMMIT_DURATION = 1 hours; // Prevent front-running
    uint256 public constant REVEAL_PERIOD = 6 hours;
    uint256 public constant GRACE_PERIOD = 2 hours; // Extra time for stragglers
    
    // NEW: Participation deposit per oracle (10% of fee per oracle)
    uint256 public constant PARTICIPATION_DEPOSIT_PERCENTAGE = 1000; // 10%
    
    // Fee thresholds
    uint256 public constant MULTI_ORACLE_THRESHOLD = 200 * 1e18;
    uint256 public constant COMPLEX_THRESHOLD = 500 * 1e18;
    uint256 public constant CRITICAL_THRESHOLD = 1000 * 1e18;
    uint256 public constant PLATFORM_FEE_PERCENTAGE = 1000; // 10%
    
    // Oracle-MSME cooldown
    uint256 public constant ORACLE_MSME_COOLDOWN = 30 days;
    mapping(address => mapping(address => uint256)) public lastAttestationTime;
    
    enum RequestComplexity {
        Simple,   // 1 oracle
        Medium,   // 3 oracles
        Complex,  // 5 oracles
        Critical  // 7 oracles
    }
    
    enum RequestStatus {
        Pending,           // Waiting for oracle assignment
        OraclesAssigned,   // Oracles selected, deposits locked
        Committing,        // In commit phase
        Revealing,         // In reveal phase
        GracePeriod,       // Extra time for stragglers
        ConsensusReached,  // Majority consensus achieved
        PartialConsensus,  // Partial consensus (some oracles didn't reveal)
        NoConsensus,       // Failed to reach consensus
        Completed,         // Finalized
        Rejected,
        Cancelled
    }
    
    struct AttestationRequest {
        uint256 id;
        address msme;
        bytes32 schemaId;
        string documentHash;
        string documentUrl;
        bytes additionalData;
        uint256 feePaid;
        uint256 requestedValidityPeriod;
        uint256 timestamp;
        RequestStatus status;
        RequestComplexity complexity;
        
        // Multi-oracle fields
        address[] assignedOracles;
        uint256 requiredOracles;
        
        // NEW: Structured deadlines
        uint256 assignmentDeadline;
        uint256 commitDeadline;
        uint256 revealDeadline;
        uint256 graceDeadline;
        
        // NEW: Participation tracking
        uint256 oraclesCommitted;
        uint256 oraclesRevealed;
        uint256 depositPerOracle;
        
        uint256 completedAt;
        uint256 actualValidityPeriod;
        bytes consensusData;
        bool finalizedWithPartialConsensus; // NEW
    }
    
    struct OracleCommitment {
        bytes32 commitmentHash;
        uint256 commitTimestamp;
        bool hasCommitted;
        bool hasRevealed;
        bool hasBeenSlashed; // NEW
        bytes attestationData;
        bytes32 secret;
        uint256 depositAmount; // NEW
    }
    
    struct ConsensusResult {
        bytes32 majorityHash;
        uint256 majorityCount;
        uint256 totalOracles;
        uint256 participatingOracles; // NEW: Oracles who actually revealed
        address[] majorityOracles;
        address[] minorityOracles;
        address[] nonRevealingOracles; // NEW
        bool consensusReached;
        bool isPartialConsensus; // NEW
    }
    
    struct Attestation {
        bytes32 schemaId;
        address[] issuers;
        bytes data;
        uint256 timestamp;
        uint256 expiryTime;
        bool revoked;
        uint256 consensusPercentage;
        bool isPartialConsensus; // NEW
    }
    
    struct Schema {
        string name;
        string description;
        bool active;
        uint256 createdAt;
    }
    
    // Mappings
    mapping(uint256 => AttestationRequest) public attestationRequests;
    uint256 public requestCounter;
    mapping(address => uint256[]) public msmeRequests;
    mapping(address => uint256[]) public oracleRequests;
    mapping(uint256 => mapping(address => OracleCommitment)) public commitments;
    mapping(uint256 => ConsensusResult) public consensusResults;
    
    mapping(address => Attestation[]) public attestations;
    mapping(bytes32 => Schema) public schemas;
    mapping(address => mapping(bytes32 => uint256)) public attestationCount;
    
    // Collusion detection
    mapping(address => mapping(address => uint256)) public coAttestationCount;
    mapping(address => uint256) public totalAttestations;
    uint256 public constant COLLUSION_THRESHOLD = 70;
    mapping(address => bool) public flaggedForCollusion;
    
    // Diversity tracking
    mapping(address => uint256) public uniqueMSMEsServed;
    mapping(address => mapping(address => bool)) public hasServedMSME;
    
    uint256 public platformEarnings;
    uint256 public slashedDeposits; // NEW: Track slashed deposits
    bytes32[] public schemaList;
    uint256 private randomSeed;

    // Events
    event AttestationRequested(
        uint256 indexed requestId,
        address indexed msme,
        bytes32 indexed schemaId,
        uint256 feePaid,
        RequestComplexity complexity,
        uint256 requiredOracles
    );
    event OraclesAssigned(uint256 indexed requestId, address[] oracles, uint256 depositPerOracle);
    event OracleCommitted(uint256 indexed requestId, address indexed oracle);
    event OracleRevealed(uint256 indexed requestId, address indexed oracle);
    event OracleSlashedForNonReveal(uint256 indexed requestId, address indexed oracle, uint256 slashedAmount);
    event CommitPhaseStarted(uint256 indexed requestId, uint256 deadline);
    event RevealPhaseStarted(uint256 indexed requestId, uint256 deadline);
    event GracePeriodStarted(uint256 indexed requestId, uint256 deadline);
    event ConsensusCalculated(
        uint256 indexed requestId,
        bool consensusReached,
        bool isPartial,
        uint256 majorityCount,
        uint256 participatingOracles
    );
    event PartialConsensusFinalized(uint256 indexed requestId, uint256 revealedCount, uint256 requiredCount);
    event ConsensusRewardsDistributed(
        uint256 indexed requestId,
        address[] majorityOracles,
        address[] minorityOracles,
        address[] nonRevealingOracles,
        uint256 rewardPerOracle
    );
    event RequestCompleted(uint256 indexed requestId, uint256 attestationIndex);
    event NoConsensusHandled(uint256 indexed requestId, string reason);
    event AttestationMade(
        address indexed msmeId,
        address[] issuers,
        bytes32 indexed schemaId,
        uint256 attestationIndex,
        uint256 consensusPercentage
    );
    event SchemaRegistered(bytes32 indexed schemaId, string name);
    event EmergencyFinalization(uint256 indexed requestId, address indexed caller);

    modifier onlyGovernance() {
        require(msg.sender == governance, "Only governance");
        _;
    }
    
    modifier onlyAssignedOracle(uint256 requestId) {
        require(_isOracleAssigned(requestId, msg.sender), "Not assigned");
        _;
    }
    
    // NEW: Strict state enforcement
    modifier inStatus(uint256 requestId, RequestStatus requiredStatus) {
        require(attestationRequests[requestId].status == requiredStatus, "Invalid status");
        _;
    }

    constructor(
        address _stakingContractAddress,
        address _governance,
        address _citTokenAddress
    ) {
        require(_stakingContractAddress != address(0), "Invalid staking");
        require(_governance != address(0), "Invalid governance");
        require(_citTokenAddress != address(0), "Invalid token");
        
        oracleStaking = OracleStakingV3(_stakingContractAddress);
        governance = _governance;
        citToken = IERC20(_citTokenAddress);
        randomSeed = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao)));
    }

    /**
     * @dev MSME creates attestation request
     */
    function requestAttestation(
        bytes32 schemaId,
        string calldata documentHash,
        string calldata documentUrl,
        bytes calldata additionalData,
        uint256 feePaid,
        uint256 requestedValidityPeriod,
        bool forceSingleOracle
    ) external whenNotPaused returns (uint256) {
        require(schemas[schemaId].active, "Schema not active");
        require(bytes(documentHash).length > 0, "Document hash required");
        require(feePaid > 0, "Fee must be > 0");
        require(requestedValidityPeriod > 0 && requestedValidityPeriod <= 365 days, "Invalid validity");
        
        // Transfer fee to contract (escrow)
        citToken.safeTransferFrom(msg.sender, address(this), feePaid);
        
        requestCounter++;
        uint256 requestId = requestCounter;
        
        // Determine complexity
        RequestComplexity complexity = _determineComplexity(feePaid, forceSingleOracle);
        uint256 requiredOracles = _getRequiredOracles(complexity);
        
        // Calculate deposit per oracle
        uint256 depositPerOracle = (feePaid * PARTICIPATION_DEPOSIT_PERCENTAGE) / (10000 * requiredOracles);
        
        attestationRequests[requestId] = AttestationRequest({
            id: requestId,
            msme: msg.sender,
            schemaId: schemaId,
            documentHash: documentHash,
            documentUrl: documentUrl,
            additionalData: additionalData,
            feePaid: feePaid,
            requestedValidityPeriod: requestedValidityPeriod,
            timestamp: block.timestamp,
            status: RequestStatus.Pending,
            complexity: complexity,
            assignedOracles: new address[](0),
            requiredOracles: requiredOracles,
            assignmentDeadline: block.timestamp + ASSIGNMENT_PERIOD,
            commitDeadline: 0,
            revealDeadline: 0,
            graceDeadline: 0,
            oraclesCommitted: 0,
            oraclesRevealed: 0,
            depositPerOracle: depositPerOracle,
            completedAt: 0,
            actualValidityPeriod: 0,
            consensusData: "",
            finalizedWithPartialConsensus: false
        });
        
        msmeRequests[msg.sender].push(requestId);
        
        // Auto-assign oracles
        if (complexity != RequestComplexity.Simple) {
            _autoAssignOracles(requestId);
        }
        
        emit AttestationRequested(requestId, msg.sender, schemaId, feePaid, complexity, requiredOracles);
        
        return requestId;
    }
    
    /**
     * @dev Auto-assign oracles with DEPOSITS
     */
    function _autoAssignOracles(uint256 requestId) internal {
        AttestationRequest storage request = attestationRequests[requestId];
        address[] memory eligibleOracles = _getEligibleOracles(request.msme);
        
        require(eligibleOracles.length >= request.requiredOracles, "Insufficient oracles");
        
        address[] memory selectedOracles = new address[](request.requiredOracles);
        
        for (uint256 i = 0; i < request.requiredOracles; i++) {
            address selected = _weightedRandomSelect(eligibleOracles, request.msme);
            selectedOracles[i] = selected;
            eligibleOracles = _removeFromArray(eligibleOracles, selected);
            oracleRequests[selected].push(requestId);
            
            // NEW: Initialize commitment with deposit requirement
            commitments[requestId][selected].depositAmount = request.depositPerOracle;
        }
        
        request.assignedOracles = selectedOracles;
        request.status = RequestStatus.OraclesAssigned;
        
        // NEW: Set commit deadline
        request.commitDeadline = block.timestamp + COMMIT_PERIOD;
        
        emit OraclesAssigned(requestId, selectedOracles, request.depositPerOracle);
        emit CommitPhaseStarted(requestId, request.commitDeadline);
    }
    
    /**
     * @dev Oracle commits with DEPOSIT (FIX #1: Participation deposit)
     */
    function commitAttestation(uint256 requestId, bytes32 commitmentHash) 
        external 
        onlyAssignedOracle(requestId) 
        inStatus(requestId, RequestStatus.OraclesAssigned) 
    {
        AttestationRequest storage request = attestationRequests[requestId];
        require(block.timestamp <= request.commitDeadline, "Commit period expired");
        
        OracleCommitment storage commitment = commitments[requestId][msg.sender];
        require(!commitment.hasCommitted, "Already committed");
        
        // NEW: Require deposit from oracle
        uint256 depositAmount = commitment.depositAmount;
        citToken.safeTransferFrom(msg.sender, address(this), depositAmount);
        
        commitment.commitmentHash = commitmentHash;
        commitment.commitTimestamp = block.timestamp;
        commitment.hasCommitted = true;
        
        request.oraclesCommitted++;
        
        emit OracleCommitted(requestId, msg.sender);
        
        // NEW: Auto-transition to Committing when first oracle commits
        if (request.status == RequestStatus.OraclesAssigned) {
            request.status = RequestStatus.Committing;
        }
        
        // NEW: Auto-start reveal phase when all committed OR minimum time passed
        if (request.oraclesCommitted == request.requiredOracles) {
            _startRevealPhase(requestId);
        }
    }
    
    /**
     * @dev Start reveal phase (FIX #4: Minimum commit duration)
     */
    function _startRevealPhase(uint256 requestId) internal {
        AttestationRequest storage request = attestationRequests[requestId];
        
        // Ensure minimum commit duration has passed (prevent front-running)
        uint256 firstCommitTime = _getFirstCommitTime(requestId);
        require(
            block.timestamp >= firstCommitTime + MIN_COMMIT_DURATION,
            "Minimum commit duration not met"
        );
        
        request.status = RequestStatus.Revealing;
        request.revealDeadline = block.timestamp + REVEAL_PERIOD;
        request.graceDeadline = request.revealDeadline + GRACE_PERIOD;
        
        emit RevealPhaseStarted(requestId, request.revealDeadline);
    }
    
    /**
     * @dev Public function to force start reveal phase after deadline
     */
    function forceStartRevealPhase(uint256 requestId) external {
        AttestationRequest storage request = attestationRequests[requestId];
        require(request.status == RequestStatus.Committing, "Not in committing phase");
        require(block.timestamp > request.commitDeadline, "Commit period not ended");
        
        // Check if minimum participation met (at least 66% committed)
        uint256 participationRate = (request.oraclesCommitted * 100) / request.requiredOracles;
        require(participationRate >= MIN_PARTICIPATION_THRESHOLD, "Insufficient commits");
        
        _startRevealPhase(requestId);
    }
    
    /**
     * @dev Oracle reveals attestation (FIX #8: Proper state enforcement)
     */
    function revealAttestation(
        uint256 requestId,
        bytes calldata attestationData,
        uint256 proposedValidityPeriod,
        bytes32 secret
    ) external onlyAssignedOracle(requestId) {
        AttestationRequest storage request = attestationRequests[requestId];
        
        // NEW: Accept reveals during Revealing OR GracePeriod
        require(
            request.status == RequestStatus.Revealing || 
            request.status == RequestStatus.GracePeriod,
            "Not in reveal phase"
        );
        require(block.timestamp <= request.graceDeadline, "Grace period expired");
        
        OracleCommitment storage commitment = commitments[requestId][msg.sender];
        require(commitment.hasCommitted, "Must commit first");
        require(!commitment.hasRevealed, "Already revealed");
        
        // Verify commitment
        bytes32 computedHash = keccak256(abi.encode(attestationData, proposedValidityPeriod, secret));
        require(computedHash == commitment.commitmentHash, "Commitment mismatch");
        
        // Validate validity period
        uint256 minValidity = (request.requestedValidityPeriod * 80) / 100;
        uint256 maxValidity = (request.requestedValidityPeriod * 120) / 100;
        require(
            proposedValidityPeriod >= minValidity && proposedValidityPeriod <= maxValidity,
            "Validity out of range"
        );
        
        commitment.attestationData = attestationData;
        commitment.secret = secret;
        commitment.hasRevealed = true;
        
        request.oraclesRevealed++;
        
        emit OracleRevealed(requestId, msg.sender);
        
        // NEW: Check if we can calculate consensus (don't wait for ALL)
        _checkAndCalculateConsensus(requestId);
    }
    
    /**
     * @dev Check if consensus can be calculated (FIX #2 & #5: Partial consensus)
     */
    function _checkAndCalculateConsensus(uint256 requestId) internal {
        AttestationRequest storage request = attestationRequests[requestId];
        
        // Option 1: All oracles revealed
        if (request.oraclesRevealed == request.requiredOracles) {
            _calculateConsensus(requestId, false);
            return;
        }
        
        // Option 2: After reveal deadline, calculate with who revealed
        if (block.timestamp > request.revealDeadline) {
            uint256 participationRate = (request.oraclesRevealed * 100) / request.requiredOracles;
            
            if (participationRate >= MIN_PARTICIPATION_THRESHOLD) {
                // Enough oracles revealed - calculate partial consensus
                request.status = RequestStatus.GracePeriod;
                emit GracePeriodStarted(requestId, request.graceDeadline);
            }
        }
    }
    
    /**
     * @dev Public function to finalize after deadlines (FIX #3: Active enforcement)
     */
    function finalizeAfterDeadline(uint256 requestId) external {
        AttestationRequest storage request = attestationRequests[requestId];
        
        require(
            request.status == RequestStatus.Revealing || 
            request.status == RequestStatus.GracePeriod,
            "Not in finalizable state"
        );
        
        // Must be past grace deadline
        require(block.timestamp > request.graceDeadline, "Grace period not ended");
        
        // Check participation threshold
        uint256 participationRate = (request.oraclesRevealed * 100) / request.requiredOracles;
        
        if (participationRate >= MIN_PARTICIPATION_THRESHOLD) {
            // Calculate consensus with partial reveals
            _calculateConsensus(requestId, true);
        } else {
            // Not enough participation - handle failure
            _handleInsufficientParticipation(requestId);
        }
    }
    
    /**
     * @dev Calculate consensus (FIX #5: Works with partial reveals)
     */
    function _calculateConsensus(uint256 requestId, bool isPartial) internal {
        AttestationRequest storage request = attestationRequests[requestId];
        ConsensusResult storage result = consensusResults[requestId];
        
        result.totalOracles = request.requiredOracles;
        result.participatingOracles = request.oraclesRevealed;
        result.isPartialConsensus = isPartial;
        
        // Slash non-revealing oracles (FIX #1: Auto-slash)
        if (isPartial) {
            _slashNonRevealingOracles(requestId);
        }
        
        // Count consensus among REVEALED attestations
        bytes32[] memory uniqueHashes = new bytes32[](request.oraclesRevealed);
        uint256[] memory hashCounts = new uint256[](request.oraclesRevealed);
        address[][] memory hashOraclesList = new address[][](request.oraclesRevealed);
        uint256 uniqueCount = 0;
        
        for (uint256 i = 0; i < request.assignedOracles.length; i++) {
            address oracle = request.assignedOracles[i];
            OracleCommitment storage commitment = commitments[requestId][oracle];
            
            if (!commitment.hasRevealed) {
                result.nonRevealingOracles.push(oracle);
                continue;
            }
            
            bytes32 dataHash = keccak256(commitment.attestationData);
            
            bool foundHash = false;
            for (uint256 j = 0; j < uniqueCount; j++) {
                if (uniqueHashes[j] == dataHash) {
                    hashCounts[j]++;
                    address[] memory temp = new address[](hashCounts[j]);
                    for (uint256 k = 0; k < hashCounts[j] - 1; k++) {
                        temp[k] = hashOraclesList[j][k];
                    }
                    temp[hashCounts[j] - 1] = oracle;
                    hashOraclesList[j] = temp;
                    foundHash = true;
                    break;
                }
            }
            
            if (!foundHash) {
                uniqueHashes[uniqueCount] = dataHash;
                hashCounts[uniqueCount] = 1;
                address[] memory temp = new address[](1);
                temp[0] = oracle;
                hashOraclesList[uniqueCount] = temp;
                uniqueCount++;
            }
        }
        
        // Find majority among PARTICIPATING oracles
        uint256 requiredConsensus = (result.participatingOracles * CONSENSUS_THRESHOLD) / 100;
        uint256 majorityIndex = type(uint256).max;
        uint256 maxCount = 0;
        
        for (uint256 i = 0; i < uniqueCount; i++) {
            if (hashCounts[i] > maxCount) {
                maxCount = hashCounts[i];
                majorityIndex = i;
            }
        }
        
        if (majorityIndex != type(uint256).max && maxCount >= requiredConsensus) {
            result.majorityCount = maxCount;
            result.majorityHash = uniqueHashes[majorityIndex];
            
            for (uint256 i = 0; i < hashOraclesList[majorityIndex].length; i++) {
                result.majorityOracles.push(hashOraclesList[majorityIndex][i]);
            }
            
            for (uint256 i = 0; i < request.assignedOracles.length; i++) {
                address oracle = request.assignedOracles[i];
                OracleCommitment storage commitment = commitments[requestId][oracle];
                
                if (!commitment.hasRevealed) continue;
                
                bool isMajority = false;
                for (uint256 j = 0; j < result.majorityOracles.length; j++) {
                    if (result.majorityOracles[j] == oracle) {
                        isMajority = true;
                        break;
                    }
                }
                if (!isMajority) {
                    result.minorityOracles.push(oracle);
                }
            }
        }
        
        uint256 consensusPercentage = (result.majorityCount * 100) / result.participatingOracles;
        
        if (result.majorityCount >= requiredConsensus && consensusPercentage >= CONSENSUS_THRESHOLD) {
            result.consensusReached = true;
            request.status = isPartial ? RequestStatus.PartialConsensus : RequestStatus.ConsensusReached;
            request.consensusData = commitments[requestId][result.majorityOracles[0]].attestationData;
            request.finalizedWithPartialConsensus = isPartial;
            
            _distributeConsensusRewards(requestId);
            _finalizeAttestation(requestId, consensusPercentage, isPartial);
            
            if (isPartial) {
                emit PartialConsensusFinalized(requestId, request.oraclesRevealed, request.requiredOracles);
            }
        } else {
            result.consensusReached = false;
            request.status = RequestStatus.NoConsensus;
            _handleNoConsensus(requestId);
        }
        
        emit ConsensusCalculated(
            requestId, 
            result.consensusReached, 
            isPartial, 
            result.majorityCount, 
            result.participatingOracles
        );
    }
    
    /**
     * @dev Slash non-revealing oracles (FIX #1 & #7: Deposit slashing)
     */
    function _slashNonRevealingOracles(uint256 requestId) internal {
        AttestationRequest storage request = attestationRequests[requestId];
        
        for (uint256 i = 0; i < request.assignedOracles.length; i++) {
            address oracle = request.assignedOracles[i];
            OracleCommitment storage commitment = commitments[requestId][oracle];
            
            if (commitment.hasCommitted && !commitment.hasRevealed && !commitment.hasBeenSlashed) {
                // Slash the deposit
                uint256 slashAmount = commitment.depositAmount;
                slashedDeposits += slashAmount;
                commitment.hasBeenSlashed = true;
                
                // Reputation penalty
                oracleStaking.updateReputation(oracle, -20, "Failed to reveal");
                
                emit OracleSlashedForNonReveal(requestId, oracle, slashAmount);
            }
        }
    }
    
    /**
     * @dev Handle insufficient participation
     */
    function _handleInsufficientParticipation(uint256 requestId) internal {
        AttestationRequest storage request = attestationRequests[requestId];
        
        // Slash all non-revealing oracles
        _slashNonRevealingOracles(requestId);
        
        request.status = RequestStatus.NoConsensus;
        
        // Refund 80% to MSME, keep 20% as platform fee
        uint256 refundAmount = (request.feePaid * 80) / 100;
        platformEarnings += (request.feePaid * 20) / 100;
        citToken.safeTransfer(request.msme, refundAmount);
        
        // Return deposits to oracles who did reveal
        for (uint256 i = 0; i < request.assignedOracles.length; i++) {
            address oracle = request.assignedOracles[i];
            OracleCommitment storage commitment = commitments[requestId][oracle];
            
            if (commitment.hasRevealed) {
                citToken.safeTransfer(oracle, commitment.depositAmount);
            }
        }
        
        emit NoConsensusHandled(requestId, "Insufficient oracle participation");
    }
    
    /**
     * @dev Distribute rewards (includes deposit returns)
     */
    function _distributeConsensusRewards(uint256 requestId) internal {
        AttestationRequest storage request = attestationRequests[requestId];
        ConsensusResult storage result = consensusResults[requestId];
        
        uint256 totalFee = request.feePaid;
        uint256 platformFee = (totalFee * PLATFORM_FEE_PERCENTAGE) / 10000;
        uint256 oracleFees = totalFee - platformFee;
        
        platformEarnings += platformFee;
        
        // Add slashed deposits to oracle rewards pool
        uint256 totalRewardPool = oracleFees + (result.nonRevealingOracles.length * request.depositPerOracle);
        uint256 majorityReward = totalRewardPool / result.majorityOracles.length;
        
        for (uint256 i = 0; i < result.majorityOracles.length; i++) {
            address oracle = result.majorityOracles[i];
            
            // Return deposit + reward
            uint256 totalPayout = majorityReward + request.depositPerOracle;
            citToken.safeTransfer(oracle, totalPayout);
            
            oracleStaking.updateReputation(oracle, 5, "Consensus agreement");
            oracleStaking.incrementAttestationCount(oracle);
            
            if (!hasServedMSME[oracle][request.msme]) {
                hasServedMSME[oracle][request.msme] = true;
                uniqueMSMEsServed[oracle]++;
            }
            
            lastAttestationTime[oracle][request.msme] = block.timestamp;
        }
        
        // Minority oracles get deposit back but reputation penalty
        for (uint256 i = 0; i < result.minorityOracles.length; i++) {
            address oracle = result.minorityOracles[i];
            citToken.safeTransfer(oracle, request.depositPerOracle);
            oracleStaking.updateReputation(oracle, -10, "Consensus disagreement");
        }
        
        emit ConsensusRewardsDistributed(
            requestId,
            result.majorityOracles,
            result.minorityOracles,
            result.nonRevealingOracles,
            majorityReward
        );
    }
    
    /**
     * @dev Finalize attestation
     */
    function _finalizeAttestation(uint256 requestId, uint256 consensusPercentage, bool isPartial) internal {
        AttestationRequest storage request = attestationRequests[requestId];
        ConsensusResult storage result = consensusResults[requestId];
        
        uint256 avgValidity = request.requestedValidityPeriod;
        uint256 expiryTime = block.timestamp + avgValidity;
        
        attestations[request.msme].push(Attestation({
            schemaId: request.schemaId,
            issuers: result.majorityOracles,
            data: request.consensusData,
            timestamp: block.timestamp,
            expiryTime: expiryTime,
            revoked: false,
            consensusPercentage: consensusPercentage,
            isPartialConsensus: isPartial
        }));
        
        uint256 attestationIndex = attestations[request.msme].length - 1;
        attestationCount[request.msme][request.schemaId]++;
        
        request.status = RequestStatus.Completed;
        request.completedAt = block.timestamp;
        request.actualValidityPeriod = avgValidity;
        
        emit AttestationMade(
            request.msme,
            result.majorityOracles,
            request.schemaId,
            attestationIndex,
            consensusPercentage
        );
        emit RequestCompleted(requestId, attestationIndex);
    }
    
    /**
     * @dev Handle no consensus
     */
    function _handleNoConsensus(uint256 requestId) internal {
        AttestationRequest storage request = attestationRequests[requestId];
        
        uint256 totalFee = request.feePaid;
        uint256 platformFee = (totalFee * 20) / 100;
        uint256 baseCompensation = (totalFee * 20) / 100 / request.oraclesRevealed;
        
        platformEarnings += platformFee;
        
        for (uint256 i = 0; i < request.assignedOracles.length; i++) {
            address oracle = request.assignedOracles[i];
            OracleCommitment storage commitment = commitments[requestId][oracle];
            
            if (commitment.hasRevealed) {
                // Return deposit + small compensation
                citToken.safeTransfer(oracle, baseCompensation + request.depositPerOracle);
                oracleStaking.updateReputation(oracle, -5, "No consensus");
            }
        }
        
        uint256 refundAmount = (totalFee * 60) / 100;
        citToken.safeTransfer(request.msme, refundAmount);
        
        emit NoConsensusHandled(requestId, "Oracles could not reach agreement");
    }
    
    /**
     * @dev Emergency finalization by governance (FIX #7)
     */
    function emergencyFinalize(uint256 requestId) external onlyGovernance {
        AttestationRequest storage request = attestationRequests[requestId];
        
        require(
            request.status == RequestStatus.Committing ||
            request.status == RequestStatus.Revealing ||
            request.status == RequestStatus.GracePeriod,
            "Not in emergency-finalizable state"
        );
        
        // Must be significantly past deadline
        require(block.timestamp > request.graceDeadline + 1 days, "Too early for emergency");
        
        if (request.oraclesRevealed >= MIN_ORACLES_REQUIRED) {
            _calculateConsensus(requestId, true);
        } else {
            _handleInsufficientParticipation(requestId);
        }
        
        emit EmergencyFinalization(requestId, msg.sender);
    }
    
    // Helper functions
    
    function _getFirstCommitTime(uint256 requestId) internal view returns (uint256) {
        AttestationRequest storage request = attestationRequests[requestId];
        uint256 earliest = type(uint256).max;
        
        for (uint256 i = 0; i < request.assignedOracles.length; i++) {
            uint256 commitTime = commitments[requestId][request.assignedOracles[i]].commitTimestamp;
            if (commitTime > 0 && commitTime < earliest) {
                earliest = commitTime;
            }
        }
        
        return earliest;
    }
    
    function _determineComplexity(uint256 fee, bool forceSingle) internal pure returns (RequestComplexity) {
        if (forceSingle && fee < MULTI_ORACLE_THRESHOLD) return RequestComplexity.Simple;
        if (fee >= CRITICAL_THRESHOLD) return RequestComplexity.Critical;
        if (fee >= COMPLEX_THRESHOLD) return RequestComplexity.Complex;
        if (fee >= MULTI_ORACLE_THRESHOLD) return RequestComplexity.Medium;
        return RequestComplexity.Simple;
    }
    
    function _getRequiredOracles(RequestComplexity complexity) internal pure returns (uint256) {
        if (complexity == RequestComplexity.Critical) return 7;
        if (complexity == RequestComplexity.Complex) return 5;
        if (complexity == RequestComplexity.Medium) return 3;
        return 1;
    }
    
    function _getEligibleOracles(address msme) internal view returns (address[] memory) {
        address[] memory allOracles = oracleStaking.getAllOracles();
        uint256 eligibleCount = 0;
        
        for (uint256 i = 0; i < allOracles.length; i++) {
            if (_isOracleEligible(allOracles[i], msme)) {
                eligibleCount++;
            }
        }
        
        address[] memory eligible = new address[](eligibleCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allOracles.length; i++) {
            if (_isOracleEligible(allOracles[i], msme)) {
                eligible[index] = allOracles[i];
                index++;
            }
        }
        
        return eligible;
    }
    
    function _isOracleEligible(address oracle, address msme) internal view returns (bool) {
        if (!oracleStaking.isValidOracle(oracle)) return false;
        
        uint256 lastTime = lastAttestationTime[oracle][msme];
        if (lastTime > 0 && block.timestamp < lastTime + ORACLE_MSME_COOLDOWN) {
            return false;
        }
        
        if (flaggedForCollusion[oracle]) return false;
        
        return true;
    }
    
    function _weightedRandomSelect(address[] memory oracles, address msme) internal returns (address) {
        require(oracles.length > 0, "No oracles");
        if (oracles.length == 1) return oracles[0];
        
        uint256[] memory weights = new uint256[](oracles.length);
        uint256 totalWeight = 0;
        
        for (uint256 i = 0; i < oracles.length; i++) {
            uint256 weight = _calculateOracleWeight(oracles[i], msme);
            weights[i] = weight;
            totalWeight += weight;
        }
        
        randomSeed = uint256(keccak256(abi.encodePacked(randomSeed, block.timestamp, block.prevrandao, msg.sender)));
        uint256 randomValue = randomSeed % totalWeight;
        uint256 cumulativeWeight = 0;
        
        for (uint256 i = 0; i < oracles.length; i++) {
            cumulativeWeight += weights[i];
            if (randomValue < cumulativeWeight) {
                return oracles[i];
            }
        }
        
        return oracles[oracles.length - 1];
    }
    
    function _calculateOracleWeight(address oracle, address msme) internal view returns (uint256) {
        uint256 reputation = oracleStaking.getCurrentReputation(oracle);
        uint256 stake = oracleStaking.getOracleStake(oracle);
        uint256 diversity = uniqueMSMEsServed[oracle];
        
        uint256 repWeight = (reputation * 40) / 200;
        uint256 stakeWeight = (stake / (50000 * 1e18)) * 30;
        if (stakeWeight > 30) stakeWeight = 30;
        
        uint256 diversityWeight = diversity >= 100 ? 20 : (diversity * 20) / 100;
        uint256 randomWeight = 10;
        
        return repWeight + stakeWeight + diversityWeight + randomWeight;
    }
    
    function _isOracleAssigned(uint256 requestId, address oracle) internal view returns (bool) {
        address[] memory assigned = attestationRequests[requestId].assignedOracles;
        for (uint256 i = 0; i < assigned.length; i++) {
            if (assigned[i] == oracle) return true;
        }
        return false;
    }
    
    function _removeFromArray(address[] memory arr, address toRemove) internal pure returns (address[] memory) {
        address[] memory result = new address[](arr.length - 1);
        uint256 index = 0;
        
        for (uint256 i = 0; i < arr.length; i++) {
            if (arr[i] != toRemove) {
                result[index] = arr[i];
                index++;
            }
        }
        
        return result;
    }
    
    // View functions
    
    function registerSchema(bytes32 schemaId, string calldata name, string calldata description) external {
        require(schemas[schemaId].createdAt == 0, "Schema exists");
        
        schemas[schemaId] = Schema({
            name: name,
            description: description,
            active: true,
            createdAt: block.timestamp
        });
        
        schemaList.push(schemaId);
        emit SchemaRegistered(schemaId, name);
    }
    
    function getAttestations(address msmeId) external view returns (Attestation[] memory) {
        return attestations[msmeId];
    }
    
    function getRequestDetails(uint256 requestId) external view returns (AttestationRequest memory) {
        return attestationRequests[requestId];
    }
    
    function getConsensusResult(uint256 requestId) external view returns (ConsensusResult memory) {
        return consensusResults[requestId];
    }
    
    function getMSMERequests(address msme) external view returns (uint256[] memory) {
        return msmeRequests[msme];
    }
    
    function getOracleRequests(address oracle) external view returns (uint256[] memory) {
        return oracleRequests[oracle];
    }
    
    function getPendingRequests() external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i <= requestCounter; i++) {
            RequestStatus status = attestationRequests[i].status;
            if (status == RequestStatus.Pending || status == RequestStatus.OraclesAssigned) {
                count++;
            }
        }
        
        uint256[] memory pending = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= requestCounter; i++) {
            RequestStatus status = attestationRequests[i].status;
            if (status == RequestStatus.Pending || status == RequestStatus.OraclesAssigned) {
                pending[index] = i;
                index++;
            }
        }
        
        return pending;
    }
    
    function getOracleDiversityScore(address oracle) external view returns (uint256) {
        return uniqueMSMEsServed[oracle];
    }
    
    function pause() external onlyGovernance {
        _pause();
    }
    
    function unpause() external onlyGovernance {
        _unpause();
    }
    
    function withdrawPlatformFees(address to, uint256 amount) external onlyGovernance {
        require(amount <= platformEarnings, "Insufficient earnings");
        platformEarnings -= amount;
        citToken.safeTransfer(to, amount);
    }
    
    function withdrawSlashedDeposits(address to, uint256 amount) external onlyGovernance {
        require(amount <= slashedDeposits, "Insufficient slashed");
        slashedDeposits -= amount;
        citToken.safeTransfer(to, amount);
    }
}
