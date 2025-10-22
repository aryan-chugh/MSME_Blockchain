import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ethers } from 'ethers';
import { getContractInstance, formatTokens, CONTRACT_ADDRESSES } from '../utils/contracts';

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
      
      console.log('📡 Home: Calling requestCounter()...');
      const counter = await loanContract.requestCounter();
      console.log('✅ Home: Got counter response:', counter);
      
      const totalLoans = Number(counter);
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
      <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '20px', color: '#2d3748' }}>
          Welcome to MSME Credit Platform
        </h1>
        <p style={{ fontSize: '20px', color: '#718096', marginBottom: '40px' }}>
          A Decentralized Credit Discovery and Verification Platform
        </p>
        
        {!account && (
          <div className="alert alert-info">
            <strong>👋 Get Started:</strong> Connect your wallet to access the platform
          </div>
        )}
      </div>

      <div className="card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <h2 style={{ marginBottom: '16px' }}>📊 Platform Dashboard</h2>
        <p style={{ opacity: 0.9, marginBottom: '20px' }}>
          View real-time platform statistics including total loans, active oracles, attestations, and more.
        </p>
        <Link to="/dashboard">
          <button className="button" style={{ background: 'white', color: '#667eea', width: '100%' }}>
            View Dashboard
          </button>
        </Link>
      </div>

      <div className="grid">
        <div className="card">
          <h2 style={{ color: '#667eea', marginBottom: '16px' }}>🏢 For MSMEs</h2>
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
          <h2 style={{ color: '#48bb78', marginBottom: '16px' }}>🏦 For Lenders</h2>
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
          <h2 style={{ color: '#ed8936', marginBottom: '16px' }}>🔍 For Oracles</h2>
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

      <div className="card" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)' }}>
        <h2 style={{ marginBottom: '20px', color: '#0c4a6e' }}>📊 Live Platform Statistics</h2>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
            ⏳ Loading platform stats...
          </div>
        ) : (
          <>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ 
                textAlign: 'center', 
                padding: '20px', 
                background: 'white', 
                borderRadius: '12px',
                border: '2px solid #667eea'
              }}>
                <div style={{ fontSize: '42px', fontWeight: 'bold', color: '#667eea' }}>
                  {stats.totalMSMEs}
                </div>
                <div style={{ color: '#718096', marginTop: '8px', fontSize: '14px' }}>Registered MSMEs</div>
              </div>
              
              <div style={{ 
                textAlign: 'center', 
                padding: '20px', 
                background: 'white', 
                borderRadius: '12px',
                border: '2px solid #48bb78'
              }}>
                <div style={{ fontSize: '42px', fontWeight: 'bold', color: '#48bb78' }}>
                  {stats.totalLoans}
                </div>
                <div style={{ color: '#718096', marginTop: '8px', fontSize: '14px' }}>Total Loans</div>
              </div>
              
              <div style={{ 
                textAlign: 'center', 
                padding: '20px', 
                background: 'white', 
                borderRadius: '12px',
                border: '2px solid #ed8936'
              }}>
                <div style={{ fontSize: '42px', fontWeight: 'bold', color: '#ed8936' }}>
                  {stats.activeLoans}
                </div>
                <div style={{ color: '#718096', marginTop: '8px', fontSize: '14px' }}>Active Loans</div>
              </div>
              
              <div style={{ 
                textAlign: 'center', 
                padding: '20px', 
                background: 'white', 
                borderRadius: '12px',
                border: '2px solid #9f7aea'
              }}>
                <div style={{ fontSize: '42px', fontWeight: 'bold', color: '#9f7aea' }}>
                  {parseFloat(stats.totalVolume).toFixed(2)}
                </div>
                <div style={{ color: '#718096', marginTop: '8px', fontSize: '14px' }}>Total Volume (CIT)</div>
              </div>
            </div>

            <div style={{ 
              background: 'white', 
              padding: '16px', 
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-around',
              border: '1px solid #cbd5e0'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea' }}>
                  {stats.totalOracles}
                </div>
                <div style={{ fontSize: '12px', color: '#718096' }}>Oracles</div>
              </div>
              <div style={{ borderLeft: '1px solid #e2e8f0' }}></div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#48bb78' }}>
                  {stats.totalAttestations}
                </div>
                <div style={{ fontSize: '12px', color: '#718096' }}>Attestations</div>
              </div>
              <div style={{ borderLeft: '1px solid #e2e8f0' }}></div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ed8936' }}>
                  {provider ? '✓' : '✗'}
                </div>
                <div style={{ fontSize: '12px', color: '#718096' }}>Network</div>
              </div>
            </div>

            <div style={{ 
              marginTop: '16px', 
              padding: '12px', 
              background: '#f0fff4',
              borderRadius: '8px',
              border: '1px solid #48bb78',
              fontSize: '14px',
              color: '#22543d',
              textAlign: 'center'
            }}>
              🔄 Stats update every 30 seconds • Connected to Sepolia Testnet
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '20px' }}>🎯 How It Works</h2>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <div style={{ 
              background: '#667eea', 
              color: 'white', 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontWeight: 'bold',
              marginBottom: '12px'
            }}>1</div>
            <h3 style={{ marginBottom: '8px' }}>Create Identity</h3>
            <p style={{ color: '#718096' }}>
              MSME creates a decentralized identity on-chain
            </p>
          </div>
          
          <div style={{ flex: '1', minWidth: '200px' }}>
            <div style={{ 
              background: '#48bb78', 
              color: 'white', 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontWeight: 'bold',
              marginBottom: '12px'
            }}>2</div>
            <h3 style={{ marginBottom: '8px' }}>Get Verified</h3>
            <p style={{ color: '#718096' }}>
              Oracles verify and attest to MSME data
            </p>
          </div>
          
          <div style={{ flex: '1', minWidth: '200px' }}>
            <div style={{ 
              background: '#ed8936', 
              color: 'white', 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontWeight: 'bold',
              marginBottom: '12px'
            }}>3</div>
            <h3 style={{ marginBottom: '8px' }}>Request Loan</h3>
            <p style={{ color: '#718096' }}>
              MSME creates loan request in marketplace
            </p>
          </div>
          
          <div style={{ flex: '1', minWidth: '200px' }}>
            <div style={{ 
              background: '#9f7aea', 
              color: 'white', 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontWeight: 'bold',
              marginBottom: '12px'
            }}>4</div>
            <h3 style={{ marginBottom: '8px' }}>Get Offers</h3>
            <p style={{ color: '#718096' }}>
              Lenders compete with sealed bids
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
