const { ethers } = require("ethers");
const axios = require("axios");

// Configuration
const CONTRACTS = {
  citToken: process.env.CIT_TOKEN_ADDRESS || "",
  oracleStaking: process.env.ORACLE_STAKING_ADDRESS || "",
  attestationRegistry: process.env.ATTESTATION_REGISTRY_ADDRESS || "",
  marketplace: process.env.MARKETPLACE_ADDRESS || "",
  agreementRegistry: process.env.AGREEMENT_REGISTRY_ADDRESS || "",
  governance: process.env.GOVERNANCE_ADDRESS || ""
};

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const ORACLE_SERVICE_URL = process.env.ORACLE_SERVICE_URL || "http://localhost:3001";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

class PlatformHealthMonitor {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    this.alerts = [];
    this.lastBlockNumber = 0;
  }

  async runAllChecks() {
    console.log("\n" + "=".repeat(60));
    console.log("🏥 PLATFORM HEALTH CHECK");
    console.log("   " + new Date().toISOString());
    console.log("=".repeat(60) + "\n");

    const results = {
      timestamp: new Date().toISOString(),
      checks: [],
      allPassed: true
    };

    // Run all health checks
    results.checks.push(await this.checkRPCConnectivity());
    results.checks.push(await this.checkContracts());
    results.checks.push(await this.checkOracleService());
    results.checks.push(await this.checkFrontend());
    results.checks.push(await this.checkBlockProgress());

    // Determine overall status
    results.allPassed = results.checks.every(check => check.passed);

    // Display summary
    this.displaySummary(results);

    return results;
  }

  async checkRPCConnectivity() {
    const check = {
      name: "RPC Connectivity",
      passed: false,
      message: "",
      data: {}
    };

    try {
      const blockNumber = await this.provider.getBlockNumber();
      const network = await this.provider.getNetwork();
      
      check.passed = true;
      check.message = `Connected to network ${network.chainId}`;
      check.data = {
        blockNumber: blockNumber,
        chainId: network.chainId.toString()
      };
      
      console.log(`✅ RPC Connectivity: Block ${blockNumber}, Chain ID ${network.chainId}`);
    } catch (error) {
      check.message = `RPC connection failed: ${error.message}`;
      console.error(`❌ RPC Connectivity: ${error.message}`);
    }

    return check;
  }

  async checkContracts() {
    const check = {
      name: "Smart Contracts",
      passed: false,
      message: "",
      data: {}
    };

    try {
      let allFound = true;
      const contractStatuses = {};

      for (const [name, address] of Object.entries(CONTRACTS)) {
        if (!address) {
          console.log(`⚠️  ${name}: Address not configured`);
          contractStatuses[name] = "not_configured";
          continue;
        }

        const code = await this.provider.getCode(address);
        if (code === "0x") {
          console.error(`❌ ${name}: No contract at ${address}`);
          contractStatuses[name] = "not_found";
          allFound = false;
        } else {
          console.log(`✅ ${name}: Deployed at ${address}`);
          contractStatuses[name] = "ok";
        }
      }

      check.passed = allFound;
      check.message = allFound ? "All contracts accessible" : "Some contracts missing";
      check.data = contractStatuses;
    } catch (error) {
      check.message = `Contract check failed: ${error.message}`;
      console.error(`❌ Contract Check: ${error.message}`);
    }

    return check;
  }

  async checkOracleService() {
    const check = {
      name: "Oracle Service",
      passed: false,
      message: "",
      data: {}
    };

    try {
      const response = await axios.get(`${ORACLE_SERVICE_URL}/health`, {
        timeout: 5000
      });
      
      if (response.data.status === "healthy") {
        check.passed = true;
        check.message = "Oracle service healthy";
        check.data = {
          oracle: response.data.oracle,
          walletConfigured: response.data.walletConfigured
        };
        console.log(`✅ Oracle Service: Healthy (${response.data.oracle})`);
      } else {
        check.message = "Oracle service unhealthy";
        console.error(`❌ Oracle Service: Unhealthy`);
      }
    } catch (error) {
      check.message = `Oracle service unreachable: ${error.message}`;
      console.error(`❌ Oracle Service: ${error.message}`);
    }

    return check;
  }

  async checkFrontend() {
    const check = {
      name: "Frontend",
      passed: false,
      message: "",
      data: {}
    };

    try {
      const response = await axios.get(FRONTEND_URL, {
        timeout: 5000,
        validateStatus: (status) => status < 500
      });
      
      if (response.status === 200) {
        check.passed = true;
        check.message = "Frontend accessible";
        console.log(`✅ Frontend: Accessible at ${FRONTEND_URL}`);
      } else {
        check.message = `Frontend returned status ${response.status}`;
        console.error(`❌ Frontend: Status ${response.status}`);
      }
    } catch (error) {
      check.message = `Frontend unreachable: ${error.message}`;
      console.error(`❌ Frontend: ${error.message}`);
    }

    return check;
  }

  async checkBlockProgress() {
    const check = {
      name: "Block Progress",
      passed: false,
      message: "",
      data: {}
    };

    try {
      const currentBlock = await this.provider.getBlockNumber();
      
      if (this.lastBlockNumber === 0) {
        this.lastBlockNumber = currentBlock;
        check.passed = true;
        check.message = "First check, baseline set";
        check.data = { currentBlock };
        console.log(`✅ Block Progress: Baseline set at block ${currentBlock}`);
      } else if (currentBlock > this.lastBlockNumber) {
        check.passed = true;
        check.message = "Blockchain progressing";
        check.data = {
          currentBlock,
          lastBlock: this.lastBlockNumber,
          blocksAdded: currentBlock - this.lastBlockNumber
        };
        console.log(`✅ Block Progress: ${currentBlock - this.lastBlockNumber} new blocks`);
        this.lastBlockNumber = currentBlock;
      } else {
        check.message = "No new blocks since last check";
        check.data = { currentBlock, stagnantFor: "1 interval" };
        console.warn(`⚠️  Block Progress: No new blocks (stuck at ${currentBlock})`);
      }
    } catch (error) {
      check.message = `Block progress check failed: ${error.message}`;
      console.error(`❌ Block Progress: ${error.message}`);
    }

    return check;
  }

  displaySummary(results) {
    console.log("\n" + "=".repeat(60));
    console.log("📊 HEALTH CHECK SUMMARY");
    console.log("=".repeat(60));
    
    const passed = results.checks.filter(c => c.passed).length;
    const total = results.checks.length;
    
    console.log(`Status: ${results.allPassed ? "✅ HEALTHY" : "⚠️  ISSUES DETECTED"}`);
    console.log(`Checks Passed: ${passed}/${total}`);
    console.log("=".repeat(60) + "\n");
  }

  alert(alertData) {
    const alert = {
      ...alertData,
      timestamp: new Date().toISOString()
    };
    
    this.alerts.push(alert);
    console.error("\n🚨 ALERT:", JSON.stringify(alert, null, 2));
    
    // In production, send to monitoring service (Slack, PagerDuty, etc.)
    // this.sendToMonitoringService(alert);
  }
}

// Main execution
async function main() {
  const monitor = new PlatformHealthMonitor();
  
  console.log("🔍 Starting Platform Health Monitor...\n");
  console.log("Configuration:");
  console.log(`  RPC URL: ${RPC_URL}`);
  console.log(`  Oracle Service: ${ORACLE_SERVICE_URL}`);
  console.log(`  Frontend: ${FRONTEND_URL}`);
  console.log("");

  // Run initial check
  await monitor.runAllChecks();

  // Schedule periodic checks (every 5 minutes)
  const intervalMs = 5 * 60 * 1000; // 5 minutes
  console.log(`\n⏰ Scheduling health checks every ${intervalMs / 1000 / 60} minutes...\n`);
  
  setInterval(async () => {
    await monitor.runAllChecks();
  }, intervalMs);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log("\n\n👋 Shutting down health monitor...");
  process.exit(0);
});

if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

module.exports = { PlatformHealthMonitor };
