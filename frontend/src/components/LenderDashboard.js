import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getContractInstance, formatTokens } from '../utils/contracts';

function LenderDashboard({ account, provider, signer }) {
  const [stats, setStats] = useState({
    activeBids: 0,
    pendingReveals: 0,
    totalCommitted: '0'
  });
  const [myBids, setMyBids] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (provider && account) {
      loadLenderStats();
      const interval = setInterval(loadLenderStats, 15000); // Refresh every 15s
      return () => clearInterval(interval);
    }
  }, [provider, account]);

  const loadLenderStats = async () => {
    if (!provider || !account) return;
    
    try {
      setLoading(true);
      const loanContract = getContractInstance('LoanMarketplace', provider);
      const counter = await loanContract.requestCounter();
      const totalLoans = Number(counter);
      
      const bids = [];
      let totalCommittedAmount = ethers.toBigInt(0);
      let activeBidsCount = 0;
      let pendingRevealsCount = 0;
      
      // Check all loans for this lender's bids
      for (let i = 1; i <= totalLoans; i++) {
        try {
          const request = await loanContract.requests(i);
          const commitment = await loanContract.commitments(i, account);
          
          // If lender has committed to this loan
          if (commitment !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
            const statusMap = ['Open', 'Reveal', 'Matched', 'Expired', 'Cancelled'];
            const status = statusMap[request.status] || 'Unknown';
            
            const deposit = await loanContract.bidDeposits(i, account);
            
            bids.push({
              requestId: i,
              loanAmount: formatTokens(request.amount),
              tenure: Number(request.tenureMonths),
              purpose: request.purpose,
              status: status,
              commitment: commitment,
              deposit: ethers.formatEther(deposit),
              commitDeadline: Number(request.commitDeadline),
              revealDeadline: Number(request.revealDeadline),
              msme: request.msme
            });
            
            totalCommittedAmount += deposit;
            
            // Count active bids (in commit phase)
            if (status === 'Open') {
              activeBidsCount++;
            }
            
            // Count pending reveals (in reveal phase)
            if (status === 'Reveal') {
              pendingRevealsCount++;
            }
          }
        } catch (err) {
          console.error(`Error loading bid for loan ${i}:`, err);
        }
      }
      
      setMyBids(bids);
      setStats({
        activeBids: activeBidsCount,
        pendingReveals: pendingRevealsCount,
        totalCommitted: ethers.formatEther(totalCommittedAmount)
      });
      
    } catch (error) {
      console.error('Error loading lender stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const revealBid = async (requestId) => {
    if (!signer) {
      alert('Please connect your wallet');
      return;
    }

    // Get stored bid info from localStorage
    const storedBids = JSON.parse(localStorage.getItem('myBids') || '{}');
    const myStoredBids = storedBids[account] || [];
    const bidInfo = myStoredBids.find(b => b.loanId === requestId);
    
    if (!bidInfo) {
      alert(
        '❌ Bid Information Not Found\n\n' +
        'Cannot find your bid details (rate and nonce) in local storage.\n\n' +
        '💡 You need the exact rate and nonce you used when committing the bid.'
      );
      return;
    }

    try {
      setLoading(true);
      
      const loanContract = getContractInstance('LoanMarketplace', signer);
      
      console.log('🔓 Revealing bid...');
      console.log('  Request ID:', requestId);
      console.log('  Rate (BP):', bidInfo.rateBP);
      console.log('  Nonce:', bidInfo.nonceBytes);
      
      const tx = await loanContract.revealBid(
        requestId,
        bidInfo.rateBP,
        bidInfo.nonceBytes
      );
      
      console.log('⏳ Transaction sent:', tx.hash);
      await tx.wait();
      console.log('✅ Bid revealed successfully');
      
      alert(
        '✅ Bid Revealed Successfully!\n\n' +
        `Your bid of ${bidInfo.rate}% has been revealed.\n\n` +
        'The MSME will now be able to see your offer and select the winning bid.'
      );
      
      // Reload stats
      await loadLenderStats();
      
    } catch (error) {
      console.error('❌ Error revealing bid:', error);
      alert(`❌ Failed to reveal bid\n\nError: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <div className="card">
        <h2>Lender Dashboard</h2>
        <div className="alert" style={{ background: '#fff7ed', border: '1px solid #ed8936', color: '#7c2d12' }}>
          Please connect your wallet to access the lender dashboard
        </div>
      </div>
    );
  }

  const getTimeRemaining = (deadline) => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = deadline - now;
    
    if (remaining <= 0) return 'Ended';
    
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    
    if (hours > 24) {
      return `${Math.floor(hours / 24)}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  return (
    <div>
      <div className="card">
        <h1>🏦 Lender Dashboard</h1>
        <p style={{ color: '#718096' }}>
          Connected as: <strong>{account}</strong>
        </p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <div className="card" style={{ background: '#f0fff4', border: '2px solid #48bb78' }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#48bb78' }}>
            {stats.activeBids}
          </div>
          <div style={{ color: '#718096', marginTop: '8px' }}>Active Bids (Committed)</div>
        </div>
        <div className="card" style={{ background: '#fef5e7', border: '2px solid #ed8936' }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#ed8936' }}>
            {stats.pendingReveals}
          </div>
          <div style={{ color: '#718096', marginTop: '8px' }}>Pending Reveals</div>
        </div>
        <div className="card" style={{ background: '#ebf8ff', border: '2px solid #667eea' }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#667eea' }}>
            {parseFloat(stats.totalCommitted).toFixed(4)}
          </div>
          <div style={{ color: '#718096', marginTop: '8px' }}>Total Committed (ETH)</div>
        </div>
      </div>

      <div className="card">
        <h2>📋 My Bids</h2>
        <p style={{ color: '#718096', marginBottom: '20px' }}>
          Track your committed bids and reveal them during the reveal phase
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
            ⏳ Loading your bids...
          </div>
        ) : myBids.length === 0 ? (
          <div className="alert" style={{ background: '#f7fafc', border: '1px solid #cbd5e0', color: '#4a5568' }}>
            No bids placed yet. Go to the Marketplace to place bids on loan requests.
          </div>
        ) : (
          <div className="grid">
            {myBids.map((bid) => {
              const now = Math.floor(Date.now() / 1000);
              const inCommitPhase = now <= bid.commitDeadline;
              const inRevealPhase = now > bid.commitDeadline && now <= bid.revealDeadline;
              const isExpired = now > bid.revealDeadline;

              return (
                <div key={bid.requestId} className="card" style={{ 
                  background: '#ffffff',
                  border: inRevealPhase ? '2px solid #ed8936' : '1px solid #e2e8f0'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <h3>Loan #{bid.requestId}</h3>
                    <span className={`status ${
                      bid.status === 'Open' ? 'status-active' : 
                      bid.status === 'Reveal' ? 'status-pending' : 
                      bid.status === 'Matched' ? 'status-completed' : 
                      'status-cancelled'
                    }`}>
                      {bid.status}
                    </span>
                  </div>
                  
                  <div style={{ background: '#f7fafc', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                    <p style={{ margin: '4px 0', fontSize: '14px' }}>
                      <strong>Loan Amount:</strong> {bid.loanAmount} tokens
                    </p>
                    <p style={{ margin: '4px 0', fontSize: '14px' }}>
                      <strong>Tenure:</strong> {bid.tenure} months
                    </p>
                    <p style={{ margin: '4px 0', fontSize: '14px' }}>
                      <strong>Purpose:</strong> {bid.purpose}
                    </p>
                    <p style={{ margin: '4px 0', fontSize: '14px' }}>
                      <strong>MSME:</strong> <code style={{ fontSize: '12px' }}>{bid.msme.substring(0, 10)}...</code>
                    </p>
                  </div>

                  <div style={{ background: '#fff7ed', padding: '12px', borderRadius: '8px', marginBottom: '12px', border: '1px solid #ed8936' }}>
                    <p style={{ margin: '4px 0', fontSize: '14px' }}>
                      <strong>Your Deposit:</strong> {bid.deposit} ETH
                    </p>
                    <p style={{ margin: '4px 0', fontSize: '12px', color: '#718096' }}>
                      Commitment: {bid.commitment.substring(0, 20)}...
                    </p>
                  </div>

                  {inCommitPhase && (
                    <div className="alert" style={{ background: '#f0fff4', border: '1px solid #48bb78', color: '#22543d', fontSize: '14px' }}>
                      ⏰ Commit phase: {getTimeRemaining(bid.commitDeadline)} remaining
                    </div>
                  )}

                  {inRevealPhase && (
                    <div>
                      <div className="alert" style={{ background: '#fff7ed', border: '1px solid #ed8936', color: '#7c2d12', fontSize: '14px', marginBottom: '12px' }}>
                        🔓 <strong>Reveal Phase Active!</strong><br/>
                        {getTimeRemaining(bid.revealDeadline)} remaining
                      </div>
                      <button 
                        className="button"
                        style={{ width: '100%', background: '#ed8936' }}
                        onClick={() => revealBid(bid.requestId)}
                        disabled={loading}
                      >
                        {loading ? '⏳ Revealing...' : '🔓 Reveal My Bid'}
                      </button>
                    </div>
                  )}

                  {isExpired && bid.status === 'Expired' && (
                    <div className="alert" style={{ background: '#fee', border: '1px solid #e53e3e', color: '#742a2a', fontSize: '14px' }}>
                      ⚠️ Expired - Reveal period ended
                    </div>
                  )}

                  {bid.status === 'Matched' && (
                    <div className="alert" style={{ background: '#f0fff4', border: '1px solid #48bb78', color: '#22543d', fontSize: '14px' }}>
                      ✅ Loan matched! Check details
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card" style={{ background: '#f7fafc' }}>
        <h2>💡 How It Works</h2>
        <div style={{ display: 'grid', gap: '16px', marginTop: '16px' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ fontSize: '24px' }}>1️⃣</div>
            <div>
              <strong>Place Bid (Commit Phase)</strong>
              <p style={{ color: '#718096', margin: '4px 0 0 0', fontSize: '14px' }}>
                Go to Marketplace and submit a sealed bid with your interest rate. Your bid is encrypted and hidden.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ fontSize: '24px' }}>2️⃣</div>
            <div>
              <strong>Reveal Bid (Reveal Phase)</strong>
              <p style={{ color: '#718096', margin: '4px 0 0 0', fontSize: '14px' }}>
                After commit deadline, come back here to reveal your bid. This makes your interest rate visible.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ fontSize: '24px' }}>3️⃣</div>
            <div>
              <strong>Winner Selection</strong>
              <p style={{ color: '#718096', margin: '4px 0 0 0', fontSize: '14px' }}>
                MSME selects the best bid. If you win, your deposit is refunded and loan agreement is created.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LenderDashboard;
