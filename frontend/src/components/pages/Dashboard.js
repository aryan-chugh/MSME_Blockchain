import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '../../utils/contracts';

function Dashboard({ account, provider }) {
  const [stats, setStats] = useState({
    totalMSMEs: 0,
    totalLoans: 0,
    activeOracles: 0,
    totalVolume: '0',
    totalAttestations: 0,
    averageRate: '0',
    activeRequests: 0,
    completedLoans: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (provider) {
      fetchStats();
    }
  }, [provider]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Initialize contracts
      const oracleStaking = new ethers.Contract(
        CONTRACT_ADDRESSES.OracleStaking,
        [
          'function totalOracles() view returns (uint256)',
          'function activeOracleCount() view returns (uint256)'
        ],
        provider
      );

      const attestationRegistry = new ethers.Contract(
        CONTRACT_ADDRESSES.AttestationRegistry,
        [
          'function attestationCounter() view returns (uint256)'
        ],
        provider
      );

      const loanMarketplace = new ethers.Contract(
        CONTRACT_ADDRESSES.LoanMarketplace,
        [
          'function loanRequestCounter() view returns (uint256)',
          'function getLoanRequest(uint256) view returns (address, uint256, uint256, uint256, uint256, uint8, uint256, uint256)',
          'event LoanRequestCreated(uint256 indexed requestId, address indexed msme, uint256 amount)'
        ],
        provider
      );

      const loanAgreementRegistry = new ethers.Contract(
        CONTRACT_ADDRESSES.LoanAgreementRegistry,
        [
          'function recordCounter() view returns (uint256)',
          'function getRecord(uint256) view returns (uint256, address, address, uint256, uint256, uint256, uint8)',
          'event AgreementRegistered(uint256 indexed recordId, uint256 indexed loanRequestId)'
        ],
        provider
      );

      // Fetch data
      const [
        totalOracles,
        activeOracles,
        attestationCount,
        loanRequestCount,
        recordCount
      ] = await Promise.all([
        oracleStaking.totalOracles().catch(() => 0n),
        oracleStaking.activeOracleCount().catch(() => 0n),
        attestationRegistry.attestationCounter().catch(() => 0n),
        loanMarketplace.loanRequestCounter().catch(() => 0n),
        loanAgreementRegistry.recordCounter().catch(() => 0n)
      ]);

      // Calculate additional stats
      let totalVolume = 0n;
      let activeRequests = 0;
      let completedLoans = 0;
      let rateSum = 0n;
      let rateCount = 0;

      // Fetch loan requests
      for (let i = 1; i <= Number(loanRequestCount); i++) {
        try {
          const request = await loanMarketplace.getLoanRequest(i);
          const amount = request[1];
          const status = request[5]; // 0=Open, 1=Bidding, 2=Closed
          
          totalVolume += amount;
          
          if (status === 0 || status === 1) {
            activeRequests++;
          }
        } catch (e) {
          console.error(`Error fetching request ${i}:`, e);
        }
      }

      // Fetch loan records
      for (let i = 1; i <= Number(recordCount); i++) {
        try {
          const record = await loanAgreementRegistry.getRecord(i);
          const interestRate = record[4];
          const status = record[6]; // 0=Active, 1=Repaid, 2=Defaulted
          
          if (status === 1) {
            completedLoans++;
          }
          
          rateSum += interestRate;
          rateCount++;
        } catch (e) {
          console.error(`Error fetching record ${i}:`, e);
        }
      }

      const averageRate = rateCount > 0 ? Number(rateSum) / rateCount / 100 : 0;

      setStats({
        totalMSMEs: Number(loanRequestCount), // Approximation: each MSME with at least one request
        totalLoans: Number(recordCount),
        activeOracles: Number(activeOracles),
        totalVolume: ethers.formatEther(totalVolume),
        totalAttestations: Number(attestationCount),
        averageRate: averageRate.toFixed(2),
        activeRequests,
        completedLoans
      });

    } catch (error) {
      console.error('Error fetching stats:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!provider) {
    return (
      <div className="card">
        <div className="alert alert-info">
          Please connect your wallet to view platform statistics
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>📊 Platform Dashboard</h1>
            <p style={{ color: '#718096', marginTop: '8px' }}>
              Real-time statistics from the MSME Credit Platform
            </p>
          </div>
          <button 
            className="button button-secondary" 
            onClick={fetchStats}
            disabled={loading}
          >
            {loading ? '🔄 Loading...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="card">
          <div className="alert alert-error">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
        <div className="card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Loan Volume</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', marginTop: '10px' }}>
            {loading ? '...' : `${parseFloat(stats.totalVolume).toFixed(2)} ETH`}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '5px' }}>
            Across {stats.totalLoans} loans
          </div>
        </div>

        <div className="card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Active Loan Requests</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', marginTop: '10px' }}>
            {loading ? '...' : stats.activeRequests}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '5px' }}>
            Available for bidding
          </div>
        </div>

        <div className="card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Active Oracles</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', marginTop: '10px' }}>
            {loading ? '...' : stats.activeOracles}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '5px' }}>
            Providing attestations
          </div>
        </div>

        <div className="card" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white' }}>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Average Interest Rate</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', marginTop: '10px' }}>
            {loading ? '...' : `${stats.averageRate}%`}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '5px' }}>
            Per annum
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="card">
        <h2>Platform Metrics</h2>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div style={{ padding: '20px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#667eea' }}>
              {loading ? '...' : stats.totalMSMEs}
            </div>
            <div style={{ color: '#718096', marginTop: '8px', fontSize: '14px' }}>
              Total MSMEs
            </div>
          </div>

          <div style={{ padding: '20px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#48bb78' }}>
              {loading ? '...' : stats.totalLoans}
            </div>
            <div style={{ color: '#718096', marginTop: '8px', fontSize: '14px' }}>
              Total Loans
            </div>
          </div>

          <div style={{ padding: '20px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ed8936' }}>
              {loading ? '...' : stats.completedLoans}
            </div>
            <div style={{ color: '#718096', marginTop: '8px', fontSize: '14px' }}>
              Completed Loans
            </div>
          </div>

          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#9f7aea' }}>
              {loading ? '...' : stats.totalAttestations}
            </div>
            <div style={{ color: '#718096', marginTop: '8px', fontSize: '14px' }}>
              Total Attestations
            </div>
          </div>
        </div>
      </div>

      {/* Contract Addresses */}
      <div className="card">
        <h2>Smart Contract Addresses</h2>
        <table>
          <thead>
            <tr>
              <th>Contract</th>
              <th>Address</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>CIT Token</strong></td>
              <td><code style={{ fontSize: '12px' }}>{CONTRACT_ADDRESSES.CIToken}</code></td>
              <td><span className="status status-active">Active</span></td>
            </tr>
            <tr>
              <td><strong>Oracle Staking</strong></td>
              <td><code style={{ fontSize: '12px' }}>{CONTRACT_ADDRESSES.OracleStaking}</code></td>
              <td><span className="status status-active">Active</span></td>
            </tr>
            <tr>
              <td><strong>Attestation Registry</strong></td>
              <td><code style={{ fontSize: '12px' }}>{CONTRACT_ADDRESSES.AttestationRegistry}</code></td>
              <td><span className="status status-active">Active</span></td>
            </tr>
            <tr>
              <td><strong>Loan Marketplace</strong></td>
              <td><code style={{ fontSize: '12px' }}>{CONTRACT_ADDRESSES.LoanMarketplace}</code></td>
              <td><span className="status status-active">Active</span></td>
            </tr>
            <tr>
              <td><strong>Loan Agreement Registry</strong></td>
              <td><code style={{ fontSize: '12px' }}>{CONTRACT_ADDRESSES.LoanAgreementRegistry}</code></td>
              <td><span className="status status-active">Active</span></td>
            </tr>
            <tr>
              <td><strong>Platform Governance</strong></td>
              <td><code style={{ fontSize: '12px' }}>{CONTRACT_ADDRESSES.PlatformGovernance}</code></td>
              <td><span className="status status-active">Active</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Network Info */}
      <div className="card">
        <h2>Network Information</h2>
        <div className="grid">
          <div>
            <p style={{ color: '#718096' }}><strong>Network:</strong> Hardhat Local</p>
            <p style={{ color: '#718096' }}><strong>RPC URL:</strong> http://localhost:8545</p>
          </div>
          <div>
            <p style={{ color: '#718096' }}><strong>Chain ID:</strong> 31337</p>
            <p style={{ color: '#718096' }}><strong>Connected Account:</strong> {account || 'Not connected'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
