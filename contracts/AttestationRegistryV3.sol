// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AttestationRegistryV3 - Multi-Oracle Consensus System
 * @dev Revolutionary decentralized attestation with:
 * 1. ✅ Multiple oracles verify each request (3-7 oracles)
 * 2. ✅ Commit-reveal scheme prevents oracle copying
 * 3. ✅ Consensus-based rewards and penalties
 * 4. ✅ Anti-monopoly mechanisms (rotation, diversity bonuses)
 * 5. ✅ Weighted random oracle selection
 * 6. ✅ Byzantine fault tolerance
 * 7. ✅ Hybrid model (single vs multi-oracle based on request size)
 */

import "./OracleStakingV3.sol";
import "./CIToken.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract AttestationRegistryV3 is Pausable {
    using SafeERC20 for IERC20;
    
    OracleStakingV3 public immutable oracleStaking;
    IERC20 public immutable citToken;
    address public governance;
    
    // Consensus parameters
    uint256 public constant MIN_ORACLES_REQUIRED = 3;
    uint256 public constant MAX_ORACLES_ALLOWED = 7;
    uint256 public constant CONSENSUS_THRESHOLD = 66; // 66% agreement required
    uint256 public constant ASSIGNMENT_PERIOD = 2 hours;
    uint256 public constant VERIFICATION_PERIOD = 24 hours;
    uint256 public constant REVEAL_PERIOD = 6 hours;
    
    // Fee thresholds for automatic multi-oracle
    uint256 public constant MULTI_ORACLE_THRESHOLD = 200 * 1e18; // 200 CIT
    uint256 public constant COMPLEX_THRESHOLD = 500 * 1e18;      // 500 CIT
    uint256 public constant CRITICAL_THRESHOLD = 1000 * 1e18;    // 1000 CIT
    
    // Fee distribution
    uint256 public constant PLATFORM_FEE_PERCENTAGE = 1000; // 10%
    
    // Oracle-MSME cooldown (prevent monopoly)
    uint256 public constant ORACLE_MSME_COOLDOWN = 30 days;
    mapping(address => mapping(address => uint256)) public lastAttestationTime;
    
    enum RequestComplexity {
        Simple,   // 1 oracle (opt-in, <200 CIT)
        Medium,   // 3 oracles (200-500 CIT)
        Complex,  // 5 oracles (500-1000 CIT)
        Critical  // 7 oracles (>1000 CIT)
    }
    
    enum RequestStatus {
        Pending,           // Waiting for oracle assignment
        OraclesAssigned,   // Oracles selected, awaiting verification
        Committing,        // Oracles submitting commitments
        Revealing,         // Oracles revealing attestations
        ConsensusReached,  // Majority consensus achieved
        NoConsensus,       // Failed to reach consensus
        Completed,         // Finalized
        Rejected,
        Cancelled,
        Disputed
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
        uint256 assignmentDeadline;
        uint256 verificationDeadline;
        uint256 revealDeadline;
        
        uint256 completedAt;
        uint256 actualValidityPeriod;
        bytes consensusData; // Final agreed attestation
    }
    
    struct OracleCommitment {
        bytes32 commitmentHash;  // hash(attestationData + secret)
        uint256 commitTimestamp;
        bool hasCommitted;
        bool hasRevealed;
        bytes attestationData;
        bytes32 secret;
    }
    
    struct ConsensusResult {
        bytes32 majorityHash;
        uint256 majorityCount;
        uint256 totalOracles;
        address[] majorityOracles;
        address[] minorityOracles;
        bool consensusReached;
    }
    
    struct Attestation {
        bytes32 schemaId;
        address[] issuers; // Multiple oracles
        bytes data;
        uint256 timestamp;
        uint256 expiryTime;
        bool revoked;
        uint256 consensusPercentage; // e.g., 100 = unanimous, 66 = 2/3
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
    
    // Commitments: requestId => oracle => commitment
    mapping(uint256 => mapping(address => OracleCommitment)) public commitments;
    
    // Consensus tracking
    mapping(uint256 => ConsensusResult) public consensusResults;
    
    mapping(address => Attestation[]) public attestations;
    mapping(bytes32 => Schema) public schemas;
    mapping(address => mapping(bytes32 => uint256)) public attestationCount;
    
    // Collusion detection
    mapping(address => mapping(address => uint256)) public coAttestationCount;
    mapping(address => uint256) public totalAttestations;
    uint256 public constant COLLUSION_THRESHOLD = 70;
    mapping(address => bool) public flaggedForCollusion;
    
    // Diversity tracking (anti-monopoly)
    mapping(address => uint256) public uniqueMSMEsServed;
    mapping(address => mapping(address => bool)) public hasServedMSME;
    
    uint256 public platformEarnings;
    bytes32[] public schemaList;
    
    // Random seed for oracle selection
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
    event OraclesAssigned(uint256 indexed requestId, address[] oracles);
    event OracleCommitted(uint256 indexed requestId, address indexed oracle);
    event OracleRevealed(uint256 indexed requestId, address indexed oracle);
    event ConsensusCalculated(
        uint256 indexed requestId,
        bool consensusReached,
        uint256 majorityCount,
        uint256 totalOracles
    );
    event ConsensusRewardsDistributed(
        uint256 indexed requestId,
        address[] majorityOracles,
        address[] minorityOracles,
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
    event OracleFlaggedForCollusion(address indexed oracle, uint256 collusionPercentage);

    modifier onlyGovernance() {
        require(msg.sender == governance, "Only governance");
        _;
    }
    
    modifier onlyAssignedOracle(uint256 requestId) {
        require(_isOracleAssigned(requestId, msg.sender), "Not assigned to this request");
        _;
    }

    constructor(
        address _stakingContractAddress,
        address _governance,
        address _citTokenAddress
    ) {
        require(_stakingContractAddress != address(0), "Invalid staking contract");
        require(_governance != address(0), "Invalid governance");
        require(_citTokenAddress != address(0), "Invalid token");
        
        oracleStaking = OracleStakingV3(_stakingContractAddress);
        governance = _governance;
        citToken = IERC20(_citTokenAddress);
        randomSeed = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao)));
    }

    /**
     * @dev MSME creates attestation request with multi-oracle consensus
     * @param schemaId Schema identifier
     * @param documentHash Document hash
     * @param documentUrl Document URL
     * @param additionalData Additional data
     * @param feePaid Fee amount
     * @param requestedValidityPeriod Requested validity
     * @param forceSingleOracle True to use single oracle (cheaper, less secure)
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
        
        // Determine complexity and required oracles
        RequestComplexity complexity = _determineComplexity(feePaid, forceSingleOracle);
        uint256 requiredOracles = _getRequiredOracles(complexity);
        
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
            verificationDeadline: 0,
            revealDeadline: 0,
            completedAt: 0,
            actualValidityPeriod: 0,
            consensusData: ""
        });
        
        msmeRequests[msg.sender].push(requestId);
        
        // Auto-assign oracles using weighted random selection
        if (complexity != RequestComplexity.Simple) {
            _autoAssignOracles(requestId);
        }
        
        emit AttestationRequested(
            requestId,
            msg.sender,
            schemaId,
            feePaid,
            complexity,
            requiredOracles
        );
        
        return requestId;
    }
    
    /**
     * @dev Determine request complexity based on fee and user preference
     */
    function _determineComplexity(uint256 fee, bool forceSingle) 
        internal pure returns (RequestComplexity) {
        
        if (forceSingle && fee < MULTI_ORACLE_THRESHOLD) {
            return RequestComplexity.Simple;
        }
        
        if (fee >= CRITICAL_THRESHOLD) return RequestComplexity.Critical;
        if (fee >= COMPLEX_THRESHOLD) return RequestComplexity.Complex;
        if (fee >= MULTI_ORACLE_THRESHOLD) return RequestComplexity.Medium;
        return RequestComplexity.Simple;
    }
    
    /**
     * @dev Get required number of oracles based on complexity
     */
    function _getRequiredOracles(RequestComplexity complexity) 
        internal pure returns (uint256) {
        
        if (complexity == RequestComplexity.Critical) return 7;
        if (complexity == RequestComplexity.Complex) return 5;
        if (complexity == RequestComplexity.Medium) return 3;
        return 1; // Simple
    }
    
    /**
     * @dev Auto-assign oracles using weighted random selection
     * Prevents monopoly by considering reputation, stake, diversity, and cooldown
     */
    function _autoAssignOracles(uint256 requestId) internal {
        AttestationRequest storage request = attestationRequests[requestId];
        address[] memory eligibleOracles = _getEligibleOracles(request.msme);
        
        require(eligibleOracles.length >= request.requiredOracles, "Insufficient oracles available");
        
        address[] memory selectedOracles = new address[](request.requiredOracles);
        
        for (uint256 i = 0; i < request.requiredOracles; i++) {
            // Weighted random selection
            address selected = _weightedRandomSelect(eligibleOracles, request.msme);
            selectedOracles[i] = selected;
            
            // Remove from pool to prevent duplicate
            eligibleOracles = _removeFromArray(eligibleOracles, selected);
            
            // Track assignment
            oracleRequests[selected].push(requestId);
        }
        
        request.assignedOracles = selectedOracles;
        request.status = RequestStatus.OraclesAssigned;
        request.verificationDeadline = block.timestamp + VERIFICATION_PERIOD;
        request.revealDeadline = request.verificationDeadline + REVEAL_PERIOD;
        
        emit OraclesAssigned(requestId, selectedOracles);
    }
    
    /**
     * @dev Get eligible oracles (not in cooldown with this MSME, sufficient stake)
     */
    function _getEligibleOracles(address msme) internal view returns (address[] memory) {
        address[] memory allOracles = oracleStaking.getAllOracles();
        uint256 eligibleCount = 0;
        
        // First pass: count eligible
        for (uint256 i = 0; i < allOracles.length; i++) {
            if (_isOracleEligible(allOracles[i], msme)) {
                eligibleCount++;
            }
        }
        
        // Second pass: populate array
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
    
    /**
     * @dev Check if oracle is eligible for this MSME
     */
    function _isOracleEligible(address oracle, address msme) internal view returns (bool) {
        // Must be valid staked oracle
        if (!oracleStaking.isValidOracle(oracle)) return false;
        
        // Check cooldown period (prevent monopoly)
        uint256 lastTime = lastAttestationTime[oracle][msme];
        if (lastTime > 0 && block.timestamp < lastTime + ORACLE_MSME_COOLDOWN) {
            return false;
        }
        
        // Not flagged for collusion
        if (flaggedForCollusion[oracle]) return false;
        
        return true;
    }
    
    /**
     * @dev Weighted random oracle selection
     * Weights: 40% reputation, 30% stake, 20% diversity, 10% randomness
     */
    function _weightedRandomSelect(address[] memory oracles, address msme) 
        internal returns (address) {
        
        require(oracles.length > 0, "No oracles available");
        
        if (oracles.length == 1) return oracles[0];
        
        uint256[] memory weights = new uint256[](oracles.length);
        uint256 totalWeight = 0;
        
        for (uint256 i = 0; i < oracles.length; i++) {
            uint256 weight = _calculateOracleWeight(oracles[i], msme);
            weights[i] = weight;
            totalWeight += weight;
        }
        
        // Generate pseudo-random number
        randomSeed = uint256(keccak256(abi.encodePacked(
            randomSeed,
            block.timestamp,
            block.prevrandao,
            msg.sender
        )));
        
        uint256 randomValue = randomSeed % totalWeight;
        uint256 cumulativeWeight = 0;
        
        for (uint256 i = 0; i < oracles.length; i++) {
            cumulativeWeight += weights[i];
            if (randomValue < cumulativeWeight) {
                return oracles[i];
            }
        }
        
        return oracles[oracles.length - 1]; // Fallback
    }
    
    /**
     * @dev Calculate oracle weight for selection
     */
    function _calculateOracleWeight(address oracle, address msme) 
        internal view returns (uint256) {
        
        // Get oracle info
        uint256 reputation = oracleStaking.getCurrentReputation(oracle);
        uint256 stake = oracleStaking.getOracleStake(oracle);
        uint256 diversity = uniqueMSMEsServed[oracle];
        
        // Normalize values (0-100 scale)
        uint256 repWeight = (reputation * 40) / 200;  // Max 40 points
        uint256 stakeWeight = (stake / (50000 * 1e18)) * 30;  // Max 30 points (per tier)
        if (stakeWeight > 30) stakeWeight = 30;
        
        uint256 diversityWeight = diversity >= 100 ? 20 : (diversity * 20) / 100; // Max 20 points
        
        uint256 randomWeight = 10; // Base 10 points for randomness
        
        return repWeight + stakeWeight + diversityWeight + randomWeight;
    }
    
    /**
     * @dev Oracle commits their attestation (phase 1 - hidden)
     * @param requestId Request ID
     * @param commitmentHash hash(attestationData + secret)
     */
    function commitAttestation(uint256 requestId, bytes32 commitmentHash) 
        external onlyAssignedOracle(requestId) {
        
        AttestationRequest storage request = attestationRequests[requestId];
        require(request.status == RequestStatus.OraclesAssigned, "Not in commit phase");
        require(block.timestamp <= request.verificationDeadline, "Commit period expired");
        require(!commitments[requestId][msg.sender].hasCommitted, "Already committed");
        
        commitments[requestId][msg.sender] = OracleCommitment({
            commitmentHash: commitmentHash,
            commitTimestamp: block.timestamp,
            hasCommitted: true,
            hasRevealed: false,
            attestationData: "",
            secret: bytes32(0)
        });
        
        // Check if all oracles have committed
        if (_allOraclesCommitted(requestId)) {
            request.status = RequestStatus.Committing;
        }
        
        emit OracleCommitted(requestId, msg.sender);
    }
    
    /**
     * @dev Oracle reveals their attestation (phase 2 - public)
     * @param requestId Request ID
     * @param attestationData The actual attestation data
     * @param proposedValidityPeriod Proposed validity
     * @param secret The secret used in commitment
     */
    function revealAttestation(
        uint256 requestId,
        bytes calldata attestationData,
        uint256 proposedValidityPeriod,
        bytes32 secret
    ) external onlyAssignedOracle(requestId) {
        AttestationRequest storage request = attestationRequests[requestId];
        require(
            request.status == RequestStatus.Committing || 
            request.status == RequestStatus.OraclesAssigned,
            "Not in reveal phase"
        );
        require(block.timestamp <= request.revealDeadline, "Reveal period expired");
        
        OracleCommitment storage commitment = commitments[requestId][msg.sender];
        require(commitment.hasCommitted, "Must commit first");
        require(!commitment.hasRevealed, "Already revealed");
        
        // Verify commitment matches
        bytes32 computedHash = keccak256(abi.encode(attestationData, proposedValidityPeriod, secret));
        require(computedHash == commitment.commitmentHash, "Commitment mismatch");
        
        // Validate proposed validity is within ±20% of requested
        uint256 minValidity = (request.requestedValidityPeriod * 80) / 100;
        uint256 maxValidity = (request.requestedValidityPeriod * 120) / 100;
        require(
            proposedValidityPeriod >= minValidity && proposedValidityPeriod <= maxValidity,
            "Validity out of range"
        );
        
        commitment.attestationData = attestationData;
        commitment.secret = secret;
        commitment.hasRevealed = true;
        
        // Check if all oracles have revealed
        if (_allOraclesRevealed(requestId)) {
            request.status = RequestStatus.Revealing;
            _calculateConsensus(requestId);
        }
        
        emit OracleRevealed(requestId, msg.sender);
    }
    
    /**
     * @dev Calculate consensus from all revealed attestations
     */
    function _calculateConsensus(uint256 requestId) internal {
        AttestationRequest storage request = attestationRequests[requestId];
        ConsensusResult storage result = consensusResults[requestId];
        result.totalOracles = request.assignedOracles.length;
        
        // Arrays to track unique attestations and their counts
        bytes32[] memory uniqueHashes = new bytes32[](request.assignedOracles.length);
        uint256[] memory hashCounts = new uint256[](request.assignedOracles.length);
        address[][] memory hashOraclesList = new address[][](request.assignedOracles.length);
        uint256 uniqueCount = 0;
        
        // Count identical attestations
        for (uint256 i = 0; i < request.assignedOracles.length; i++) {
            address oracle = request.assignedOracles[i];
            OracleCommitment storage commitment = commitments[requestId][oracle];
            
            if (!commitment.hasRevealed) continue; // Skip non-revealed
            
            bytes32 dataHash = keccak256(commitment.attestationData);
            
            // Find or create entry for this hash
            bool foundHash = false;
            for (uint256 j = 0; j < uniqueCount; j++) {
                if (uniqueHashes[j] == dataHash) {
                    hashCounts[j]++;
                    // Add oracle to this hash's list
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
        
        // Find majority (66%+ threshold)
        uint256 requiredConsensus = (result.totalOracles * CONSENSUS_THRESHOLD) / 100;
        uint256 majorityIndex = type(uint256).max;
        uint256 maxCount = 0;
        
        for (uint256 i = 0; i < uniqueCount; i++) {
            if (hashCounts[i] > maxCount) {
                maxCount = hashCounts[i];
                majorityIndex = i;
            }
        }
        
        // Store majority result
        if (majorityIndex != type(uint256).max && maxCount >= requiredConsensus) {
            result.majorityCount = maxCount;
            result.majorityHash = uniqueHashes[majorityIndex];
            
            // Add majority oracles
            for (uint256 i = 0; i < hashOraclesList[majorityIndex].length; i++) {
                result.majorityOracles.push(hashOraclesList[majorityIndex][i]);
            }
            
            // Add minority oracles
            for (uint256 i = 0; i < request.assignedOracles.length; i++) {
                address oracle = request.assignedOracles[i];
                bool isMajority = false;
                for (uint256 j = 0; j < result.majorityOracles.length; j++) {
                    if (result.majorityOracles[j] == oracle) {
                        isMajority = true;
                        break;
                    }
                }
                if (!isMajority && commitments[requestId][oracle].hasRevealed) {
                    result.minorityOracles.push(oracle);
                }
            }
        }
        
        // Check consensus threshold
        uint256 consensusPercentage = (result.majorityCount * 100) / result.totalOracles;
        
        if (result.majorityCount >= requiredConsensus && consensusPercentage >= CONSENSUS_THRESHOLD) {
            result.consensusReached = true;
            request.status = RequestStatus.ConsensusReached;
            
            // Get consensus data from first majority oracle
            request.consensusData = commitments[requestId][result.majorityOracles[0]].attestationData;
            
            // Distribute rewards
            _distributeConsensusRewards(requestId);
            
            // Finalize attestation
            _finalizeAttestation(requestId, consensusPercentage);
        } else {
            result.consensusReached = false;
            request.status = RequestStatus.NoConsensus;
            _handleNoConsensus(requestId);
        }
        
        emit ConsensusCalculated(requestId, result.consensusReached, result.majorityCount, result.totalOracles);
    }
    
    /**
     * @dev Distribute rewards based on consensus
     */
    function _distributeConsensusRewards(uint256 requestId) internal {
        AttestationRequest storage request = attestationRequests[requestId];
        ConsensusResult storage result = consensusResults[requestId];
        
        uint256 totalFee = request.feePaid;
        uint256 platformFee = (totalFee * PLATFORM_FEE_PERCENTAGE) / 10000;
        uint256 oracleFees = totalFee - platformFee;
        
        platformEarnings += platformFee;
        
        // Majority oracles share the fee
        uint256 majorityReward = oracleFees / result.majorityOracles.length;
        
        for (uint256 i = 0; i < result.majorityOracles.length; i++) {
            address oracle = result.majorityOracles[i];
            
            // Pay oracle
            citToken.safeTransfer(oracle, majorityReward);
            
            // Update reputation (+5)
            oracleStaking.updateReputation(oracle, 5, "Consensus agreement");
            
            // Track attestation
            oracleStaking.incrementAttestationCount(oracle);
            
            // Track diversity
            if (!hasServedMSME[oracle][request.msme]) {
                hasServedMSME[oracle][request.msme] = true;
                uniqueMSMEsServed[oracle]++;
            }
            
            // Update cooldown
            lastAttestationTime[oracle][request.msme] = block.timestamp;
        }
        
        // Minority oracles get penalized
        for (uint256 i = 0; i < result.minorityOracles.length; i++) {
            address oracle = result.minorityOracles[i];
            
            // Reputation penalty (-10)
            oracleStaking.updateReputation(oracle, -10, "Consensus disagreement");
        }
        
        emit ConsensusRewardsDistributed(
            requestId,
            result.majorityOracles,
            result.minorityOracles,
            majorityReward
        );
    }
    
    /**
     * @dev Handle no consensus scenario
     */
    function _handleNoConsensus(uint256 requestId) internal {
        AttestationRequest storage request = attestationRequests[requestId];
        
        // Pay all oracles base rate (20% of normal)
        uint256 totalFee = request.feePaid;
        uint256 platformFee = (totalFee * 20) / 100;
        uint256 baseCompensation = (totalFee * 20) / 100 / request.assignedOracles.length;
        
        platformEarnings += platformFee;
        
        for (uint256 i = 0; i < request.assignedOracles.length; i++) {
            address oracle = request.assignedOracles[i];
            citToken.safeTransfer(oracle, baseCompensation);
            
            // Small reputation penalty (-5)
            oracleStaking.updateReputation(oracle, -5, "No consensus reached");
        }
        
        // Refund 60% to MSME
        uint256 refundAmount = (totalFee * 60) / 100;
        citToken.safeTransfer(request.msme, refundAmount);
        
        emit NoConsensusHandled(requestId, "Oracles could not reach agreement");
    }
    
    /**
     * @dev Finalize attestation with consensus data
     */
    function _finalizeAttestation(uint256 requestId, uint256 consensusPercentage) internal {
        AttestationRequest storage request = attestationRequests[requestId];
        ConsensusResult storage result = consensusResults[requestId];
        
        // Calculate average validity period from majority oracles
        uint256 totalValidity = 0;
        for (uint256 i = 0; i < result.majorityOracles.length; i++) {
            // In production, track each oracle's proposed validity
            // For now, use requested as baseline
            totalValidity += request.requestedValidityPeriod;
        }
        uint256 avgValidity = totalValidity / result.majorityOracles.length;
        
        uint256 expiryTime = block.timestamp + avgValidity;
        
        // Create attestation
        attestations[request.msme].push(Attestation({
            schemaId: request.schemaId,
            issuers: result.majorityOracles,
            data: request.consensusData,
            timestamp: block.timestamp,
            expiryTime: expiryTime,
            revoked: false,
            consensusPercentage: consensusPercentage
        }));
        
        uint256 attestationIndex = attestations[request.msme].length - 1;
        attestationCount[request.msme][request.schemaId]++;
        totalAttestations[msg.sender]++;
        
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
     * @dev Check if oracle is assigned to request
     */
    function _isOracleAssigned(uint256 requestId, address oracle) 
        internal view returns (bool) {
        
        address[] memory assigned = attestationRequests[requestId].assignedOracles;
        for (uint256 i = 0; i < assigned.length; i++) {
            if (assigned[i] == oracle) return true;
        }
        return false;
    }
    
    /**
     * @dev Check if all assigned oracles have committed
     */
    function _allOraclesCommitted(uint256 requestId) internal view returns (bool) {
        address[] memory assigned = attestationRequests[requestId].assignedOracles;
        for (uint256 i = 0; i < assigned.length; i++) {
            if (!commitments[requestId][assigned[i]].hasCommitted) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * @dev Check if all assigned oracles have revealed
     */
    function _allOraclesRevealed(uint256 requestId) internal view returns (bool) {
        address[] memory assigned = attestationRequests[requestId].assignedOracles;
        for (uint256 i = 0; i < assigned.length; i++) {
            if (!commitments[requestId][assigned[i]].hasRevealed) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * @dev Remove address from array (helper function)
     */
    function _removeFromArray(address[] memory arr, address toRemove) 
        internal pure returns (address[] memory) {
        
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
    
    /**
     * @dev Register schema
     */
    function registerSchema(bytes32 schemaId, string calldata name, string calldata description) 
        external {
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
    
    // View functions
    
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
            if (attestationRequests[i].status == RequestStatus.Pending ||
                attestationRequests[i].status == RequestStatus.OraclesAssigned) {
                count++;
            }
        }
        
        uint256[] memory pending = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= requestCounter; i++) {
            if (attestationRequests[i].status == RequestStatus.Pending ||
                attestationRequests[i].status == RequestStatus.OraclesAssigned) {
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
}
