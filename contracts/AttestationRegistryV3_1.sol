// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AttestationRegistryV3_1 - Self-Assignment Multi-Oracle System
 * @notice V3.1 Enhancement: First-come-first-served oracle assignment
 * 
 * KEY IMPROVEMENTS:
 * - ✅ Oracles manually accept requests (no auto-assignment)
 * - ✅ First N oracles to accept get the request
 * - ✅ More decentralized and transparent
 * - ✅ Better for testing and demonstration
 * - ✅ Maintains all V3 commit-reveal consensus features
 */

import "./OracleStakingV3.sol";
import "./CIToken.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract AttestationRegistryV3_1 is Pausable {
    using SafeERC20 for IERC20;
    
    OracleStakingV3 public immutable oracleStaking;
    IERC20 public immutable citToken;
    address public governance;
    
    // Consensus parameters
    uint256 public constant MIN_ORACLES_REQUIRED = 3;
    uint256 public constant MAX_ORACLES_ALLOWED = 7;
    uint256 public constant CONSENSUS_THRESHOLD = 66; // 66% agreement
    uint256 public constant ASSIGNMENT_PERIOD = 24 hours; // Increased for manual acceptance
    uint256 public constant VERIFICATION_PERIOD = 24 hours;
    uint256 public constant REVEAL_PERIOD = 6 hours;
    
    // Fee thresholds
    uint256 public constant MULTI_ORACLE_THRESHOLD = 200 * 1e18;
    uint256 public constant COMPLEX_THRESHOLD = 500 * 1e18;
    uint256 public constant CRITICAL_THRESHOLD = 1000 * 1e18;
    
    uint256 public constant PLATFORM_FEE_PERCENTAGE = 1000; // 10%
    uint256 public constant ORACLE_MSME_COOLDOWN = 1 minutes; // Relaxed for testing (was 30 days)
    
    mapping(address => mapping(address => uint256)) public lastAttestationTime;
    
    enum RequestComplexity { Simple, Medium, Complex, Critical }
    enum RequestStatus {
        Pending, OraclesAssigned, Committing, Revealing,
        ConsensusReached, NoConsensus, Completed, Rejected, Cancelled, Disputed
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
        address[] assignedOracles;
        uint256 requiredOracles;
        uint256 assignmentDeadline;
        uint256 verificationDeadline;
        uint256 revealDeadline;
        uint256 completedAt;
        uint256 actualValidityPeriod;
        bytes consensusData;
    }
    
    struct OracleCommitment {
        bytes32 commitmentHash;
        uint256 commitTimestamp;
        bool hasCommitted;
        bool hasRevealed;
        bytes attestationData;
        bytes32 secret;
    }
    
    struct ConsensusResult {
        address[] majorityOracles;
        address[] minorityOracles;
        uint256 majorityCount;
        uint256 totalOracles;
        bytes32 majorityHash;
        bool consensusReached;
    }
    
    struct Schema {
        string name;
        string description;
        bool active;
        uint256 createdAt;
    }
    
    struct Attestation {
        bytes32 schemaId;
        address issuer;
        bytes data;
        uint256 timestamp;
        uint256 expiryTime;
        bool revoked;
    }
    
    // State
    uint256 public requestCounter;
    uint256 public attestationCounter;
    mapping(uint256 => AttestationRequest) public attestationRequests;
    mapping(uint256 => mapping(address => OracleCommitment)) public commitments;
    mapping(uint256 => ConsensusResult) public consensusResults;
    mapping(bytes32 => Schema) public schemas;
    mapping(address => Attestation[]) public attestations;
    mapping(address => uint256[]) public msmeRequests;
    mapping(address => uint256[]) public oracleRequests;
    
    // Events
    event SchemaRegistered(bytes32 indexed schemaId, string name);
    event AttestationRequested(uint256 indexed requestId, address indexed msme, bytes32 indexed schemaId, uint256 feePaid, RequestComplexity complexity, uint256 requiredOracles);
    event OracleAcceptedRequest(uint256 indexed requestId, address indexed oracle, uint256 currentCount, uint256 requiredCount);
    event OraclesFullyAssigned(uint256 indexed requestId, address[] oracles);
    event CommitmentSubmitted(uint256 indexed requestId, address indexed oracle);
    event AttestationRevealed(uint256 indexed requestId, address indexed oracle);
    event ConsensusCalculated(uint256 indexed requestId, bool consensusReached, uint256 majorityCount, uint256 totalOracles);
    event AttestationMade(address indexed msmeId, address indexed issuer, bytes32 indexed schemaId, uint256 attestationIndex);
    event AttestationRevoked(address indexed msmeId, uint256 indexed attestationIndex, address indexed revoker);
    event FeeDistributed(uint256 indexed requestId, address[] oracles, uint256 totalFee);
    
    constructor(address _oracleStaking, address _citToken) {
        require(_oracleStaking != address(0), "Invalid staking address");
        require(_citToken != address(0), "Invalid token address");
        
        oracleStaking = OracleStakingV3(_oracleStaking);
        citToken = IERC20(_citToken);
        governance = msg.sender;
    }
    
    modifier onlyGovernance() {
        require(msg.sender == governance, "Only governance");
        _;
    }
    
    // ============ SCHEMA MANAGEMENT ============
    
    function registerSchema(
        bytes32 schemaId,
        string calldata name,
        string calldata description
    ) external onlyGovernance {
        require(!schemas[schemaId].active, "Schema already exists");
        
        schemas[schemaId] = Schema({
            name: name,
            description: description,
            active: true,
            createdAt: block.timestamp
        });
        
        emit SchemaRegistered(schemaId, name);
    }
    
    function getAllSchemas() external view returns (bytes32[] memory) {
        // Return hardcoded schema IDs for simplicity
        bytes32[] memory schemaIds = new bytes32[](10);
        schemaIds[0] = bytes32("GST Revenue");
        schemaIds[1] = bytes32("Credit Score");
        schemaIds[2] = bytes32("Bank Statements");
        schemaIds[3] = bytes32("Tax Returns");
        schemaIds[4] = bytes32("KYC Verification");
        schemaIds[5] = bytes32("Business License");
        schemaIds[6] = bytes32("GST_REGISTRATION");
        schemaIds[7] = bytes32("FINANCIAL_AUDIT");
        schemaIds[8] = bytes32("INCORPORATION_CERT");
        schemaIds[9] = bytes32("BANK_STATEMENT");
        return schemaIds;
    }
    
    function getSchema(bytes32 schemaId) external view returns (Schema memory) {
        return schemas[schemaId];
    }
    
    // ============ REQUEST MANAGEMENT (V3.1 SELF-ASSIGNMENT) ============
    
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
        
        citToken.safeTransferFrom(msg.sender, address(this), feePaid);
        
        requestCounter++;
        uint256 requestId = requestCounter;
        
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
            assignedOracles: new address[](0), // Empty - oracles will self-assign
            requiredOracles: requiredOracles,
            assignmentDeadline: block.timestamp + ASSIGNMENT_PERIOD,
            verificationDeadline: 0,
            revealDeadline: 0,
            completedAt: 0,
            actualValidityPeriod: 0,
            consensusData: ""
        });
        
        msmeRequests[msg.sender].push(requestId);
        
        emit AttestationRequested(requestId, msg.sender, schemaId, feePaid, complexity, requiredOracles);
        
        return requestId;
    }
    
    /**
     * @notice V3.1 NEW: Oracle self-assigns to request (first-come-first-served)
     */
    function acceptRequest(uint256 requestId) external whenNotPaused {
        AttestationRequest storage request = attestationRequests[requestId];
        
        require(request.id != 0, "Request does not exist");
        require(request.status == RequestStatus.Pending, "Request not pending");
        require(block.timestamp <= request.assignmentDeadline, "Assignment period expired");
        require(request.assignedOracles.length < request.requiredOracles, "All oracles assigned");
        
        // Check oracle eligibility
        OracleStakingV3.OracleInfo memory oracleInfo = oracleStaking.getOracleInfo(msg.sender);
        require(oracleInfo.isActive, "Oracle not active");
        require(oracleInfo.stakedAmount >= oracleStaking.MINIMUM_STAKE(), "Insufficient stake");
        require(oracleInfo.slashCount < 3, "Too many slashes");
        
        // Reputation-based requirements (Option 3)
        uint256 minReputation = _getMinimumReputation(request.complexity);
        require(oracleInfo.reputationScore >= minReputation, "Insufficient reputation for complexity tier");
        
        // Check cooldown period
        uint256 lastAttestation = lastAttestationTime[msg.sender][request.msme];
        require(block.timestamp >= lastAttestation + ORACLE_MSME_COOLDOWN, "Cooldown period not over");
        
        // Check not already assigned
        for (uint256 i = 0; i < request.assignedOracles.length; i++) {
            require(request.assignedOracles[i] != msg.sender, "Already assigned");
        }
        
        // Add oracle to assigned list
        request.assignedOracles.push(msg.sender);
        oracleRequests[msg.sender].push(requestId);
        
        emit OracleAcceptedRequest(requestId, msg.sender, request.assignedOracles.length, request.requiredOracles);
        
        // Check if all oracles assigned
        if (request.assignedOracles.length == request.requiredOracles) {
            request.status = RequestStatus.OraclesAssigned;
            request.verificationDeadline = block.timestamp + VERIFICATION_PERIOD;
            request.revealDeadline = request.verificationDeadline + REVEAL_PERIOD;
            
            emit OraclesFullyAssigned(requestId, request.assignedOracles);
        }
    }
    
    // ============ COMMIT-REVEAL ATTESTATION (Same as V3) ============
    
    function commitAttestation(uint256 requestId, bytes32 commitmentHash) external whenNotPaused {
        AttestationRequest storage request = attestationRequests[requestId];
        
        require(request.status == RequestStatus.OraclesAssigned || request.status == RequestStatus.Committing, "Not in commit phase");
        require(_isOracleAssigned(requestId, msg.sender), "Not assigned to request");
        require(block.timestamp <= request.verificationDeadline, "Verification period ended");
        require(!commitments[requestId][msg.sender].hasCommitted, "Already committed");
        
        commitments[requestId][msg.sender] = OracleCommitment({
            commitmentHash: commitmentHash,
            commitTimestamp: block.timestamp,
            hasCommitted: true,
            hasRevealed: false,
            attestationData: "",
            secret: bytes32(0)
        });
        
        if (request.status == RequestStatus.OraclesAssigned) {
            request.status = RequestStatus.Committing;
        }
        
        emit CommitmentSubmitted(requestId, msg.sender);
        
        // Check if all oracles committed
        if (_allOraclesCommitted(requestId)) {
            request.status = RequestStatus.Revealing;
        }
    }
    
    function revealAttestation(
        uint256 requestId,
        bytes calldata attestationData,
        uint256 validityPeriod,
        bytes32 secret
    ) external whenNotPaused {
        AttestationRequest storage request = attestationRequests[requestId];
        OracleCommitment storage commitment = commitments[requestId][msg.sender];
        
        require(request.status == RequestStatus.Revealing || request.status == RequestStatus.Committing, "Not in reveal phase");
        require(commitment.hasCommitted, "No commitment found");
        require(!commitment.hasRevealed, "Already revealed");
        require(block.timestamp <= request.revealDeadline, "Reveal period ended");
        
        // Verify commitment
        bytes32 computedHash = keccak256(abi.encodePacked(attestationData, secret));
        require(computedHash == commitment.commitmentHash, "Invalid secret");
        
        commitment.attestationData = attestationData;
        commitment.secret = secret;
        commitment.hasRevealed = true;
        
        emit AttestationRevealed(requestId, msg.sender);
        
        // Check if all revealed
        if (_allOraclesRevealed(requestId)) {
            _calculateConsensus(requestId, validityPeriod);
        }
    }
    
    // ============ CONSENSUS CALCULATION (Same as V3) ============
    
    function _calculateConsensus(uint256 requestId, uint256 validityPeriod) internal {
        AttestationRequest storage request = attestationRequests[requestId];
        ConsensusResult storage result = consensusResults[requestId];
        result.totalOracles = request.assignedOracles.length;
        
        // Arrays to track unique attestations and their counts
        bytes32[] memory uniqueHashes = new bytes32[](request.assignedOracles.length);
        uint256[] memory hashCounts = new uint256[](request.assignedOracles.length);
        address[][] memory hashOraclesList = new address[][](request.assignedOracles.length);
        uint256 uniqueCount = 0;
        
        // Count identical attestations (based on decision only, ignoring comments)
        for (uint256 i = 0; i < request.assignedOracles.length; i++) {
            address oracle = request.assignedOracles[i];
            OracleCommitment storage commitment = commitments[requestId][oracle];
            
            if (!commitment.hasRevealed) continue; // Skip non-revealed
            
            // Decode attestation data to extract decision (ignore comments for consensus)
            // attestationData format: [bool approved, string comments, bytes32 docHash, string schema]
            (bool decision, , , ) = abi.decode(commitment.attestationData, (bool, string, bytes32, string));
            
            // Hash only the decision for consensus matching
            bytes32 dataHash = keccak256(abi.encode(decision));
            
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
            
            // Create attestation
            _createAttestation(request.msme, request.schemaId, request.consensusData, validityPeriod);
            
            request.status = RequestStatus.Completed;
            request.completedAt = block.timestamp;
            request.actualValidityPeriod = validityPeriod;
            
            // Slash minority oracles (they were wrong)
            _slashMinorityOracles(requestId);
            
            // Distribute fees to majority oracles
            _distributeFees(requestId);
        } else {
            result.consensusReached = false;
            request.status = RequestStatus.NoConsensus;
            // Refund fee to MSME
            citToken.safeTransfer(request.msme, request.feePaid);
        }
        
        emit ConsensusCalculated(requestId, result.consensusReached, result.majorityCount, result.totalOracles);
    }
    
    function _slashMinorityOracles(uint256 requestId) internal {
        ConsensusResult storage consensus = consensusResults[requestId];
        
        // Slash each minority oracle a small amount (5000 CIT = 0.01% of minimum stake)
        uint256 slashAmount = 5000 * 1e18;
        
        for (uint256 i = 0; i < consensus.minorityOracles.length; i++) {
            address oracle = consensus.minorityOracles[i];
            
            // Check if oracle has enough stake to slash
            OracleStakingV3.OracleInfo memory oracleInfo = oracleStaking.getOracleInfo(oracle);
            
            if (oracleInfo.stakedAmount >= slashAmount) {
                // Slash with distribution: 50% to platform, 50% to MSME
                try oracleStaking.slashWithDistribution(
                    oracle,
                    slashAmount,
                    attestationRequests[requestId].msme, // MSME gets compensation
                    slashAmount / 2,                      // 50% to MSME
                    "Minority consensus decision"
                ) {} catch {
                    // If slashing fails, continue with other oracles
                }
            }
        }
    }

    function _distributeFees(uint256 requestId) internal {
        AttestationRequest storage request = attestationRequests[requestId];
        ConsensusResult storage consensus = consensusResults[requestId];
        
        uint256 platformFee = (request.feePaid * PLATFORM_FEE_PERCENTAGE) / 10000;
        uint256 oracleFee = request.feePaid - platformFee;
        
        // Distribute to majority oracles only
        if (consensus.majorityOracles.length > 0) {
            uint256 feePerOracle = oracleFee / consensus.majorityOracles.length;
            
            for (uint256 i = 0; i < consensus.majorityOracles.length; i++) {
                address oracle = consensus.majorityOracles[i];
                citToken.safeTransfer(oracle, feePerOracle);
                
                // Update last attestation time
                lastAttestationTime[oracle][request.msme] = block.timestamp;
            }
            
            // Platform fee
            citToken.safeTransfer(governance, platformFee);
            
            emit FeeDistributed(requestId, consensus.majorityOracles, request.feePaid);
        }
    }
    
    function _createAttestation(
        address msmeId,
        bytes32 schemaId,
        bytes memory data,
        uint256 validityPeriod
    ) internal {
        attestations[msmeId].push(Attestation({
            schemaId: schemaId,
            issuer: address(this),
            data: data,
            timestamp: block.timestamp,
            expiryTime: block.timestamp + validityPeriod,
            revoked: false
        }));
        
        emit AttestationMade(msmeId, address(this), schemaId, attestations[msmeId].length - 1);
    }
    
    // ============ VIEW FUNCTIONS ============
    
    function getRequestDetails(uint256 requestId) external view returns (AttestationRequest memory) {
        return attestationRequests[requestId];
    }
    
    function getConsensusResult(uint256 requestId) external view returns (ConsensusResult memory) {
        return consensusResults[requestId];
    }
    
    function getOracleCommitment(uint256 requestId, address oracle) external view returns (OracleCommitment memory) {
        return commitments[requestId][oracle];
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
    
    function getAttestations(address msmeId) external view returns (Attestation[] memory) {
        return attestations[msmeId];
    }
    
    function getAttestationsBySchema(address msmeId, bytes32 schemaId) 
        external view returns (Attestation[] memory) {
        
        Attestation[] storage allAttestations = attestations[msmeId];
        uint256 count = 0;
        
        for (uint256 i = 0; i < allAttestations.length; i++) {
            if (allAttestations[i].schemaId == schemaId) {
                count++;
            }
        }
        
        Attestation[] memory filtered = new Attestation[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allAttestations.length; i++) {
            if (allAttestations[i].schemaId == schemaId) {
                filtered[index] = allAttestations[i];
                index++;
            }
        }
        
        return filtered;
    }
    
    function isAttestationValid(address msmeId, uint256 attestationIndex) 
        external view returns (bool) {
        
        if (attestations[msmeId].length <= attestationIndex) return false;
        
        Attestation storage attestation = attestations[msmeId][attestationIndex];
        return !attestation.revoked && block.timestamp <= attestation.expiryTime;
    }
    
    // ============ INTERNAL HELPERS ============
    
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
    
    function _getRequiredOracles(RequestComplexity complexity) 
        internal pure returns (uint256) {
        
        if (complexity == RequestComplexity.Critical) return 7;
        if (complexity == RequestComplexity.Complex) return 5;
        if (complexity == RequestComplexity.Medium) return 3;
        return 1;
    }
    
    function _isOracleAssigned(uint256 requestId, address oracle) 
        internal view returns (bool) {
        
        address[] memory assigned = attestationRequests[requestId].assignedOracles;
        for (uint256 i = 0; i < assigned.length; i++) {
            if (assigned[i] == oracle) return true;
        }
        return false;
    }
    
    function _allOraclesCommitted(uint256 requestId) internal view returns (bool) {
        address[] memory oracles = attestationRequests[requestId].assignedOracles;
        for (uint256 i = 0; i < oracles.length; i++) {
            if (!commitments[requestId][oracles[i]].hasCommitted) return false;
        }
        return true;
    }
    
    function _allOraclesRevealed(uint256 requestId) internal view returns (bool) {
        address[] memory oracles = attestationRequests[requestId].assignedOracles;
        for (uint256 i = 0; i < oracles.length; i++) {
            if (!commitments[requestId][oracles[i]].hasRevealed) return false;
        }
        return true;
    }
    
    function _getMinimumReputation(RequestComplexity complexity) 
        internal pure returns (uint256) {
        
        if (complexity == RequestComplexity.Critical) return 200; // 7 oracles need 200+ reputation
        if (complexity == RequestComplexity.Complex) return 100;  // 5 oracles need 100+ reputation
        if (complexity == RequestComplexity.Medium) return 50;    // 3 oracles need 50+ reputation
        return 0; // Simple (1 oracle) - any reputation
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    function pause() external onlyGovernance {
        _pause();
    }
    
    function unpause() external onlyGovernance {
        _unpause();
    }
    
    function updateGovernance(address newGovernance) external onlyGovernance {
        require(newGovernance != address(0), "Invalid address");
        governance = newGovernance;
    }
}
