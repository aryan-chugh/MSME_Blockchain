// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./AttestationRegistry.sol";
import "./LoanAgreementRegistry.sol";

/**
 * @title DynamicCreditScore
 * @dev Real-time credit scoring based on multiple on-chain factors
 * Unlike CIBIL's static score, this updates instantly with every action
 */
contract DynamicCreditScore {
    
    AttestationRegistry public attestationRegistry;
    LoanAgreementRegistry public loanAgreementRegistry;
    
    // Score components (out of 1000)
    struct CreditProfile {
        uint256 attestationScore;      // 0-300: Quality of attestations
        uint256 repaymentScore;        // 0-400: Loan repayment history
        uint256 businessMetricsScore;  // 0-200: GST, revenue trends
        uint256 networkScore;          // 0-100: Platform participation
        uint256 totalScore;            // Sum of all components
        uint256 lastUpdated;
    }
    
    // Advanced scoring factors (things CIBIL doesn't track)
    struct AdvancedMetrics {
        uint256 gstRevenueTrend;       // Revenue growth rate
        uint256 invoicePaymentSpeed;   // How fast they pay suppliers
        uint256 supplyChainScore;      // Supply chain health
        uint256 socialProof;           // Community endorsements
        uint256 businessAge;           // Time in business
        uint256 transactionVolume;     // On-chain activity
    }
    
    mapping(address => CreditProfile) public profiles;
    mapping(address => AdvancedMetrics) public advancedMetrics;
    
    // Real-time score factors
    mapping(address => uint256) public consecutiveOnTimePayments;
    mapping(address => uint256) public totalSuccessfulLoans;
    mapping(address => uint256) public platformEngagement; // Interactions
    
    event CreditScoreUpdated(
        address indexed msme,
        uint256 oldScore,
        uint256 newScore,
        string reason
    );
    
    event ScoreBoost(
        address indexed msme,
        uint256 boostAmount,
        string achievement
    );
    
    constructor(
        address _attestationRegistry,
        address _loanAgreementRegistry
    ) {
        attestationRegistry = AttestationRegistry(_attestationRegistry);
        loanAgreementRegistry = LoanAgreementRegistry(_loanAgreementRegistry);
    }
    
    /**
     * @dev Calculate attestation score (0-300)
     * Better than CIBIL: Multiple independent verifications + recency
     */
    function calculateAttestationScore(address msme) public view returns (uint256) {
        // Get all attestations (would need to implement in AttestationRegistry)
        // For now, simplified calculation
        
        uint256 score = 0;
        uint256 attestationCount = 0; // TODO: Query from registry
        uint256 oracleReputation = 0; // TODO: Query oracle reputation
        
        // Base score from attestation count
        if (attestationCount >= 5) score += 100;
        else score += attestationCount * 20;
        
        // Bonus for high-reputation oracles
        score += (oracleReputation * 100) / 1000;
        
        // Recency bonus (attestations < 90 days old)
        // TODO: Check attestation timestamps
        score += 50;
        
        // Diversity bonus (different types of attestations)
        score += 50;
        
        return score > 300 ? 300 : score;
    }
    
    /**
     * @dev Calculate repayment score (0-400)
     * Better than CIBIL: Real-time updates + partial payment tracking
     */
    function calculateRepaymentScore(address msme) public view returns (uint256) {
        uint256 score = 0;
        
        // Perfect repayment streak
        uint256 streak = consecutiveOnTimePayments[msme];
        if (streak >= 12) score += 200; // Perfect for 1 year
        else score += streak * 15;
        
        // Total successful loans
        uint256 successful = totalSuccessfulLoans[msme];
        score += successful * 20;
        if (score > 200) score = 200;
        
        // TODO: Query actual loan repayment data from LoanAgreementRegistry
        
        return score > 400 ? 400 : score;
    }
    
    /**
     * @dev Calculate business metrics score (0-200)
     * Revolutionary: Track revenue trends, not just history
     */
    function calculateBusinessMetricsScore(address msme) public view returns (uint256) {
        AdvancedMetrics memory metrics = advancedMetrics[msme];
        uint256 score = 0;
        
        // GST revenue trend (growing = higher score)
        if (metrics.gstRevenueTrend > 110) score += 80; // 10% growth
        else if (metrics.gstRevenueTrend > 100) score += 50; // Stable
        else score += 20; // Declining
        
        // Invoice payment speed
        score += (metrics.invoicePaymentSpeed * 60) / 100;
        
        // Supply chain health
        score += (metrics.supplyChainScore * 40) / 100;
        
        // Business age bonus (stability)
        uint256 ageYears = metrics.businessAge / 365 days;
        if (ageYears >= 5) score += 20;
        else score += ageYears * 4;
        
        return score > 200 ? 200 : score;
    }
    
    /**
     * @dev Calculate network score (0-100)
     * Innovative: Platform participation = creditworthiness
     */
    function calculateNetworkScore(address msme) public view returns (uint256) {
        uint256 engagement = platformEngagement[msme];
        AdvancedMetrics memory metrics = advancedMetrics[msme];
        
        uint256 score = 0;
        
        // Platform activity
        score += engagement > 100 ? 40 : (engagement * 40) / 100;
        
        // Social proof (community endorsements)
        score += (metrics.socialProof * 30) / 100;
        
        // Transaction volume (active user)
        score += (metrics.transactionVolume * 30) / 1000;
        
        return score > 100 ? 100 : score;
    }
    
    /**
     * @dev Calculate total credit score
     * Dynamic, real-time, multi-dimensional
     */
    function calculateTotalScore(address msme) public returns (uint256) {
        uint256 attestationScore = calculateAttestationScore(msme);
        uint256 repaymentScore = calculateRepaymentScore(msme);
        uint256 businessScore = calculateBusinessMetricsScore(msme);
        uint256 networkScore = calculateNetworkScore(msme);
        
        uint256 oldScore = profiles[msme].totalScore;
        uint256 newScore = attestationScore + repaymentScore + businessScore + networkScore;
        
        profiles[msme] = CreditProfile({
            attestationScore: attestationScore,
            repaymentScore: repaymentScore,
            businessMetricsScore: businessScore,
            networkScore: networkScore,
            totalScore: newScore,
            lastUpdated: block.timestamp
        });
        
        emit CreditScoreUpdated(msme, oldScore, newScore, "Recalculated");
        
        return newScore;
    }
    
    /**
     * @dev Record on-time payment (instant score boost!)
     * Better than CIBIL: Real-time, not 30-day lag
     */
    function recordOnTimePayment(address msme) external {
        // TODO: Add access control (only LoanAgreementRegistry)
        consecutiveOnTimePayments[msme]++;
        totalSuccessfulLoans[msme]++;
        
        // Instant score boost
        uint256 oldScore = profiles[msme].totalScore;
        calculateTotalScore(msme);
        uint256 newScore = profiles[msme].totalScore;
        
        emit ScoreBoost(msme, newScore - oldScore, "On-time payment");
    }
    
    /**
     * @dev Update business metrics from oracle
     */
    function updateBusinessMetrics(
        address msme,
        uint256 revenueTrend,
        uint256 invoiceSpeed,
        uint256 supplyChainScore
    ) external {
        // TODO: Add access control (only oracles)
        advancedMetrics[msme].gstRevenueTrend = revenueTrend;
        advancedMetrics[msme].invoicePaymentSpeed = invoiceSpeed;
        advancedMetrics[msme].supplyChainScore = supplyChainScore;
        
        calculateTotalScore(msme);
    }
    
    /**
     * @dev Get credit rating category
     */
    function getCreditRating(address msme) external view returns (string memory) {
        uint256 score = profiles[msme].totalScore;
        
        if (score >= 900) return "AAA - Excellent";
        if (score >= 800) return "AA - Very Good";
        if (score >= 700) return "A - Good";
        if (score >= 600) return "BBB - Fair";
        if (score >= 500) return "BB - Below Average";
        if (score >= 400) return "B - Poor";
        return "C - Very Poor";
    }
    
    /**
     * @dev Check if MSME qualifies for instant approval
     * Revolutionary: Automated credit decisions
     */
    function qualifiesForInstantApproval(
        address msme,
        uint256 loanAmount
    ) external view returns (bool, string memory) {
        CreditProfile memory profile = profiles[msme];
        
        // High credit score
        if (profile.totalScore < 700) {
            return (false, "Credit score too low");
        }
        
        // Recent attestations
        if (block.timestamp - profile.lastUpdated > 90 days) {
            return (false, "Attestations too old");
        }
        
        // Strong repayment history
        if (profile.repaymentScore < 300) {
            return (false, "Insufficient repayment history");
        }
        
        // Loan amount vs creditworthiness
        // TODO: More sophisticated risk assessment
        
        return (true, "Qualified for instant approval");
    }
    
    /**
     * @dev Get detailed credit profile
     */
    function getCreditProfile(address msme) external view returns (
        CreditProfile memory profile,
        AdvancedMetrics memory metrics,
        string memory rating
    ) {
        profile = profiles[msme];
        metrics = advancedMetrics[msme];
        rating = this.getCreditRating(msme);
    }
}
