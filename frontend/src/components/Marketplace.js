import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getContractInstance, formatTokens } from '../utils/contracts';

function Marketplace({ account, provider, signer }) {
  const [loanRequests, setLoanRequests] = useState([]);
  const [selectedLoanForDetails, setSelectedLoanForDetails] = useState(null);
  const [selectedMSME, setSelectedMSME] = useState(null);
  const [selectedLoanForBid, setSelectedLoanForBid] = useState(null);
  const [bidRate, setBidRate] = useState('');
  const [bidNonce, setBidNonce] = useState('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all, open, reveal, matched

  useEffect(() => {
    loadLoansFromBlockchain();
    const interval = setInterval(loadLoansFromBlockchain, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [provider, account]);

  const loadLoansFromBlockchain = async () => {
    if (!provider) return;
    
    try {
      const loanContract = getContractInstance('LoanMarketplace', provider);
      const counter = await loanContract.requestCounter();
      const totalLoans = Number(counter);
      
      const loans = [];
      for (let i = 1; i <= totalLoans; i++) {
        try {
          const request = await loanContract.requests(i);
          
          // Status: 0=Open, 1=Reveal, 2=Matched, 3=Expired, 4=Cancelled
          const statusMap = ['Open', 'Reveal', 'Matched', 'Expired', 'Cancelled'];
          const status = statusMap[request.status] || 'Unknown';
          
          loans.push({
            id: i,
            msme: request.msme,
            amount: formatTokens(request.amount),
            amountRaw: request.amount, // Store raw Wei amount
            tenure: Number(request.tenureMonths),
            purpose: request.purpose,
            commitDeadline: Number(request.commitDeadline),
            revealDeadline: Number(request.revealDeadline),
            status: status,
            createdAt: Number(request.createdAt)
          });
        } catch (err) {
          console.error(`Error loading loan ${i}:`, err);
        }
      }
      
      setLoanRequests(loans);
    } catch (error) {
      console.error('Error loading loans:', error);
    }
  };

  const placeBid = async () => {
    if (!bidRate || !bidNonce) {
      alert('Please enter both interest rate and nonce');
      return;
    }

    if (!signer) {
      alert('Please connect your wallet');
      return;
    }

    // Check if user is trying to bid on their own loan
    if (selectedLoanForBid.msme.toLowerCase() === account.toLowerCase()) {
      alert(
        '❌ Cannot Bid on Your Own Loan\n\n' +
        'You cannot place a bid on a loan request you created.\n\n' +
        '💡 To test bidding:\n' +
        '1. Switch to a different wallet account\n' +
        '2. Or ask someone else to bid on your loan'
      );
      setSelectedLoanForBid(null);
      return;
    }

    // Check if user has already bid on this loan (from blockchain)
    try {
      const loanContract = getContractInstance('LoanMarketplace', provider);
      const existingCommitment = await loanContract.commitments(selectedLoanForBid.id, account);
      
      console.log('🔍 Checking existing commitment...');
      console.log('  Request ID:', selectedLoanForBid.id);
      console.log('  Your address:', account);
      console.log('  Existing commitment:', existingCommitment);
      
      if (existingCommitment !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        alert(
          '❌ You Have Already Bid on This Loan\n\n' +
          `You have already submitted a sealed bid for Loan #${selectedLoanForBid.id}.\n\n` +
          `Your commitment: ${existingCommitment.substring(0, 20)}...\n\n` +
          '💡 Each lender can only submit ONE bid per loan.\n\n' +
          'Wait for the reveal period to reveal your bid.'
        );
        setSelectedLoanForBid(null);
        return;
      }
    } catch (error) {
      console.error('Error checking existing commitment:', error);
    }

    // Check if commit period has ended
    const now = Math.floor(Date.now() / 1000);
    console.log('⏰ Deadline Check:');
    console.log('  Current time (unix):', now);
    console.log('  Commit deadline:', selectedLoanForBid.commitDeadline);
    console.log('  Time until deadline:', selectedLoanForBid.commitDeadline - now, 'seconds');
    console.log('  Has ended?', now > selectedLoanForBid.commitDeadline);
    
    if (now > selectedLoanForBid.commitDeadline) {
      alert(
        '❌ Commit Period Has Ended\n\n' +
        `Commit deadline was: ${new Date(selectedLoanForBid.commitDeadline * 1000).toLocaleString()}\n` +
        `Current time: ${new Date().toLocaleString()}\n\n` +
        'You can no longer place bids on this loan.\n\n' +
        'Look for other loans with active commit periods (green timer).'
      );
      setSelectedLoanForBid(null);
      loadLoansFromBlockchain(); // Refresh to update status
      return;
    }

    try {
      setLoading(true);
      
      const rateBP = Math.floor(parseFloat(bidRate) * 100); // Convert % to basis points
      const nonceBytes = ethers.id(bidNonce); // Hash the nonce string
      
      // Generate commitment: keccak256(rateBP, nonce, lender)
      const commitment = ethers.solidityPackedKeccak256(
        ['uint256', 'bytes32', 'address'],
        [rateBP, nonceBytes, account]
      );
      
      // Calculate deposit (5% of loan amount in ETH)
      // ⚠️ CONTRACT BUG: The contract calculates deposit as (tokenAmount * 5) / 100
      // where tokenAmount has 18 decimals. This results in massive ETH requirements.
      // 
      // Example: 100 CIT = 100 * 10^18 → deposit = 5 * 10^18 wei = 5 ETH (unreasonable!)
      //
      // WORKAROUND: We'll send exactly what the contract expects, which means
      // users need massive ETH for testing. This should be fixed in contract v2.
      
      let loanAmountWei;
      if (selectedLoanForBid.amountRaw) {
        loanAmountWei = ethers.toBigInt(selectedLoanForBid.amountRaw);
      } else {
        loanAmountWei = ethers.parseUnits(selectedLoanForBid.amount.toString(), 18);
      }
      const depositWei = (loanAmountWei * ethers.toBigInt(5)) / ethers.toBigInt(100);
      
      // Show user-friendly warning about deposit
      const depositEth = ethers.formatEther(depositWei);
      
      console.log('🔍 Bid Debug Info:');
      console.log('  Loan Amount (display):', selectedLoanForBid.amount);
      console.log('  Loan Amount (raw):', selectedLoanForBid.amountRaw?.toString());
      console.log('  Loan Amount (wei):', loanAmountWei.toString());
      console.log('  Deposit (wei):', depositWei.toString());
      console.log('  Deposit (ETH):', depositEth);
      
      // Check if deposit is too high (contract bug)
      if (Number(depositEth) > 1) {
        alert(
          `⚠️ WARNING: High Deposit Required!\n\n` +
          `The contract requires ${depositEth} ETH deposit for this ${selectedLoanForBid.amount} token loan.\n\n` +
          `This is due to a contract design issue where deposit is calculated as 5% of the token amount (with 18 decimals) in ETH.\n\n` +
          `💡 SOLUTION FOR TESTING:\n` +
          `Create smaller loan requests (e.g., 0.01-0.1 tokens) which require:\n` +
          `- 0.01 tokens → 0.0005 ETH deposit\n` +
          `- 0.1 tokens → 0.005 ETH deposit\n\n` +
          `Or ensure you have sufficient Sepolia ETH for this bid.`
        );
        return;
      }
      
      alert(
        `Submitting sealed bid...\n\n` +
        `Loan ID: ${selectedLoanForBid.id}\n` +
        `Loan Amount: ${selectedLoanForBid.amount} tokens\n` +
        `Interest Rate: ${bidRate}% (${rateBP} BP)\n` +
        `Deposit Required: ${depositEth} ETH (5%)\n` +
        `Commitment: ${commitment.substring(0, 20)}...\n\n` +
        `⚠️ IMPORTANT: Save your nonce!\n` +
        `Nonce: ${bidNonce}\n\n` +
        `You'll need this exact value to reveal your bid later.`
      );
      
      const loanContract = getContractInstance('LoanMarketplace', signer);
      
      console.log('📤 Submitting bid transaction...');
      console.log('  Request ID:', selectedLoanForBid.id);
      console.log('  Commitment:', commitment);
      console.log('  Deposit (wei):', depositWei.toString());
      
      const tx = await loanContract.commitBid(selectedLoanForBid.id, commitment, {
        value: depositWei
      });
      
      console.log('⏳ Transaction sent:', tx.hash);
      await tx.wait();
      console.log('✅ Transaction confirmed');
      
      // Store nonce locally for reveal phase
      const storedBids = JSON.parse(localStorage.getItem('myBids') || '{}');
      if (!storedBids[account]) storedBids[account] = [];
      storedBids[account].push({
        loanId: selectedLoanForBid.id,
        rateBP: rateBP,
        rate: bidRate,
        nonce: bidNonce,
        nonceBytes: nonceBytes,
        commitment: commitment,
        txHash: tx.hash,
        timestamp: Date.now()
      });
      localStorage.setItem('myBids', JSON.stringify(storedBids));
      
      alert(
        `✅ Bid committed successfully!\n\n` +
        `Transaction: ${tx.hash}\n\n` +
        `Your bid is now sealed. You can reveal it after the commit period ends.\n\n` +
        `View on Etherscan:\n` +
        `https://sepolia.etherscan.io/tx/${tx.hash}`
      );
      
      setBidRate('');
      setBidNonce('');
      setSelectedLoanForBid(null);
      loadLoansFromBlockchain();
      
    } catch (error) {
      console.error('❌ Error placing bid:', error);
      console.error('Error details:', {
        code: error.code,
        reason: error.reason,
        message: error.message,
        data: error.data
      });
      
      let errorMsg = 'Unknown error';
      
      if (error.code === 'ACTION_REJECTED') {
        errorMsg = 'Transaction rejected by user';
      } else if (error.reason) {
        errorMsg = error.reason;
      } else if (error.message) {
        // Try to extract revert reason from error message
        if (error.message.includes('execution reverted')) {
          const match = error.message.match(/execution reverted: (.+?)"/);
          errorMsg = match ? match[1] : error.message;
        } else {
          errorMsg = error.message;
        }
      }
      
      alert(
        `❌ Bid Failed\n\n` +
        `Error: ${errorMsg}\n\n` +
        `Check console for details (F12)`
      );
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = (deadline) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = deadline - now;
    
    if (diff <= 0) return 'Ended';
    
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    
    if (hours > 24) {
      return `${Math.floor(hours / 24)}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  const getStatusBadge = (status) => {
    const colors = {
      'Open': '#48bb78',
      'Reveal': '#ed8936',
      'Matched': '#667eea',
      'Expired': '#718096',
      'Cancelled': '#e53e3e'
    };
    return (
      <span style={{
        background: colors[status] || '#718096',
        color: 'white',
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>
        {status}
      </span>
    );
  };

  const filteredLoans = loanRequests.filter(loan => {
    if (filter === 'all') return true;
    return loan.status.toLowerCase() === filter;
  });

  if (!account) {
    return (
      <div className="card">
        <h2>💰 Loan Marketplace</h2>
        <div className="alert alert-info">Please connect your wallet to view loan requests</div>
      </div>
    );
  }

  return (
    <div>
      <div className="card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <h1>💰 Loan Marketplace</h1>
        <p style={{ color: '#f7fafc', opacity: 0.9 }}>
          Browse loan requests from verified MSMEs and submit sealed bids
        </p>
        <div style={{ marginTop: '16px', display: 'flex', gap: '16px' }}>
          <div style={{ background: 'rgba(255,255,255,0.2)', padding: '12px 20px', borderRadius: '8px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{loanRequests.length}</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Total Loans</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.2)', padding: '12px 20px', borderRadius: '8px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              {loanRequests.filter(l => l.status === 'Open').length}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Open for Bids</div>
          </div>
        </div>
      </div>

      {/* Testing Notice */}
      {loanRequests.some(loan => {
        try {
          const loanAmountWei = loan.amountRaw ? ethers.toBigInt(loan.amountRaw) : ethers.parseUnits(loan.amount.toString(), 18);
          const depositWei = (loanAmountWei * ethers.toBigInt(5)) / ethers.toBigInt(100);
          return Number(ethers.formatEther(depositWei)) > 1;
        } catch { return false; }
      }) && (
        <div className="card" style={{ background: '#fed7d7', border: '2px solid #fc8181' }}>
          <h3 style={{ color: '#c53030', margin: '0 0 12px 0' }}>⚠️ High Deposit Requirements Detected</h3>
          <p style={{ color: '#742a2a', margin: '0 0 12px 0' }}>
            Some loans require very high ETH deposits due to a contract design issue. 
            Loans marked with a warning cannot be bid on.
          </p>
          <p style={{ color: '#742a2a', margin: 0, fontSize: '14px' }}>
            💡 <strong>For testing:</strong> Create new loans with amounts <strong>0.01 - 0.1 tokens</strong> which require reasonable deposits (0.0005 - 0.005 ETH).
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['all', 'open', 'reveal', 'matched'].map(f => (
            <button
              key={f}
              className="button"
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? '#667eea' : '#e2e8f0',
                color: filter === f ? 'white' : '#2d3748',
                fontSize: '14px',
                padding: '8px 16px'
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Loan Requests Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
        {filteredLoans.length === 0 ? (
          <div className="card">
            <div className="alert alert-info">
              No {filter !== 'all' ? filter : ''} loan requests found
            </div>
          </div>
        ) : (
          filteredLoans.map((loan) => {
            const now = Math.floor(Date.now() / 1000);
            const inCommitPhase = now <= loan.commitDeadline;
            const inRevealPhase = now > loan.commitDeadline && now <= loan.revealDeadline;
            
            // Calculate required deposit for this loan
            let depositRequired = '0';
            let depositTooHigh = false;
            const isMyOwnLoan = loan.msme.toLowerCase() === account.toLowerCase();
            
            try {
              const loanAmountWei = loan.amountRaw ? ethers.toBigInt(loan.amountRaw) : ethers.parseUnits(loan.amount.toString(), 18);
              const depositWei = (loanAmountWei * ethers.toBigInt(5)) / ethers.toBigInt(100);
              depositRequired = ethers.formatEther(depositWei);
              depositTooHigh = Number(depositRequired) > 1;
            } catch (err) {
              console.error('Error calculating deposit:', err);
            }
            
            return (
              <div key={loan.id} className="card" style={{ 
                background: '#ffffff',
                border: '2px solid #e2e8f0',
                borderLeft: '4px solid #667eea',
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, color: '#2d3748' }}>Loan #{loan.id}</h3>
                  {getStatusBadge(loan.status)}
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#667eea', marginBottom: '4px' }}>
                    {loan.amount} <span style={{ fontSize: '16px', color: '#718096' }}>tokens</span>
                  </div>
                  <div style={{ color: '#718096', fontSize: '14px' }}>
                    {loan.tenure} months tenure
                  </div>
                  {isMyOwnLoan && (
                    <div style={{ 
                      background: '#bee3f8', 
                      color: '#2c5282', 
                      padding: '8px', 
                      borderRadius: '6px', 
                      fontSize: '12px',
                      marginTop: '8px',
                      fontWeight: '500'
                    }}>
                      ℹ️ This is your loan request
                    </div>
                  )}
                  {!isMyOwnLoan && depositTooHigh && (
                    <div style={{ 
                      background: '#fed7d7', 
                      color: '#c53030', 
                      padding: '8px', 
                      borderRadius: '6px', 
                      fontSize: '12px',
                      marginTop: '8px',
                      fontWeight: '500'
                    }}>
                      ⚠️ Requires {Number(depositRequired).toFixed(4)} ETH deposit (too high for testing)
                    </div>
                  )}
                  {!isMyOwnLoan && !depositTooHigh && Number(depositRequired) > 0 && (
                    <div style={{ 
                      background: '#c6f6d5', 
                      color: '#22543d', 
                      padding: '8px', 
                      borderRadius: '6px', 
                      fontSize: '12px',
                      marginTop: '8px'
                    }}>
                      ✅ Deposit: {Number(depositRequired).toFixed(6)} ETH
                    </div>
                  )}
                </div>

                <div style={{ background: '#f7fafc', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>Purpose</div>
                  <div style={{ fontSize: '14px', color: '#2d3748', fontWeight: '500' }}>{loan.purpose}</div>
                </div>

                <div style={{ fontSize: '12px', color: '#718096', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span>MSME:</span>
                    <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>
                      {loan.msme.substring(0, 10)}...
                    </code>
                  </div>
                  {inCommitPhase && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span>⏰ Commit ends:</span>
                      <strong style={{ color: '#ed8936' }}>{getTimeRemaining(loan.commitDeadline)}</strong>
                    </div>
                  )}
                  {inRevealPhase && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span>🔓 Reveal ends:</span>
                      <strong style={{ color: '#48bb78' }}>{getTimeRemaining(loan.revealDeadline)}</strong>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="button"
                    style={{ flex: 1, fontSize: '14px', padding: '8px' }}
                    onClick={() => setSelectedLoanForDetails(loan)}
                  >
                    📄 Details
                  </button>
                  <button 
                    className="button"
                    style={{ 
                      flex: 1, 
                      fontSize: '14px', 
                      padding: '8px',
                      background: loan.status === 'Open' && inCommitPhase && !depositTooHigh && !isMyOwnLoan ? '#48bb78' : '#cbd5e0',
                      color: loan.status === 'Open' && inCommitPhase && !depositTooHigh && !isMyOwnLoan ? 'white' : '#718096',
                      cursor: (depositTooHigh || isMyOwnLoan) ? 'not-allowed' : 'pointer'
                    }}
                    onClick={() => !depositTooHigh && !isMyOwnLoan && setSelectedLoanForBid(loan)} 
                    disabled={loan.status !== 'Open' || !inCommitPhase || depositTooHigh || isMyOwnLoan}
                    title={isMyOwnLoan ? 'Cannot bid on your own loan' : depositTooHigh ? 'Deposit requirement too high for testing' : ''}
                  >
                    {isMyOwnLoan ? '👤 Your Loan' : depositTooHigh ? '⚠️ Deposit Too High' : loan.status === 'Open' && inCommitPhase ? '💰 Place Bid' : '🔒 Bidding Closed'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bid Submission Modal */}
      {selectedLoanForBid && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ 
            background: '#ffffff', 
            border: '2px solid #667eea',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2>🔒 Submit Sealed Bid</h2>
            <div style={{ background: '#f0fff4', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #48bb78' }}>
              <div style={{ fontSize: '12px', color: '#22543d', marginBottom: '8px' }}>Loan #{selectedLoanForBid.id}</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#48bb78' }}>
                {selectedLoanForBid.amount} tokens
              </div>
              <div style={{ fontSize: '14px', color: '#718096', marginTop: '4px' }}>
                {selectedLoanForBid.tenure} months • {selectedLoanForBid.purpose}
              </div>
            </div>

            <div className="alert" style={{ background: '#fff7ed', border: '1px solid #ed8936', color: '#7c2d12', marginBottom: '16px' }}>
              <strong>⚠️ Sealed Bid Auction</strong>
              <p style={{ fontSize: '14px', margin: '8px 0 0 0' }}>
                Your bid will be sealed (encrypted). Save your nonce to reveal it later!
              </p>
            </div>

            <label className="label">Interest Rate (% per annum)</label>
            <input 
              type="number" 
              className="input" 
              value={bidRate} 
              onChange={(e) => setBidRate(e.target.value)} 
              placeholder="e.g., 10.5"
              step="0.1"
              min="0"
              max="100"
              required
            />

            <label className="label">Nonce (Secret Key for Reveal Phase)</label>
            <input 
              type="text" 
              className="input" 
              value={bidNonce} 
              onChange={(e) => setBidNonce(e.target.value)} 
              placeholder="Enter a random secret (save this!)"
              required
            />
            <div style={{ fontSize: '12px', color: '#718096', marginTop: '4px', marginBottom: '16px' }}>
              💡 Tip: Use a random string like "mySecret123xyz". You'll need this exact value to reveal your bid.
            </div>

            <div style={{ background: '#e6fffa', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #38b2ac' }}>
              <div style={{ fontSize: '12px', color: '#234e52', marginBottom: '4px' }}>Deposit Required (5% of loan amount)</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#38b2ac' }}>
                {(() => {
                  console.log('Selected loan for bid:', selectedLoanForBid);
                  if (selectedLoanForBid.amountRaw) {
                    console.log('Using amountRaw:', selectedLoanForBid.amountRaw);
                    const deposit = (ethers.toBigInt(selectedLoanForBid.amountRaw) * ethers.toBigInt(5)) / ethers.toBigInt(100);
                    return ethers.formatEther(deposit);
                  } else if (selectedLoanForBid.amount) {
                    console.log('Using amount (fallback):', selectedLoanForBid.amount);
                    // Fallback: parse the formatted amount
                    const amountWei = ethers.parseUnits(selectedLoanForBid.amount.toString(), 18);
                    const deposit = (amountWei * ethers.toBigInt(5)) / ethers.toBigInt(100);
                    return ethers.formatEther(deposit);
                  }
                  console.log('No amount found!');
                  return '0';
                })()} ETH
              </div>
              <div style={{ fontSize: '11px', color: '#234e52', marginTop: '4px' }}>
                Make sure you have enough Sepolia ETH in your wallet
              </div>
            </div>

            <button 
              className="button" 
              onClick={placeBid}
              disabled={loading || !bidRate || !bidNonce}
              style={{ width: '100%', marginBottom: '8px' }}
            >
              {loading ? '⏳ Submitting...' : '🔒 Submit Sealed Bid'}
            </button>
            <button 
              className="button button-secondary" 
              onClick={() => setSelectedLoanForBid(null)}
              disabled={loading}
              style={{ width: '100%' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {selectedLoanForDetails && (
        <div className="card" style={{ background: '#f0f9ff', border: '2px solid #667eea' }}>
          <h2>Loan Details</h2>
          <button className="button button-secondary" onClick={() => setSelectedLoanForDetails(null)}>Close</button>
          <table>
            <tbody>
              <tr><td>ID:</td><td>#{selectedLoanForDetails.id}</td></tr>
              <tr><td>Amount:</td><td>{selectedLoanForDetails.amount} ETH</td></tr>
              <tr><td>Tenure:</td><td>{selectedLoanForDetails.tenure} months</td></tr>
              <tr><td>Purpose:</td><td>{selectedLoanForDetails.purpose}</td></tr>
              <tr><td>Category:</td><td>{selectedLoanForDetails.category || 'N/A'}</td></tr>
              <tr><td>Status:</td><td>{selectedLoanForDetails.status}</td></tr>
              <tr><td>Bids:</td><td>{selectedLoanForDetails.bids}</td></tr>
            </tbody>
          </table>
        </div>
      )}

      {selectedMSME && (
        <div className="card" style={{ background: '#fefcf9', border: '2px solid #ed8936' }}>
          <h2>MSME Profile</h2>
          <button className="button button-secondary" onClick={() => setSelectedMSME(null)}>Close</button>
          <table>
            <tbody>
              <tr><td>Business:</td><td>{selectedMSME.businessName || 'N/A'}</td></tr>
              <tr><td>Industry:</td><td>{selectedMSME.industry || 'N/A'}</td></tr>
              <tr><td>Address:</td><td><code>{selectedMSME.msmeAddress || selectedMSME.msme}</code></td></tr>
              <tr><td>Reputation:</td><td>{selectedMSME.reputation || 'N/A'}/1000</td></tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Marketplace;
