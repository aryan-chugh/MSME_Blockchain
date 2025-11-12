import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getContractInstance, formatTokens } from '../../utils/contracts';

function Marketplace({ account, provider, signer }) {
  const [loanRequests, setLoanRequests] = useState([]);
  const [selectedLoanForDetails, setSelectedLoanForDetails] = useState(null);
  const [selectedMSME, setSelectedMSME] = useState(null);
  const [msmeAttestations, setMsmeAttestations] = useState([]);
  const [msmePreviousLoans, setMsmePreviousLoans] = useState([]);
  const [loadingMSMEDetails, setLoadingMSMEDetails] = useState(false);
  const [selectedLoanForBid, setSelectedLoanForBid] = useState(null);
  const [bidRate, setBidRate] = useState('');
  const [bidNonce, setBidNonce] = useState('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all, open, reveal, matched

  useEffect(() => {
    loadLoansFromBlockchain();
    const interval = setInterval(loadLoansFromBlockchain, 10000); // Refresh every 10s
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const loadMSMEDetails = async (msmeAddress) => {
    if (!provider) return;
    
    setLoadingMSMEDetails(true);
    try {
      const attestationContract = getContractInstance('AttestationRegistry', provider);
      const loanMarketplaceContract = getContractInstance('LoanMarketplace', provider);
      
      // Load attestations
      const attestations = await attestationContract.getAttestations(msmeAddress);
      const formattedAttestations = attestations.map((att, index) => ({
        index,
        schemaId: att.schemaId,
        issuer: att.issuer,
        issuedAt: Number(att.issuedAt),
        expiresAt: Number(att.expiresAt),
        revoked: att.revoked,
        data: att.data
      }));
      setMsmeAttestations(formattedAttestations);
      
      // Load previous loans
      const requestIds = await loanMarketplaceContract.getRequestsByMSME(msmeAddress);
      const loans = [];
      for (let i = 0; i < requestIds.length; i++) {
        try {
          const requestId = Number(requestIds[i]);
          const request = await loanMarketplaceContract.requests(requestId);
          const statusMap = ['Open', 'Reveal', 'Matched', 'Expired', 'Cancelled'];
          loans.push({
            id: requestId,
            amount: formatTokens(request.amount),
            tenure: Number(request.tenureMonths),
            purpose: request.purpose,
            status: statusMap[request.status] || 'Unknown',
            createdAt: Number(request.createdAt)
          });
        } catch (err) {
          console.error(`Error loading MSME loan ${requestIds[i]}:`, err);
        }
      }
      setMsmePreviousLoans(loans);
      
    } catch (error) {
      console.error('Error loading MSME details:', error);
    } finally {
      setLoadingMSMEDetails(false);
    }
  };

  const viewMSMEDetails = (loan) => {
    setSelectedLoanForDetails(loan);
    loadMSMEDetails(loan.msme);
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
        '? Cannot Bid on Your Own Loan\n\n' +
        'You cannot place a bid on a loan request you created.\n\n' +
        ' To test bidding:\n' +
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
      
      console.log(' Checking existing commitment...');
      console.log('  Request ID:', selectedLoanForBid.id);
      console.log('  Your address:', account);
      console.log('  Existing commitment:', existingCommitment);
      
      if (existingCommitment !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        alert(
          '? You Have Already Bid on This Loan\n\n' +
          `You have already submitted a sealed bid for Loan #${selectedLoanForBid.id}.\n\n` +
          `Your commitment: ${existingCommitment.substring(0, 20)}...\n\n` +
          ' Each lender can only submit ONE bid per loan.\n\n' +
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
    console.log('? Deadline Check:');
    console.log('  Current time (unix):', now);
    console.log('  Commit deadline:', selectedLoanForBid.commitDeadline);
    console.log('  Time until deadline:', selectedLoanForBid.commitDeadline - now, 'seconds');
    console.log('  Has ended?', now > selectedLoanForBid.commitDeadline);
    
    if (now > selectedLoanForBid.commitDeadline) {
      alert(
        '? Commit Period Has Ended\n\n' +
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
      //  CONTRACT BUG: The contract calculates deposit as (tokenAmount * 5) / 100
      // where tokenAmount has 18 decimals. This results in massive ETH requirements.
      // 
      // Example: 100 CIT = 100 * 10^18 ? deposit = 5 * 10^18 wei = 5 ETH (unreasonable!)
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
      
      console.log(' Bid Debug Info:');
      console.log('  Loan Amount (display):', selectedLoanForBid.amount);
      console.log('  Loan Amount (raw):', selectedLoanForBid.amountRaw?.toString());
      console.log('  Loan Amount (wei):', loanAmountWei.toString());
      console.log('  Deposit (wei):', depositWei.toString());
      console.log('  Deposit (ETH):', depositEth);
      
      // Check if deposit is too high (contract bug)
      if (Number(depositEth) > 1) {
        alert(
          ` WARNING: High Deposit Required!\n\n` +
          `The contract requires ${depositEth} ETH deposit for this ${selectedLoanForBid.amount} token loan.\n\n` +
          `This is due to a contract design issue where deposit is calculated as 5% of the token amount (with 18 decimals) in ETH.\n\n` +
          ` SOLUTION FOR TESTING:\n` +
          `Create smaller loan requests (e.g., 0.01-0.1 tokens) which require:\n` +
          `- 0.01 tokens ? 0.0005 ETH deposit\n` +
          `- 0.1 tokens ? 0.005 ETH deposit\n\n` +
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
        ` IMPORTANT: Save your nonce!\n` +
        `Nonce: ${bidNonce}\n\n` +
        `You'll need this exact value to reveal your bid later.`
      );
      
      const loanContract = getContractInstance('LoanMarketplace', signer);
      
      console.log(' Submitting bid transaction...');
      console.log('  Request ID:', selectedLoanForBid.id);
      console.log('  Commitment:', commitment);
      console.log('  Deposit (wei):', depositWei.toString());
      
      const tx = await loanContract.commitBid(selectedLoanForBid.id, commitment, {
        value: depositWei
      });
      
      console.log('? Transaction sent:', tx.hash);
      await tx.wait();
      console.log('? Transaction confirmed');
      
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
        `? Bid committed successfully!\n\n` +
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
      console.error('? Error placing bid:', error);
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
        `? Bid Failed\n\n` +
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
      'Open': { bg: '#48bb78', shadow: 'rgba(72, 187, 120, 0.3)' },
      'Reveal': { bg: '#ed8936', shadow: 'rgba(237, 137, 54, 0.3)' },
      'Matched': { bg: '#667eea', shadow: 'rgba(102, 126, 234, 0.3)' },
      'Expired': { bg: '#718096', shadow: 'rgba(113, 128, 150, 0.3)' },
      'Cancelled': { bg: '#e53e3e', shadow: 'rgba(229, 62, 62, 0.3)' }
    };
    const statusColor = colors[status] || { bg: '#718096', shadow: 'rgba(113, 128, 150, 0.3)' };
    return (
      <span style={{
        background: statusColor.bg,
        color: 'white',
        padding: '6px 14px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '700',
        boxShadow: `0 2px 8px ${statusColor.shadow}`,
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
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
        <h2> Loan Marketplace</h2>
        <div className="alert alert-info">Please connect your wallet to view loan requests</div>
      </div>
    );
  }

  return (
    <div>
      <div className="card mb-4" style={{ 
        background: 'transparent',
        border: 'none',
        // centrally aligned
        textAlign: 'center'
      }}>
        <h1 className="mb-2" style={{ color: '#ffffff', fontSize: '40px', fontWeight: '800' }}>
           Loan Marketplace
        </h1>
        <p className="mb-4" style={{ color: '#ffffff', opacity: 0.9, fontSize: '25px' }}>
          Browse loan requests from verified MSMEs and submit sealed bids
        </p>
        {/* make this div's buttons span the entire width in 50 - 50 proportion */}

        <div className="d-flex gap-4" style={{ justifyContent: 'center' }}>
          <div className="p-3 rounded" style={{ 
            background: '#03b709ff',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            width: '30%',
            textAlign: 'center',
            // make the components side by side
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
             <div className="text-l font-bold" style={{ color: '#ffffff', opacity: 0.8, marginRight: '15px' }}>
              Total Loans: 
            </div>
            <div className="text-xl font-bold" style={{ color: '#ffffff' }}>
              {loanRequests.length}
            </div>
          </div>
          <div className="p-3 rounded" style={{ 
            background: '#ffaa00ff',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            width: '30%',
            textAlign: 'center',
            // make the components side by side
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div className="text-l font-bold" style={{ color: '#ffffff', opacity: 0.8, marginRight: '15px' }}>
              Open for Bids: 
            </div>
            <div className="text-xl font-bold" style={{ color: '#ffffff' }}>
              {loanRequests.filter(l => l.status === 'Open').length}
            </div>
            
          </div>
        </div>
      </div>

      {/* Testing Notice
      {loanRequests.some(loan => {
        try {
          const loanAmountWei = loan.amountRaw ? ethers.toBigInt(loan.amountRaw) : ethers.parseUnits(loan.amount.toString(), 18);
          const depositWei = (loanAmountWei * ethers.toBigInt(5)) / ethers.toBigInt(100);
          return Number(ethers.formatEther(depositWei)) > 1;
        } catch { return false; }
      }) && (
        <div className="info-box info-box-error mb-4">
          <h3 className="text-primary mb-3"> High Deposit Requirements Detected</h3>
          <p className="text-secondary mb-3">
            Some loans require very high ETH deposits due to a contract design issue. 
            Loans marked with a warning cannot be bid on.
          </p>
          <p className="text-secondary text-sm mb-0">
             <strong>For testing:</strong> Create new loans with amounts <strong>0.01 - 0.1 tokens</strong> which require reasonable deposits (0.0005 - 0.005 ETH).
          </p>
        </div>
      )} */}

      {/* Filters */}
      <div className="card mb-4">
        <div className="d-flex gap-2" style={{ flexWrap: 'wrap' }}>
          {['all', 'open', 'reveal', 'matched'].map(f => (
            <button
              key={f}
              className="button"
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? '#00b7ffff' : 'var(--card-background)',
                color: filter === f ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '18px',
                width: '140px',
                justifyContent: 'center',
                padding: '15px 30px',
                border: filter === f ? 'none' : '1px solid var(--card-border)',
                fontWeight: filter === f ? '600' : '500',
                boxShadow: filter === f ? '0 4px 12px rgba(102, 126, 234, 0.3)' : 'none'
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Loan Requests Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px', width: '100%' }}>
        {filteredLoans.length === 0 ? (
          <div className="card" style={{ 
            textAlign: 'center', 
            padding: '60px 40px',
            background: 'transparent',
            border: '2px dashed var(--accent-info)',
            width: '100%',
          }}>
            <h3 className="text-primary mb-2">No Loan Requests Found</h3>
            <p className="text-secondary">
              {filter !== 'all' 
                ? `No ${filter} loan requests are currently available.` 
                : 'There are no loan requests at the moment.'}
            </p>
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
                background: 'transparent',
                border: '1px solid #e2e8f0',
                borderLeft: '5px solid #667eea',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(102, 126, 234, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
              }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, color: '#2d3748', fontSize: '18px', fontWeight: '700' }}>
                     Loan #{loan.id}
                  </h3>
                  {getStatusBadge(loan.status)}
                </div>

                <div style={{ 
                  marginBottom: '20px',
                  padding: '16px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '12px',
                  color: 'white'
                }}>
                  <div style={{ fontSize: '36px', fontWeight: '900', marginBottom: '4px' }}>
                    {loan.amount} <span style={{ fontSize: '18px', opacity: 0.9 }}>CIT</span>
                  </div>
                  <div style={{ fontSize: '14px', opacity: 0.9 }}>
                     {loan.tenure} months tenure
                  </div>
                </div>
                
                <div style={{ marginBottom: '16px' }}>
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
                       This is your loan request
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
                       Requires {Number(depositRequired).toFixed(4)} ETH deposit (too high for testing)
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
                    Deposit: {Number(depositRequired).toFixed(6)} ETH
                    </div>
                  )}
                </div>

                <div style={{ background: '#f7fafc', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>Purpose</div>
                  <div style={{ fontSize: '14px', color: '#2d3748', fontWeight: '500' }}>{loan.purpose}</div>
                </div>

                <div style={{ fontSize: '12px', color: 'white', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span>MSME:</span>
                    <code style={{ background: 'transparent', padding: '2px 6px', borderRadius: '4px' }}>
                      {loan.msme.substring(0, 10)}...
                    </code>
                  </div>
                  {inCommitPhase && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span>? Commit ends:</span>
                      <strong style={{ color: '#ed8936' }}>{getTimeRemaining(loan.commitDeadline)}</strong>
                    </div>
                  )}
                  {inRevealPhase && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span> Reveal ends:</span>
                      <strong style={{ color: '#48bb78' }}>{getTimeRemaining(loan.revealDeadline)}</strong>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="button"
                    style={{ flex: 1, fontSize: '14px', padding: '8px' }}
                    onClick={() => viewMSMEDetails(loan)}
                  >
                     Details
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
                    {isMyOwnLoan ? ' Your Loan' : depositTooHigh ? ' Deposit Too High' : loan.status === 'Open' && inCommitPhase ? ' Place Bid' : ' Bidding Closed'}
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
            background: 'black', 
            border: '2px solid #667eea',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2> Submit Sealed Bid</h2>
            <div style={{ background: 'transparent', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #48bb78' }}>
              <div style={{ fontSize: '12px', color: 'white', marginBottom: '8px' }}>Loan #{selectedLoanForBid.id}</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#48bb78' }}>
                {selectedLoanForBid.amount} tokens
              </div>
              <div style={{ fontSize: '14px', color: 'white', marginTop: '4px' }}>
                {selectedLoanForBid.tenure} months {selectedLoanForBid.purpose}
              </div>
            </div>

            <div className="alert" style={{ background: 'transparent', border: '1px solid #ed8936', color: '#7c2d12', marginBottom: '16px' }}>
              <strong> Sealed Bid Auction</strong>
              
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
            <div style={{ fontSize: '12px', color: 'white', marginTop: '4px', marginBottom: '16px' }}>
               Tip: Use a random string like "mySecret123xyz". You'll need this exact value to reveal your bid.
            </div>

            <div style={{ background: 'transparent', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #38b2ac' }}>
              <div style={{ fontSize: '12px', color: 'white', marginBottom: '4px' }}>Deposit Required (5% of loan amount)</div>
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
              <div style={{ fontSize: '11px', color: 'white', marginTop: '4px' }}>
                Make sure you have enough Sepolia ETH in your wallet
              </div>
            </div>

            <button 
              className="button" 
              onClick={placeBid}
              disabled={loading || !bidRate || !bidNonce}
              style={{ width: '50%', marginBottom: '8px', background: '#48bb78', color: 'white' }}
            >
              {loading ? '? Submitting...' : 'Submit Sealed Bid'}
            </button>
            <button 
              className="button button-secondary" 
              onClick={() => setSelectedLoanForBid(null)}
              disabled={loading}
              style={{ width: '45%', color: 'white', background: 'red' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {selectedLoanForDetails && (
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
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="card" style={{ 
            background: '#ffffff', 
            border: '2px solid #667eea',
            maxWidth: '900px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2> Loan Request Details</h2>
              <button
                onClick={() => {
                  setSelectedLoanForDetails(null);
                  setMsmeAttestations([]);
                  setMsmePreviousLoans([]);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '28px',
                  cursor: 'pointer',
                  color: '#718096'
                }}
              >
                �
              </button>
            </div>

            {/* Loan Basic Info */}
            <div style={{ background: '#f0f9ff', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #667eea' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>Loan ID</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>#{selectedLoanForDetails.id}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>Amount</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#667eea' }}>{selectedLoanForDetails.amount} tokens</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>Tenure</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{selectedLoanForDetails.tenure} months</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>Status</div>
                  <div>{getStatusBadge(selectedLoanForDetails.status)}</div>
                </div>
              </div>
              <div style={{ marginTop: '15px' }}>
                <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>Purpose</div>
                <div style={{ fontSize: '14px' }}>{selectedLoanForDetails.purpose}</div>
              </div>
            </div>

            {/* MSME Information */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ marginBottom: '12px' }}> MSME Information</h3>
              <div style={{ background: '#f7fafc', padding: '15px', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>Address</div>
                <code style={{ fontSize: '13px', wordBreak: 'break-all' }}>{selectedLoanForDetails.msme}</code>
              </div>
            </div>

            {/* Attestations */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ marginBottom: '12px' }}>? Verified Documents</h3>
              {loadingMSMEDetails ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#718096' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>?</div>
                  Loading attestations...
                </div>
              ) : msmeAttestations.length === 0 ? (
                <div className="alert" style={{ background: '#fed7d7', color: '#742a2a', border: '1px solid #feb2b2' }}>
                   No verified documents found for this MSME
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {msmeAttestations.map((att, index) => {
                    const now = Math.floor(Date.now() / 1000);
                    const isExpired = att.expiresAt > 0 && att.expiresAt < now;
                    const isValid = !att.revoked && !isExpired;
                    
                    return (
                      <div key={index} style={{
                        background: isValid ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${isValid ? '#86efac' : '#fca5a5'}`,
                        padding: '12px',
                        borderRadius: '6px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
                              {isValid ? '?' : '?'} Attestation #{att.index}
                            </div>
                            <div style={{ fontSize: '11px', color: '#718096' }}>
                              Schema: {att.schemaId.substring(0, 10)}...
                            </div>
                            <div style={{ fontSize: '11px', color: '#718096' }}>
                              Issued: {new Date(att.issuedAt * 1000).toLocaleDateString()}
                            </div>
                            {att.expiresAt > 0 && (
                              <div style={{ fontSize: '11px', color: isExpired ? '#dc2626' : '#16a34a' }}>
                                {isExpired ? 'Expired' : 'Valid until'}: {new Date(att.expiresAt * 1000).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            background: isValid ? '#dcfce7' : '#fee2e2',
                            color: isValid ? '#16a34a' : '#dc2626'
                          }}>
                            {att.revoked ? 'Revoked' : isExpired ? 'Expired' : 'Valid'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Previous Loans */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ marginBottom: '12px' }}> Loan History</h3>
              {loadingMSMEDetails ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#718096' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>?</div>
                  Loading loan history...
                </div>
              ) : msmePreviousLoans.length === 0 ? (
                <div className="alert" style={{ background: '#e0f2fe', color: '#075985', border: '1px solid #7dd3fc' }}>
                   No previous loans found
                </div>
              ) : (
                <table style={{ width: '100%', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '8px', textAlign: 'left' }}>ID</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Amount</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Tenure</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Purpose</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Status</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {msmePreviousLoans.map((loan, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px' }}>#{loan.id}</td>
                        <td style={{ padding: '8px', fontWeight: 'bold' }}>{loan.amount}</td>
                        <td style={{ padding: '8px' }}>{loan.tenure}m</td>
                        <td style={{ padding: '8px' }}>{loan.purpose}</td>
                        <td style={{ padding: '8px' }}>{getStatusBadge(loan.status)}</td>
                        <td style={{ padding: '8px', fontSize: '11px', color: '#718096' }}>
                          {new Date(loan.createdAt * 1000).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <button 
              className="button"
              onClick={() => {
                setSelectedLoanForDetails(null);
                setMsmeAttestations([]);
                setMsmePreviousLoans([]);
              }}
              style={{ width: '100%' }}
            >
              Close
            </button>
          </div>
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
