import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getContractInstance, formatTokens } from '../../utils/contracts';

function LenderDashboard({ account, provider, signer }) {
  const [stats, setStats] = useState({
    activeBids: 0,
    pendingReveals: 0,
    totalCommitted: '0'
  });
  const [myBids, setMyBids] = useState([]);
  const [myAgreements, setMyAgreements] = useState([]);
  const [winningBids, setWinningBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [manualRevealMode, setManualRevealMode] = useState(null);
  const [manualRate, setManualRate] = useState('');
  const [manualNonce, setManualNonce] = useState('');
  
  // Lender profile state
  const [lenderProfile, setLenderProfile] = useState({
    displayName: '',
    businessName: '',
    lenderType: '',
    yearsExperience: '',
    fundingCapacity: '',
    preferredIndustries: '',
    bio: ''
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [tab, setTab] = useState('overview');

  // Issues & Disputes state
  const [issues, setIssues] = useState([]);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedAgreementForIssue, setSelectedAgreementForIssue] = useState(null);
  const [issueReason, setIssueReason] = useState('');
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidenceHash, setEvidenceHash] = useState('');
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  // Load lender profile from blockchain
  useEffect(() => {
    if (account && provider) {
      loadProfileFromBlockchain();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, provider]);

  // Load profile from blockchain
  const loadProfileFromBlockchain = async () => {
    try {
      setProfileLoading(true);
      const loanContract = await getContractInstance('LoanMarketplace', provider);
      const profile = await loanContract.getLenderProfile(account);
      
      if (profile.exists) {
        setLenderProfile({
          displayName: profile.displayName,
          businessName: profile.businessName,
          lenderType: profile.lenderType,
          yearsExperience: profile.yearsExperience.toString(),
          fundingCapacity: ethers.formatEther(profile.fundingCapacity),
          preferredIndustries: profile.preferredIndustries,
          bio: profile.bio
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  // Save profile to blockchain
  const saveProfile = async () => {
    try {
      setProfileLoading(true);
      const loanContract = await getContractInstance('LoanMarketplace', signer);
      
      const tx = await loanContract.setLenderProfile(
        lenderProfile.displayName,
        lenderProfile.businessName,
        lenderProfile.lenderType,
        lenderProfile.yearsExperience || 0,
        ethers.parseEther(lenderProfile.fundingCapacity || '0'),
        lenderProfile.preferredIndustries,
        lenderProfile.bio
      );
      
      await tx.wait();
      setIsEditingProfile(false);
      alert('✅ Profile saved successfully on blockchain!');
      
      // Reload profile
      await loadProfileFromBlockchain();
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('❌ Error saving profile: ' + (error.reason || error.message));
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (provider && account) {
      loadLenderStats();
      const interval = setInterval(loadLenderStats, 15000); // Refresh every 15s
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            
            // Fetch deposit amount safely
            let deposit = ethers.toBigInt(0);
            try {
              deposit = await loanContract.bidDeposits(i, account);
            } catch (depositErr) {
              console.warn(`Could not fetch deposit for loan ${i}:`, depositErr.message);
            }
            
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

      // Load winning bids and agreements
      await loadWinningBids();
      await loadMyAgreements();
      
    } catch (error) {
      console.error('Error loading lender stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWinningBids = async () => {
    if (!provider || !account) return;
    
    try {
      const loanContract = getContractInstance('LoanMarketplace', provider);
      const counter = await loanContract.requestCounter();
      const totalLoans = Number(counter);
      
      const winners = [];
      for (let i = 1; i <= totalLoans; i++) {
        try {
          const winner = await loanContract.getWinner(i);
          
          // Check if I'm the winner and winner is not zero address
          if (winner.toLowerCase() === account.toLowerCase() && 
              winner !== '0x0000000000000000000000000000000000000000') {
            const request = await loanContract.requests(i);
            const rate = await loanContract.getWinningRate(i);
            
            const statusMap = ['Open', 'Reveal', 'Matched', 'Expired', 'Cancelled'];
            const status = statusMap[request.status];
            
            // Only show if status is "Matched"
            if (status === 'Matched') {
              winners.push({
                requestId: i,
                msme: request.msme,
                amount: formatTokens(request.amount),
                amountRaw: request.amount,
                tenure: Number(request.tenureMonths),
                purpose: request.purpose,
                rateBP: Number(rate),
                ratePercent: (Number(rate) / 100).toFixed(2),
                status: status,
                createdAt: Number(request.createdAt)
              });
            }
          }
        } catch (err) {
          // Not a winner or request doesn't exist
        }
      }
      
      setWinningBids(winners);
    } catch (error) {
      console.error('Error loading winning bids:', error);
    }
  };

  const loadMyAgreements = async () => {
    if (!provider || !account) return;
    
    try {
      const agreementContract = getContractInstance('LoanAgreementRegistry', provider);
      const loanIds = await agreementContract.getLenderLoans(account);
      
      const agreements = [];
      for (let i = 0; i < loanIds.length; i++) {
        try {
          const recordId = Number(loanIds[i]);
          const record = await agreementContract.records(recordId);
          
          const statusMap = ['Active', 'Repaid', 'Defaulted', 'Disputed', 'Restructured'];
          
          agreements.push({
            recordId: recordId,
            marketplaceId: Number(record.marketplaceId),
            msme: record.msme,
            amount: formatTokens(record.amount),
            amountRaw: record.amount,
            rateBP: Number(record.rateBP),
            ratePercent: (Number(record.rateBP) / 100).toFixed(2),
            tenureMonths: Number(record.tenureMonths),
            status: statusMap[record.status],
            disbursementDate: Number(record.disbursementDate),
            createdAt: Number(record.createdAt)
          });
        } catch (err) {
          console.error(`Error loading agreement ${loanIds[i]}:`, err);
        }
      }
      
      setMyAgreements(agreements);
    } catch (error) {
      console.error('Error loading agreements:', error);
    }
  };

  const createAgreement = async (requestId) => {
    if (!signer) {
      alert('Please connect your wallet');
      return;
    }

    try {
      // First verify the loan is matched and you're the winner
      const loanContract = getContractInstance('LoanMarketplace', provider);
      const request = await loanContract.requests(requestId);
      const winner = await loanContract.getWinner(requestId);
      
      const statusMap = ['Open', 'Reveal', 'Matched', 'Expired', 'Cancelled'];
      const status = statusMap[request.status];
      
      console.log('🔍 Agreement Creation Check:');
      console.log('  Request ID:', requestId);
      console.log('  Status:', status);
      console.log('  Winner:', winner);
      console.log('  Your address:', account);
      
      // Validate before attempting to create agreement
      if (status !== 'Matched') {
        alert(
          `❌ Cannot Create Agreement\n\n` +
          `The loan status is "${status}", not "Matched".\n\n` +
          `Please wait for the MSME to select a winning bid.`
        );
        return;
      }
      
      if (winner === '0x0000000000000000000000000000000000000000') {
        alert(
          `❌ No Winner Selected\n\n` +
          `The MSME hasn't selected a winning bid yet.\n\n` +
          `Wait for the reveal period to end and the MSME to select a winner.`
        );
        return;
      }
      
      if (winner.toLowerCase() !== account.toLowerCase()) {
        alert(
          `❌ You Are Not The Winner\n\n` +
          `Winner: ${winner}\n` +
          `Your Address: ${account}\n\n` +
          `Only the winning lender can create an agreement.`
        );
        return;
      }
      
      const agreementHash = ethers.id(`Agreement-${requestId}-${Date.now()}`);
      
      const confirmCreate = window.confirm(
        `📝 Create Loan Agreement\n\n` +
        `Request ID: ${requestId}\n` +
        `Status: ${status}\n` +
        `Amount: ${formatTokens(request.amount)} CIT\n` +
        `Agreement Hash: ${agreementHash.substring(0, 20)}...\n\n` +
        `This will create a formal loan agreement on the blockchain.\n\n` +
        `Continue?`
      );

      if (!confirmCreate) return;

      setLoading(true);
      
      const agreementContract = getContractInstance('LoanAgreementRegistry', signer);
      
      console.log('Creating agreement for request:', requestId);
      console.log('Agreement hash:', agreementHash);
      
      const tx = await agreementContract.registerAgreement(requestId, agreementHash);
      console.log('Transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);
      
      alert(
        `✅ Agreement Created Successfully!\n\n` +
        `Request ID: ${requestId}\n` +
        `Transaction: ${tx.hash}\n\n` +
        `The agreement is now recorded on the blockchain.\n` +
        `Both you and the MSME can view it in the Agreements tab.`
      );
      
      // Reload data
      await loadLenderStats();
      
    } catch (error) {
      console.error('Error creating agreement:', error);
      
      let errorMsg = '';
      
      if (error.code === 'ACTION_REJECTED') {
        errorMsg = 'Transaction rejected by user';
      } else if (error.reason) {
        errorMsg = error.reason;
      } else if (error.message) {
        errorMsg = error.message;
      } else {
        errorMsg = 'Unknown error';
      }
      
      alert(
        '❌ Error Creating Agreement\n\n' + 
        errorMsg + '\n\n' +
        'Possible causes:\n' +
        '• Loan status is not "Matched"\n' +
        '• You are not the winning lender\n' +
        '• MSME has not selected a winner yet\n' +
        '• Agreement already exists for this loan\n\n' +
        'Check the browser console (F12) for details.'
      );
    } finally {
      setLoading(false);
    }
  };

  const recordDisbursement = async (recordId) => {
    if (!signer) {
      alert('Please connect your wallet');
      return;
    }

    const confirmation = window.confirm(
      `💰 Record Loan Disbursement\n\n` +
      `Are you sure you want to record that you have disbursed the loan amount?\n\n` +
      `Agreement ID: ${recordId}\n\n` +
      `This action confirms that the loan funds have been transferred to the MSME.\n` +
      `The loan will become "Active" and interest calculations will begin.\n\n` +
      `This action cannot be undone.`
    );

    if (!confirmation) return;

    // Prompt for expected repayment date
    const agreement = myAgreements.find(a => a.recordId === recordId);
    if (!agreement) {
      alert('Agreement not found');
      setLoading(false);
      return;
    }

    const defaultMonths = 12; // Default loan term
    const defaultRepaymentDate = new Date();
    defaultRepaymentDate.setMonth(defaultRepaymentDate.getMonth() + defaultMonths);
    
    const repaymentDateInput = prompt(
      `📅 Enter Expected Repayment Date\n\n` +
      `Loan Amount: ${agreement.amount} CIT\n` +
      `Interest Rate: ${agreement.ratePercent}%\n\n` +
      `Enter the date when you expect full repayment.\n` +
      `Format: YYYY-MM-DD\n\n` +
      `Suggested (${defaultMonths} months): ${defaultRepaymentDate.toISOString().split('T')[0]}`,
      defaultRepaymentDate.toISOString().split('T')[0]
    );

    if (!repaymentDateInput) {
      setLoading(false);
      return; // User cancelled
    }

    // Validate and convert date
    const repaymentDate = new Date(repaymentDateInput);
    if (isNaN(repaymentDate.getTime())) {
      alert('❌ Invalid date format. Please use YYYY-MM-DD (e.g., 2025-12-31)');
      setLoading(false);
      return;
    }

    const expectedRepaymentTimestamp = Math.floor(repaymentDate.getTime() / 1000);
    const now = Math.floor(Date.now() / 1000);

    if (expectedRepaymentTimestamp <= now) {
      alert('❌ Repayment date must be in the future');
      setLoading(false);
      return;
    }

    // Prompt for document hash (proof of disbursement)
    const documentHash = prompt(
      `📄 Enter Document Hash (Proof of Disbursement)\n\n` +
      `Please provide the hash of your disbursement proof document.\n` +
      `This could be:\n` +
      `• Transaction receipt hash\n` +
      `• IPFS hash of bank transfer proof\n` +
      `• SHA256 hash of signed document\n\n` +
      `Enter the hash (or leave empty to skip):`,
      ''
    );

    // Validate hash format if provided
    if (documentHash && documentHash.trim()) {
      // Basic validation - should be hex string
      if (!/^(0x)?[a-fA-F0-9]+$/.test(documentHash.trim())) {
        alert('❌ Invalid hash format. Please enter a valid hexadecimal hash.');
        setLoading(false);
        return;
      }
    }

    const finalDocHash = documentHash && documentHash.trim() 
      ? (documentHash.startsWith('0x') ? documentHash : '0x' + documentHash)
      : '0x0000000000000000000000000000000000000000000000000000000000000000';

    try {
      setLoading(true);
      const agreementContract = getContractInstance('LoanAgreementRegistry', signer);
      
      console.log('Recording disbursement for agreement:', recordId);
      console.log('Expected repayment date:', repaymentDate.toLocaleDateString());
      console.log('Expected repayment timestamp:', expectedRepaymentTimestamp);
      console.log('Document hash:', finalDocHash);
      
      const tx = await agreementContract.recordDisbursement(recordId, expectedRepaymentTimestamp, finalDocHash);
      console.log('Transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);
      
      alert(
        `✅ Disbursement Recorded Successfully!\n\n` +
        `Agreement ID: ${recordId}\n` +
        `Expected Repayment: ${repaymentDate.toLocaleDateString()}\n` +
        (finalDocHash !== '0x0000000000000000000000000000000000000000000000000000000000000000' 
          ? `Document Hash: ${finalDocHash.slice(0, 10)}...${finalDocHash.slice(-8)}\n\n`
          : '\n') +
        `The loan is now active. Interest will accrue from today.\n` +
        `The MSME will see the updated status in their dashboard.`
      );
      
      // Reload agreements
      await loadMyAgreements();
      
    } catch (error) {
      console.error('Error recording disbursement:', error);
      
      let errorMsg = '';
      if (error.code === 'ACTION_REJECTED') {
        errorMsg = 'Transaction rejected by user';
      } else if (error.reason) {
        errorMsg = error.reason;
      } else {
        errorMsg = error.message || 'Unknown error';
      }
      
      alert(
        '❌ Error Recording Disbursement\n\n' + 
        errorMsg + '\n\n' +
        'Possible causes:\n' +
        '• You are not the lender for this agreement\n' +
        '• Disbursement has already been recorded\n' +
        '• Agreement does not exist\n\n' +
        'Check the browser console (F12) for details.'
      );
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
    
    console.log('🔍 LocalStorage Debug:');
    console.log('  All stored bids:', storedBids);
    console.log('  My account:', account);
    console.log('  My stored bids:', myStoredBids);
    console.log('  Looking for loan ID:', requestId);
    
    const bidInfo = myStoredBids.find(b => b.loanId === requestId);
    console.log('  Found bid info:', bidInfo);
    
    if (!bidInfo) {
      alert(
        '❌ Bid Information Not Found\n\n' +
        'Cannot find your bid details (rate and nonce) in local storage.\n\n' +
        `Stored bids for ${account}: ${myStoredBids.length}\n` +
        `Loan IDs found: ${myStoredBids.map(b => b.loanId).join(', ')}\n` +
        `Looking for: ${requestId}\n\n` +
        '💡 You need the exact rate and nonce you used when committing the bid.\n\n' +
        '🔍 Check browser console for localStorage details.'
      );
      return;
    }

    try {
      setLoading(true);
      
      const loanContract = getContractInstance('LoanMarketplace', signer);
      
      // Check if we're in reveal period
      const request = await loanContract.requests(requestId);
      const now = Math.floor(Date.now() / 1000);
      const commitDeadline = Number(request.commitDeadline);
      const revealDeadline = Number(request.revealDeadline);
      
      console.log('🔓 Revealing bid...');
      console.log('  Request ID:', requestId);
      console.log('  Rate (BP):', bidInfo.rateBP);
      console.log('  Nonce (bytes32):', bidInfo.nonceBytes);
      console.log('  Current time:', now);
      console.log('  Commit deadline:', commitDeadline, '(ended:', now > commitDeadline, ')');
      console.log('  Reveal deadline:', revealDeadline, '(ended:', now > revealDeadline, ')');
      console.log('  Account:', account);
      
      // Verify we can reveal
      if (now <= commitDeadline) {
        alert(`❌ Still in Commit Phase\n\nCannot reveal yet. Wait until: ${new Date(commitDeadline * 1000).toLocaleString()}\n\nTime remaining: ${commitDeadline - now} seconds`);
        return;
      }
      
      if (now > revealDeadline) {
        alert(`❌ Reveal Period Ended\n\nReveal deadline was: ${new Date(revealDeadline * 1000).toLocaleString()}\n\nYou can no longer reveal this bid.`);
        return;
      }
      
      // Check if already revealed
      try {
        const revealedBids = await loanContract.getRevealedBids(requestId);
        console.log('  Revealed bids:', revealedBids);
        
        const alreadyRevealed = revealedBids.some(bid => 
          bid.lender.toLowerCase() === account.toLowerCase()
        );
        
        if (alreadyRevealed) {
          const myRevealedBid = revealedBids.find(bid => 
            bid.lender.toLowerCase() === account.toLowerCase()
          );
          const revealedRate = (Number(myRevealedBid.rateBP) / 100).toFixed(2);
          
          alert(
            '✅ Bid Already Revealed\n\n' +
            `Your bid of ${revealedRate}% has already been revealed for this loan request.\n\n` +
            'You cannot reveal the same bid twice.\n\n' +
            '💡 Wait for the MSME to select a winning bid.'
          );
          return;
        }
      } catch (error) {
        console.log('  Note: Could not check revealed bids (might be none yet)');
      }
      
      // Check commitment exists
      const commitment = await loanContract.commitments(requestId, account);
      console.log('  Stored commitment:', commitment);
      
      if (commitment === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        alert('❌ No commitment found on blockchain for this request.');
        return;
      }
      
      // Recompute hash to verify
      const computedHash = ethers.solidityPackedKeccak256(
        ['uint256', 'bytes32', 'address'],
        [bidInfo.rateBP, bidInfo.nonceBytes, account]
      );
      console.log('  Computed hash:', computedHash);
      console.log('  Hashes match:', computedHash === commitment);
      
      if (computedHash !== commitment) {
        alert(`❌ Hash Mismatch!\n\nStored commitment: ${commitment}\nComputed hash: ${computedHash}\n\nThe rate or nonce might be incorrect.`);
        return;
      }
      
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

  const revealBidManually = async () => {
    if (!manualRate || !manualNonce) {
      alert('Please enter both interest rate and nonce');
      return;
    }

    try {
      setLoading(true);
      const loanContract = getContractInstance('LoanMarketplace', signer);
      
      const rateBP = Math.floor(parseFloat(manualRate) * 100);
      const nonceBytes = ethers.id(manualNonce);
      
      console.log('🔓 Manual Reveal:');
      console.log('  Request ID:', manualRevealMode);
      console.log('  Rate:', manualRate, '%');
      console.log('  Rate (BP):', rateBP);
      console.log('  Nonce string:', manualNonce);
      console.log('  Nonce (bytes32):', nonceBytes);
      console.log('  Account:', account);
      
      // Check if already revealed
      try {
        const revealedBids = await loanContract.getRevealedBids(manualRevealMode);
        console.log('  Revealed bids:', revealedBids);
        
        const alreadyRevealed = revealedBids.some(bid => 
          bid.lender.toLowerCase() === account.toLowerCase()
        );
        
        if (alreadyRevealed) {
          const myRevealedBid = revealedBids.find(bid => 
            bid.lender.toLowerCase() === account.toLowerCase()
          );
          const revealedRate = (Number(myRevealedBid.rateBP) / 100).toFixed(2);
          
          alert(
            '✅ Bid Already Revealed\n\n' +
            `Your bid of ${revealedRate}% has already been revealed for this loan request.\n\n` +
            'You cannot reveal the same bid twice.\n\n' +
            '💡 Wait for the MSME to select a winning bid.'
          );
          setManualRevealMode(null);
          setManualRate('');
          setManualNonce('');
          return;
        }
      } catch (error) {
        console.log('  Note: Could not check revealed bids (might be none yet)');
      }
      
      // Verify commitment exists
      const commitment = await loanContract.commitments(manualRevealMode, account);
      console.log('  Stored commitment:', commitment);
      
      if (commitment === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        alert(
          '❌ No Commitment Found\n\n' +
          'No commitment found on blockchain for this request.\n\n' +
          '💡 Make sure you:\n' +
          '• Placed a bid during the commit phase\n' +
          '• Are using the same wallet address\n' +
          '• Have the correct loan request ID'
        );
        return;
      }
      
      // Compute hash
      const computedHash = ethers.solidityPackedKeccak256(
        ['uint256', 'bytes32', 'address'],
        [rateBP, nonceBytes, account]
      );
      console.log('  Computed hash:', computedHash);
      console.log('  Match:', computedHash === commitment);
      
      if (computedHash !== commitment) {
        alert(
          '❌ Hash Mismatch\n\n' +
          'The rate or nonce you entered does not match your commitment.\n\n' +
          '💡 Make sure you enter:\n' +
          '• The EXACT interest rate you committed (e.g., 15.00)\n' +
          '• The EXACT nonce string you used\n\n' +
          `Expected commitment: ${commitment}\n` +
          `Computed from inputs: ${computedHash}\n\n` +
          'Check browser console (F12) for stored bid details.'
        );
        return;
      }
      
      const tx = await loanContract.revealBid(
        manualRevealMode,
        rateBP,
        nonceBytes
      );
      
      await tx.wait();
      
      alert(`✅ Bid Revealed!\n\nRate: ${manualRate}%\nTransaction: ${tx.hash}`);
      
      setManualRevealMode(null);
      setManualRate('');
      setManualNonce('');
      await loadLenderStats();
      
    } catch (error) {
      console.error('❌ Manual reveal error:', error);
      alert(`❌ Reveal Failed\n\n${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load issues for lender
  const loadIssues = async () => {
    if (!provider || !account) return;
    
    try {
      const loanRegistry = await getContractInstance('LoanAgreementRegistry', provider);
      const issueCount = await loanRegistry.issueCounter();
      const allIssues = [];
      
      for (let i = 1; i <= Number(issueCount); i++) {
        const issue = await loanRegistry.issues(i);
        const record = await loanRegistry.records(Number(issue.recordId));
        
        // Include issues where this lender is the lender
        if (record.lender.toLowerCase() === account.toLowerCase()) {
          const statusMap = ['Open', 'Resolved', 'Escalated'];
          allIssues.push({
            id: i,
            recordId: Number(issue.recordId),
            raisedBy: issue.raisedBy,
            reason: issue.reason,
            evidenceHash: issue.evidenceHash,
            status: statusMap[issue.status] || 'Unknown',
            resolution: issue.resolution,
            resolvedBy: issue.resolvedBy,
            timestamp: new Date(Number(issue.timestamp) * 1000).toLocaleString(),
            msme: record.msme,
            loanAmount: ethers.formatEther(record.loanAmount)
          });
        }
      }
      
      setIssues(allIssues);
    } catch (error) {
      console.error('Error loading issues:', error);
    }
  };

  // Load issues when tab is switched to issues
  useEffect(() => {
    if (tab === 'issues' && provider && account) {
      loadIssues();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, provider, account]);

  // Handle raising an issue from lender side
  // eslint-disable-next-line no-unused-vars
  const handleRaiseIssue = (agreement) => {
    setSelectedAgreementForIssue(agreement);
    setShowIssueModal(true);
    setIssueReason('');
    setEvidenceFile(null);
    setEvidenceHash('');
  };

  // Upload evidence to IPFS (mock implementation)
  const uploadIssueEvidenceToIPFS = async () => {
    if (!evidenceFile) {
      alert('Please select a file first');
      return;
    }
    
    try {
      setUploadingEvidence(true);
      
      // Simulate IPFS upload with hash generation
      await new Promise(resolve => setTimeout(resolve, 1500));
      const fileContent = await evidenceFile.text();
      const hash = ethers.keccak256(ethers.toUtf8Bytes(fileContent + Date.now()));
      
      setEvidenceHash(hash);
      alert('✅ Evidence uploaded to IPFS!\n\nHash: ' + hash.substring(0, 20) + '...');
    } catch (error) {
      console.error('Error uploading evidence:', error);
      alert('❌ Error uploading evidence: ' + error.message);
    } finally {
      setUploadingEvidence(false);
    }
  };

  // Submit issue
  const submitIssue = async () => {
    if (!issueReason.trim()) {
      alert('Please provide a reason for the issue');
      return;
    }
    
    if (!evidenceHash) {
      alert('Please upload evidence before submitting');
      return;
    }
    
    try {
      setLoading(true);
      const loanRegistry = await getContractInstance('LoanAgreementRegistry', signer);
      
      const tx = await loanRegistry.raiseIssue(
        selectedAgreementForIssue.recordId,
        issueReason,
        evidenceHash
      );
      
      console.log('Raising issue, transaction:', tx.hash);
      const receipt = await tx.wait();
      
      // Parse IssueRaised event
      const issueRaisedEvent = receipt.logs
        .map(log => {
          try {
            return loanRegistry.interface.parseLog(log);
          } catch (e) {
            return null;
          }
        })
        .find(event => event && event.name === 'IssueRaised');
      
      if (issueRaisedEvent) {
        alert(
          '✅ Issue Raised Successfully!\n\n' +
          `Issue ID: ${issueRaisedEvent.args.issueId}\n` +
          `Record ID: ${issueRaisedEvent.args.recordId}\n\n` +
          'The issue has been logged on-chain and will be reviewed for resolution.'
        );
      } else {
        alert('✅ Issue raised successfully!');
      }
      
      setShowIssueModal(false);
      await loadIssues();
      await loadMyAgreements();
    } catch (error) {
      console.error('Error raising issue:', error);
      alert('❌ Error raising issue: ' + (error.reason || error.message));
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
        <h1>Lender Dashboard</h1>
        <p style={{ color: '#718096' }}>
          Connected as: <strong>{account}</strong>
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="card" style={{ padding: '0', marginBottom: '20px' }}>
        <div style={{ display: 'flex', fontSize: '25px'}}>
          <button
            onClick={() => setTab('overview')}
            style={{
              flex: 1,
              padding: '30px',
              background: tab === 'overview' ? '#00b7ffff' : 'transparent',
              color: tab === 'overview' ? 'white' : 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: tab === 'overview' ? 'bold' : 'normal',
              transition: 'all 0.3s'
            }}
          >
            Overview
          </button>
          <button
            onClick={() => setTab('profile')}
            style={{
              flex: 1,
              padding: '30px',
              background: tab === 'profile' ? '#00b7ffff' : 'transparent',
              color: tab === 'profile' ? 'white' : 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: tab === 'profile' ? 'bold' : 'normal',
              transition: 'all 0.3s'
            }}
          >
             Profile
          </button>
          {/* <button
            onClick={() => setTab('agreements')}
            style={{
              flex: 1,
              padding: '30px',
              background: tab === 'agreements' ? '#00b7ffff' : 'transparent',
              color: tab === 'agreements' ? 'white' : 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: tab === 'agreements' ? 'bold' : 'normal',
              transition: 'all 0.3s'
            }}
          >
            Agreements
          </button>
          <button
            onClick={() => setTab('issues')}
            style={{
              flex: 1,
              padding: '30px',
              background: tab === 'issues' ? '#00b7ffff' : 'transparent',
              color: tab === 'issues' ? 'white' : 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: tab === 'issues' ? 'bold' : 'normal',
              transition: 'all 0.3s'
            }}
          >
            Issues
          </button> */}
        </div>
      </div>

      {/* Profile Tab */}
      {tab === 'profile' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2> Lender Profile</h2>
            {!isEditingProfile && (
              <button
                onClick={() => setIsEditingProfile(true)}
                style={{
                  padding: '10px 16px',
                  background: '#00b7ffff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                 Edit Profile
              </button>
            )}
          </div>
          
          <p style={{ color: '#718096', marginBottom: '20px' }}>
            Build your reputation as a lender. MSMEs will see this information when evaluating your bids.
          </p>

          {isEditingProfile ? (
            <div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Display Name *
                </label>
                <input
                  type="text"
                  value={lenderProfile.displayName}
                  onChange={(e) => setLenderProfile({ ...lenderProfile, displayName: e.target.value })}
                  placeholder="e.g., John Doe"
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e0', background: 'transparent', color: 'white' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Business/Organization Name
                </label>
                <input
                  type="text"
                  value={lenderProfile.businessName}
                  onChange={(e) => setLenderProfile({ ...lenderProfile, businessName: e.target.value })}
                  placeholder="e.g., ABC Capital Partners"
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e0', background: 'transparent', color: 'white'  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Lender Type
                </label>
                <select
                  value={lenderProfile.lenderType}
                  onChange={(e) => setLenderProfile({ ...lenderProfile, lenderType: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e0', background: 'transparent', color: 'white'  }}
                >
                  <option value="">Select type...</option>
                  <option value="Individual">Individual Investor</option>
                  <option value="Angel">Angel Investor</option>
                  <option value="VC">Venture Capital</option>
                  <option value="Bank">Bank/Financial Institution</option>
                  <option value="NBFC">NBFC</option>
                  <option value="Family Office">Family Office</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Years of Experience
                </label>
                <input
                  type="number"
                  value={lenderProfile.yearsExperience}
                  onChange={(e) => setLenderProfile({ ...lenderProfile, yearsExperience: e.target.value })}
                  placeholder="e.g., 5"
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e0', background: 'transparent', color: 'white'  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Funding Capacity (ETH)
                </label>
                <input
                  type="text"
                  value={lenderProfile.fundingCapacity}
                  onChange={(e) => setLenderProfile({ ...lenderProfile, fundingCapacity: e.target.value })}
                  placeholder="e.g., 100-500"
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e0', background: 'transparent', color: 'white'  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Preferred Industries (comma-separated)
                </label>
                <input
                  type="text"
                  value={lenderProfile.preferredIndustries}
                  onChange={(e) => setLenderProfile({ ...lenderProfile, preferredIndustries: e.target.value })}
                  placeholder="e.g., Technology, Manufacturing, Retail"
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e0', background: 'transparent', color: 'white'  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Bio / About You
                </label>
                <textarea
                  value={lenderProfile.bio}
                  onChange={(e) => setLenderProfile({ ...lenderProfile, bio: e.target.value })}
                  placeholder="Tell MSMEs about your lending philosophy, experience, and what you look for in borrowers..."
                  rows={4}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e0', resize: 'vertical', background: 'transparent', color: 'white'  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={saveProfile}
                  disabled={profileLoading}
                  style={{
                    padding: '10px 20px',
                    background: profileLoading ? '#cbd5e0' : '#48bb78',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: profileLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  {profileLoading ? '⏳ Saving to Blockchain...' : '💾 Save Profile'}
                </button>
                <button
                  onClick={() => setIsEditingProfile(false)}
                  disabled={profileLoading}
                  style={{
                    padding: '10px 20px',
                    background: '#cbd5e0',
                    color: '#2d3748',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: profileLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              {!lenderProfile.displayName ? (
                <div className="alert" style={{ background: 'transparent', border: '1px solid #f59e0b', color: 'white' }}>
                  You haven't set up your profile yet. Click "Edit Profile" to add your information and build trust with MSMEs.
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: '15px', padding: '15px', background: 'transparent', color: 'white' , borderRadius: '8px' }}>
                    <strong>Display Name:</strong> {lenderProfile.displayName}
                  </div>
                  {lenderProfile.businessName && (
                    <div style={{ marginBottom: '15px', padding: '15px', background: 'transparent', color: 'white' , borderRadius: '8px' }}>
                      <strong>Business:</strong> {lenderProfile.businessName}
                    </div>
                  )}
                  {lenderProfile.lenderType && (
                    <div style={{ marginBottom: '15px', padding: '15px',background: 'transparent', color: 'white' , borderRadius: '8px' }}>
                      <strong>Type:</strong> {lenderProfile.lenderType}
                    </div>
                  )}
                  {lenderProfile.yearsExperience && (
                    <div style={{ marginBottom: '15px', padding: '15px', background: 'transparent', color: 'white' , borderRadius: '8px' }}>
                      <strong>Experience:</strong> {lenderProfile.yearsExperience} years
                    </div>
                  )}
                  {lenderProfile.fundingCapacity && (
                    <div style={{ marginBottom: '15px', padding: '15px', background: 'transparent', color: 'white' , borderRadius: '8px' }}>
                      <strong>Funding Capacity:</strong> {lenderProfile.fundingCapacity} ETH
                    </div>
                  )}
                  {lenderProfile.preferredIndustries && (
                    <div style={{ marginBottom: '15px', padding: '15px', background: 'transparent', color: 'white' , borderRadius: '8px' }}>
                      <strong>Preferred Industries:</strong> {lenderProfile.preferredIndustries}
                    </div>
                  )}
                  {lenderProfile.bio && (
                    <div style={{ marginBottom: '15px', padding: '15px', background: 'transparent', color: 'white' , borderRadius: '8px' }}>
                      <strong>About:</strong>
                      <p style={{ marginTop: '10px', marginBottom: 0 }}>{lenderProfile.bio}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Overview Tab (existing content) */}
      {tab === 'overview' && (
        <div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginBottom: '100px', }}>
            <div className="card" style={{ background: 'transparent', border: '2px solid #48bb78' }}>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#48bb78' }}>
                {stats.activeBids}
              </div>
              <div style={{ color: 'white', marginTop: '8px' }}>Active Bids (Committed)</div>
            </div>
            <div className="card" style={{ background: 'transparent', border: '2px solid #ed8936' }}>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#ed8936' }}>
                {stats.pendingReveals}
              </div>
              <div style={{ color: 'white', marginTop: '8px' }}>Pending Reveals</div>
            </div>
            <div className="card" style={{ background: 'transparen', border: '2px solid #667eea' }}>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#667eea' }}>
                {parseFloat(stats.totalCommitted).toFixed(4)}
              </div>
              <div style={{ color: 'white', marginTop: '8px' }}>Total Committed (ETH)</div>
            </div>
          </div>

      {/* Bids Section (visible in overview tab) */}
        <div className="card" style={{marginTop: '20px'}}>
          <h2>My Bids</h2>
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
                    background: 'transparent',
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
                  
                  <div style={{ background: 'transparent', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
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

                  <div style={{ background: 'transparent', padding: '12px', borderRadius: '8px', marginBottom: '12px', border: '1px solid #ed8936' }}>
                    <p style={{ margin: '4px 0', fontSize: '14px' }}>
                      <strong>Your Deposit:</strong> {bid.deposit} ETH
                    </p>
                    <p style={{ margin: '4px 0', fontSize: '12px', color: '#718096' }}>
                      Commitment: {bid.commitment.substring(0, 20)}...
                    </p>
                  </div>

                  {inCommitPhase && (
                    <div className="alert" style={{ background: 'transparent', border: '1px solid #48bb78', color: '#22543d', fontSize: '14px' }}>
                      ⏰ Commit phase: {getTimeRemaining(bid.commitDeadline)} remaining
                    </div>
                  )}

                  {inRevealPhase && (
                    <div>
                      <div className="alert" style={{ background: 'transparent', border: '1px solid #ed8936', color: '#7c2d12', fontSize: '14px', marginBottom: '12px' }}>
                        🔓 <strong>Reveal Phase Active!</strong><br/>
                      </div>
                      <button 
                        className="button"
                        style={{ width: '47%', background: '#ed8936' }}
                        onClick={() => revealBid(bid.requestId)}
                        disabled={loading}
                      >
                        {loading ? '⏳ Revealing...' : '🔓 Reveal My Bid'}
                      </button>
                      <button 
                        className="button button-secondary"
                        style={{ width: '47%', marginTop: '8px', fontSize: '13px' }}
                        onClick={() => setManualRevealMode(bid.requestId)}
                      >
                        🔧 Manual Reveal (if localStorage failed)
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

      {/* Winning Bids - Need Agreement Creation */}
      {winningBids.length > 0 && (
        <div className="card" style={{ background: 'transparent', border: '2px solid #48bb78' }}>
          <h2>🏆 Winning Bids - Action Required</h2>
          <p style={{ color: 'green', marginBottom: '20px' }}>
            <strong>Congratulations!</strong> You won these bids. Create formal loan agreements to proceed.
          </p>

            <table>
              <thead>
                <tr>
                  <th>Request ID</th>
                <th>MSME</th>
                <th>Amount</th>
                <th>Your Rate</th>
                <th>Tenure</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {winningBids.map((bid) => {
                // Check if agreement already exists
                const hasAgreement = myAgreements.some(a => a.marketplaceId === bid.requestId);
                
                return (
                  <tr key={bid.requestId}>
                    <td><strong>#{bid.requestId}</strong></td>
                    <td>
                      <code style={{ fontSize: '11px' }}>
                        {bid.msme.substring(0, 8)}...{bid.msme.substring(38)}
                      </code>
                    </td>
                    <td><strong>{bid.amount} CIT</strong></td>
                    <td style={{ color: '#ed8936', fontWeight: 'bold' }}>{bid.ratePercent}% APR</td>
                    <td>{bid.tenure} months</td>
                    <td>
                      {hasAgreement ? (
                        <span style={{ color: '#48bb78', fontSize: '14px' }}>✅ Agreement Created</span>
                      ) : (
                        <button
                          className="button"
                          style={{ background: '#48bb78', padding: '8px 16px' }}
                          onClick={() => createAgreement(bid.requestId)}
                          disabled={loading}
                        >
                          {loading ? '⏳ Creating...' : '📝 Create Agreement'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* My Loan Agreements */}
      {myAgreements.length > 0 && (
        <div className="card">
          <h2>📄 My Loan Agreements</h2>
          <p style={{ color: '#718096', marginBottom: '20px' }}>
            Formal loan agreements created after winning bids
          </p>

          <table>
            <thead>
              <tr>
                <th>Agreement ID</th>
                <th>Marketplace ID</th>
                <th>MSME</th>
                <th>Amount</th>
                <th>Rate</th>
                <th>Tenure</th>
                <th>Status</th>
                <th>Disbursement</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {myAgreements.map((agreement) => (
                <tr key={agreement.recordId}>
                  <td><strong>#{agreement.recordId}</strong></td>
                  <td>#{agreement.marketplaceId}</td>
                  <td>
                    <code style={{ fontSize: '11px' }}>
                      {agreement.msme.substring(0, 8)}...{agreement.msme.substring(38)}
                    </code>
                  </td>
                  <td><strong>{agreement.amount} CIT</strong></td>
                  <td style={{ color: '#ed8936', fontWeight: 'bold' }}>{agreement.ratePercent}% APR</td>
                  <td>{agreement.tenureMonths} months</td>
                  <td>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      background: agreement.status === 'Active' ? '#f0fff4' : 
                                 agreement.status === 'Repaid' ? '#e0f2fe' : '#fee',
                      color: agreement.status === 'Active' ? '#22543d' : 
                             agreement.status === 'Repaid' ? '#0c4a6e' : '#742a2a'
                    }}>
                      {agreement.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '12px' }}>
                    {agreement.disbursementDate > 0 ? (
                      <div>
                        <span style={{ color: '#16a34a' }}>✅ Disbursed</span>
                        <div style={{ fontSize: '11px', color: '#718096' }}>
                          {new Date(agreement.disbursementDate * 1000).toLocaleDateString()}
                        </div>
                        {agreement.documentHash && agreement.documentHash !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? (
                          <div 
                            style={{ 
                              fontSize: '10px', 
                              color: '#7c3aed', 
                              marginTop: '4px',
                              cursor: 'pointer'
                            }}
                            onClick={() => {
                              alert(
                                `📄 Disbursement Proof\n\n` +
                                `Agreement ID: ${agreement.recordId}\n` +
                                `Document Hash:\n${agreement.documentHash}\n\n` +
                                `Disbursed: ${new Date(agreement.disbursementDate * 1000).toLocaleString()}\n` +
                                `Expected Repayment: ${new Date(agreement.expectedRepaymentDate * 1000).toLocaleDateString()}`
                              );
                            }}
                            title="Click to view full hash"
                          >
                            📄 Proof: {agreement.documentHash.slice(0, 8)}...{agreement.documentHash.slice(-6)}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <span style={{ color: '#d97706' }}>⏳ Pending</span>
                    )}
                  </td>
                  <td>
                    {agreement.disbursementDate === 0 ? (
                      <button
                        className="button"
                        style={{ background: '#16a34a', padding: '6px 12px', fontSize: '13px' }}
                        onClick={() => recordDisbursement(agreement.recordId)}
                        disabled={loading}
                      >
                        {loading ? '⏳' : '💰 Record Disbursement'}
                      </button>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#718096' }}>
                        Created: {new Date(agreement.createdAt * 1000).toLocaleDateString()}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card mb-4">
        <h2 className="text-primary mb-4">💡 How It Works</h2>
        <div className="d-flex flex-column gap-4">
          <div className="d-flex gap-3">
            <div className="text-3xl">1️⃣</div>
            <div>
              <strong className="text-primary">Place Bid (Commit Phase)</strong>
              <p className="text-secondary text-sm mt-1 mb-0">
                Go to Marketplace and submit a sealed bid with your interest rate. Your bid is encrypted and hidden.
              </p>
            </div>
          </div>
          <div className="d-flex gap-3">
            <div className="text-3xl">2️⃣</div>
            <div>
              <strong className="text-primary">Reveal Bid (Reveal Phase)</strong>
              <p className="text-secondary text-sm mt-1 mb-0">
                After commit deadline, come back here to reveal your bid. This makes your interest rate visible.
              </p>
            </div>
          </div>
          <div className="d-flex gap-3">
            <div className="text-3xl">3️⃣</div>
            <div>
              <strong className="text-primary">Winner Selection</strong>
              <p className="text-secondary text-sm mt-1 mb-0">
                MSME selects the best bid. If you win, your deposit is refunded and loan agreement is created.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Reveal Modal */}
      {manualRevealMode && (
        <div className="card" style={{ background: 'transparent', border: '2px solid #ed8936' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0 }}>🔧 Manual Bid Reveal</h2>
            <button 
              className="button button-secondary"
              onClick={() => setManualRevealMode(null)}
            >
              ✕ Close
            </button>
          </div>

          <div className="alert" style={{ background: 'transparent', border: '1px solid #ed8936', color: '#7c2d12', marginBottom: '20px' }}>
            <strong>⚠️ Manual Reveal Mode</strong><br/>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label><strong>Loan Request ID:</strong></label>
            <input
              type="text"
              value={manualRevealMode}
              disabled
              style={{ background: '#f7fafc', color: '#718096' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label><strong>Interest Rate (%):</strong></label>
            <input
              type="number"
              step="0.01"
              placeholder="e.g., 12.50"
              style={{padding: '5px'}}
              value={manualRate}
              onChange={(e) => setManualRate(e.target.value)}
            />
            <small style={{ color: '#718096', display: 'block', marginTop: '4px' }}>
              Enter the exact rate you committed (e.g., 12.50 for 12.5%)
            </small>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label><strong>Nonce (secret string):</strong></label>
            <input
              type="text"
              placeholder="e.g., mySecret123"
              value={manualNonce}
              onChange={(e) => setManualNonce(e.target.value)}
            />
            <small style={{ color: '#718096', display: 'block', marginTop: '4px' }}>
              Enter the exact nonce string you entered when committing
            </small>
          </div>

          <button
            className="button"
            style={{ width: '100%', background: '#ed8936' }}
            onClick={revealBidManually}
            disabled={loading || !manualRate || !manualNonce}
          >
            {loading ? '⏳ Revealing...' : '🔓 Reveal Bid'}
          </button>
        </div>
      )}
        </div>
      )}

      {/* Agreements Tab */}
      {/* {tab === 'agreements' && (
        <div className="card">
          <h2>📄 My Loan Agreements</h2>
          <p style={{ color: '#718096', marginBottom: '20px' }}>
            Manage your active loan agreements
          </p>
          {/* Agreements content will be displayed here - same as what was in overview tab */}
        {/* </div>
      )} */}

      {/* Issues & Disputes Tab */}
      {/* {tab === 'issues' && (
        <div className="card">
          <h2 className="text-primary mb-3"> Issues & Disputes</h2>
          <p className="text-secondary mb-4">
            Track and manage loan-related issues from your lending portfolio
          </p>

          {issues.length === 0 ? (
            <div className="info-box info-box-success mb-4">
              <strong className="text-primary">✅ No Issues Found</strong>
              <p className="mt-2 mb-0">
                All your loans are running smoothly! Issues raised by borrowers or yourself will appear here.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Issue ID</th>
                    <th>Record ID</th>
                    <th>Raised By</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Evidence</th>
                    <th>Resolution</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map((issue) => (
                    <tr key={issue.id}>
                      <td>#{issue.id}</td>
                      <td>#{issue.recordId}</td>
                      <td className="text-xs break-all">
                        {issue.raisedBy.substring(0, 10)}...
                      </td>
                      <td style={{ maxWidth: '200px' }}>
                        {issue.reason}
                      </td>
                      <td>
                        <span className={`badge ${
                          issue.status === 'Open' ? 'badge-warning' : 
                          issue.status === 'Resolved' ? 'badge-success' : 'badge-error'
                        }`}>
                          {issue.status}
                        </span>
                      </td>
                      <td>
                        {issue.evidenceHash && issue.evidenceHash !== ethers.ZeroHash ? (
                          <a 
                            href={`https://ipfs.io/ipfs/${issue.evidenceHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent"
                          >
                            View Evidence
                          </a>
                        ) : (
                          <span className="text-muted">No evidence</span>
                        )}
                      </td>
                      <td style={{ maxWidth: '200px' }}>
                        {issue.resolution || <span className="text-muted">Pending</span>}
                      </td>
                      <td className="text-xs text-muted">
                        {issue.timestamp}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="info-box info-box-info mt-4">
            <strong className="text-primary">💡 About Issues & Disputes</strong>
            <p className="mt-2 mb-0">
              Issues can be raised when there are problems with loan repayments, disputes, or contract violations. 
              Resolutions are handled offline and recorded on-chain for transparency.
            </p>
          </div>
        </div>
      )} */}

      {/* Raise Issue Modal */}
      {showIssueModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '30px',
            borderRadius: '12px'
          }}>
            <h2>🚨 Raise Issue</h2>
            <p style={{ color: '#718096', marginBottom: '20px' }}>
              Report a problem with loan agreement #{selectedAgreementForIssue?.recordId}
            </p>

            {selectedAgreementForIssue && (
              <div style={{
                background: '#f7fafc',
                padding: '15px',
                borderRadius: '8px',
                marginBottom: '20px',
                border: '1px solid #e2e8f0'
              }}>
                <p style={{ margin: '5px 0' }}>
                  <strong>MSME:</strong> {selectedAgreementForIssue.msme?.substring(0, 20)}...
                </p>
                <p style={{ margin: '5px 0' }}>
                  <strong>Loan Amount:</strong> {selectedAgreementForIssue.loanAmount} CIT
                </p>
                <p style={{ margin: '5px 0' }}>
                  <strong>Record ID:</strong> #{selectedAgreementForIssue.recordId}
                </p>
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label><strong>Reason for Issue:</strong></label>
              <textarea
                value={issueReason}
                onChange={(e) => setIssueReason(e.target.value)}
                placeholder="Describe the problem (e.g., Late payment, breach of terms, etc.)"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #cbd5e0',
                  borderRadius: '6px',
                  fontSize: '1em',
                  fontFamily: 'inherit',
                  minHeight: '100px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label><strong>Evidence (Optional):</strong></label>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={(e) => setEvidenceFile(e.target.files[0])}
                style={{
                  display: 'block',
                  marginTop: '8px',
                  padding: '8px',
                  border: '1px solid #cbd5e0',
                  borderRadius: '6px',
                  width: '100%'
                }}
              />
              <small style={{ color: '#718096', display: 'block', marginTop: '8px' }}>
                Upload supporting documents (payment receipts, communication logs, etc.)
              </small>

              {evidenceFile && (
                <button
                  onClick={uploadIssueEvidenceToIPFS}
                  disabled={uploadingEvidence}
                  style={{
                    marginTop: '12px',
                    padding: '10px 20px',
                    background: '#48bb78',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: uploadingEvidence ? 'not-allowed' : 'pointer',
                    opacity: uploadingEvidence ? 0.6 : 1
                  }}
                >
                  {uploadingEvidence ? '⏳ Uploading...' : '📤 Upload to IPFS'}
                </button>
              )}

              {evidenceHash && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px',
                  background: '#f0fdf4',
                  border: '1px solid #86efac',
                  borderRadius: '6px'
                }}>
                  <strong style={{ color: '#166534' }}>✅ Evidence Uploaded</strong>
                  <p style={{ fontSize: '0.85em', fontFamily: 'monospace', color: '#166534', marginTop: '8px', wordBreak: 'break-all' }}>
                    {evidenceHash}
                  </p>
                </div>
              )}
            </div>

            <div className="alert" style={{
              background: '#eff6ff',
              border: '1px solid #93c5fd',
              color: '#1e40af',
              marginBottom: '20px',
              fontSize: '0.9em'
            }}>
              <strong>📋 What Happens Next:</strong>
              <ol style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
                <li>Issue is logged on-chain with evidence hash</li>
                <li>Both parties are notified of the dispute</li>
                <li>Platform governance reviews the case</li>
                <li>Resolution is decided and recorded</li>
                <li>Reputations may be adjusted based on findings</li>
              </ol>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="button"
                onClick={submitIssue}
                disabled={loading || !issueReason.trim()}
                style={{
                  flex: 1,
                  background: '#f56565',
                  opacity: (loading || !issueReason.trim()) ? 0.6 : 1
                }}
              >
                {loading ? '⏳ Submitting...' : '🚨 Submit Issue'}
              </button>
              <button
                className="button"
                onClick={() => setShowIssueModal(false)}
                disabled={loading}
                style={{
                  flex: 1,
                  background: '#a0aec0'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LenderDashboard;
