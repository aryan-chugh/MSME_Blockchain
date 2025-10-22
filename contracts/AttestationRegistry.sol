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
     * @dev Submit an attestation for an MSME
     * @param msmeId Address of the MSME identity contract
     * @param schemaId Schema identifier
     * @param data Encoded attestation data
     * @param validityPeriod How long the attestation is valid (in seconds)
     */
    function submitAttestation(
        address msmeId,
        bytes32 schemaId,
        bytes calldata data,
        uint256 validityPeriod
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
}
