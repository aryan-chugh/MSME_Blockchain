import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ethers } from 'ethers';
import { getContractInstance, formatTokens, NETWORK_CONFIG } from '../../utils/contracts';

function Home({ account, provider }) {
  const [stats, setStats] = useState({
    totalMSMEs: 0,
    totalLoans: 0,
    totalOracles: 0,
    totalVolume: '0',
    activeLoans: 0,
    totalAttestations: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🏠 Home useEffect triggered');
    console.log('  Provider:', !!provider);
    console.log('  Account:', account);
    
    if (provider) {
      console.log('✅ Provider exists, calling loadPlatformStats');
      loadPlatformStats();
      const interval = setInterval(loadPlatformStats, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    } else {
      console.log('❌ No provider, skipping stats load');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  const loadPlatformStats = async () => {
    console.log('🎯 loadPlatformStats called');
    console.log('  Provider exists:', !!provider);
    
    if (!provider) {
      console.error('❌ Home: No provider available');
      return;
    }
    
    try {
      console.log('📊 Home: Starting to load platform stats...');
      setLoading(true);
      
      console.log('🔗 Home: Getting LoanMarketplace contract instance...');
      const loanContract = getContractInstance('LoanMarketplace', provider);
      console.log('✅ Home: Got contract instance');
      console.log('  Contract address:', await loanContract.getAddress());
      
      console.log('📡 Home: Querying loan requests...');
      
      // Try to get request counter, if it fails, query events
      let totalLoans = 0;
      try {
        const counter = await loanContract.requestCounter();
        totalLoans = Number(counter);
        console.log('✅ Home: Got counter from contract:', totalLoans);
      } catch (err) {
        console.log('⚠️ Home: requestCounter not available, querying events instead');
        // Query LoanRequestCreated events to find the highest request ID
        const filter = loanContract.filters.LoanRequestCreated();
        const events = await loanContract.queryFilter(filter, 0, 'latest');
        console.log('📋 Home: Found', events.length, 'loan creation events');
        
        if (events.length > 0) {
          // Get the highest request ID from events
          totalLoans = Math.max(...events.map(e => Number(e.args.requestId)));
        }
        console.log('✅ Home: Highest request ID from events:', totalLoans);
      }
      
      console.log('📋 Home: Total loans (as number):', totalLoans);
      
      // Calculate total volume and active loans
      let totalVolumeWei = ethers.toBigInt(0);
      let activeLoansCount = 0;
      const uniqueMSMEs = new Set();
      
      for (let i = 1; i <= totalLoans; i++) {
        try {
          const request = await loanContract.requests(i);
          console.log(`  Loan ${i}:`, {
            msme: request.msme,
            amount: request.amount.toString(),
            status: request.status.toString()
          });
          
          totalVolumeWei += request.amount;
          uniqueMSMEs.add(request.msme.toLowerCase());
          
          // Count active loans (Open or Reveal status)
          if (request.status === 0n || request.status === 1n) {
            activeLoansCount++;
          }
        } catch (err) {
          console.error(`Error loading loan ${i}:`, err);
        }
      }
      
      console.log('📊 Home: Stats calculated:', {
        totalMSMEs: uniqueMSMEs.size,
        totalLoans,
        activeLoans: activeLoansCount,
        totalVolume: formatTokens(totalVolumeWei)
      });
      
      // Load Oracle stats
      // Note: We would need to track oracle registrations via events
      // For now, we'll show 0 or you can implement event querying
      const totalOracles = 0; // TODO: Query OracleRegistered events
      
      // Load Attestation stats
      // Note: We would query AttestationMade events
      const totalAttestations = 0; // TODO: Query AttestationMade events
      
      setStats({
        totalMSMEs: uniqueMSMEs.size,
        totalLoans: totalLoans,
        totalOracles: totalOracles,
        totalVolume: formatTokens(totalVolumeWei),
        activeLoans: activeLoansCount,
        totalAttestations: totalAttestations
      });
      
      console.log('✅ Home: Stats updated successfully');
      
    } catch (error) {
      console.error('❌ Home: Error loading platform stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="card" style={{ 
        textAlign: 'center', 
        padding: '60px 40px',
        background: 'transparent',
        border: 'none'
      }}>
        <h1 style={{ 
          fontSize: '48px', 
          marginBottom: '20px', 
          color: '#ffffff',
          fontWeight: '900',
          textShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          Welcome to MSME Credit Platform
        </h1>
        <p style={{ 
          fontSize: '20px', 
          color: '#ffffff', 
          marginBottom: '40px',
          opacity: 0.95
        }}>
          A Decentralized Credit Discovery and Verification Platform
        </p>
        
        {!account && (
          <div className="info-box info-box-info" style={{ 
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderLeft: '4px solid #ffffff'
          }}>
            <strong style={{ color: '#ffffff' }}>👋 Get Started:</strong>
            <span style={{ color: '#ffffff', marginLeft: '8px' }}>Connect your wallet to access the platform</span>
          </div>
        )}
      </div>

      {/* <div className="card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <h2 style={{ marginBottom: '16px' }}>📊 Platform Dashboard</h2>
        <p style={{ opacity: 0.9, marginBottom: '20px' }}>
          View real-time platform statistics including total loans, active oracles, attestations, and more.
        </p>
        <Link to="/dashboard">
          <button className="button" style={{ background: 'white', color: '#667eea', width: '100%' }}>
            View Dashboard
          </button>
        </Link>
      </div> */}

      <div style={{marginBottom: '40px'}} className="grid">
        <div className="card">
          <h2 style={{ color: '#667eea', marginBottom: '16px' }}>For MSMEs</h2>
          <p style={{ color: '#4a5568', marginBottom: '20px' }}>
            Build your verified on-chain profile and get access to competitive credit offers
          </p>
          <ul style={{ listStyle: 'none', padding: 0, color: '#718096' }}>
            <li>✓ Create decentralized identity</li>
            <li>✓ Get verifiable attestations</li>
            <li>✓ Request loans transparently</li>
            <li>✓ Build on-chain reputation</li>
          </ul>
          <Link to="/msme">
            <button className="button" style={{ marginTop: '20px', width: '100%' }}>
              MSME Dashboard
            </button>
          </Link>
        </div>

        <div className="card">
          <h2 style={{ color: '#48bb78', marginBottom: '16px' }}>For Lenders</h2>
          <p style={{ color: '#4a5568', marginBottom: '20px' }}>
            Access verified MSME data and participate in sealed-bid auctions
          </p>
          <ul style={{ listStyle: 'none', padding: 0, color: '#718096' }}>
            <li>✓ View verified profiles</li>
            <li>✓ Submit competitive bids</li>
            <li>✓ Reduce verification costs</li>
            <li>✓ Track loan performance</li>
          </ul>
          <Link to="/lender">
            <button className="button button-secondary" style={{ marginTop: '20px', width: '100%' }}>
              Lender Dashboard
            </button>
          </Link>
        </div>

        <div className="card">
          <h2 style={{ color: '#ed8936', marginBottom: '16px' }}>For Oracles</h2>
          <p style={{ color: '#4a5568', marginBottom: '20px' }}>
            Stake tokens and provide verifiable data attestations
          </p>
          <ul style={{ listStyle: 'none', padding: 0, color: '#718096' }}>
            <li>✓ Stake CIT tokens</li>
            <li>✓ Provide attestations</li>
            <li>✓ Earn fees & rewards</li>
            <li>✓ Build reputation</li>
          </ul>
          <Link to="/oracle">
            <button className="button" style={{ marginTop: '20px', width: '100%', background: '#ed8936' }}>
              Oracle Dashboard
            </button>
          </Link>
        </div>
      </div>

      <div style={{marginTop: '10px'}} className="card" >
        <h2 style={{marginBottom: '20px', color: '#ffffff' }}>Live Platform Statistics</h2>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
              ⏳ Loading platform stats...
          </div>
        ) : (
          <>
            <div className="grid grid-auto-fit gap-4 mb-4">
              <div className="stat-box-primary">
                <div className="stat-value stat-value-primary">
                  {stats.totalMSMEs}
                </div>
                <div className="stat-label">Registered MSMEs</div>
              </div>
              
              <div className="stat-box-success">
                <div className="stat-value stat-value-success">
                  {stats.totalLoans}
                </div>
                <div className="stat-label">Total Loans</div>
              </div>
              
              <div className="stat-box-warning">
                <div className="stat-value stat-value-warning">
                  {stats.activeLoans}
                </div>
                <div className="stat-label">Active Loans</div>
              </div>
              
              <div className="stat-box-secondary">
                <div className="stat-value stat-value-secondary">
                  {parseFloat(stats.totalVolume).toFixed(2)}
                </div>
                <div className="stat-label">Total Volume (CIT)</div>
              </div>
            </div>

            <div className="info-panel">
              <div className="info-panel-item">
                <div className="info-panel-value text-primary">
                  {stats.totalOracles}
                </div>
                <div className="info-panel-label">Oracles</div>
              </div>
              <div className="info-panel-divider"></div>
              <div className="info-panel-item">
                <div className="info-panel-value" style={{ color: '#34d399' }}>
                  {stats.totalAttestations}
                </div>
                <div className="info-panel-label">Attestations</div>
              </div>
              <div className="info-panel-divider"></div>
              <div className="info-panel-item">
                <div className="info-panel-value" style={{ color: '#fbbf24' }}>
                  {provider ? '✓' : '✗'}
                </div>
                <div className="info-panel-label">Network</div>
              </div>
            </div>

            <div className="success-message">
              ✓ Connected to {NETWORK_CONFIG.chainName} - All systems operational
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h2 className="text-primary mb-4">🎯 How It Works</h2>
        <div className="d-flex gap-4" style={{ flexWrap: 'wrap' }}>
          <div className="flex-1 min-w-200">
            <div className="step-number step-number-primary mb-3">1</div>
            <h3 className="text-primary mb-2">Create Identity</h3>
            <p className="text-secondary">
              MSME creates a decentralized identity on-chain
            </p>
          </div>
          
          <div className="flex-1 min-w-200">
            <div className="step-number step-number-success mb-3">2</div>
            <h3 className="text-primary mb-2">Get Verified</h3>
            <p className="text-secondary">
              Oracles verify and attest to MSME data
            </p>
          </div>
          
          <div className="flex-1 min-w-200">
            <div className="step-number step-number-warning mb-3">3</div>
            <h3 className="text-primary mb-2">Request Loan</h3>
            <p className="text-secondary">
              MSME creates loan request in marketplace
            </p>
          </div>
          
          <div className="flex-1 min-w-200">
            <div className="step-number step-number-secondary mb-3">4</div>
            <h3 className="text-primary mb-2">Get Offers</h3>
            <p className="text-secondary">
              Lenders compete with sealed bids
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
