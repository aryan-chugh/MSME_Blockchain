// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title FlashAssessment
 * @dev Instant creditworthiness assessment using zero-knowledge proofs
 * Revolutionary: Prove you're creditworthy WITHOUT revealing sensitive data
 */
contract FlashAssessment {
    
    struct AssessmentResult {
        bool qualifies;
        uint256 maxLoanAmount;
        uint256 recommendedRate;
        uint256 confidenceScore;
        uint256 timestamp;
        string[] verifiedCriteria;
    }
    
    struct ZKProof {
        bytes32 proofHash;
        string proofType;               // "income", "gst", "bank_balance", etc.
        bool verified;
        uint256 timestamp;
    }
    
    struct InstantQualification {
        bool hasMinIncome;              // Proved income > threshold
        bool hasGoodGST;                // Proved GST compliance
        bool hasBankBalance;            // Proved sufficient liquidity
        bool hasBusinessAge;            // Proved business > 6 months
        bool hasTradeHistory;           // Proved trade references
        uint256 qualificationScore;    // 0-100
    }
    
    mapping(address => AssessmentResult) public assessments;
    mapping(address => mapping(string => ZKProof)) public zkProofs;
    mapping(address => InstantQualification) public qualifications;
    
    // Verification thresholds
    uint256 public constant MIN_INCOME = 100000;        // Minimum monthly income
    uint256 public constant MIN_GST_COMPLIANCE = 90;    // 90% compliance
    uint256 public constant MIN_BANK_BALANCE = 50000;   // Minimum balance
    uint256 public constant MIN_BUSINESS_AGE = 180 days;
    
    event AssessmentCompleted(
        address indexed msme,
        bool qualified,
        uint256 maxLoanAmount,
        uint256 timestamp
    );
    
    event ZKProofSubmitted(
        address indexed msme,
        string proofType,
        bool verified
    );
    
    event InstantApproval(
        address indexed msme,
        uint256 approvedAmount,
        uint256 rate
    );
    
    /**
     * @dev Submit zero-knowledge proof
     * Revolutionary: Prove eligibility without revealing actual data
     * 
     * Example: Prove "income > 100,000" without revealing "income = 156,789"
     */
    function submitZKProof(
        string calldata proofType,
        bytes32 proofHash,
        bytes calldata proof
    ) external {
        // In production: Use zkSNARKs library (e.g., snarkjs)
        // For now: Simplified verification
        
        bool verified = verifyProof(proofType, proofHash, proof);
        
        zkProofs[msg.sender][proofType] = ZKProof({
            proofHash: proofHash,
            proofType: proofType,
            verified: verified,
            timestamp: block.timestamp
        });
        
        emit ZKProofSubmitted(msg.sender, proofType, verified);
        
        // Update qualifications
        updateQualifications(msg.sender, proofType, verified);
    }
    
    /**
     * @dev Verify zero-knowledge proof
     * In production: Use proper zk-SNARK verification
     */
    function verifyProof(
        string calldata proofType,
        bytes32 proofHash,
        bytes calldata proof
    ) internal pure returns (bool) {
        // TODO: Implement actual zk-SNARK verification
        // For now: Simplified check
        
        // In production, would verify:
        // 1. Proof is mathematically valid
        // 2. Proof shows value meets threshold
        // 3. Proof is recent (not replayed)
        
        return proof.length > 0 && proofHash != bytes32(0);
    }
    
    /**
     * @dev Update instant qualifications based on proofs
     */
    function updateQualifications(
        address msme,
        string calldata proofType,
        bool verified
    ) internal {
        InstantQualification storage qual = qualifications[msme];
        
        if (keccak256(bytes(proofType)) == keccak256(bytes("income"))) {
            qual.hasMinIncome = verified;
        } else if (keccak256(bytes(proofType)) == keccak256(bytes("gst"))) {
            qual.hasGoodGST = verified;
        } else if (keccak256(bytes(proofType)) == keccak256(bytes("bank_balance"))) {
            qual.hasBankBalance = verified;
        } else if (keccak256(bytes(proofType)) == keccak256(bytes("business_age"))) {
            qual.hasBusinessAge = verified;
        } else if (keccak256(bytes(proofType)) == keccak256(bytes("trade_history"))) {
            qual.hasTradeHistory = verified;
        }
        
        // Calculate qualification score
        uint256 score = 0;
        if (qual.hasMinIncome) score += 25;
        if (qual.hasGoodGST) score += 25;
        if (qual.hasBankBalance) score += 20;
        if (qual.hasBusinessAge) score += 15;
        if (qual.hasTradeHistory) score += 15;
        
        qual.qualificationScore = score;
    }
    
    /**
     * @dev Run instant assessment
     * Revolutionary: Get loan approval in seconds, not days
     */
    function runInstantAssessment() external returns (AssessmentResult memory) {
        InstantQualification memory qual = qualifications[msg.sender];
        
        // Check if qualifies for instant approval
        bool qualifies = qual.qualificationScore >= 60;
        
        uint256 maxLoan = 0;
        uint256 rate = 1500; // 15% default
        string[] memory criteria = new string[](5);
        uint256 criteriaCount = 0;
        
        if (qualifies) {
            // Calculate max loan based on proofs
            if (qual.hasMinIncome) {
                maxLoan += 50000; // Base amount
                criteria[criteriaCount++] = "Minimum income verified";
            }
            
            if (qual.hasGoodGST) {
                maxLoan += 30000;
                rate -= 200; // Better rate
                criteria[criteriaCount++] = "GST compliance verified";
            }
            
            if (qual.hasBankBalance) {
                maxLoan += 20000;
                rate -= 100;
                criteria[criteriaCount++] = "Bank balance verified";
            }
            
            if (qual.hasBusinessAge) {
                maxLoan += 15000;
                criteria[criteriaCount++] = "Business age verified";
            }
            
            if (qual.hasTradeHistory) {
                maxLoan += 10000;
                rate -= 100;
                criteria[criteriaCount++] = "Trade history verified";
            }
        }
        
        AssessmentResult memory result = AssessmentResult({
            qualifies: qualifies,
            maxLoanAmount: maxLoan,
            recommendedRate: rate,
            confidenceScore: qual.qualificationScore,
            timestamp: block.timestamp,
            verifiedCriteria: criteria
        });
        
        assessments[msg.sender] = result;
        
        emit AssessmentCompleted(
            msg.sender,
            qualifies,
            maxLoan,
            block.timestamp
        );
        
        if (qualifies) {
            emit InstantApproval(msg.sender, maxLoan, rate);
        }
        
        return result;
    }
    
    /**
     * @dev Check if MSME qualifies for instant approval
     */
    function checkInstantEligibility(address msme) external view returns (
        bool eligible,
        uint256 estimatedAmount,
        uint256 missingProofs
    ) {
        InstantQualification memory qual = qualifications[msme];
        
        eligible = qual.qualificationScore >= 60;
        
        // Estimate max amount
        uint256 amount = 0;
        if (qual.hasMinIncome) amount += 50000;
        if (qual.hasGoodGST) amount += 30000;
        if (qual.hasBankBalance) amount += 20000;
        if (qual.hasBusinessAge) amount += 15000;
        if (qual.hasTradeHistory) amount += 10000;
        
        estimatedAmount = amount;
        
        // Count missing proofs
        uint256 missing = 0;
        if (!qual.hasMinIncome) missing++;
        if (!qual.hasGoodGST) missing++;
        if (!qual.hasBankBalance) missing++;
        if (!qual.hasBusinessAge) missing++;
        if (!qual.hasTradeHistory) missing++;
        
        missingProofs = missing;
        
        return (eligible, estimatedAmount, missing);
    }
    
    /**
     * @dev Get required proofs for instant approval
     */
    function getRequiredProofs() external pure returns (
        string[] memory proofTypes,
        uint256[] memory thresholds,
        string[] memory descriptions
    ) {
        proofTypes = new string[](5);
        thresholds = new uint256[](5);
        descriptions = new string[](5);
        
        proofTypes[0] = "income";
        thresholds[0] = MIN_INCOME;
        descriptions[0] = "Prove monthly income exceeds minimum";
        
        proofTypes[1] = "gst";
        thresholds[1] = MIN_GST_COMPLIANCE;
        descriptions[1] = "Prove GST compliance percentage";
        
        proofTypes[2] = "bank_balance";
        thresholds[2] = MIN_BANK_BALANCE;
        descriptions[2] = "Prove minimum bank balance";
        
        proofTypes[3] = "business_age";
        thresholds[3] = MIN_BUSINESS_AGE;
        descriptions[3] = "Prove business operates 6+ months";
        
        proofTypes[4] = "trade_history";
        thresholds[4] = 3; // Minimum 3 references
        descriptions[4] = "Prove trade references";
        
        return (proofTypes, thresholds, descriptions);
    }
    
    /**
     * @dev Get assessment history
     */
    function getAssessment(address msme) external view returns (
        AssessmentResult memory
    ) {
        return assessments[msme];
    }
    
    /**
     * @dev Check if proof is recent and valid
     */
    function isProofValid(
        address msme,
        string calldata proofType
    ) external view returns (bool valid, uint256 age) {
        ZKProof memory proof = zkProofs[msme][proofType];
        
        valid = proof.verified && (block.timestamp - proof.timestamp < 90 days);
        age = block.timestamp - proof.timestamp;
        
        return (valid, age);
    }
    
    /**
     * @dev Bulk submit multiple proofs at once
     * For fast onboarding
     */
    function submitMultipleProofs(
        string[] calldata proofTypes,
        bytes32[] calldata proofHashes,
        bytes[] calldata proofs
    ) external {
        require(
            proofTypes.length == proofHashes.length &&
            proofTypes.length == proofs.length,
            "Array length mismatch"
        );
        
        for (uint i = 0; i < proofTypes.length; i++) {
            bool verified = verifyProof(proofTypes[i], proofHashes[i], proofs[i]);
            
            zkProofs[msg.sender][proofTypes[i]] = ZKProof({
                proofHash: proofHashes[i],
                proofType: proofTypes[i],
                verified: verified,
                timestamp: block.timestamp
            });
            
            updateQualifications(msg.sender, proofTypes[i], verified);
        }
    }
    
    /**
     * @dev Get qualification status summary
     */
    function getQualificationStatus(address msme) external view returns (
        bool hasMinIncome,
        bool hasGoodGST,
        bool hasBankBalance,
        bool hasBusinessAge,
        bool hasTradeHistory,
        uint256 overallScore
    ) {
        InstantQualification memory qual = qualifications[msme];
        
        return (
            qual.hasMinIncome,
            qual.hasGoodGST,
            qual.hasBankBalance,
            qual.hasBusinessAge,
            qual.hasTradeHistory,
            qual.qualificationScore
        );
    }
}
