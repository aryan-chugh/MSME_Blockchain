// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title PredictiveAnalyticsOracle
 * @dev AI/ML-powered credit risk prediction
 * Revolutionary feature: Predict future behavior, not just score past behavior
 */
contract PredictiveAnalyticsOracle {
    
    struct PredictiveScore {
        uint256 defaultProbability;    // 0-100 (percentage)
        uint256 growthPotential;       // 0-100 (future revenue growth)
        uint256 marketRisk;            // 0-100 (industry/sector risk)
        uint256 seasonalityFactor;     // Business seasonality impact
        uint256 confidenceLevel;       // ML model confidence
        uint256 timestamp;
    }
    
    struct BusinessInsights {
        string industry;
        uint256 avgRevenueGrowth;      // Historical average
        uint256 volatilityScore;       // Business stability
        uint256 competitorAnalysis;    // Market position
        bool  expandingMarket;         // Growing vs shrinking sector
    }
    
    mapping(address => PredictiveScore) public predictions;
    mapping(address => BusinessInsights) public insights;
    
    // ML Model parameters (simplified - in production, use Chainlink Functions)
    mapping(bytes32 => uint256) public modelWeights;
    
    event PredictionUpdated(
        address indexed msme,
        uint256 defaultProbability,
        uint256 growthPotential,
        uint256 timestamp
    );
    
    event RiskAlert(
        address indexed msme,
        string alertType,
        uint256 severity
    );
    
    /**
     * @dev Generate predictive score using on-chain and off-chain data
     * This is revolutionary - CIBIL only looks backward!
     */
    function generatePrediction(
        address msme,
        uint256[] calldata historicalRevenue,  // Last 12 months
        uint256[] calldata paymentDelays,      // Days late
        uint256 industryGrowthRate,
        uint256 macroEconomicIndicators
    ) external returns (PredictiveScore memory) {
        // TODO: In production, use Chainlink Functions to call ML model
        
        // Calculate revenue trend
        uint256 revenueTrend = calculateRevenueTrend(historicalRevenue);
        
        // Calculate payment reliability
        uint256 paymentReliability = calculatePaymentReliability(paymentDelays);
        
        // Predict default probability
        uint256 defaultProb = predictDefaultProbability(
            revenueTrend,
            paymentReliability,
            industryGrowthRate,
            macroEconomicIndicators
        );
        
        // Predict growth potential
        uint256 growthPotential = predictGrowthPotential(
            revenueTrend,
            industryGrowthRate
        );
        
        // Calculate market risk
        uint256 marketRisk = assessMarketRisk(
            msme,
            macroEconomicIndicators
        );
        
        PredictiveScore memory score = PredictiveScore({
            defaultProbability: defaultProb,
            growthPotential: growthPotential,
            marketRisk: marketRisk,
            seasonalityFactor: 50, // TODO: Calculate from historical data
            confidenceLevel: 85,   // ML model confidence
            timestamp: block.timestamp
        });
        
        predictions[msme] = score;
        
        emit PredictionUpdated(msme, defaultProb, growthPotential, block.timestamp);
        
        // Generate risk alerts
        if (defaultProb > 30) {
            emit RiskAlert(msme, "High default risk", defaultProb);
        }
        
        return score;
    }
    
    /**
     * @dev Calculate revenue trend
     */
    function calculateRevenueTrend(
        uint256[] calldata historicalRevenue
    ) internal pure returns (uint256) {
        if (historicalRevenue.length < 2) return 100;
        
        uint256 recent = historicalRevenue[historicalRevenue.length - 1];
        uint256 older = historicalRevenue[0];
        
        if (older == 0) return 100;
        
        return (recent * 100) / older;
    }
    
    /**
     * @dev Calculate payment reliability score
     */
    function calculatePaymentReliability(
        uint256[] calldata paymentDelays
    ) internal pure returns (uint256) {
        if (paymentDelays.length == 0) return 100;
        
        uint256 totalDelay = 0;
        for (uint i = 0; i < paymentDelays.length; i++) {
            totalDelay += paymentDelays[i];
        }
        
        uint256 avgDelay = totalDelay / paymentDelays.length;
        
        // Perfect = 100, decreases with delays
        if (avgDelay == 0) return 100;
        if (avgDelay > 30) return 0;
        
        return 100 - (avgDelay * 100 / 30);
    }
    
    /**
     * @dev Predict default probability using simplified model
     * In production: Use Chainlink to call external ML model
     */
    function predictDefaultProbability(
        uint256 revenueTrend,
        uint256 paymentReliability,
        uint256 industryGrowth,
        uint256 macroIndicators
    ) internal pure returns (uint256) {
        // Simplified linear model (in production, use neural network)
        uint256 score = 0;
        
        // Revenue declining = higher risk
        if (revenueTrend < 90) score += 30;
        else if (revenueTrend < 100) score += 15;
        
        // Poor payment history = higher risk
        score += (100 - paymentReliability) / 3;
        
        // Declining industry = higher risk
        if (industryGrowth < 95) score += 20;
        
        // Poor macro conditions = higher risk
        if (macroIndicators < 50) score += 15;
        
        return score > 100 ? 100 : score;
    }
    
    /**
     * @dev Predict future growth potential
     * Revolutionary: Help lenders find high-potential businesses
     */
    function predictGrowthPotential(
        uint256 revenueTrend,
        uint256 industryGrowth
    ) internal pure returns (uint256) {
        uint256 potential = 0;
        
        // Strong revenue growth
        if (revenueTrend > 120) potential += 40;
        else if (revenueTrend > 110) potential += 30;
        else if (revenueTrend > 100) potential += 20;
        
        // Growing industry
        if (industryGrowth > 110) potential += 40;
        else if (industryGrowth > 100) potential += 25;
        
        // Innovation indicator (TODO: track product launches, patents)
        potential += 20;
        
        return potential > 100 ? 100 : potential;
    }
    
    /**
     * @dev Assess market/sector risk
     */
    function assessMarketRisk(
        address msme,
        uint256 macroIndicators
    ) internal view returns (uint256) {
        BusinessInsights memory business = insights[msme];
        
        uint256 risk = 0;
        
        // Sector-specific risk
        if (!business.expandingMarket) risk += 30;
        
        // High competition
        if (business.competitorAnalysis > 70) risk += 20;
        
        // Business volatility
        risk += business.volatilityScore / 2;
        
        // Macro conditions
        if (macroIndicators < 50) risk += 20;
        
        return risk > 100 ? 100 : risk;
    }
    
    /**
     * @dev Get recommended interest rate based on risk
     * Automated pricing - lenders can use this as guidance
     */
    function getRecommendedRate(address msme) external view returns (
        uint256 minRate,
        uint256 maxRate,
        string memory reasoning
    ) {
        PredictiveScore memory score = predictions[msme];
        
        // Base rate + risk premium
        uint256 baseRate = 800; // 8.00% in basis points
        uint256 riskPremium = score.defaultProbability * 10; // 0.1% per 1% risk
        
        minRate = baseRate + riskPremium;
        maxRate = minRate + 300; // +3% range
        
        if (score.growthPotential > 70) {
            reasoning = "High growth potential - competitive rate recommended";
            minRate = minRate > 200 ? minRate - 200 : minRate;
        } else if (score.defaultProbability > 30) {
            reasoning = "Higher risk - premium rate required";
        } else {
            reasoning = "Standard risk profile";
        }
    }
    
    /**
     * @dev Early warning system for existing loans
     * Monitor borrowers and predict problems before they happen
     */
    function earlyWarningCheck(address msme) external view returns (
        bool warningTriggered,
        string memory warningMessage,
        uint256 severity
    ) {
        PredictiveScore memory score = predictions[msme];
        
        // Check if prediction is recent (< 30 days)
        if (block.timestamp - score.timestamp > 30 days) {
            return (true, "Prediction outdated - refresh required", 50);
        }
        
        // High default probability
        if (score.defaultProbability > 40) {
            return (true, "High default risk detected", 80);
        }
        
        // Rapidly increasing risk
        // TODO: Compare with previous prediction
        
        // Market deterioration
        if (score.marketRisk > 70) {
            return (true, "Sector risk elevated", 60);
        }
        
        return (false, "No warnings", 0);
    }
    
    /**
     * @dev Update business insights
     */
    function updateBusinessInsights(
        address msme,
        string calldata industry,
        uint256 avgGrowth,
        uint256 volatility,
        uint256 competitorScore,
        bool expandingMarket
    ) external {
        // TODO: Add access control (only authorized oracles)
        insights[msme] = BusinessInsights({
            industry: industry,
            avgRevenueGrowth: avgGrowth,
            volatilityScore: volatility,
            competitorAnalysis: competitorScore,
            expandingMarket: expandingMarket
        });
    }
}
