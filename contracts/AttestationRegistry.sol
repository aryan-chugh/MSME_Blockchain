// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./OracleStaking.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title AttestationRegistry
 * @dev Stores verifiable claims (attestations) made by staked oracles
 * Only staked oracles can submit attestations
 */
contract AttestationRegistry is Pausable {
    
    OracleStaking public immutable oracleStaking;
    address public governance;

    // Attestation Request structure (MSME requests oracle verification)
    struct AttestationRequest {
        uint256 id;
        address msme;
        bytes32 schemaId;
        string documentHash;
        string documentUrl;
        bytes additionalData;
        uint256 feePaid;
        uint256 timestamp;
        RequestStatus status;
        address assignedOracle;
        uint256 completedAt;
    }

    enum RequestStatus {
        Pending,
        InProgress,
        Completed,
        Rejected,
        Cancelled
    }

    // Attestation structure
    struct Attestation {
        bytes32 schemaId;      // Schema identifier (e.g., keccak256("gst-revenue"))
        address issuer;        // Oracle that issued the attestation
        bytes data;            // Encoded attestation data
        uint256 timestamp;     // When the attestation was made
        uint256 expiryTime;    // When the attestation expires
        bool revoked;          // Revocation status
    }

    // Schema structure for standardized data formats
    struct Schema {
        string name;
        string description;
        bool active;
        uint256 createdAt;
    }

    // Mappings
    mapping(uint256 => AttestationRequest) public attestationRequests;
    uint256 public requestCounter;
    mapping(address => uint256[]) public msmeRequests; // MSME => request IDs
    mapping(address => uint256[]) public oracleRequests; // Oracle => request IDs assigned
    
    mapping(address => Attestation[]) public attestations;
    mapping(bytes32 => Schema) public schemas;
    mapping(address => mapping(bytes32 => uint256)) public attestationCount; // msme => schemaId => count
    
    // Collusion detection: track oracle co-attestation patterns
    mapping(address => mapping(address => uint256)) public coAttestationCount; // oracle1 => oracle2 => count
    mapping(address => uint256) public totalAttestations; // oracle => total attestations made
    uint256 public constant COLLUSION_THRESHOLD = 70; // 70% threshold for flagging
    mapping(address => bool) public flaggedForCollusion;
    
    bytes32[] public schemaList;

    // Events
    event AttestationRequested(
        uint256 indexed requestId,
        address indexed msme,
        bytes32 indexed schemaId,
        uint256 feePaid,
        string documentHash
    );
    event RequestAssigned(uint256 indexed requestId, address indexed oracle);
    event RequestCompleted(uint256 indexed requestId, uint256 attestationIndex);
    event RequestRejected(uint256 indexed requestId, address indexed oracle, string reason);
    event RequestCancelled(uint256 indexed requestId, address indexed msme);
    
    event AttestationMade(
        address indexed msmeId, 
        address indexed issuer, 
        bytes32 indexed schemaId,
        uint256 attestationIndex
    );
    event AttestationRevoked(
        address indexed msmeId,
        uint256 indexed attestationIndex,
        address indexed revoker
    );
    event SchemaRegistered(bytes32 indexed schemaId, string name);
    event OracleFlaggedForCollusion(address indexed oracle, uint256 collusionPercentage);
    
    // Modifiers
    modifier onlyStakedOracle() {
        require(
            oracleStaking.isValidOracle(msg.sender),
            "Caller is not a valid staked oracle"
        );
        _;
    }

    modifier onlyGovernance() {
        require(msg.sender == governance, "Only governance can call");
        _;
    }

    /**
     * @dev Constructor
     * @param _stakingContractAddress Address of the OracleStaking contract
     * @param _governance Address of governance
     */
    constructor(address _stakingContractAddress, address _governance) {
        require(_stakingContractAddress != address(0), "Invalid staking contract");
        require(_governance != address(0), "Invalid governance address");
        oracleStaking = OracleStaking(_stakingContractAddress);
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
     * @dev MSME creates an attestation request (stores on-chain for oracles to pick up)
     * @param schemaId Schema identifier for the attestation type
     * @param documentHash Hash of the document to be verified
     * @param documentUrl URL where oracle can access the document
     * @param additionalData Any additional information encoded as bytes
     * @param feePaid Amount of CIT tokens paid as fee
     */
    function requestAttestation(
        bytes32 schemaId,
        string calldata documentHash,
        string calldata documentUrl,
        bytes calldata additionalData,
        uint256 feePaid
    ) external whenNotPaused returns (uint256) {
        require(schemas[schemaId].active, "Schema not active");
        require(bytes(documentHash).length > 0, "Document hash required");
        require(feePaid > 0, "Fee must be greater than 0");
        
        requestCounter++;
        uint256 requestId = requestCounter;
        
        attestationRequests[requestId] = AttestationRequest({
            id: requestId,
            msme: msg.sender,
            schemaId: schemaId,
            documentHash: documentHash,
            documentUrl: documentUrl,
            additionalData: additionalData,
            feePaid: feePaid,
            timestamp: block.timestamp,
            status: RequestStatus.Pending,
            assignedOracle: address(0),
            completedAt: 0
        });
        
        msmeRequests[msg.sender].push(requestId);
        
        emit AttestationRequested(requestId, msg.sender, schemaId, feePaid, documentHash);
        
        return requestId;
    }

    /**
     * @dev Oracle assigns themselves to a pending request
     * @param requestId ID of the attestation request
     */
    function assignRequest(uint256 requestId) external onlyStakedOracle {
        AttestationRequest storage request = attestationRequests[requestId];
        require(request.msme != address(0), "Request does not exist");
        require(request.status == RequestStatus.Pending, "Request not available");
        
        request.status = RequestStatus.InProgress;
        request.assignedOracle = msg.sender;
        oracleRequests[msg.sender].push(requestId);
        
        emit RequestAssigned(requestId, msg.sender);
    }

    /**
     * @dev Oracle rejects an attestation request
     * @param requestId ID of the attestation request
     * @param reason Reason for rejection
     */
    function rejectRequest(uint256 requestId, string calldata reason) external onlyStakedOracle {
        AttestationRequest storage request = attestationRequests[requestId];
        require(request.assignedOracle == msg.sender, "Not assigned to you");
        require(request.status == RequestStatus.InProgress, "Request not in progress");
        
        request.status = RequestStatus.Rejected;
        request.completedAt = block.timestamp;
        
        emit RequestRejected(requestId, msg.sender, reason);
    }

    /**
     * @dev MSME cancels their own request
     * @param requestId ID of the attestation request
     */
    function cancelRequest(uint256 requestId) external {
        AttestationRequest storage request = attestationRequests[requestId];
        require(request.msme == msg.sender, "Not your request");
        require(request.status == RequestStatus.Pending, "Cannot cancel");
        
        request.status = RequestStatus.Cancelled;
        request.completedAt = block.timestamp;
        
        emit RequestCancelled(requestId, msg.sender);
    }

    /**
     * @dev Register a new attestation schema
     * @param schemaId Unique identifier for the schema
     * @param name Human-readable name
     * @param description Schema description
     */
    function registerSchema(
        bytes32 schemaId,
        string calldata name,
        string calldata description
    ) external {
        require(schemas[schemaId].createdAt == 0, "Schema already exists");
        
        schemas[schemaId] = Schema({
            name: name,
            description: description,
            active: true,
            createdAt: block.timestamp
        });
        
        schemaList.push(schemaId);
        emit SchemaRegistered(schemaId, name);
    }

    /**
     * @dev Submit an attestation for an MSME (can be linked to a request)
     * @param msmeId Address of the MSME identity contract
     * @param schemaId Schema identifier
     * @param data Encoded attestation data
     * @param validityPeriod How long the attestation is valid (in seconds)
     * @param requestId Optional: ID of the attestation request (0 if not linked)
     */
    function submitAttestation(
        address msmeId,
        bytes32 schemaId,
        bytes calldata data,
        uint256 validityPeriod,
        uint256 requestId
    ) external onlyStakedOracle whenNotPaused {
        require(msmeId != address(0), "Invalid MSME address");
        require(schemas[schemaId].active, "Schema not active");
        require(validityPeriod > 0, "Invalid validity period");
        
        uint256 expiryTime = block.timestamp + validityPeriod;
        
        attestations[msmeId].push(Attestation({
            schemaId: schemaId,
            issuer: msg.sender,
            data: data,
            timestamp: block.timestamp,
            expiryTime: expiryTime,
            revoked: false
        }));
        
        uint256 attestationIndex = attestations[msmeId].length - 1;
        attestationCount[msmeId][schemaId] += 1;
        
        // Track collusion: check if other oracles have attested to this MSME
        _trackCoAttestation(msmeId, msg.sender);
        
        // Increment total attestations for this oracle
        totalAttestations[msg.sender] += 1;
        
        // Increment oracle's attestation count
        oracleStaking.incrementAttestationCount(msg.sender);
        
        // If this attestation is linked to a request, mark it as completed
        if (requestId > 0) {
            AttestationRequest storage request = attestationRequests[requestId];
            require(request.assignedOracle == msg.sender, "Not assigned to you");
            require(request.status == RequestStatus.InProgress, "Request not in progress");
            
            request.status = RequestStatus.Completed;
            request.completedAt = block.timestamp;
            
            emit RequestCompleted(requestId, attestationIndex);
        }
        
        emit AttestationMade(msmeId, msg.sender, schemaId, attestationIndex);
    }

    /**
     * @dev Revoke an attestation (only issuer can revoke)
     * @param msmeId MSME identity address
     * @param attestationIndex Index of attestation to revoke
     */
    function revokeAttestation(
        address msmeId,
        uint256 attestationIndex
    ) external {
        require(attestationIndex < attestations[msmeId].length, "Invalid index");
        Attestation storage attestation = attestations[msmeId][attestationIndex];
        
        require(msg.sender == attestation.issuer, "Only issuer can revoke");
        require(!attestation.revoked, "Already revoked");
        
        attestation.revoked = true;
        emit AttestationRevoked(msmeId, attestationIndex, msg.sender);
    }

    /**
     * @dev Get all attestations for an MSME
     * @param msmeId MSME identity address
     * @return Attestation[] Array of attestations
     */
    function getAttestations(address msmeId) external view returns (Attestation[] memory) {
        return attestations[msmeId];
    }

    /**
     * @dev Get attestations by schema
     * @param msmeId MSME identity address
     * @param schemaId Schema identifier
     * @return Attestation[] Filtered array of attestations
     */
    function getAttestationsBySchema(
        address msmeId,
        bytes32 schemaId
    ) external view returns (Attestation[] memory) {
        Attestation[] memory allAttestations = attestations[msmeId];
        uint256 count = attestationCount[msmeId][schemaId];
        
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

    /**
     * @dev Check if an attestation is valid (not expired and not revoked)
     * @param msmeId MSME identity address
     * @param attestationIndex Index of attestation
     * @return bool True if valid
     */
    function isAttestationValid(
        address msmeId,
        uint256 attestationIndex
    ) external view returns (bool) {
        if (attestationIndex >= attestations[msmeId].length) {
            return false;
        }
        
        Attestation memory attestation = attestations[msmeId][attestationIndex];
        
        return !attestation.revoked && block.timestamp <= attestation.expiryTime;
    }

    /**
     * @dev Get count of valid attestations for an MSME by schema
     * @param msmeId MSME identity address
     * @param schemaId Schema identifier
     * @return uint256 Count of valid attestations
     */
    function getValidAttestationCount(
        address msmeId,
        bytes32 schemaId
    ) external view returns (uint256) {
        Attestation[] memory allAttestations = attestations[msmeId];
        uint256 validCount = 0;
        
        for (uint256 i = 0; i < allAttestations.length; i++) {
            if (
                allAttestations[i].schemaId == schemaId &&
                !allAttestations[i].revoked &&
                block.timestamp <= allAttestations[i].expiryTime
            ) {
                validCount++;
            }
        }
        
        return validCount;
    }

    /**
     * @dev Get all registered schemas
     * @return bytes32[] Array of schema IDs
     */
    function getAllSchemas() external view returns (bytes32[] memory) {
        return schemaList;
    }

    /**
     * @dev Get schema information
     * @param schemaId Schema identifier
     * @return Schema struct
     */
    function getSchema(bytes32 schemaId) external view returns (Schema memory) {
        return schemas[schemaId];
    }

    /**
     * @dev Internal function to track co-attestation patterns
     * Detects if oracles are colluding by frequently attesting together
     * @param msmeId MSME being attested
     * @param currentOracle Oracle making current attestation
     */
    function _trackCoAttestation(address msmeId, address currentOracle) internal {
        // Find all other oracles who have attested to this MSME
        Attestation[] memory msmeAttestations = attestations[msmeId];
        
        for (uint256 i = 0; i < msmeAttestations.length; i++) {
            address otherOracle = msmeAttestations[i].issuer;
            
            // Skip if same oracle or already counted in this iteration
            if (otherOracle == currentOracle) continue;
            
            // Increment co-attestation count (bidirectional)
            coAttestationCount[currentOracle][otherOracle] += 1;
            coAttestationCount[otherOracle][currentOracle] += 1;
            
            // Check for collusion (>70% co-attestation rate)
            _checkCollusionThreshold(currentOracle, otherOracle);
        }
    }

    /**
     * @dev Check if two oracles exceed collusion threshold
     * @param oracle1 First oracle
     * @param oracle2 Second oracle
     */
    function _checkCollusionThreshold(address oracle1, address oracle2) internal {
        uint256 totalOracle1 = totalAttestations[oracle1];
        uint256 totalOracle2 = totalAttestations[oracle2];
        
        // Need sufficient attestations to make determination (min 10)
        if (totalOracle1 < 10 || totalOracle2 < 10) return;
        
        uint256 coCount = coAttestationCount[oracle1][oracle2];
        
        // Check if oracle1 is colluding
        uint256 oracle1Percentage = (coCount * 100) / totalOracle1;
        if (oracle1Percentage >= COLLUSION_THRESHOLD && !flaggedForCollusion[oracle1]) {
            flaggedForCollusion[oracle1] = true;
            emit OracleFlaggedForCollusion(oracle1, oracle1Percentage);
        }
        
        // Check if oracle2 is colluding
        uint256 oracle2Percentage = (coCount * 100) / totalOracle2;
        if (oracle2Percentage >= COLLUSION_THRESHOLD && !flaggedForCollusion[oracle2]) {
            flaggedForCollusion[oracle2] = true;
            emit OracleFlaggedForCollusion(oracle2, oracle2Percentage);
        }
    }

    /**
     * @dev Get collusion statistics for an oracle
     * @param oracle Oracle address
     * @return isFlagged Whether oracle is flagged for collusion
     * @return totalCount Total attestations made
     */
    function getCollusionStats(address oracle) external view returns (
        bool isFlagged,
        uint256 totalCount
    ) {
        return (flaggedForCollusion[oracle], totalAttestations[oracle]);
    }

    /**
     * @dev Get co-attestation count between two oracles
     * @param oracle1 First oracle
     * @param oracle2 Second oracle
     * @return uint256 Number of times they've attested together
     */
    function getCoAttestationCount(address oracle1, address oracle2) external view returns (uint256) {
        return coAttestationCount[oracle1][oracle2];
    }

    /**
     * @dev Get all pending attestation requests (for oracles to browse)
     * @return Array of pending request IDs
     */
    function getPendingRequests() external view returns (uint256[] memory) {
        uint256 pendingCount = 0;
        
        // First, count pending requests
        for (uint256 i = 1; i <= requestCounter; i++) {
            if (attestationRequests[i].status == RequestStatus.Pending) {
                pendingCount++;
            }
        }
        
        // Then, populate array
        uint256[] memory pendingIds = new uint256[](pendingCount);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= requestCounter; i++) {
            if (attestationRequests[i].status == RequestStatus.Pending) {
                pendingIds[index] = i;
                index++;
            }
        }
        
        return pendingIds;
    }

    /**
     * @dev Get requests assigned to a specific oracle
     * @param oracle Oracle address
     * @return Array of request IDs
     */
    function getOracleRequests(address oracle) external view returns (uint256[] memory) {
        return oracleRequests[oracle];
    }

    /**
     * @dev Get requests created by a specific MSME
     * @param msme MSME address
     * @return Array of request IDs
     */
    function getMSMERequests(address msme) external view returns (uint256[] memory) {
        return msmeRequests[msme];
    }

    /**
     * @dev Get detailed information about a specific request
     * @param requestId Request ID
     * @return Full attestation request struct
     */
    function getRequestDetails(uint256 requestId) external view returns (AttestationRequest memory) {
        require(attestationRequests[requestId].msme != address(0), "Request does not exist");
        return attestationRequests[requestId];
    }
}
