// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title SocialCreditSystem
 * @dev Community-driven reputation and trust scoring
 * Revolutionary: Capture "soft data" that traditional bureaus can't
 */
contract SocialCreditSystem {
    
    struct SocialProfile {
        uint256 supplierEndorsements;      // From supply chain partners
        uint256 customerReviews;           // From clients/buyers
        uint256 communityVouches;          // From other MSMEs
        uint256 employeeRating;            // From team (optional)
        uint256 industryRecognition;       // Awards, certifications
        uint256 socialScore;               // Composite (0-1000)
        uint256 trustLevel;                // Verified vs unverified
    }
    
    struct Endorsement {
        address endorser;
        string relationship;               // "supplier", "customer", "partner"
        string comment;
        uint256 amount;                    // Total business volume
        uint256 timestamp;
        bool verified;                     // Oracle verified relationship
    }
    
    struct Review {
        address reviewer;
        uint8 rating;                      // 1-5 stars
        string feedback;
        uint256 timestamp;
        bool verified;
    }
    
    // Social graph
    mapping(address => SocialProfile) public profiles;
    mapping(address => Endorsement[]) public endorsements;
    mapping(address => Review[]) public reviews;
    mapping(address => mapping(address => bool)) public hasEndorsed;
    
    // Reputation staking
    mapping(address => uint256) public reputationStake;
    mapping(address => bool) public flagged;
    
    event EndorsementGiven(
        address indexed msme,
        address indexed endorser,
        string relationship,
        uint256 amount
    );
    
    event ReviewSubmitted(
        address indexed msme,
        address indexed reviewer,
        uint8 rating
    );
    
    event SocialScoreUpdated(
        address indexed msme,
        uint256 newScore,
        uint256 trustLevel
    );
    
    event ReputationChallenged(
        address indexed msme,
        address indexed challenger,
        string reason
    );
    
    /**
     * @dev Give endorsement to MSME
     * Must have business relationship to endorse
     */
    function endorseMSME(
        address msme,
        string calldata relationship,
        string calldata comment,
        uint256 businessVolume
    ) external {
        require(msme != msg.sender, "Cannot endorse yourself");
        require(!hasEndorsed[msg.sender][msme], "Already endorsed");
        require(!flagged[msg.sender], "Endorser is flagged");
        
        Endorsement memory endorsement = Endorsement({
            endorser: msg.sender,
            relationship: relationship,
            comment: comment,
            amount: businessVolume,
            timestamp: block.timestamp,
            verified: false  // Oracle verifies later
        });
        
        endorsements[msme].push(endorsement);
        hasEndorsed[msg.sender][msme] = true;
        
        profiles[msme].supplierEndorsements++;
        
        emit EndorsementGiven(msme, msg.sender, relationship, businessVolume);
        
        // Recalculate social score
        calculateSocialScore(msme);
    }
    
    /**
     * @dev Submit review for MSME
     * From customers/clients
     */
    function submitReview(
        address msme,
        uint8 rating,
        string calldata feedback
    ) external {
        require(rating >= 1 && rating <= 5, "Rating must be 1-5");
        require(msme != msg.sender, "Cannot review yourself");
        require(!flagged[msg.sender], "Reviewer is flagged");
        
        Review memory review = Review({
            reviewer: msg.sender,
            rating: rating,
            feedback: feedback,
            timestamp: block.timestamp,
            verified: false
        });
        
        reviews[msme].push(review);
        profiles[msme].customerReviews++;
        
        emit ReviewSubmitted(msme, msg.sender, rating);
        
        calculateSocialScore(msme);
    }
    
    /**
     * @dev Community vouch - stake reputation on another MSME
     * Revolutionary: Skin in the game for endorsements
     */
    function vouchForMSME(address msme) external payable {
        require(msg.value >= 0.01 ether, "Minimum 0.01 ETH stake");
        require(msme != msg.sender, "Cannot vouch for yourself");
        require(!hasEndorsed[msg.sender][msme], "Already vouched");
        
        reputationStake[msme] += msg.value;
        hasEndorsed[msg.sender][msme] = true;
        profiles[msme].communityVouches++;
        
        calculateSocialScore(msme);
    }
    
    /**
     * @dev Calculate composite social score
     * Revolutionary: Quantify "soft" reputation data
     */
    function calculateSocialScore(address msme) public {
        SocialProfile storage profile = profiles[msme];
        
        uint256 score = 0;
        
        // Supplier endorsements (0-300 points)
        uint256 endorsementScore = profile.supplierEndorsements * 30;
        if (endorsementScore > 300) endorsementScore = 300;
        score += endorsementScore;
        
        // Customer reviews (0-300 points)
        uint256 reviewScore = calculateReviewScore(msme);
        score += reviewScore;
        
        // Community vouches (0-200 points)
        uint256 vouchScore = profile.communityVouches * 20;
        if (vouchScore > 200) vouchScore = 200;
        score += vouchScore;
        
        // Industry recognition (0-100 points)
        score += profile.industryRecognition;
        
        // Trust level bonus (verified relationships)
        uint256 verifiedCount = countVerifiedEndorsements(msme);
        uint256 trustBonus = verifiedCount * 10;
        if (trustBonus > 100) trustBonus = 100;
        score += trustBonus;
        
        // Reputation stake multiplier
        if (reputationStake[msme] > 0.1 ether) {
            score = score * 110 / 100; // 10% bonus
        }
        
        profile.socialScore = score;
        
        emit SocialScoreUpdated(msme, score, profile.trustLevel);
    }
    
    /**
     * @dev Calculate average review score
     */
    function calculateReviewScore(address msme) internal view returns (uint256) {
        Review[] memory msmeReviews = reviews[msme];
        if (msmeReviews.length == 0) return 0;
        
        uint256 totalRating = 0;
        for (uint i = 0; i < msmeReviews.length; i++) {
            totalRating += msmeReviews[i].rating;
        }
        
        uint256 avgRating = totalRating / msmeReviews.length;
        
        // Convert 5-star to 300-point scale
        return (avgRating * 300) / 5;
    }
    
    /**
     * @dev Count verified endorsements
     */
    function countVerifiedEndorsements(address msme) internal view returns (uint256) {
        Endorsement[] memory msmeEndorsements = endorsements[msme];
        uint256 count = 0;
        
        for (uint i = 0; i < msmeEndorsements.length; i++) {
            if (msmeEndorsements[i].verified) {
                count++;
            }
        }
        
        return count;
    }
    
    /**
     * @dev Oracle verifies endorsement authenticity
     * Checks if relationship is real (GST records, invoices, etc.)
     */
    function verifyEndorsement(
        address msme,
        uint256 endorsementIndex,
        bool isValid
    ) external {
        // TODO: Add oracle access control
        require(endorsementIndex < endorsements[msme].length, "Invalid index");
        
        endorsements[msme][endorsementIndex].verified = isValid;
        
        if (isValid) {
            profiles[msme].trustLevel++;
        }
        
        calculateSocialScore(msme);
    }
    
    /**
     * @dev Challenge fraudulent reputation
     * Allows community to flag suspicious endorsements
     */
    function challengeReputation(
        address msme,
        string calldata reason
    ) external payable {
        require(msg.value >= 0.05 ether, "Minimum 0.05 ETH challenge stake");
        
        emit ReputationChallenged(msme, msg.sender, reason);
        
        // TODO: Governance vote on challenge
        // If valid, slash staked reputation
        // If invalid, challenger loses stake
    }
    
    /**
     * @dev Get social proof summary
     * For lenders to see at a glance
     */
    function getSocialProof(address msme) external view returns (
        uint256 socialScore,
        uint256 endorsementCount,
        uint256 avgReview,
        uint256 communityTrust,
        bool highlyTrusted
    ) {
        SocialProfile memory profile = profiles[msme];
        
        socialScore = profile.socialScore;
        endorsementCount = profile.supplierEndorsements;
        communityTrust = profile.communityVouches;
        
        // Calculate average review
        Review[] memory msmeReviews = reviews[msme];
        if (msmeReviews.length > 0) {
            uint256 total = 0;
            for (uint i = 0; i < msmeReviews.length; i++) {
                total += msmeReviews[i].rating;
            }
            avgReview = (total * 100) / msmeReviews.length; // Out of 500
        }
        
        highlyTrusted = (profile.socialScore > 600 && profile.trustLevel > 5);
        
        return (socialScore, endorsementCount, avgReview, communityTrust, highlyTrusted);
    }
    
    /**
     * @dev Get endorsement details
     */
    function getEndorsements(address msme) external view returns (
        Endorsement[] memory
    ) {
        return endorsements[msme];
    }
    
    /**
     * @dev Get reviews
     */
    function getReviews(address msme) external view returns (
        Review[] memory
    ) {
        return reviews[msme];
    }
    
    /**
     * @dev Record industry recognition
     * Awards, certifications, memberships
     */
    function recordRecognition(
        address msme,
        uint256 points
    ) external {
        // TODO: Add oracle access control
        require(points <= 100, "Max 100 points");
        
        profiles[msme].industryRecognition += points;
        calculateSocialScore(msme);
    }
    
    /**
     * @dev Withdraw reputation stake
     * Only if no active challenges
     */
    function withdrawStake(address msme) external {
        // TODO: Implement withdrawal logic with time locks
        // Can't withdraw if MSME has active loans
        // Can't withdraw if recently challenged
    }
}
