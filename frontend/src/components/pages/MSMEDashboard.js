import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getContractInstance, CONTRACT_ADDRESSES, parseTokens, formatTokens, calculateComplexity } from '../../utils/contracts';

function MSMEDashboard({ account, provider, signer }) {
  const [identityAddress, setIdentityAddress] = useState('');
  const [attestations, setAttestations] = useState([]);
  const [loanRequests, setLoanRequests] = useState([]);
  const [revealedBids, setRevealedBids] = useState({}); // { requestId: [bids] }
  const [nonRevealingLenders, setNonRevealingLenders] = useState({}); // { requestId: [lenders] }
  const [slashedLenders, setSlashedLenders] = useState({}); // { requestId: { lenderAddress: true } }
  const [loanAgreements, setLoanAgreements] = useState([]); // Loan agreements
  const [tab, setTab] = useState('identity');
  const [loading, setLoading] = useState(false);

  // Create Identity Form
  const [creatingIdentity, setCreatingIdentity] = useState(false);
  
  // Business Profile Fields
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [registrationYear, setRegistrationYear] = useState('');
  const [annualRevenue, setAnnualRevenue] = useState('');
  const [employeeCount, setEmployeeCount] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');

  // Attestation Request Form
  const [attestationRequests, setAttestationRequests] = useState([]);
  const [showAttestationForm, setShowAttestationForm] = useState(false);
  const [selectedSchema, setSelectedSchema] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [documentHash, setDocumentHash] = useState('');
  const [additionalData, setAdditionalData] = useState('');
  const [submittingAttestation, setSubmittingAttestation] = useState(false);
  
  // V3 Multi-Oracle Features
  const [requestedValidityDays, setRequestedValidityDays] = useState(180); // Default 6 months
  const [forceSingleOracle, setForceSingleOracle] = useState(false); // Default to multi-oracle for V3 testing
  const [feeAmount, setFeeAmount] = useState('100'); // Default for Simple complexity (1 oracle)

  // Consensus Details Modal
  const [showConsensusModal, setShowConsensusModal] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [consensusDetails, setConsensusDetails] = useState(null);
  const [loadingConsensus, setLoadingConsensus] = useState(false);

  // Repayment Recording Modal
  const [showRepaymentModal, setShowRepaymentModal] = useState(false);
  const [selectedAgreementForRepayment, setSelectedAgreementForRepayment] = useState(null);
  const [repaymentProofFile, setRepaymentProofFile] = useState(null);
  const [repaymentProofHash, setRepaymentProofHash] = useState('');
  const [uploadingRepaymentProof, setUploadingRepaymentProof] = useState(false);
  const [recordingRepayment, setRecordingRepayment] = useState(false);

  // Issues Tab
  const [showIssuesTab, setShowIssuesTab] = useState(false);
  const [issues, setIssues] = useState([]);
  const [showRaiseIssueModal, setShowRaiseIssueModal] = useState(false);
  const [issueRecordId, setIssueRecordId] = useState('');
  const [issueReason, setIssueReason] = useState('');
  const [issueEvidenceFile, setIssueEvidenceFile] = useState(null);
  const [issueEvidenceHash, setIssueEvidenceHash] = useState('');
  const [uploadingIssueEvidence, setUploadingIssueEvidence] = useState(false);
  const [raisingIssue, setRaisingIssue] = useState(false);
  const [loadingIssues, setLoadingIssues] = useState(false);

  // Loan Request Form
  const [loanAmount, setLoanAmount] = useState('');
  const [loanTenure, setLoanTenure] = useState('12');
  const [loanPurpose, setLoanPurpose] = useState('');
  const [loanCategory, setLoanCategory] = useState('');
  const [collateralType, setCollateralType] = useState('');
  const [collateralValue, setCollateralValue] = useState('');
  const [expectedRate, setExpectedRate] = useState('');
  const [commitPeriod, setCommitPeriod] = useState('120'); // 2 minutes minimum
  const [revealPeriod, setRevealPeriod] = useState('120'); // 2 minutes minimum
  // eslint-disable-next-line no-unused-vars
  const [submittingLoan, setSubmittingLoan] = useState(false);
  const [creatingLoan, setCreatingLoan] = useState(false);
  const [selectedLoanDetails, setSelectedLoanDetails] = useState(null);

  // Reputation
  const [reputation, setReputation] = useState(null);
  const [loadingReputation, setLoadingReputation] = useState(false);

  // Load MSME identity from localStorage on mount
  useEffect(() => {
    if (account) {
      const storedIdentities = JSON.parse(localStorage.getItem('msmeIdentities') || '{}');
      if (storedIdentities[account]) {
        console.log('✅ MSME Identity loaded from storage for:', account);
        setIdentityAddress(storedIdentities[account].address);
        // Restore profile data
        const profile = storedIdentities[account].profile;
        setBusinessName(profile.businessName || '');
        setIndustry(profile.industry || '');
        setGstNumber(profile.gstNumber || '');
        setPanNumber(profile.panNumber || '');
        setRegistrationYear(profile.registrationYear || '');
        setAnnualRevenue(profile.annualRevenue || '');
        setEmployeeCount(profile.employeeCount || '');
        setBusinessAddress(profile.businessAddress || '');
      } else {
        console.log('ℹ️ No existing MSME Identity found for:', account);
      }
    }
  }, [account]);

  // Load loan requests from blockchain on mount and periodically
  useEffect(() => {
    if (provider && account) {
      loadMyLoanRequests();
      loadMyLoanAgreements();
      // Refresh every 3 MINUTES (reduced from 15s to save RPC calls)
      const interval = setInterval(() => {
        loadMyLoanRequests();
        loadMyLoanAgreements();
      }, 180000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, account]);

  const loadMyLoanAgreements = async () => {
    if (!provider || !account) return;
    
    try {
      const agreementContract = getContractInstance('LoanAgreementRegistry', provider);
      let loanIds = [];
      
      // Try to get loan IDs directly, fallback to events if function doesn't exist
      try {
        loanIds = await agreementContract.getMSMELoans(account);
      } catch (err) {
        console.log('⚠️ getMSMELoans not available, querying events...');
        // Fallback: Query AgreementRegistered events for this MSME
        const filter = agreementContract.filters.AgreementRegistered(null, null, account);
        const events = await agreementContract.queryFilter(filter, 0, 'latest');
        loanIds = events.map(e => e.args.recordId);
      }
      
      const agreements = [];
      for (let i = 0; i < loanIds.length; i++) {
        try {
          const recordId = Number(loanIds[i]);
          const record = await agreementContract.records(recordId);
          
          const statusMap = ['Active', 'Repaid', 'Defaulted', 'Disputed', 'Restructured'];
          
          agreements.push({
            recordId: recordId,
            marketplaceId: Number(record.marketplaceId),
            agreementHash: record.agreementHash,
            msme: record.msme,
            lender: record.lender,
            amount: formatTokens(record.amount),
            amountRaw: record.amount,
            rateBP: Number(record.rateBP),
            ratePercent: (Number(record.rateBP) / 100).toFixed(2),
            tenureMonths: Number(record.tenureMonths),
            status: statusMap[record.status] || 'Unknown',
            statusCode: record.status,
            disbursementDate: Number(record.disbursementDate),
            expectedRepaymentDate: Number(record.expectedRepaymentDate),
            actualRepaymentDate: Number(record.actualRepaymentDate),
            createdAt: Number(record.createdAt)
          });
        } catch (err) {
          console.error(`Error loading agreement ${loanIds[i]}:`, err);
        }
      }
      
      setLoanAgreements(agreements);
    } catch (error) {
      console.error('Error loading loan agreements:', error);
    }
  };

  const loadMyLoanRequests = async () => {
    if (!provider || !account) return;
    
    try {
      const loanContract = getContractInstance('LoanMarketplace', provider);
      
      // Check if contract is accessible
      let counter;
      try {
        counter = await loanContract.requestCounter();
      } catch (err) {
        console.log('Loan marketplace not ready yet, skipping...');
        setLoanRequests([]);
        return;
      }
      
      const totalLoans = Number(counter);
      
      // Load extra fields from localStorage
      const loanExtras = JSON.parse(localStorage.getItem('loanExtras') || '{}');
      
      const myLoans = [];
      for (let i = 1; i <= totalLoans; i++) {
        try {
          const request = await loanContract.requests(i);
          
          // Only show loans created by this MSME
          if (request.msme.toLowerCase() === account.toLowerCase()) {
            const statusMap = ['Open', 'Reveal', 'Matched', 'Expired', 'Cancelled'];
            const status = statusMap[request.status] || 'Unknown';
            
            const now = Math.floor(Date.now() / 1000);
            const commitDeadline = Number(request.commitDeadline);
            const revealDeadline = Number(request.revealDeadline);
            
            // Calculate remaining time
            let remainingTime = 0;
            let timePhase = '';
            if (now < commitDeadline) {
              remainingTime = commitDeadline - now;
              timePhase = 'commit';
            } else if (now < revealDeadline) {
              remainingTime = revealDeadline - now;
              timePhase = 'reveal';
            }
            
            // Get revealed bids count
            let bidsCount = 0;
            try {
              // eslint-disable-next-line no-unused-vars
              const bids = await loanContract.revealedBids(i, 0);
              // Count bids by querying the array
              let idx = 0;
              while (true) {
                try {
                  await loanContract.revealedBids(i, idx);
                  bidsCount++;
                  idx++;
                } catch {
                  break;
                }
              }
            } catch (err) {
              // No bids yet
            }
            
            // Get extra fields from localStorage if available
            const extras = loanExtras[i] || {};
            
            myLoans.push({
              id: i,
              amount: formatTokens(request.amount),
              amountRaw: request.amount,
              tenure: Number(request.tenureMonths),
              purpose: request.purpose,
              commitDeadline: commitDeadline,
              revealDeadline: revealDeadline,
              commitPeriod: commitDeadline - Number(request.createdAt),
              revealPeriod: revealDeadline - commitDeadline,
              status: status,
              createdAt: Number(request.createdAt),
              bids: bidsCount,
              remainingTime: remainingTime,
              timePhase: timePhase,
              // Extra fields from localStorage
              category: extras.category,
              expectedRate: extras.expectedRate,
              collateralType: extras.collateralType,
              collateralValue: extras.collateralValue
            });
          }
        } catch (err) {
          console.error(`Error loading loan ${i}:`, err);
        }
      }
      
      setLoanRequests(myLoans);
    } catch (error) {
      console.error('Error loading loan requests:', error);
    }
  };

  // Load revealed bids for a specific loan request
  const loadRevealedBids = async (requestId) => {
    if (!provider) return;
    
    try {
      const loanContract = getContractInstance('LoanMarketplace', provider);
      const oracleStakingContract = getContractInstance('OracleStaking', provider);
      
      // Use getRevealedBids function instead of iterating
      const revealedBidsArray = await loanContract.getRevealedBids(requestId);
      
      const bids = [];
      for (let i = 0; i < revealedBidsArray.length; i++) {
        const bid = revealedBidsArray[i];
        
        // Try to get lender's staking info (they might be an oracle)
        let lenderInfo = {
          isOracle: false,
          stakedAmount: '0',
          tier: 0,
          reputation: 0
        };
        
        try {
          const oracleData = await oracleStakingContract.getOracleInfo(bid.lender);
          if (oracleData && oracleData[0] && oracleData[0] > 0) {
            lenderInfo = {
              isOracle: true,
              stakedAmount: formatTokens(oracleData[0]),
              tier: calculateTier(oracleData[0]),
              reputation: Number(oracleData[1])
            };
          }
        } catch (err) {
          // Lender is not an oracle, that's okay
        }
        
        // Get lender profile from blockchain
        let lenderProfile = null;
        try {
          const profile = await loanContract.getLenderProfile(bid.lender);
          if (profile.exists) {
            lenderProfile = {
              displayName: profile.displayName,
              businessName: profile.businessName,
              lenderType: profile.lenderType,
              yearsExperience: profile.yearsExperience.toString(),
              fundingCapacity: ethers.formatEther(profile.fundingCapacity),
              preferredIndustries: profile.preferredIndustries,
              bio: profile.bio
            };
          }
        } catch (err) {
          console.log('No profile for lender:', bid.lender);
        }
        
        bids.push({
          lender: bid.lender,
          rateBP: Number(bid.rateBP),
          ratePercent: (Number(bid.rateBP) / 100).toFixed(2),
          timestamp: Number(bid.timestamp),
          withdrawn: bid.withdrawn,
          lenderInfo: lenderInfo,
          profile: lenderProfile // Add profile data from blockchain
        });
      }
      
      setRevealedBids(prev => ({ ...prev, [requestId]: bids }));
      return bids;
    } catch (error) {
      console.error('Error loading revealed bids:', error);
      return [];
    }
  };

  // Load non-revealing lenders (those who committed but didn't reveal)
  const loadNonRevealingLenders = async (requestId) => {
    if (!provider) return [];
    
    try {
      const loanContract = getContractInstance('LoanMarketplace', provider);
      const oracleStakingContract = getContractInstance('OracleStaking', provider);
      
      const nonRevealingAddresses = await loanContract.getNonRevealingLenders(requestId);
      
      const lenders = [];
      for (let i = 0; i < nonRevealingAddresses.length; i++) {
        const lenderAddress = nonRevealingAddresses[i];
        const deposit = await loanContract.bidDeposits(requestId, lenderAddress);
        
        // Get lender info if they're an oracle
        let lenderInfo = {
          isOracle: false,
          stakedAmount: '0',
          reputation: 0
        };
        
        try {
          const oracleData = await oracleStakingContract.getOracleInfo(lenderAddress);
          if (oracleData && oracleData[0] && oracleData[0] > 0) {
            lenderInfo = {
              isOracle: true,
              stakedAmount: formatTokens(oracleData[0]),
              reputation: Number(oracleData[1])
            };
          }
        } catch (err) {
          // Not an oracle
        }
        
        // Get lender profile from blockchain
        let lenderProfile = null;
        try {
          const profile = await loanContract.getLenderProfile(lenderAddress);
          if (profile.exists) {
            lenderProfile = {
              displayName: profile.displayName,
              businessName: profile.businessName,
              lenderType: profile.lenderType,
              yearsExperience: profile.yearsExperience.toString(),
              fundingCapacity: ethers.formatEther(profile.fundingCapacity),
              preferredIndustries: profile.preferredIndustries,
              bio: profile.bio
            };
          }
        } catch (err) {
          console.log('No profile for lender:', lenderAddress);
        }
        
        lenders.push({
          address: lenderAddress,
          deposit: ethers.formatEther(deposit),
          depositWei: deposit,
          lenderInfo: lenderInfo,
          profile: lenderProfile
        });
      }
      
      return lenders;
    } catch (error) {
      console.error('Error loading non-revealing lenders:', error);
      return [];
    }
  };

  // Slash a non-revealing lender
  const slashNonRevealingLender = async (requestId, lenderAddress, depositAmount) => {
    if (!signer) {
      alert('Please connect your wallet');
      return;
    }

    const confirmation = window.confirm(
      `⚠️ Slash Non-Revealing Lender\n\n` +
      `Lender: ${lenderAddress.slice(0, 6)}...${lenderAddress.slice(-4)}\n` +
      `Deposit to slash: ${depositAmount} ETH\n\n` +
      `This lender committed a bid but failed to reveal it during the reveal period.\n` +
      `Their deposit will be transferred to you as compensation for wasting your time.\n\n` +
      `Are you sure you want to slash this lender?`
    );

    if (!confirmation) return;

    try {
      setLoading(true);
      const loanContract = getContractInstance('LoanMarketplace', signer);
      
      console.log('Slashing non-revealing lender:', lenderAddress);
      
      const tx = await loanContract.slashUnrevealedDeposit(requestId, lenderAddress);
      console.log('Transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);
      
      alert(
        `✅ Lender Slashed Successfully!\n\n` +
        `Lender: ${lenderAddress.slice(0, 10)}...${lenderAddress.slice(-8)}\n` +
        `Deposit transferred: ${depositAmount} ETH\n\n` +
        `The deposit has been transferred to your wallet as compensation.`
      );
      
      // Mark lender as slashed
      setSlashedLenders(prev => ({
        ...prev,
        [requestId]: {
          ...(prev[requestId] || {}),
          [lenderAddress.toLowerCase()]: true
        }
      }));
      
      // Reload loan details
      await loadMyLoanRequests();
      
    } catch (error) {
      console.error('Error slashing lender:', error);
      
      let errorMsg = '';
      if (error.code === 'ACTION_REJECTED') {
        errorMsg = 'Transaction rejected by user';
      } else if (error.reason) {
        errorMsg = error.reason;
      } else {
        errorMsg = error.message || 'Unknown error';
      }
      
      alert(
        '❌ Error Slashing Lender\n\n' + 
        errorMsg + '\n\n' +
        'Possible causes:\n' +
        '• Lender has already been slashed\n' +
        '• Lender did reveal their bid\n' +
        '• Reveal period has not ended yet\n\n' +
        'Check the browser console (F12) for details.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Helper function to calculate tier (same as in OracleDashboard)
  const calculateTier = (stakedAmount) => {
    const amount = Number(ethers.formatUnits(stakedAmount, 18));
    if (amount >= 1000000) return 4;
    if (amount >= 500000) return 3;
    if (amount >= 200000) return 2;
    if (amount >= 50000) return 1;
    return 0;
  };

  // Load loan requests on mount and periodically
  useEffect(() => {
    loadMyLoanRequests();
    const interval = setInterval(loadMyLoanRequests, 15000);
    return () => clearInterval(interval);
  }, [provider, account]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load attestations from attestation requests with consensus data
  useEffect(() => {
    const loadAttestations = async () => {
      if (!account || !provider) return;

      try {
        const attestationContract = getContractInstance('AttestationRegistry', provider);
        
        // Get all request IDs for this MSME
        let requestIds = [];
        try {
          requestIds = await attestationContract.getMSMERequests(account);
        } catch (err) {
          console.log('⚠️ getMSMERequests not available, querying events...');
          const filter = attestationContract.filters.AttestationRequested(null, account);
          const events = await attestationContract.queryFilter(filter, 0, 'latest');
          requestIds = events.map(e => e.args.requestId);
        }

        console.log('📋 Loading attestations for', requestIds.length, 'requests');

        // Load details for each completed request
        const attestationsData = await Promise.all(
          requestIds.map(async (id) => {
            try {
              const details = await attestationContract.getRequestDetails(id);
              const status = Number(details.status);
              
              // Only include completed requests (status 4=ConsensusReached or 6=Completed)
              if (status !== 4 && status !== 6) {
                return null;
              }

              // Get schema name
              let schemaName = 'Unknown Schema';
              try {
                const schema = await attestationContract.getSchema(details.schemaId);
                schemaName = schema.name;
              } catch (e) {
                console.log('Could not get schema name');
              }

              // Get consensus result
              let consensus = null;
              try {
                consensus = await attestationContract.getConsensusResult(id);
              } catch (e) {
                console.log('Could not get consensus for request', id);
              }

              if (!consensus) return null;

              // Consensus is returned as array: [majorityOracles[], minorityOracles[], majorityCount, totalOracles, majorityHash, consensusReached]
              const majorityOracles = consensus[0] || [];
              const minorityOracles = consensus[1] || [];
              const majorityCount = Number(consensus[2] || 0);
              const totalOracles = Number(consensus[3] || 0);
              const consensusReached = consensus[5] || false;

              return {
                id: Number(id),
                schema: schemaName,
                documentHash: details.documentHash,
                verifiedCount: majorityCount, // Oracles in majority (approved)
                rejectedCount: minorityOracles.length, // Oracles in minority
                totalCount: totalOracles, // Total oracles who participated
                majorityOracles: majorityOracles,
                minorityOracles: minorityOracles,
                timestamp: new Date(Number(details.timestamp) * 1000).toLocaleString(),
                status: consensusReached ? 'Verified' : 'No Consensus',
                consensusReached: consensusReached,
                requestId: Number(id)
              };
            } catch (error) {
              console.error('Error loading attestation for request', id, ':', error);
              return null;
            }
          })
        );

        // Filter out null entries
        const validAttestations = attestationsData.filter(a => a !== null);
        
        console.log('✅ Loaded', validAttestations.length, 'completed attestations');
        setAttestations(validAttestations);
      } catch (error) {
        console.error('Error loading attestations:', error);
        setAttestations([]);
      }
    };

    loadAttestations();
    const interval = setInterval(loadAttestations, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [account, provider]);

  // Load attestation requests from blockchain
  useEffect(() => {
    const loadRequests = async () => {
      if (!account || !provider) return;

      try {
        const attestationContract = getContractInstance('AttestationRegistry', provider);
        let requestIds = [];
        
        // Try to get request IDs directly, fallback to events if function doesn't exist
        try {
          requestIds = await attestationContract.getMSMERequests(account);
        } catch (err) {
          console.log('⚠️ getMSMERequests not available, querying events...');
          // Fallback: Query AttestationRequested events for this MSME
          const filter = attestationContract.filters.AttestationRequested(null, account);
          const events = await attestationContract.queryFilter(filter, 0, 'latest');
          requestIds = events.map(e => e.args.requestId);
        }
        
        console.log(`📋 Loading ${requestIds.length} attestation requests for MSME...`);
        
        // Get details for each request
        const requests = await Promise.all(
          requestIds.map(async (id) => {
            try {
              const details = await attestationContract.getRequestDetails(id);
              
              // Status enum: 0=Pending, 1=OraclesAssigned, 2=Committing, 3=Revealing, 4=ConsensusReached, 5=NoConsensus, 6=Completed, 7=Rejected, 8=Cancelled, 9=Disputed
              const statusLabels = [
                'Pending', 'Oracles Assigned', 'Committing', 'Revealing', 
                'Consensus Reached', 'No Consensus', 'Completed', 'Rejected', 'Cancelled', 'Disputed'
              ];
              
              const blockchainStatus = Number(details.status);
              const assignedOracles = details.assignedOracles || [];
              const requiredOracles = Number(details.requiredOracles);
              
              // Get schema name from schemaId (same as Oracle Dashboard)
              let schemaName = 'Unknown Schema';
              try {
                const schema = await attestationContract.getSchema(details.schemaId);
                schemaName = schema.name;
              } catch (e) {
                console.log('Could not get schema name for', details.schemaId);
                // Keep as Unknown Schema
              }
              
              // Safely decode additionalData
              let additionalDataStr = '';
              try {
                if (details.additionalData && details.additionalData !== '0x' && details.additionalData !== '0x00') {
                  additionalDataStr = ethers.toUtf8String(details.additionalData);
                }
              } catch (e) {
                // If UTF-8 decoding fails, keep as hex
                console.log('Could not decode additionalData as UTF-8, keeping as hex');
                additionalDataStr = details.additionalData || '';
              }
              
              // Convert blockchain data to frontend format
              return {
                id: Number(details.id),
                schema: schemaName, // Human-readable schema name from blockchain
                schemaId: details.schemaId, // Keep hash for reference
                documentHash: details.documentHash,
                documentUrl: details.documentUrl,
                additionalData: additionalDataStr,
                msmeAddress: details.msme,
                status: statusLabels[blockchainStatus] || 'Unknown',
                requestedAt: Number(details.timestamp) * 1000,
                verifiedAt: details.completedAt > 0 ? Number(details.completedAt) * 1000 : null,
                oracle: details.assignedOracle !== ethers.ZeroAddress ? details.assignedOracle : null,
                fee: Number(ethers.formatUnits(details.feePaid, 18)),
                feePaid: true,
                // Additional info
                assignedOracles: assignedOracles,
                requiredOracles: requiredOracles,
                assignmentProgress: `${assignedOracles.length}/${requiredOracles}`,
                blockchainStatus: blockchainStatus
              };
            } catch (error) {
              console.error('Error loading request details for ID', id, ':', error);
              return null;
            }
          })
        );
        
        // Filter out null entries from errors
        const validRequests = requests.filter(r => r !== null);
        
        console.log('✅ Loaded requests from blockchain:', validRequests);
        setAttestationRequests(validRequests);
      } catch (error) {
        console.error('❌ Error loading attestation requests:', error);
      }
    };
    
    if (account && provider) {
      loadRequests();
      // Check for updates every 5 seconds for real-time updates
      const interval = setInterval(loadRequests, 5000);
      return () => clearInterval(interval);
    }
  }, [account, provider]);

  // Load issues when tab changes to issues
  useEffect(() => {
    if (showIssuesTab && provider && account) {
      loadIssues();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showIssuesTab, provider, account]);

  // Load reputation when identity tab is active
  useEffect(() => {
    if (tab === 'identity' && provider && account) {
      loadReputation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, provider, account]);

  // Load reputation from contract
  const loadReputation = async () => {
    if (!provider || !account) return;
    
    try {
      setLoadingReputation(true);
      const agreementContract = getContractInstance('LoanAgreementRegistry', provider);
      
      const rep = await agreementContract.getReputation(account);
      
      setReputation({
        totalLoans: Number(rep.totalLoans),
        repaidLoans: Number(rep.repaidLoans),
        defaultedLoans: Number(rep.defaultedLoans),
        activeLoans: Number(rep.activeLoans),
        totalAmountBorrowed: ethers.formatEther(rep.totalAmountBorrowed),
        totalAmountRepaid: ethers.formatEther(rep.totalAmountRepaid),
        averageRepaymentTime: Number(rep.averageRepaymentTime),
        reputationScore: Number(rep.reputationScore)
      });
    } catch (error) {
      console.error('Error loading reputation:', error);
    } finally {
      setLoadingReputation(false);
    }
  };

  if (!account) {
    return (
      <div className="card">
        <h2>MSME Dashboard</h2>
        <div className="alert alert-info">
          Please connect your wallet to access the MSME dashboard
        </div>
      </div>
    );
  }

  const createIdentity = async (e) => {
    e.preventDefault();
    
    if (!businessName || !industry || !gstNumber) {
      alert('Please fill in all required fields');
      return;
    }
    
    try {
      setCreatingIdentity(true);
      
      if (!account || !provider) {
        alert('Please connect your wallet first');
        return;
      }
      
      // Deploy a real MSMEIdentity contract on-chain
      alert('🔄 Deploying MSMEIdentity Contract...\n\nPlease confirm the transaction in MetaMask.\n\nThis will create your unique identity contract on the blockchain.');
      
      const signer = await provider.getSigner();
      
      // MSMEIdentity contract bytecode and ABI
      const MSMEIdentity_ABI = [
        "constructor(address initialOwner)",
        "function owner() view returns (address)",
        "function approveOperator(address operator) external",
        "function setData(bytes32 key, bytes calldata value) external",
        "function getData(bytes32 key) view returns (bytes memory)"
      ];
      
      const MSMEIdentity_BYTECODE = "0x608060405234801561001057600080fd5b50604051610bb2380380610bb283398101604081905261002f91610115565b806001600160a01b03811661005f57604051631e4fbdf760e01b8152600060048201526024015b60405180910390fd5b610068816100c5565b506001600160a01b0381166100bf5760405162461bcd60e51b815260206004820152601560248201527f496e76616c6964206f776e6572206164647265737300000000000000000000006044820152606401610056565b50610145565b600080546001600160a01b038381166001600160a01b0319831681178455604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b60006020828403121561012757600080fd5b81516001600160a01b038116811461013e57600080fd5b9392505050565b610a5e806101546000396000f3fe608060405234801561001057600080fd5b50600436106100935760003560e01c80637f23690c116100665780637f23690c1461011a5780638da5cb5b1461012d5780639790242114610148578063f2fde38b1461015b578063fad8b32a1461016e57600080fd5b8063242cae9f1461009857806354f6127f146100ad5780635a7d11d3146100d6578063715018a614610112575b600080fd5b6100ab6100a636600461064b565b610181565b005b6100c06100bb36600461067b565b610230565b6040516100cd9190610694565b60405180910390f35b6101026100e436600461064b565b6001600160a01b031660009081526002602052604090205460ff1690565b60405190151581526020016100cd565b6100ab6102d2565b6100ab6101283660046106e2565b6102e6565b6000546040516001600160a01b0390911681526020016100cd565b6100ab6101563660046107aa565b6103a4565b6100ab61016936600461064b565b61053f565b6100ab61017c36600461064b565b61057d565b6101896105ce565b6001600160a01b0381166101e45760405162461bcd60e51b815260206004820152601860248201527f496e76616c6964206f70657261746f722061646472657373000000000000000060448201526064015b60405180910390fd5b6001600160a01b038116600081815260026020526040808220805460ff19166001179055517ff338da91446072bf7ec4ea65ab28ef537a3bc388f29aa5fa6e92ded4ff67e49b9190a250565b600081815260016020526040902080546060919061024d90610816565b80601f016020809104026020016040519081016040528092919081815260200182805461027990610816565b80156102c65780601f1061029b576101008083540402835291602001916102c6565b820191906000526020600020905b8154815290600101906020018083116102a957829003601f168201915b50505050509050919050565b6102da6105ce565b6102e460006105fb565b565b6000546001600160a01b031633148061030e57503360009081526002602052604090205460ff165b61034b5760405162461bcd60e51b815260206004820152600e60248201526d139bdd08185d5d1a1bdc9a5e995960921b60448201526064016101db565b60008381526001602052604090206103648284836108b5565b50827fece574603820d07bc9b91f2a932baadf4628aabcb8afba49776529c14a6104b28383604051610397929190610975565b60405180910390a2505050565b6000546001600160a01b03163314806103cc57503360009081526002602052604090205460ff165b6104095760405162461bcd60e51b815260206004820152600e60248201526d139bdd08185d5d1a1bdc9a5e995960921b60448201526064016101db565b82811461044a5760405162461bcd60e51b815260206004820152600f60248201526e098cadccee8d040dad2e6dac2e8c6d608b1b60448201526064016101db565b60005b8381101561053857828282818110610467576104676109a4565b905060200281019061047991906109ba565b6001600088888681811061048f5761048f6109a4565b90506020020135815260200190815260200160002091826104b19291906108b5565b508484828181106104c4576104c46109a4565b905060200201357fece574603820d07bc9b91f2a932baadf4628aabcb8afba49776529c14a6104b28484848181106104fe576104fe6109a4565b905060200281019061051091906109ba565b60405161051e929190610975565b60405180910390a28061053081610a01565b91505061044d565b5050505050565b6105476105ce565b6001600160a01b03811661057157604051631e4fbdf760e01b8152600060048201526024016101db565b61057a816105fb565b50565b6105856105ce565b6001600160a01b038116600081815260026020526040808220805460ff19169055517fa5f3b7626fd86ff989f1d22cf3d41d74591ea6eb99241079400b0c332a9a8f119190a250565b6000546001600160a01b031633146102e45760405163118cdaa760e01b81523360048201526024016101db565b600080546001600160a01b038381166001600160a01b0319831681178455604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b60006020828403121561065d57600080fd5b81356001600160a01b038116811461067457600080fd5b9392505050565b60006020828403121561068d57600080fd5b5035919050565b600060208083528351808285015260005b818110156106c1578581018301518582016040015282016106a5565b506000604082860101526040601f19601f8301168501019250505092915050565b6000806000604084860312156106f757600080fd5b83359250602084013567ffffffffffffffff8082111561071657600080fd5b818601915086601f83011261072a57600080fd5b81358181111561073957600080fd5b87602082850101111561074b57600080fd5b6020830194508093505050509250925092565b60008083601f84011261077057600080fd5b50813567ffffffffffffffff81111561078857600080fd5b6020830191508360208260051b85010111156107a357600080fd5b9250929050565b600080600080604085870312156107c057600080fd5b843567ffffffffffffffff808211156107d857600080fd5b6107e48883890161075e565b909650945060208701359150808211156107fd57600080fd5b5061080a8782880161075e565b95989497509550505050565b600181811c9082168061082a57607f821691505b60208210810361084a57634e487b7160e01b600052602260045260246000fd5b50919050565b634e487b7160e01b600052604160045260246000fd5b601f8211156108b057600081815260208120601f850160051c8101602086101561088d5750805b601f850160051c820191505b818110156108ac57828155600101610899565b5050505b505050565b67ffffffffffffffff8311156108cd576108cd610850565b6108e1836108db8354610816565b83610866565b6000601f84116001811461091557600085156108fd5750838201355b600019600387901b1c1916600186901b178355610538565b600083815260209020601f19861690835b828110156109465786850135825560209485019460019092019101610926565b50868210156109635760001960f88860031b161c19848701351681555b505060018560011b0183555050505050565b60208152816020820152818360408301376000818301604090810191909152601f909201601f19160101919050565b634e487b7160e01b600052603260045260246000fd5b6000808335601e198436030181126109d157600080fd5b83018035915067ffffffffffffffff8211156109ec57600080fd5b6020019150368190038213156107a357600080fd5b600060018201610a2157634e487b7160e01b600052601160045260246000fd5b506001019056fea2646970667358221220fc4888928046f3039bcee3fbd545c8560e25a01abcb85c56c072c82f417e262a64736f6c63430008140033";
      
      // Deploy the contract
      const MSMEIdentityFactory = new ethers.ContractFactory(
        MSMEIdentity_ABI,
        MSMEIdentity_BYTECODE,
        signer
      );
      
      const identityContract = await MSMEIdentityFactory.deploy(account);
      
      console.log('⏳ Waiting for deployment confirmation...');
      await identityContract.waitForDeployment();
      
      const identityAddr = await identityContract.getAddress();
      console.log('✅ MSMEIdentity deployed at:', identityAddr);
      
      // Store profile data
      const profile = {
        businessName,
        industry,
        gstNumber,
        panNumber,
        registrationYear,
        annualRevenue,
        employeeCount,
        businessAddress,
        createdAt: Date.now(),
        owner: account
      };
      
      // Store profile data on-chain
      const profileKey = ethers.id("profile"); // keccak256("profile")
      const profileData = ethers.toUtf8Bytes(JSON.stringify(profile));
      
      console.log('📝 Storing profile data on-chain...');
      const setDataTx = await identityContract.setData(profileKey, profileData);
      await setDataTx.wait();
      console.log('✅ Profile data stored on-chain');
      
      // Persist to localStorage for quick access
      const storedIdentities = JSON.parse(localStorage.getItem('msmeIdentities') || '{}');
      storedIdentities[account] = {
        address: identityAddr,
        profile: profile,
        createdAt: Date.now(),
        deploymentTx: identityContract.deploymentTransaction()?.hash
      };
      localStorage.setItem('msmeIdentities', JSON.stringify(storedIdentities));
      
      setIdentityAddress(identityAddr);
      
      alert(
        `✅ MSMEIdentity Contract Deployed!\n\n` +
        `Business: ${businessName}\n` +
        `Industry: ${industry}\n` +
        `Contract Address: ${identityAddr}\n\n` +
        `🔗 Your identity is now on-chain!\n\n` +
        `View on Sepolia Etherscan:\nhttps://sepolia.etherscan.io/address/${identityAddr}`
      );
      
    } catch (error) {
      console.error('Error creating identity:', error);
      alert('❌ Failed to deploy identity contract:\n\n' + (error.message || 'Unknown error'));
    } finally {
      setCreatingIdentity(false);
    }
  };

  // Helper function to get schema name from hash
  const getSchemaName = (schemaHash) => {
    const schemaMap = {
      '0x1d9a9685070f56edbe34f600e59b60534ac750927dc7df290cfe3664dbe37621': 'GST Revenue',
      '0x9d240a2f096fbae8c0c23724a26cabf63dbc0728cfcd8ecd92be758149342428': 'Bank Statement',
      '0xa29cad97d4110e8822dedef32879f84a8e8889bf965ff9c57998689e2fdafbc4': 'KYC',
      '0xb7d4f589d55b902a131d35bb1b29c63b38a7c472e84b09c1ac87fd40b785554c': 'Credit Score'
    };
    return schemaMap[schemaHash] || schemaHash.substring(0, 10) + '...';
  };

  // Fetch consensus details for a request
  const fetchConsensusDetails = async (requestId) => {
    setLoadingConsensus(true);
    setSelectedRequestId(requestId);
    setShowConsensusModal(true);
    
    try {
      const attestationRegistryContract = getContractInstance('AttestationRegistry', provider);

      // Fetch request details for oracle addresses (use getRequestDetails, not requests)
      const details = await attestationRegistryContract.getRequestDetails(requestId);
      
      console.log('Request details:', details);
      
      // Fetch consensus result using getConsensusResult function (not direct mapping access)
      const consensus = await attestationRegistryContract.getConsensusResult(requestId);
      
      console.log('Consensus result:', consensus);
      
      // Consensus struct: [majorityOracles[], minorityOracles[], majorityCount, totalOracles, majorityHash, consensusReached]
      setConsensusDetails({
        consensusReached: consensus.consensusReached || consensus[5],
        approved: consensus.consensusReached || consensus[5], // If consensus reached, majority approved
        approvalCount: consensus.majorityCount?.toString() || consensus[2]?.toString() || '0',
        rejectionCount: (consensus.totalOracles - consensus.majorityCount)?.toString() || 
                        ((consensus[3] || 0) - (consensus[2] || 0))?.toString() || '0',
        majorityOracles: consensus.majorityOracles || consensus[0] || [],
        minorityOracles: consensus.minorityOracles || consensus[1] || [],
        totalOracles: consensus.totalOracles?.toString() || consensus[3]?.toString() || details.assignedOracles?.length.toString() || '0',
        assignedOracles: details.assignedOracles || []
      });
    } catch (error) {
      console.error('Error fetching consensus:', error);
      alert('Failed to fetch consensus details.\n\nError: ' + (error.message || 'Unknown error'));
      setShowConsensusModal(false);
    } finally {
      setLoadingConsensus(false);
    }
  };

  const openAttestationForm = (schemaType) => {
    // Convert display name to schema ID (must match registered schemas)
    let schemaId;
    switch(schemaType) {
      case 'GST Revenue':
        schemaId = 'gst-revenue';
        setDocumentType('GST Return Filing');
        break;
      case 'Bank Statements':
        schemaId = 'bank-statements'; // FIXED: Must match deployment (plural)
        setDocumentType('Bank Statement PDF');
        break;
      case 'KYC Verification':
        schemaId = 'kyc-basic'; // FIXED: Must match deployment (kyc-basic not kyc)
        setDocumentType('Aadhaar + PAN + Business Registration');
        break;
      case 'Credit Score':
        schemaId = 'credit-score';
        setDocumentType('Credit Bureau Report');
        break;
      default:
        schemaId = schemaType;
        setDocumentType('');
    }
    setSelectedSchema(schemaId); // Use the schema ID, not display name
    setShowAttestationForm(true);
  };

  const submitAttestationRequest = async (e) => {
    e.preventDefault();
    
    // Check if MSME identity exists
    if (!identityAddress) {
      alert('❌ MSME Identity Required\n\nYou must create an MSME identity before requesting attestations.\n\nPlease go to the "Identity" tab and create your business profile first.');
      return;
    }
    
    if (!documentUrl || !documentHash) {
      alert('Please provide document URL and hash');
      return;
    }

    // Validate document hash format (must be 32 bytes = 64 hex characters + 0x prefix)
    const hashRegex = /^0x[a-fA-F0-9]{64}$/;
    if (!hashRegex.test(documentHash)) {
      alert(
        '❌ Invalid Document Hash Format\n\n' +
        'The document hash must be:\n' +
        '• Start with "0x"\n' +
        '• Be exactly 66 characters long (0x + 64 hex digits)\n' +
        '• Use only hex characters (0-9, a-f)\n\n' +
        'Example: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef\n\n' +
        'You can use an online SHA256 tool to hash your document.'
      );
      return;
    }

    if (!signer) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      setSubmittingAttestation(true);
      
      // Fee amount is now user-selected from the form
      const fee = parseFloat(feeAmount) || 100;
      
      // Calculate complexity info for display
      const complexity = calculateComplexity(fee.toString());
      
      // Ask for confirmation
      const confirmPayment = window.confirm(
        `💰 V3 Multi-Oracle Attestation Request\n\n` +
        `Schema: ${selectedSchema}\n` +
        `Fee: ${fee} CIT tokens\n` +
        `Security Level: ${complexity.tier} (${complexity.oracles} oracle${complexity.oracles > 1 ? 's' : ''})\n` +
        `Validity: ${requestedValidityDays} days\n\n` +
        `${complexity.oracles > 1 ? 
          `🔒 Multi-oracle consensus verification:\n` +
          `• ${complexity.oracles} independent oracles will verify\n` +
          `• Majority (66%+) must agree\n` +
          `• Byzantine fault tolerant\n\n` : 
          `⚡ Single oracle verification (faster, economical)\n\n`}` +
        `The fee will be distributed among verifying oracles.\n\n` +
        `Continue?`
      );
      
      if (!confirmPayment) {
        setSubmittingAttestation(false);
        return;
      }

      // Get contract instances
      const tokenContract = getContractInstance('CIToken', signer);
      const attestationContract = getContractInstance('AttestationRegistry', signer);
      
      const feeInWei = parseTokens(feeAmount.toString());
      
      // Check MSME has enough CIT tokens
      console.log('🔍 Checking CIT balance for:', account);
      const balance = await tokenContract.balanceOf(account);
      const balanceInCIT = formatTokens(balance);
      
      console.log(`💰 CIT Balance: ${balanceInCIT} CIT`);
      console.log(`💸 Fee Required: ${feeAmount} CIT`);
      
      if (balance < feeInWei) {
        alert(
          `❌ Insufficient CIT Balance\n\n` +
          `Your balance: ${balanceInCIT} CIT\n` +
          `Required: ${feeAmount} CIT\n\n` +
          `Please get CIT tokens first or reduce the fee amount.`
        );
        setSubmittingAttestation(false);
        return;
      }
      
      // Step 1: Approve AttestationRegistry to spend CIT tokens
      alert('Step 1/3: Approving fee payment...\n\nPlease confirm the transaction in your wallet.');
      
      console.log('📝 Approving', CONTRACT_ADDRESSES.AttestationRegistry, 'to spend', feeInWei.toString(), 'wei');
      const approveTx = await tokenContract.approve(CONTRACT_ADDRESSES.AttestationRegistry, feeInWei);
      console.log('⏳ Waiting for approval transaction...', approveTx.hash);
      await approveTx.wait();
      
      console.log('✅ Approved AttestationRegistry to spend', feeAmount, 'CIT');
      
      // Step 2: Create attestation request on blockchain
      alert(`✅ Approval confirmed!\n\nStep 2/3: Creating attestation request on blockchain...\n\nPlease confirm the transaction.`);
      
      // Encode schema as bytes32 - MUST match deployment script (keccak256 of UTF-8 bytes)
      const schemaId = ethers.keccak256(ethers.toUtf8Bytes(selectedSchema));
      
      // additionalData should be bytes
      // If it's a string, convert to bytes; if empty, use empty bytes
      let additionalDataBytes;
      if (!additionalData || additionalData.trim() === '') {
        additionalDataBytes = '0x';
      } else if (typeof additionalData === 'string' && !additionalData.startsWith('0x')) {
        // It's a regular string, convert to UTF-8 bytes
        additionalDataBytes = ethers.toUtf8Bytes(additionalData);
      } else {
        // It's already hex bytes
        additionalDataBytes = additionalData;
      }
      
      // Using AttestationRegistryV3 with multi-oracle consensus
      const requestTx = await attestationContract.requestAttestation(
        schemaId,
        documentHash,
        documentUrl,
        additionalDataBytes,
        feeInWei,
        requestedValidityDays * 86400, // Convert days to seconds
        forceSingleOracle
      );
      
      console.log('⏳ Waiting for attestation request transaction...', requestTx.hash);
      const receipt = await requestTx.wait();
      
      // Find the AttestationRequested event to get the request ID
      const event = receipt.logs.find(log => {
        try {
          const parsed = attestationContract.interface.parseLog(log);
          return parsed && parsed.name === 'AttestationRequested';
        } catch {
          return false;
        }
      });
      
      let requestId = 'unknown';
      if (event) {
        const parsed = attestationContract.interface.parseLog(event);
        requestId = parsed.args.requestId.toString();
      }
      
      console.log('✅ Attestation request created on blockchain! Request ID:', requestId);
      
      const complexityInfo = calculateComplexity(fee.toString());
      
      alert(
        `✅ V3 Multi-Oracle Attestation Request Submitted!\n\n` +
        `Request ID: ${requestId}\n` +
        `Schema: ${selectedSchema}\n` +
        `Fee Paid: ${fee} CIT\n` +
        `Security Level: ${complexityInfo.tier} (${complexityInfo.oracles} oracle${complexityInfo.oracles > 1 ? 's' : ''})\n` +
        `Validity Period: ${requestedValidityDays} days\n` +
        `Document Hash: ${documentHash.substring(0, 20)}...\n\n` +
        `${complexityInfo.oracles > 1 ? 
          `🔒 ${complexityInfo.oracles} oracles will independently verify your documents.\n` +
          `Majority (66%+) consensus required for approval.\n` : 
          `⚡ 1 oracle will verify your documents.\n`}\n\n` +
        `Transaction: https://sepolia.etherscan.io/tx/${requestTx.hash}`
      );
      
      // Reload requests from blockchain
      const requestIds = await attestationContract.getMSMERequests(account);
      const requests = await Promise.all(
        requestIds.map(async (id) => {
          try {
            const details = await attestationContract.getRequestDetails(id);
            
            // Get schema name from schemaId
            let schemaName = 'Unknown Schema';
            try {
              const schema = await attestationContract.getSchema(details.schemaId);
              schemaName = schema.name;
            } catch (e) {
              console.log('Could not get schema name for', details.schemaId);
            }
            
            // Status enum: 0=Pending, 1=OraclesAssigned, 2=Committing, 3=Revealing, 4=ConsensusReached, 5=NoConsensus, 6=Completed, 7=Rejected, 8=Cancelled, 9=Disputed
            const statusLabels = [
              'Pending', 'Oracles Assigned', 'Committing', 'Revealing', 
              'Consensus Reached', 'No Consensus', 'Completed', 'Rejected', 'Cancelled', 'Disputed'
            ];
            
            // Safely decode additionalData
            let additionalDataStr = '';
            try {
              if (details.additionalData && details.additionalData !== '0x' && details.additionalData !== '0x00') {
                additionalDataStr = ethers.toUtf8String(details.additionalData);
              }
            } catch (e) {
              // If UTF-8 decoding fails, keep as hex
              console.log('Could not decode additionalData as UTF-8, keeping as hex');
              additionalDataStr = details.additionalData || '';
            }
            
            return {
              id: Number(details.id),
              schema: schemaName,
              schemaId: details.schemaId,
              documentHash: details.documentHash,
              documentUrl: details.documentUrl,
              additionalData: additionalDataStr,
              msmeAddress: details.msme,
              status: statusLabels[Number(details.status)] || 'Unknown',
              requestedAt: Number(details.timestamp) * 1000,
              verifiedAt: details.completedAt > 0 ? Number(details.completedAt) * 1000 : null,
              oracle: details.assignedOracle !== ethers.ZeroAddress ? details.assignedOracle : null,
              fee: Number(ethers.formatUnits(details.feePaid, 18)),
              feePaid: true,
              assignedOracles: details.assignedOracles || [],
              requiredOracles: Number(details.requiredOracles),
              blockchainStatus: Number(details.status)
            };
          } catch (error) {
            console.error('Error loading request details:', error);
            return null;
          }
        })
      );
      setAttestationRequests(requests.filter(r => r !== null));

      
      // Reset form
      setShowAttestationForm(false);
      setSelectedSchema('');
      setDocumentType('');
      setDocumentUrl('');
      setDocumentHash('');
      setAdditionalData('');
      
    } catch (error) {
      console.error('❌ Error submitting attestation request:', error);
      
      let errorMsg = '';
      
      // Handle different error types
      if (error.code === 'ACTION_REJECTED') {
        errorMsg = 'Transaction rejected by user';
      } else if (error.code === 'CALL_EXCEPTION') {
        // Contract revert - try to get the reason
        errorMsg = 'Transaction failed:\n\n';
        
        if (error.message.includes('Schema not active')) {
          errorMsg += 'The selected schema is not active. Please select a different schema.';
        } else if (error.message.includes('Fee must be')) {
          errorMsg += 'Fee amount is invalid. Must be greater than 0.';
        } else if (error.message.includes('Invalid validity')) {
          errorMsg += 'Validity period is invalid. Must be between 1 and 365 days.';
        } else if (error.message.includes('ERC20: transfer amount exceeds balance')) {
          errorMsg += 'Insufficient CIT token balance.';
        } else if (error.message.includes('ERC20: insufficient allowance')) {
          errorMsg += 'Token approval failed. Please try again.';
        } else {
          errorMsg += 'Contract execution failed. This could be due to:\n\n';
          errorMsg += '• Insufficient CIT token balance\n';
          errorMsg += '• Invalid parameters\n';
          errorMsg += '• Schema not registered\n\n';
          errorMsg += 'Please check your balance and try again.';
        }
      } else if (error.message) {
        errorMsg = error.message;
      } else {
        errorMsg = 'Unknown error occurred';
      }
      
      alert('❌ Error submitting attestation request:\n\n' + errorMsg);
    } finally {
      setSubmittingAttestation(false);
    }
  };

  // mockOracleApproval function removed - attestations now come from blockchain only

  const createLoanRequest = async (e) => {
    e.preventDefault();
    
    // Check if MSME identity exists
    if (!identityAddress) {
      alert('❌ MSME Identity Required\n\nYou must create an MSME identity before creating loan requests.\n\nPlease go to the "Identity" tab and create your business profile first.');
      return;
    }
    
    if (!loanAmount || !loanPurpose || !loanCategory) {
      alert('Please fill in all required fields');
      return;
    }

    if (!signer) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      setCreatingLoan(true);
      
      // Convert values to proper formats
      const amountInWei = parseTokens(loanAmount); // Convert to Wei (assuming loan amount in ETH/tokens)
      const tenureInMonths = parseInt(loanTenure);
      const commitPeriodSeconds = parseInt(commitPeriod); // Already in seconds
      const revealPeriodSeconds = parseInt(revealPeriod); // Already in seconds
      
      // Validate periods - CONTRACT ENFORCED MINIMUMS
      const MIN_COMMIT_PERIOD = 120; // 2 minutes (contract requirement - reduced for testing)
      const MIN_REVEAL_PERIOD = 120; // 2 minutes (contract requirement - reduced for testing)
      const MAX_COMMIT_PERIOD = 7 * 24 * 3600; // 7 days
      
      if (commitPeriodSeconds < MIN_COMMIT_PERIOD || commitPeriodSeconds > MAX_COMMIT_PERIOD) {
        alert(`❌ Invalid Commit Period\n\nCommit period must be between 2 minutes (120s) and 7 days.\nCurrent: ${commitPeriodSeconds}s\n\nThis is enforced by the smart contract.`);
        setCreatingLoan(false);
        return;
      }
      
      if (revealPeriodSeconds < MIN_REVEAL_PERIOD || revealPeriodSeconds > MAX_COMMIT_PERIOD) {
        alert(`❌ Invalid Reveal Period\n\nReveal period must be between 2 minutes (120s) and 7 days.\nCurrent: ${revealPeriodSeconds}s\n\nThis is enforced by the smart contract.`);
        setCreatingLoan(false);
        return;
      }
      
      // Combine purpose and category into single string
      const fullPurpose = `${loanCategory} - ${loanPurpose}`;
      
      // Warn about deposit requirements for large loans
      const loanAmountNum = parseFloat(loanAmount);
      const estimatedDeposit = (loanAmountNum * 0.05); // 5% in ETH
      
      if (estimatedDeposit > 0.1) {
        const proceed = window.confirm(
          `⚠️ HIGH DEPOSIT WARNING\n\n` +
          `Loan Amount: ${loanAmount} tokens\n` +
          `Estimated Lender Deposit: ~${estimatedDeposit.toFixed(4)} ETH\n\n` +
          `Due to a contract design issue, lenders will need ${estimatedDeposit.toFixed(4)} ETH to bid on this loan.\n\n` +
          `💡 RECOMMENDATION FOR TESTING:\n` +
          `Use smaller amounts (0.01 - 0.1 tokens) for testing:\n` +
          `• 0.01 tokens → 0.0005 ETH deposit\n` +
          `• 0.1 tokens → 0.005 ETH deposit\n\n` +
          `Do you want to continue with ${loanAmount} tokens?`
        );
        
        if (!proceed) {
          setCreatingLoan(false);
          return;
        }
      }
      
      alert(
        `Creating loan request...\n\n` +
        `Amount: ${loanAmount} tokens\n` +
        `Tenure: ${tenureInMonths} months\n` +
        `Purpose: ${fullPurpose}\n` +
        `Commit Period: ${commitPeriodSeconds}s (${(commitPeriodSeconds/3600).toFixed(1)}h)\n` +
        `Reveal Period: ${revealPeriodSeconds}s (${(revealPeriodSeconds/3600).toFixed(1)}h)\n\n` +
        `Please confirm the transaction...`
      );
      
      // Call LoanMarketplace contract
      const loanContract = getContractInstance('LoanMarketplace', signer);
      
      const tx = await loanContract.createLoanRequest(
        amountInWei,
        tenureInMonths,
        fullPurpose,
        commitPeriodSeconds,
        revealPeriodSeconds
      );
      
      alert('⏳ Waiting for blockchain confirmation...');
      const receipt = await tx.wait();
      
      // Extract requestId from event
      const event = receipt.logs.find(log => {
        try {
          const parsed = loanContract.interface.parseLog(log);
          return parsed.name === 'LoanRequestCreated';
        } catch {
          return false;
        }
      });
      
      let requestId = 'N/A';
      if (event) {
        const parsed = loanContract.interface.parseLog(event);
        requestId = parsed.args.requestId.toString();
        
        // Save extra fields to localStorage for this specific loan
        const loanExtras = JSON.parse(localStorage.getItem('loanExtras') || '{}');
        loanExtras[requestId] = {
          category: loanCategory,
          expectedRate: expectedRate,
          collateralType: collateralType,
          collateralValue: collateralValue,
          msme: account
        };
        localStorage.setItem('loanExtras', JSON.stringify(loanExtras));
        console.log('💾 Saved extra loan details to localStorage for Request #' + requestId);
      }
      
      alert(
        `✅ Loan request created successfully!\n\n` +
        `Request ID: ${requestId}\n` +
        `Amount: ${loanAmount} tokens\n` +
        `Tenure: ${tenureInMonths} months\n` +
        `Transaction: ${receipt.hash}\n\n` +
        `Lenders can now submit bids during the commit period.\n\n` +
        `View on Etherscan:\n` +
        `https://sepolia.etherscan.io/tx/${receipt.hash}`
      );
      
      // Reload loan requests from blockchain
      await loadMyLoanRequests();
      
      // Reset form
      setLoanAmount('');
      setLoanTenure('12');
      setLoanPurpose('');
      setLoanCategory('');
      setCollateralType('');
      setCollateralValue('');
      setExpectedRate('');
      setCommitPeriod('120'); // Reset to 2 minutes (contract minimum - reduced for testing)
      setRevealPeriod('120'); // Reset to 2 minutes (contract minimum - reduced for testing)
      
    } catch (error) {
      console.error('Error creating loan request:', error);
      let errorMsg = error.code === 'ACTION_REJECTED' 
        ? 'Transaction rejected by user' 
        : error.reason || error.message;
      alert('❌ Error creating loan request:\n\n' + errorMsg);
    } finally {
      setCreatingLoan(false);
    }
  };

  // Select a specific bid
  const selectBid = async (requestId, lenderAddress) => {
    if (!signer) {
      alert('Please connect your wallet');
      return;
    }

    try {
      const loanContract = getContractInstance('LoanMarketplace', provider);
      
      // Check if reveal period has ended
      const request = await loanContract.requests(requestId);
      const now = Math.floor(Date.now() / 1000);
      const revealDeadline = Number(request.revealDeadline);
      
      if (now <= revealDeadline) {
        const timeRemaining = revealDeadline - now;
        const hoursRemaining = Math.floor(timeRemaining / 3600);
        const minutesRemaining = Math.floor((timeRemaining % 3600) / 60);
        
        alert(
          `⏰ Cannot Select Bid Yet\n\n` +
          `The reveal phase is still active. You must wait for all lenders to reveal their bids.\n\n` +
          `Reveal deadline: ${new Date(revealDeadline * 1000).toLocaleString()}\n` +
          `Time remaining: ${hoursRemaining}h ${minutesRemaining}m\n\n` +
          `💡 Come back after the reveal period ends to select the winning bid.`
        );
        return;
      }
      
      const confirmSelection = window.confirm(
        `🤝 Select Winning Bid\n\n` +
        `Are you sure you want to select this lender?\n\n` +
        `Lender: ${lenderAddress.substring(0, 10)}...${lenderAddress.substring(38)}\n\n` +
        `After selecting, the lender will be able to create a formal loan agreement.\n\n` +
        `This action cannot be undone.`
      );

      if (!confirmSelection) return;

      const loanContractWithSigner = getContractInstance('LoanMarketplace', signer);
      
      console.log('Selecting bid for request', requestId, 'lender', lenderAddress);
      
      const tx = await loanContractWithSigner.selectBid(requestId, lenderAddress);
      console.log('Transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);
      
      alert(
        `✅ Bid Selected Successfully!\n\n` +
        `Lender: ${lenderAddress}\n\n` +
        `Next Steps:\n` +
        `1. The lender will create a loan agreement\n` +
        `2. You'll be able to view it in the "Agreements" tab\n` +
        `3. Once disbursement happens, loan becomes active`
      );
      
      // Reload loan requests
      await loadMyLoanRequests();
      
      // Close the details modal if it's open
      setSelectedLoanDetails(null);
      
    } catch (error) {
      console.error('Error selecting bid:', error);
      let errorMsg = error.code === 'ACTION_REJECTED' 
        ? 'Transaction rejected by user' 
        : error.reason || error.message;
      alert('❌ Error selecting bid:\n\n' + errorMsg);
    }
  };

  // ============ REPAYMENT RECORDING HANDLERS ============
  
  const handleRecordRepayment = (agreement) => {
    setSelectedAgreementForRepayment(agreement);
    setRepaymentProofHash('');
    setRepaymentProofFile(null);
    setShowRepaymentModal(true);
  };

  const handleRepaymentFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setRepaymentProofFile(file);
    }
  };

  const uploadRepaymentProofToIPFS = async () => {
    if (!repaymentProofFile) {
      alert('Please select a file first');
      return;
    }

    try {
      setUploadingRepaymentProof(true);
      
      // For now, we'll simulate IPFS upload by generating a hash
      // In production, you'd use Pinata or another IPFS service
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target.result;
        const hash = ethers.keccak256(ethers.toUtf8Bytes(content));
        const ipfsHash = `Qm${hash.substring(2, 48)}`; // Mock IPFS hash
        setRepaymentProofHash(ipfsHash);
        alert(`✅ File uploaded successfully!\n\nIPFS Hash: ${ipfsHash}\n\n(In production, this would use real IPFS)`);
      };
      reader.readAsText(repaymentProofFile);
    } catch (error) {
      console.error('Error uploading to IPFS:', error);
      alert('❌ Error uploading file: ' + error.message);
    } finally {
      setUploadingRepaymentProof(false);
    }
  };

  const submitRepayment = async () => {
    if (!repaymentProofHash) {
      alert('Please upload proof of repayment first');
      return;
    }

    if (!signer) {
      alert('Please connect your wallet');
      return;
    }

    try {
      setRecordingRepayment(true);
      
      const agreementContract = getContractInstance('LoanAgreementRegistry', signer);
      
      console.log('Recording repayment for agreement:', selectedAgreementForRepayment.recordId);
      console.log('Proof hash:', repaymentProofHash);
      
      const tx = await agreementContract.recordRepayment(
        selectedAgreementForRepayment.recordId,
        repaymentProofHash
      );
      
      console.log('Transaction sent:', tx.hash);
      alert('⏳ Recording repayment...\n\nPlease wait for confirmation.');
      
      const receipt = await tx.wait();
      console.log('Repayment recorded! Receipt:', receipt);
      
      // Parse events to get reputation change
      // eslint-disable-next-line no-unused-vars
      const statusEvent = receipt.logs.find(log => {
        try {
          const parsed = agreementContract.interface.parseLog(log);
          return parsed.name === 'StatusUpdated';
        } catch {
          return false;
        }
      });
      
      alert(
        '✅ Repayment Recorded Successfully!\n\n' +
        `Agreement ID: ${selectedAgreementForRepayment.recordId}\n` +
        `Proof Hash: ${repaymentProofHash}\n` +
        `Transaction: ${tx.hash.substring(0, 10)}...`
      );
      
      // Reload agreements
      await loadMyLoanAgreements();
      
      // Close modal
      setShowRepaymentModal(false);
      setSelectedAgreementForRepayment(null);
      setRepaymentProofHash('');
      setRepaymentProofFile(null);
      
    } catch (error) {
      console.error('Error recording repayment:', error);
      let errorMsg = error.code === 'ACTION_REJECTED' 
        ? 'Transaction rejected by user' 
        : error.reason || error.message;
      alert('❌ Error recording repayment:\n\n' + errorMsg);
    } finally {
      setRecordingRepayment(false);
    }
  };

  // ============ ISSUES HANDLERS ============
  
  const loadIssues = async () => {
    if (!provider || !account) return;
    
    try {
      setLoadingIssues(true);
      const agreementContract = getContractInstance('LoanAgreementRegistry', provider);
      
      // Get issue counter
      const issueCounter = await agreementContract.issueCounter();
      const totalIssues = Number(issueCounter);
      
      console.log(`Loading ${totalIssues} total issues from contract`);
      
      // Load all issues
      const allIssues = [];
      for (let i = 1; i <= totalIssues; i++) {
        try {
          const issue = await agreementContract.issues(i);
          const record = await agreementContract.records(Number(issue.recordId));
          
          // Filter: only show issues where user is MSME or Lender in the loan
          if (record.msme.toLowerCase() === account.toLowerCase() || 
              record.lender.toLowerCase() === account.toLowerCase()) {
            
            const statusMap = ['Open', 'Resolved', 'Escalated'];
            
            allIssues.push({
              issueId: i,
              recordId: Number(issue.recordId),
              raisedBy: issue.raisedBy,
              reason: issue.reason,
              evidenceHash: issue.evidenceHash,
              status: statusMap[issue.status] || 'Unknown',
              statusCode: issue.status,
              resolution: issue.resolution,
              resolvedBy: issue.resolvedBy,
              createdAt: Number(issue.timestamp), // Keep as number for date formatting
              timestamp: new Date(Number(issue.timestamp) * 1000).toLocaleString(),
              // Add loan details for context
              msme: record.msme,
              lender: record.lender,
              loanAmount: ethers.formatEther(record.amount)
            });
          }
        } catch (err) {
          console.error(`Error loading issue ${i}:`, err);
        }
      }
      
      console.log(`Loaded ${allIssues.length} issues for user ${account}`);
      setIssues(allIssues);
    } catch (error) {
      console.error('Error loading issues:', error);
    } finally {
      setLoadingIssues(false);
    }
  };

  const handleRaiseIssue = (agreementRecordId = null) => {
    setIssueRecordId(agreementRecordId ? agreementRecordId.toString() : '');
    setIssueReason('');
    setIssueEvidenceFile(null);
    setIssueEvidenceHash('');
    setShowRaiseIssueModal(true);
  };

  const handleIssueEvidenceFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setIssueEvidenceFile(file);
    }
  };

  const uploadIssueEvidenceToIPFS = async () => {
    if (!issueEvidenceFile) {
      alert('Please select a file first');
      return;
    }

    try {
      setUploadingIssueEvidence(true);
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target.result;
        const hash = ethers.keccak256(ethers.toUtf8Bytes(content));
        const ipfsHash = `Qm${hash.substring(2, 48)}`; // Mock IPFS hash
        setIssueEvidenceHash(ipfsHash);
        alert(`✅ Evidence uploaded successfully!\n\nIPFS Hash: ${ipfsHash}\n\n(In production, this would use real IPFS)`);
      };
      reader.readAsText(issueEvidenceFile);
    } catch (error) {
      console.error('Error uploading evidence:', error);
      alert('❌ Error uploading file: ' + error.message);
    } finally {
      setUploadingIssueEvidence(false);
    }
  };

  const submitIssue = async () => {
    if (!issueRecordId || !issueReason || !issueEvidenceHash) {
      alert('Please fill all fields and upload evidence');
      return;
    }

    if (!signer) {
      alert('Please connect your wallet');
      return;
    }

    try {
      setRaisingIssue(true);
      
      const agreementContract = getContractInstance('LoanAgreementRegistry', signer);
      
      console.log('Raising issue for record:', issueRecordId);
      console.log('Reason:', issueReason);
      console.log('Evidence hash:', issueEvidenceHash);
      
      const tx = await agreementContract.raiseIssue(
        issueRecordId,
        issueReason,
        issueEvidenceHash
      );
      
      console.log('Transaction sent:', tx.hash);
      alert('⏳ Raising issue...\n\nPlease wait for confirmation.');
      
      const receipt = await tx.wait();
      console.log('Issue raised! Receipt:', receipt);
      
      // Get issue ID from event
      const issueEvent = receipt.logs.find(log => {
        try {
          const parsed = agreementContract.interface.parseLog(log);
          return parsed.name === 'IssueRaised';
        } catch {
          return false;
        }
      });
      
      let issueId = 'N/A';
      if (issueEvent) {
        const parsed = agreementContract.interface.parseLog(issueEvent);
        issueId = parsed.args.issueId.toString();
      }
      
      alert(
        '✅ Issue Raised Successfully!\n\n' +
        `Issue ID: ${issueId}\n` +
        `Loan Record: ${issueRecordId}\n` +
        `Evidence Hash: ${issueEvidenceHash}\n\n` +
        `The issue will be reviewed by governance and resolved off-chain (e.g., in courts).`
      );
      
      // Reload issues and agreements
      await loadIssues();
      await loadMyLoanAgreements();
      
      // Close modal
      setShowRaiseIssueModal(false);
      setIssueRecordId('');
      setIssueReason('');
      setIssueEvidenceFile(null);
      setIssueEvidenceHash('');
      
    } catch (error) {
      console.error('Error raising issue:', error);
      let errorMsg = error.code === 'ACTION_REJECTED' 
        ? 'Transaction rejected by user' 
        : error.reason || error.message;
      alert('❌ Error raising issue:\n\n' + errorMsg);
    } finally {
      setRaisingIssue(false);
    }
  };

  return (
    <div>
      <div className="card">
        <h1>MSME Dashboard</h1>
        <p style={{ color: '#718096' }}>
          Connected as: <strong>{account}</strong>
        </p>
      </div>

      {/* Tabs */}
      <div className="card">
        <div style={{ display: 'flex', gap: '10px', paddingBottom: '10px' }}>
          <button 
            className={`button ${tab === 'identity' ? '' : 'button-secondary'}`}
            onClick={() => setTab('identity')}
            style={{ background: tab === 'identity' ? '#00b7ffff' : '#ffffff', color: tab === 'identity' ? 'white' : 'black' }}
          >
            Identity
          </button>
          <button 
            className={`button ${tab === 'attestations' ? '' : 'button-secondary'}`}
            onClick={() => setTab('attestations')}
            style={{ background: tab === 'attestations' ? '#00b7ffff' : '#ffffff', color: tab === 'attestations' ? 'white' : 'black' }}
          >
            Attestations
          </button>
          <button 
            className={`button ${tab === 'loans' ? '' : 'button-secondary'}`}
            onClick={() => setTab('loans')}
            style={{ background: tab === 'loans' ?'#00b7ffff' : '#ffffff', color: tab === 'loans' ? 'white' : 'black' }}
          >
            Loan Requests
          </button>
          <button 
            className={`button ${tab === 'agreements' ? '' : 'button-secondary'}`}
            onClick={() => setTab('agreements')}
            style={{ background: tab === 'agreements' ? '#00b7ffff' : '#ffffff', color: tab === 'agreements' ? 'white' : 'black' }}
          >
            Agreements ({loanAgreements.length})
          </button>
          <button 
            className={`button ${tab === 'issues' ? '' : 'button-secondary'}`}
            onClick={() => { setTab('issues'); setShowIssuesTab(true); }}
            style={{ background: tab === 'issues' ? '#00b7ffff' : '#ffffff', color: tab === 'issues' ? 'white' : 'black' }}
          >
            Issues & Disputes ({issues.length})
          </button>
        </div>
      </div>

      {/* Identity Tab */}
      {tab === 'identity' && (
        <div className="card">
          <h2>Your Identity</h2>
          
          {!identityAddress ? (
            <div>
              <p style={{ color: '#718096', marginBottom: '20px' }}>
                Create your decentralized identity to start building your verified profile
              </p>
              
              <form onSubmit={createIdentity}>
                <div className="grid">
                  <div>
                    <label className="label">Business Name *</label>
                    <input 
                      type="text"
                      className="input"
                      placeholder="ABC Manufacturing Pvt Ltd"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="label">Industry *</label>
                    <select 
                      className="input"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      required
                    >
                      <option value="">Select Industry</option>
                      <option value="Manufacturing">Manufacturing</option>
                      <option value="Services">Services</option>
                      <option value="Trading">Trading</option>
                      <option value="Technology">Technology</option>
                      <option value="Agriculture">Agriculture</option>
                      <option value="Retail">Retail</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="Education">Education</option>
                      <option value="Construction">Construction</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid">
                  <div>
                    <label className="label">GST Number *</label>
                    <input 
                      type="text"
                      className="input"
                      placeholder="22AAAAA0000A1Z5"
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="label">PAN Number</label>
                    <input 
                      type="text"
                      className="input"
                      placeholder="AAAAA0000A"
                      value={panNumber}
                      onChange={(e) => setPanNumber(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="grid">
                  <div>
                    <label className="label">Registration Year</label>
                    <input 
                      type="number"
                      className="input"
                      placeholder="2020"
                      min="1900"
                      max="2025"
                      value={registrationYear}
                      onChange={(e) => setRegistrationYear(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="label">Annual Revenue (₹)</label>
                    <input 
                      type="number"
                      className="input"
                      placeholder="5000000"
                      value={annualRevenue}
                      onChange={(e) => setAnnualRevenue(e.target.value)}
                    />
                  </div>
                </div>
                
                <label className="label">Number of Employees</label>
                <input 
                  type="number"
                  className="input"
                  placeholder="50"
                  value={employeeCount}
                  onChange={(e) => setEmployeeCount(e.target.value)}
                />
                
                <label className="label">Business Address</label>
                <textarea 
                  className="input"
                  placeholder="123 Industrial Area, Mumbai, Maharashtra - 400001"
                  rows="3"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                />
                
                <button 
                  type="submit"
                  className="button"
                  style={{ marginTop: '20px' }}
                  disabled={creatingIdentity}
                >
                  {creatingIdentity ? 'Creating...' : 'Create MSME Identity'}
                </button>
              </form>
            </div>
          ) : (
            <div> 
              <div style={{ background: 'transparent', padding: '16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #48bb78' }}>
                <div style={{ fontSize: '12px', color: '#08ff8cff', marginBottom: '8px' }}>
                  🔑 Your MSME Identity Address
                </div>
                <code style={{ 
                  background: '#ffffff', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  display: 'block',
                  wordBreak: 'break-all',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#48bb78'
                }}>
                  {identityAddress}
                </code>
                <div style={{ fontSize: '11px', color: '#00ff88ff', marginTop: '8px' }}>
                  💡 This identity is linked to your wallet address and will be automatically loaded when you reconnect.
                </div>
              </div>
              
              <div style={{ marginTop: '30px' }}>
                <h3>Business Profile</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Field</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Business Name</strong></td>
                      <td>{businessName || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td><strong>Industry</strong></td>
                      <td>{industry || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td><strong>GST Number</strong></td>
                      <td>{gstNumber || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td><strong>PAN Number</strong></td>
                      <td>{panNumber || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td><strong>Registration Year</strong></td>
                      <td>{registrationYear || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td><strong>Annual Revenue</strong></td>
                      <td>{annualRevenue ? `₹${parseInt(annualRevenue).toLocaleString('en-IN')}` : 'N/A'}</td>
                    </tr>
                    <tr>
                      <td><strong>Employees</strong></td>
                      <td>{employeeCount || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td><strong>Address</strong></td>
                      <td>{businessAddress || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td><strong>Owner Address</strong></td>
                      <td>{account}</td>
                    </tr>
                    <tr>
                      <td><strong>Status</strong></td>
                      <td><span className="status status-active">Active</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Reputation Score Card */}
              <div style={{ marginTop: '30px' }}>
                <h3>Loan Reputation</h3>
                {loadingReputation ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
                    Loading reputation data...
                  </div>
                ) : reputation ? (
                  <div>
                    {/* Reputation Score Badge */}
                    <div style={{ 
                      background: reputation.reputationScore >= 800 ? '#f0fff4' : 
                                 reputation.reputationScore >= 500 ? '#fffaf0' : '#fff5f5',
                      border: `2px solid ${reputation.reputationScore >= 800 ? '#48bb78' : 
                                          reputation.reputationScore >= 500 ? '#ed8936' : '#f56565'}`,
                      borderRadius: '12px',
                      padding: '24px',
                      marginBottom: '20px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '14px', color: '#718096', marginBottom: '8px' }}>
                        Overall Reputation Score
                      </div>
                      <div style={{ 
                        fontSize: '48px', 
                        fontWeight: 'bold',
                        color: reputation.reputationScore >= 800 ? '#48bb78' : 
                               reputation.reputationScore >= 500 ? '#ed8936' : '#f56565'
                      }}>
                        {reputation.reputationScore}
                      </div>
                      <div style={{ fontSize: '12px', color: '#718096', marginTop: '8px' }}>
                        out of 1000 points
                      </div>
                      <div style={{ 
                        marginTop: '12px',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        display: 'inline-block',
                        background: reputation.reputationScore >= 800 ? '#48bb78' : 
                                   reputation.reputationScore >= 500 ? '#ed8936' : '#f56565',
                        color: 'white',
                        fontSize: '13px',
                        fontWeight: 'bold'
                      }}>
                        {reputation.reputationScore >= 800 ? '⭐ Excellent' : 
                         reputation.reputationScore >= 500 ? '⚠️ Good' : '❌ Needs Improvement'}
                      </div>
                    </div>

                    {/* Loan Statistics */}
                    <div className="grid" style={{ gap: '16px' }}>
                      <div style={{ 
                        background: '#f7fafc', 
                        padding: '20px', 
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                      }}>
                        <div style={{ fontSize: '12px', color: '#718096', marginBottom: '8px' }}>
                          Total Loans
                        </div>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2d3748' }}>
                          {reputation.totalLoans}
                        </div>
                      </div>

                      <div style={{ 
                        background: '#f0fff4', 
                        padding: '20px', 
                        borderRadius: '8px',
                        border: '1px solid #48bb78'
                      }}>
                        <div style={{ fontSize: '12px', color: '#22543d', marginBottom: '8px' }}>
                          Repaid Loans
                        </div>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#48bb78' }}>
                          {reputation.repaidLoans}
                        </div>
                      </div>

                      <div style={{ 
                        background: '#fffaf0', 
                        padding: '20px', 
                        borderRadius: '8px',
                        border: '1px solid #ed8936'
                      }}>
                        <div style={{ fontSize: '12px', color: '#744210', marginBottom: '8px' }}>
                          Active Loans
                        </div>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ed8936' }}>
                          {reputation.activeLoans}
                        </div>
                      </div>

                      <div style={{ 
                        background: '#fff5f5', 
                        padding: '20px', 
                        borderRadius: '8px',
                        border: '1px solid #f56565'
                      }}>
                        <div style={{ fontSize: '12px', color: '#742a2a', marginBottom: '8px' }}>
                          Defaulted Loans
                        </div>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f56565' }}>
                          {reputation.defaultedLoans}
                        </div>
                      </div>
                    </div>

                    {/* Financial Metrics */}
                    <table style={{ marginTop: '20px' }}>
                      <thead>
                        <tr>
                          <th>Metric</th>
                          <th>Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><strong>Total Amount Borrowed</strong></td>
                          <td>{parseFloat(reputation.totalAmountBorrowed).toFixed(4)} CIT</td>
                        </tr>
                        <tr>
                          <td><strong>Total Amount Repaid</strong></td>
                          <td>{parseFloat(reputation.totalAmountRepaid).toFixed(4)} CIT</td>
                        </tr>
                        <tr>
                          <td><strong>Average Repayment Time</strong></td>
                          <td>
                            {reputation.averageRepaymentTime > 0 
                              ? `${reputation.averageRepaymentTime} days` 
                              : 'No data'}
                          </td>
                        </tr>
                        <tr>
                          <td><strong>Repayment Rate</strong></td>
                          <td>
                            {reputation.totalLoans > 0 
                              ? `${((reputation.repaidLoans / reputation.totalLoans) * 100).toFixed(1)}%`
                              : 'No loans yet'}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Reputation Tips */}
                    <div className="reputation-tips">
                      <div className="reputation-tips-title">
                        💡 How to Improve Your Reputation:
                      </div>
                      <ul>
                        <li>Pay loans very early (30+ days before due): +100 points</li>
                        <li>Pay loans early (7-30 days before due): +75 points</li>
                        <li>Pay on time: +50 points</li>
                        <li>Avoid late payments to prevent score reduction</li>
                        <li>Maintain consistent repayment behavior</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-state-icon">📊</div>
                    <div className="empty-state-title">
                      No Reputation Data Yet
                    </div>
                    <div style={{ fontSize: '13px', color: '#a0aec0' }}>
                      Your reputation will be built as you borrow and repay loans
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Attestations Tab */}
      {tab === 'attestations' && (
        <div>
          <div className="card mb-4">
            <h2 className="text-primary mb-3">Request Attestations</h2>
            <p className="text-secondary mb-4">
              Submit documents for verification by trusted oracles
            </p>
            
            <div className="grid grid-cols-4 gap-3">
              <button className="button" onClick={() => openAttestationForm('GST Revenue')}>
                GST
              </button>
              <button className="button" onClick={() => openAttestationForm('Bank Statements')}>
                Bank
              </button>
              <button className="button" onClick={() => openAttestationForm('KYC Verification')}>
                KYC
              </button>
              <button className="button" onClick={() => openAttestationForm('Credit Score')}>
                Credit
              </button>
            </div>
          </div>

          {/* Attestation Request Form */}
          {showAttestationForm && (
            <div className="card border-2 border-primary">
              <h2 className="text-primary mb-3">Submit {selectedSchema} Attestation</h2>
              <form onSubmit={submitAttestationRequest}>
                <label className="label">Document Type</label>
                <input 
                  type="text"
                  className="input"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  placeholder="e.g., GST Return Filing"
                  required
                />

                <label className="label">Document URL / IPFS Hash</label>
                <input 
                  type="text"
                  className="input"
                  value={documentUrl}
                  onChange={(e) => setDocumentUrl(e.target.value)}
                  placeholder="ipfs://QmXxx... or https://..."
                  required
                />

                <label className="label">Document Hash (SHA-256)</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <input 
                    type="text"
                    className="input"
                    value={documentHash}
                    onChange={(e) => setDocumentHash(e.target.value)}
                    placeholder="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
                    required
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="button"
                    style={{ 
                      fontSize: '12px', 
                      padding: '8px 12px',
                      background: '#718096',
                      whiteSpace: 'nowrap'
                    }}
                    onClick={() => {
                      // Generate a random valid hash for testing
                      const randomHash = '0x' + Array.from({length: 64}, () => 
                        Math.floor(Math.random() * 16).toString(16)
                      ).join('');
                      setDocumentHash(randomHash);
                    }}
                  >
                    Generate Test Hash
                  </button>
                </div>
                <div style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>
                  Must be 66 characters (0x + 64 hex digits). Use the button above to generate a test hash.
                </div>

                <label className="label">Additional Information</label>
                <textarea 
                  className="input"
                  rows="3"
                  value={additionalData}
                  onChange={(e) => setAdditionalData(e.target.value)}
                  placeholder="Any additional context for the oracle (e.g., reporting period, account numbers, etc.)"
                />

                {/* V3 Multi-Oracle Features */}
                <div className="card bg-tertiary border-2 border-primary mt-4 p-4">
                  <h3 className="text-primary mb-3" style={{ fontSize: '16px' }}>
                    Multi-Oracle Verification
                  </h3>
                  
                  <label className="label">Attestation Fee (CIT) - Determines Security Level</label>
                  <div className="d-flex gap-2 align-center mb-2">
                    <input 
                      type="number"
                      className="input"
                      value={feeAmount}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFeeAmount(val);
                        // Auto-update based on fee
                        const fee = parseFloat(val) || 0;
                        if (fee >= 1000) {
                          setForceSingleOracle(false); // Critical tier
                        } else if (fee >= 500) {
                          setForceSingleOracle(false); // Complex tier
                        } else if (fee >= 200) {
                          setForceSingleOracle(false); // Medium tier
                        }
                      }}
                      min="50"
                      max="10000"
                      step="50"
                      required
                      style={{ flex: 1 }}
                    />
                    <span className="font-bold p-2 rounded text-primary" style={{ 
                      background: (() => {
                        const fee = parseFloat(feeAmount) || 0;
                        if (forceSingleOracle) return '#10b981';
                        if (fee >= 1000) return '#dc2626';
                        if (fee >= 500) return '#ea580c';
                        if (fee >= 200) return '#f59e0b';
                        return '#10b981';
                      })(),
                      minWidth: '140px',
                      textAlign: 'center'
                    }}>
                      {(() => {
                        const fee = parseFloat(feeAmount) || 0;
                        if (forceSingleOracle) return '1 Oracle';
                        if (fee >= 1000) return '7 Oracles';
                        if (fee >= 500) return '5 Oracles';
                        if (fee >= 200) return '3 Oracles';
                        return '1 Oracle';
                      })()}
                    </span>
                  </div>
                  <div className="text-xs text-secondary mb-4">
                    💡 <strong>Security Tiers:</strong><br/>
                    • Simple (1 oracle): &lt;200 CIT - Fast & economical<br/>
                    • Medium (3 oracles): 200-499 CIT - Balanced security<br/>
                    • Complex (5 oracles): 500-999 CIT - High security<br/>
                    • Critical (7 oracles): 1000+ CIT - Maximum Byzantine fault tolerance
                  </div>

                  <label className="label">
                    <input 
                      type="checkbox"
                      checked={forceSingleOracle}
                      onChange={(e) => setForceSingleOracle(e.target.checked)}
                      style={{ marginRight: '8px' }}
                    />
                    Force Single Oracle (opt-out of multi-oracle consensus)
                  </label>
                  <div className="text-xs text-secondary mt-1 mb-3">
                    💡 <strong>Recommended: Leave unchecked for V3 multi-oracle consensus.</strong><br/>
                    Only check this if you prefer faster, cheaper verification with less security.<br/>
                    ⚠️ Single oracle mode requires manual oracle acceptance (no auto-assignment).
                  </div>

                  <label className="label mt-3">
                    Validity Period (Days)
                  </label>
                  <div className="d-flex gap-2 align-center">
                    <input 
                      type="range"
                      min="30"
                      max="365"
                      step="30"
                      value={requestedValidityDays}
                      onChange={(e) => setRequestedValidityDays(parseInt(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    <span className="font-bold text-primary" style={{ 
                      minWidth: '80px',
                      color: '#667eea'
                    }}>
                      {requestedValidityDays} days
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>
                    How long the attestation should remain valid. Oracles may adjust ±20%.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button 
                    type="submit"
                    className="button"
                    disabled={submittingAttestation}
                  >
                    {submittingAttestation ? 'Submitting...' : '📤 Submit for Verification'}
                  </button>
                  <button 
                    type="button"
                    className="button button-secondary"
                    onClick={() => setShowAttestationForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Pending Attestation Requests */}
          {attestationRequests.length > 0 && (
            <div className="card">
              <h2>Your Attestation Requests</h2>
              <table>
                <thead>
                  <tr>
                    <th>Schema</th>
                    <th>Document Type</th>
                    <th>Document Hash</th>
                    <th>Status</th>
                    <th>Requested</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {attestationRequests.map((req) => (
                    <tr key={req.id}>
                      <td><strong>{getSchemaName(req.schema)}</strong></td>
                      <td>{req.documentType}</td>
                      <td><code style={{ fontSize: '11px' }}>{req.documentHash.substring(0, 20)}...</code></td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span className={`status ${
                            req.status === 'Completed' ? 'status-active' : 
                            req.status === 'Rejected' || req.status === 'No Consensus' ? 'status-error' :
                            req.status === 'Pending' ? 'status-warning' :
                            'status-info'
                          }`}>
                            {req.status}
                          </span>
                          {req.assignmentProgress && req.blockchainStatus <= 3 && (
                            <span style={{ fontSize: '11px', color: '#718096' }}>
                              Oracles: {req.assignmentProgress}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>{new Date(req.requestedAt).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {req.status === 'Pending' && (
                            <span style={{ fontSize: '12px', color: '#718096' }}>
                              ⏳ Waiting for Oracles ({req.assignmentProgress})
                            </span>
                          )}
                          {req.status === 'Oracles Assigned' && (
                            <span style={{ fontSize: '12px', color: '#f59e0b' }}>
                              🔒 Oracles Committing...
                            </span>
                          )}
                          {req.status === 'Committing' && (
                            <span style={{ fontSize: '12px', color: '#f59e0b' }}>
                              ⏳ Oracles Committing Attestations...
                            </span>
                          )}
                          {req.status === 'Revealing' && (
                            <span style={{ fontSize: '12px', color: '#9f7aea' }}>
                              🔓 Oracles Revealing Attestations...
                            </span>
                          )}
                          {req.status === 'Consensus Reached' && (
                            <span style={{ fontSize: '12px', color: '#48bb78' }}>
                              ✅ Consensus Reached! Finalizing...
                            </span>
                          )}
                          
                          {/* Show "View Oracles" button for in-progress requests */}
                          {req.blockchainStatus <= 3 && req.assignedOracles && req.assignedOracles.length > 0 && (
                            <button
                              onClick={() => fetchConsensusDetails(req.id)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '11px',
                                backgroundColor: '#667eea',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer'
                              }}
                            >
                              👥 View Assigned Oracles
                            </button>
                          )}
                          
                          {/* Show "View Consensus" for completed requests */}
                          {(req.status === 'Consensus Reached' || req.status === 'Completed') && (
                            <button
                              onClick={() => fetchConsensusDetails(req.id)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                backgroundColor: '#667eea',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer'
                              }}
                            >
                              View Consensus Details
                            </button>
                          )}
                        </div>
                        {req.status === 'Completed' && req.txHash && (
                          <a 
                            href={`https://sepolia.etherscan.io/tx/${req.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '12px', color: '#667eea' }}
                          >
                            View Transaction →
                          </a>
                        )}
                        {req.status === 'Completed' && !req.txHash && (
                          <span style={{ color: '#48bb78', fontSize: '12px' }}>✅ Verified</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="card">
            <h2>📊 Your Document Attestations</h2>
            <p style={{ color: 'white', marginBottom: '16px', fontSize: '14px' }}>
              {attestations.length === 0 
                ? 'No attestations yet. Request verifications above.'
                : `You have ${attestations.length} document${attestations.length > 1 ? 's' : ''} reviewed by oracles`
              }
            </p>
            {attestations.length > 0 && (
              <table>
                <thead>
                  <tr>
                    <th>Document Type</th>
                    <th>Document Hash</th>
                    <th>✅ Verified By</th>
                    <th>❌ Rejected By</th>
                    <th>Trust Score</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {attestations.map((att, index) => (
                    <tr key={index}>
                      <td>
                        <strong style={{ color: 'white' }}>{att.schema}</strong>
                      </td>
                      <td>
                        <code style={{ fontSize: '11px', background: 'transparent', padding: '2px 6px', borderRadius: '3px' }}>
                          {att.documentHash.substring(0, 20)}...
                        </code>
                      </td>
                      <td>
                        {att.verifiedCount > 0 ? (
                          <div>
                            <span style={{ 
                              background: 'transparent', 
                              color: 'white', 
                              padding: '4px 10px', 
                              borderRadius: '12px',
                              fontWeight: 'bold',
                              fontSize: '12px'
                            }}>
                              ✅ {att.verifiedCount} Oracle{att.verifiedCount > 1 ? 's' : ''}
                            </span>
                            <div style={{ fontSize: '10px', color: '#718096', marginTop: '4px' }}>
                              {att.majorityOracles?.slice(0, 2).map((oracle, i) => (
                                <div key={i}>{oracle.substring(0, 10)}...</div>
                              ))}
                              {att.majorityOracles?.length > 2 && <div>+{att.majorityOracles.length - 2} more</div>}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#a0aec0', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                      <td>
                        {att.rejectedCount > 0 ? (
                          <div>
                            <span style={{ 
                              background: 'transparent', 
                              color: 'white', 
                              padding: '4px 10px', 
                              borderRadius: '12px',
                              fontWeight: 'bold',
                              fontSize: '12px'
                            }}>
                              ❌ {att.rejectedCount} Oracle{att.rejectedCount > 1 ? 's' : ''}
                            </span>
                            <div style={{ fontSize: '10px', color: '#718096', marginTop: '4px' }}>
                              {att.minorityOracles?.slice(0, 2).map((oracle, i) => (
                                <div key={i}>{oracle.substring(0, 10)}...</div>
                              ))}
                              {att.minorityOracles?.length > 2 && <div>+{att.minorityOracles.length - 2} more</div>}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#a0aec0', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                      <td>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ 
                            fontSize: '20px', 
                            fontWeight: 'bold',
                            color: att.verifiedCount > att.rejectedCount ? '#48bb78' : '#e53e3e'
                          }}>
                            {att.totalCount > 0 ? Math.round((att.verifiedCount / att.totalCount) * 100) : 0}%
                          </div>
                          <div style={{ fontSize: '10px', color: '#718096' }}>
                            {att.verifiedCount}/{att.totalCount} positive
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`status ${
                          att.status === 'Verified' ? 'status-active' : 
                          att.status === 'Rejected' ? 'status-error' : 
                          'status-warning'
                        }`}>
                          {att.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Loans Tab */}
      {tab === 'loans' && (
        <div>
          <div className="card">
            <h2>Create Loan Request</h2>
            <form onSubmit={createLoanRequest}>
              <div className="grid">
                <div>
                  <label className="label">Loan Amount (ETH) *</label>
                  <input 
                    type="number"
                    className="input"
                    placeholder="100"
                    step="0.01"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="label">Tenure (Months) *</label>
                  <select 
                    className="input"
                    value={loanTenure}
                    onChange={(e) => setLoanTenure(e.target.value)}
                  >
                    <option value="6">6 months</option>
                    <option value="12">12 months</option>
                    <option value="18">18 months</option>
                    <option value="24">24 months</option>
                    <option value="36">36 months</option>
                  </select>
                </div>
              </div>

              <div className="grid">
                <div>
                  <label className="label">Loan Category *</label>
                  <select 
                    className="input"
                    value={loanCategory}
                    onChange={(e) => setLoanCategory(e.target.value)}
                    required
                  >
                    <option value="">Select Category</option>
                    <option value="Working Capital">Working Capital</option>
                    <option value="Equipment Purchase">Equipment Purchase</option>
                    <option value="Business Expansion">Business Expansion</option>
                    <option value="Inventory">Inventory</option>
                    <option value="Technology Upgrade">Technology Upgrade</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="Debt Refinancing">Debt Refinancing</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="label">Expected Interest Rate (%)</label>
                  <input 
                    type="number"
                    className="input"
                    placeholder="10.5"
                    step="0.1"
                    value={expectedRate}
                    onChange={(e) => setExpectedRate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid">
                <div>
                  <label className="label">Collateral Type (Optional)</label>
                  <select 
                    className="input"
                    value={collateralType}
                    onChange={(e) => setCollateralType(e.target.value)}
                  >
                    <option value="">None</option>
                    <option value="Property">Property</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Inventory">Inventory</option>
                    <option value="Receivables">Receivables</option>
                    <option value="Securities">Securities</option>
                  </select>
                </div>

                <div>
                  <label className="label">Collateral Value (ETH)</label>
                  <input 
                    type="number"
                    className="input"
                    placeholder="50"
                    step="0.01"
                    value={collateralValue}
                    onChange={(e) => setCollateralValue(e.target.value)}
                    disabled={!collateralType}
                  />
                </div>
              </div>

              <label className="label">Purpose *</label>
              <textarea 
                className="input"
                placeholder="Detailed description of how the funds will be used..."
                rows="3"
                value={loanPurpose}
                onChange={(e) => setLoanPurpose(e.target.value)}
                required
              />

              <div className="grid">
                <div>
                  <label className="label">Commit Period (seconds) *</label>
                  <input 
                    type="number"
                    className="input"
                    value={commitPeriod}
                    onChange={(e) => setCommitPeriod(e.target.value)}
                    min="120"
                    required
                  />
                  <small style={{ color: '#718096' }}>
                    Minimum: 120s (2 minutes) - Contract enforced (reduced for testing)
                  </small>
                </div>

                <div>
                  <label className="label">Reveal Period (seconds) *</label>
                  <input 
                    type="number"
                    className="input"
                    value={revealPeriod}
                    onChange={(e) => setRevealPeriod(e.target.value)}
                    min="120"
                    required
                  />
                  <small style={{ color: '#718096' }}>
                    Minimum: 120s (2 minutes) - Contract enforced (reduced for testing)
                  </small>
                </div>
              </div>

              <button 
                type="submit"
                className="button"
                style={{ marginTop: '20px' }}
                disabled={creatingLoan}
              >
                {creatingLoan ? 'Creating...' : '📝 Create Loan Request'}
              </button>
            </form>
          </div>

          <div className="card">
            <h2>Your Loan Requests</h2>
            {loanRequests.length === 0 ? (
              <p style={{ color: '#718096' }}>No loan requests yet. Create one above.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {loanRequests.map((loan) => (
                  <div key={loan.id} className="card" style={{ background: 'transparent', marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                          <h3 style={{ margin: 0 }}>Loan Request #{loan.id}</h3>
                          <span className="status status-active">{loan.status}</span>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                          <div>
                            <p style={{ color: '#718096', margin: '4px 0', fontSize: '14px' }}>Amount</p>
                            <p style={{ margin: '4px 0', fontWeight: '600', fontSize: '18px', color: '#667eea' }}>
                              {loan.amount} ETH
                            </p>
                          </div>
                          <div>
                            <p style={{ color: '#718096', margin: '4px 0', fontSize: '14px' }}>Tenure</p>
                            <p style={{ margin: '4px 0', fontWeight: '600' }}>{loan.tenure} months</p>
                          </div>
                          <div>
                            <p style={{ color: '#718096', margin: '4px 0', fontSize: '14px' }}>Category</p>
                            <p style={{ margin: '4px 0', fontWeight: '600' }}>{loan.category || 'N/A'}</p>
                          </div>
                        </div>

                        <div style={{ 
                          background: 'white', 
                          padding: '12px', 
                          borderRadius: '8px',
                          marginBottom: '12px'
                        }}>
                          <p style={{ margin: '4px 0' }}><strong>Bids Received:</strong> {loan.bids}</p>
                          <p style={{ margin: '4px 0' }}><strong>Created:</strong> {new Date(loan.createdAt * 1000).toLocaleDateString()}</p>
                        </div>
                      </div>
                      
                      <button 
                        className="button" 
                        style={{ marginLeft: '20px' }}
                        onClick={() => setSelectedLoanDetails(loan)}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Loan Details Modal */}
          {selectedLoanDetails && (
            <div className="card" style={{ background: 'transparent', border: '2px solid #667eea' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>Loan Request Details</h2>
                <button 
                  className="button button-secondary"
                  onClick={() => setSelectedLoanDetails(null)}
                >
                  ✕ Close
                </button>
              </div>

              {/* Status and Phase Info */}
              <div style={{ 
                background: 'transparent',
                padding: '15px',
                borderRadius: '8px',
                marginBottom: '20px',
                border: `2px solid ${selectedLoanDetails.status === 'Open' ? '#86efac' : 
                                     selectedLoanDetails.status === 'Reveal' ? '#fdba74' :
                                     selectedLoanDetails.status === 'Matched' ? '#93c5fd' : '#cbd5e0'}`
              }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
                  Status: {selectedLoanDetails.status}
                </div>
                {selectedLoanDetails.timePhase === 'commit' && (
                  <div style={{ fontSize: '13px', color: '#16a34a' }}>
                    ⏰ Commit Phase: {Math.floor(selectedLoanDetails.remainingTime / 3600)}h {Math.floor((selectedLoanDetails.remainingTime % 3600) / 60)}m remaining
                  </div>
                )}
                {selectedLoanDetails.timePhase === 'reveal' && (
                  <div style={{ fontSize: '13px', color: '#d97706' }}>
                    🔓 Reveal Phase: {Math.floor(selectedLoanDetails.remainingTime / 3600)}h {Math.floor((selectedLoanDetails.remainingTime % 3600) / 60)}m remaining
                  </div>
                )}
                {!selectedLoanDetails.timePhase && (
                  <div style={{ fontSize: '13px', color: '#718096' }}>
                    Phase ended
                  </div>
                )}
              </div>

              <table>
                <tbody>
                  <tr>
                    <td><strong>Request ID:</strong></td>
                    <td>#{selectedLoanDetails.id}</td>
                  </tr>
                  <tr>
                    <td><strong>Amount:</strong></td>
                    <td style={{ fontSize: '18px', color: '#667eea', fontWeight: 'bold' }}>
                      {selectedLoanDetails.amount} tokens
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Tenure:</strong></td>
                    <td>{selectedLoanDetails.tenure} months</td>
                  </tr>
                  <tr>
                    <td><strong>Category:</strong></td>
                    <td>{selectedLoanDetails.category || 'Not specified'}</td>
                  </tr>
                  <tr>
                    <td><strong>Purpose:</strong></td>
                    <td>{selectedLoanDetails.purpose}</td>
                  </tr>
                  <tr>
                    <td><strong>Expected Rate:</strong></td>
                    <td>{selectedLoanDetails.expectedRate || 'Not specified'}{selectedLoanDetails.expectedRate && '%'}</td>
                  </tr>
                  <tr>
                    <td><strong>Collateral Type:</strong></td>
                    <td>{selectedLoanDetails.collateralType || 'Not specified'}</td>
                  </tr>
                  <tr>
                    <td><strong>Collateral Value:</strong></td>
                    <td>{selectedLoanDetails.collateralValue || 'Not specified'} {selectedLoanDetails.collateralValue && 'tokens'}</td>
                  </tr>
                  <tr>
                    <td><strong>Commit Period:</strong></td>
                    <td>{selectedLoanDetails.commitPeriod}s ({(selectedLoanDetails.commitPeriod / 60).toFixed(0)} minutes)</td>
                  </tr>
                  <tr>
                    <td><strong>Reveal Period:</strong></td>
                    <td>{selectedLoanDetails.revealPeriod}s ({(selectedLoanDetails.revealPeriod / 60).toFixed(0)} minutes)</td>
                  </tr>
                  {selectedLoanDetails.remainingTime > 0 && (
                    <tr>
                      <td><strong>⏱️ Remaining Time:</strong></td>
                      <td style={{ color: '#e53e3e', fontWeight: 'bold' }}>
                        {selectedLoanDetails.remainingTime}s ({Math.floor(selectedLoanDetails.remainingTime / 60)}m {selectedLoanDetails.remainingTime % 60}s)
                        - {selectedLoanDetails.timePhase === 'commit' ? 'Commit Phase' : 'Reveal Phase'}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td><strong>Status:</strong></td>
                    <td><span className="status status-active">{selectedLoanDetails.status}</span></td>
                  </tr>
                  <tr>
                    <td><strong>Bids Received:</strong></td>
                    <td style={{ fontWeight: 'bold', color: '#48bb78' }}>{selectedLoanDetails.bids}</td>
                  </tr>
                  <tr>
                    <td><strong>Created On:</strong></td>
                    <td>{new Date(selectedLoanDetails.createdAt * 1000).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              {/* Revealed Bids Section */}
              {selectedLoanDetails.status === 'Reveal' && (
                <div style={{ marginTop: '20px', padding: '15px', background: 'white', borderRadius: '8px' }}>
                  <h3>💰 Revealed Bids</h3>
                  <button 
                    className="button button-secondary"
                    onClick={() => loadRevealedBids(selectedLoanDetails.id)}
                    style={{ marginBottom: '10px' }}
                  >
                    🔄 Refresh Bids
                  </button>
                  
                  {revealedBids[selectedLoanDetails.id] && revealedBids[selectedLoanDetails.id].length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', fontSize: '14px' }}>
                        <thead>
                          <tr>
                            <th style={{ padding: '12px 8px', textAlign: 'left' }}>Lender</th>
                            <th style={{ padding: '12px 8px', textAlign: 'left' }}>Rate</th>
                            <th style={{ padding: '12px 8px', textAlign: 'left' }}>Profile & Status</th>
                            <th style={{ padding: '12px 8px', textAlign: 'left' }}>Revealed</th>
                            <th style={{ padding: '12px 8px', textAlign: 'left' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {revealedBids[selectedLoanDetails.id]
                            .filter(bid => !bid.withdrawn)
                            .sort((a, b) => a.rateBP - b.rateBP)
                            .map((bid, index) => (
                            <tr key={index} style={{ 
                              background: index === 0 ? 'transparent' : 'transparent',
                              borderBottom: '1px solid #e2e8f0'
                            }}>
                              <td style={{ padding: '12px 8px' }}>
                                <div>
                                  <code style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                                    {bid.lender.substring(0, 10)}...{bid.lender.substring(38)}
                                  </code>
                                  {index === 0 && (
                                    <span style={{ 
                                      fontSize: '11px',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      background: 'transparent',
                                      color: '#16a34a',
                                      fontWeight: 'bold'
                                    }}>
                                      ⭐ Lowest Rate
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td style={{ 
                                padding: '12px 8px', 
                                fontWeight: 'bold', 
                                fontSize: '16px',
                                color: index === 0 ? '#16a34a' : 'white'
                              }}>
                                {bid.ratePercent}%
                              </td>
                              <td style={{ padding: '12px 8px' }}>
                                {/* Lender Profile */}
                                {bid.profile ? (
                                  <div style={{ marginBottom: '8px' }}>
                                    <div style={{ fontWeight: 'bold', color: 'white', marginBottom: '2px' }}>
                                      {bid.profile.displayName || 'Anonymous Lender'}
                                    </div>
                                    {bid.profile.businessName && (
                                      <div style={{ fontSize: '11px', color: 'white', marginBottom: '2px' }}>
                                        🏢 {bid.profile.businessName}
                                      </div>
                                    )}
                                    {bid.profile.lenderType && (
                                      <div style={{ 
                                        fontSize: '12px',
                                        padding: '2px 6px',
                                        borderRadius: '3px',
                                        background: 'white',
                                        color: '#4338ca',
                                        display: 'inline-block',
                                        marginBottom: '2px'
                                      }}>
                                        {bid.profile.lenderType}
                                      </div>
                                    )}
                                    {bid.profile.yearsExperience && (
                                      <div style={{ fontSize: '11px', color: 'white' }}>
                                        📅 {bid.profile.yearsExperience} years experience
                                      </div>
                                    )}
                                    {bid.profile.fundingCapacity && (
                                      <div style={{ fontSize: '11px', color: 'white' }}>
                                        💰 Capacity: {bid.profile.fundingCapacity} ETH
                                      </div>
                                    )}
                                  </div>
                                ) : null}
                                
                                {/* Oracle Status */}
                                {bid.lenderInfo.isOracle ? (
                                  <div>
                                    <div style={{ 
                                      fontSize: '11px',
                                      padding: '3px 8px',
                                      borderRadius: '4px',
                                      background: 'transparent',
                                      color: '#d97706',
                                      fontWeight: 'bold',
                                      display: 'inline-block',
                                      marginBottom: '4px'
                                    }}>
                                      ⭐ Tier {bid.lenderInfo.tier} Oracle
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'white' }}>
                                      Staked: {Number(bid.lenderInfo.stakedAmount).toLocaleString()} CIT
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'white' }}>
                                      Rep: {bid.lenderInfo.reputation}
                                    </div>
                                  </div>
                                ) : (
                                  <span style={{ 
                                    fontSize: '11px',
                                    color: 'transparent',
                                  }}>
                                    {!bid.profile && 'Regular Lender'}
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '12px 8px', fontSize: '12px', color: 'white' }}>
                                {new Date(bid.timestamp * 1000).toLocaleString()}
                              </td>
                              <td style={{ padding: '12px 8px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <button
                                    className="button"
                                    style={{ 
                                      padding: '8px 16px', 
                                      fontSize: '13px',
                                      background: index === 0 ? '#007129ff' : '#667eea',
                                      color: 'white'
                                    }}
                                    onClick={() => selectBid(selectedLoanDetails.id, bid.lender)}
                                  >
                                    {index === 0 ? 'Select Best' : 'Select'}
                                  </button>
                                  {bid.profile && (bid.profile.bio || bid.profile.preferredIndustries) && (
                                    <button
                                      style={{ 
                                        padding: '6px 12px', 
                                        fontSize: '11px',
                                        background: 'transparent',
                                        border: '1px solid #cbd5e0',
                                        color: 'white',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                      }}
                                      onClick={() => {
                                        alert(
                                          `👤 ${bid.profile.displayName || 'Lender'} Profile\n\n` +
                                          (bid.profile.businessName ? `Business: ${bid.profile.businessName}\n` : '') +
                                          (bid.profile.lenderType ? `Type: ${bid.profile.lenderType}\n` : '') +
                                          (bid.profile.yearsExperience ? `Experience: ${bid.profile.yearsExperience} years\n` : '') +
                                          (bid.profile.fundingCapacity ? `Capacity: ${bid.profile.fundingCapacity} ETH\n` : '') +
                                          (bid.profile.preferredIndustries ? `\nPreferred Industries:\n${bid.profile.preferredIndustries}\n` : '') +
                                          (bid.profile.bio ? `\nAbout:\n${bid.profile.bio}` : '')
                                        );
                                      }}
                                    >
                                      📋 View Full Profile
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="tips-box">
                        <strong>💡 Tips:</strong>
                        <ul>
                          <li>Lenders with complete profiles show their experience and funding capacity</li>
                          <li>Oracle-verified lenders have staked CIT tokens and have reputation scores</li>
                          <li>Higher tier oracles have more tokens at stake, showing commitment</li>
                          <li>Click "View Full Profile" to see lender's bio and preferred industries</li>
                          <li>Consider both the interest rate AND the lender's credibility</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <p className="text-secondary italic">
                      {revealedBids[selectedLoanDetails.id] ? 'No bids revealed yet. Wait for reveal phase to end.' : 'Click "Refresh Bids" to load revealed bids'}
                    </p>
                  )}
                </div>
              )}

              {/* Non-Revealing Lenders Section - Show after reveal deadline */}
              {selectedLoanDetails && selectedLoanDetails.status !== 'Open' && (
                <div className="mt-4">
                  <div className="d-flex justify-between align-center mb-3">
                    <h3 className="text-primary">⚠️ Non-Revealing Lenders (Slashable)</h3>
                    <button
                      onClick={async () => {
                        const lenders = await loadNonRevealingLenders(selectedLoanDetails.id);
                        setNonRevealingLenders(prev => ({ ...prev, [selectedLoanDetails.id]: lenders }));
                      }}
                      style={{
                        padding: '8px 16px',
                        background: '#f59e0b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Check Non-Revealing Lenders
                    </button>
                  </div>
                  
                  {nonRevealingLenders[selectedLoanDetails.id] && nonRevealingLenders[selectedLoanDetails.id].length > 0 ? (
                    <div>
                      <p style={{ color: '#d97706', marginBottom: '15px', background: '#fff7ed', padding: '10px', borderRadius: '4px' }}>
                        These lenders committed bids but failed to reveal them during the reveal period. 
                        You can slash their deposits as compensation for wasting your time.
                      </p>
                      
                      {nonRevealingLenders[selectedLoanDetails.id].map((lender, idx) => (
                        <div 
                          key={idx}
                          style={{
                            padding: '15px',
                            background: '#fef2f2',
                            border: '1px solid #fca5a5',
                            borderRadius: '8px',
                            marginBottom: '10px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ marginBottom: '8px' }}>
                                <strong>Lender:</strong>{' '}
                                <span style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>
                                  {lender.address.slice(0, 10)}...{lender.address.slice(-8)}
                                </span>
                              </div>
                              
                              {lender.profile && (
                                <div style={{ marginBottom: '8px', padding: '8px', background: '#fff7ed', borderRadius: '4px' }}>
                                  <div style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#2d3748' }}>
                                    {lender.profile.displayName || 'Anonymous'}
                                  </div>
                                  {lender.profile.businessName && (
                                    <div style={{ fontSize: '0.85em', color: '#4a5568' }}>
                                      🏢 {lender.profile.businessName}
                                    </div>
                                  )}
                                  {lender.profile.lenderType && (
                                    <div style={{ fontSize: '0.8em', color: '#718096' }}>
                                      Type: {lender.profile.lenderType}
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              <div style={{ marginBottom: '8px' }}>
                                <strong>Slashable Deposit:</strong> {lender.deposit} ETH
                              </div>
                              
                              {lender.lenderInfo.isOracle && (
                                <div style={{ color: '#7c3aed', fontSize: '0.9em' }}>
                                  🔮 Registered Oracle | Stake: {lender.lenderInfo.stakedAmount} CIT | Rep: {lender.lenderInfo.reputation}
                                </div>
                              )}
                            </div>
                            
                            <button
                              onClick={() => slashNonRevealingLender(
                                selectedLoanDetails.id,
                                lender.address,
                                lender.deposit
                              )}
                              disabled={
                                loading || 
                                (slashedLenders[selectedLoanDetails.id] && 
                                 slashedLenders[selectedLoanDetails.id][lender.address.toLowerCase()])
                              }
                              style={{
                                padding: '10px 20px',
                                background: (slashedLenders[selectedLoanDetails.id] && 
                                            slashedLenders[selectedLoanDetails.id][lender.address.toLowerCase()]) 
                                  ? '#9ca3af' 
                                  : '#dc2626',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: (loading || (slashedLenders[selectedLoanDetails.id] && 
                                        slashedLenders[selectedLoanDetails.id][lender.address.toLowerCase()])) 
                                  ? 'not-allowed' 
                                  : 'pointer',
                                fontWeight: 'bold',
                                marginLeft: '15px'
                              }}
                            >
                              {(slashedLenders[selectedLoanDetails.id] && 
                                slashedLenders[selectedLoanDetails.id][lender.address.toLowerCase()]) 
                                ? '✅ Slashed' 
                                : '⚡ Slash'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : nonRevealingLenders[selectedLoanDetails.id] ? (
                    <p style={{ color: '#10b981', background: 'transparent', padding: '10px', borderRadius: '4px' }}>
                      ✅ All lenders who committed bids have revealed them. No lenders to slash.
                    </p>
                  ) : (
                    <p style={{ color: '#718096', fontStyle: 'italic' }}>
                      Click "Check Non-Revealing Lenders" to see if any lenders failed to reveal their bids.
                    </p>
                  )}
                </div>
              )}

              {selectedLoanDetails.status === 'Matched' && (
                <div style={{ marginTop: '20px', padding: '15px', background: 'transparent', borderRadius: '8px', border: '1px solid #86efac' }}>
                  <h3 style={{ color: '#16a34a', marginTop: 0 }}>✅ Bid Selected!</h3>
                  <p style={{ marginBottom: 0 }}>The lender can now create a loan agreement. Check the "Agreements" tab once it's created.</p>
                </div>
              )}

              {selectedLoanDetails.status === 'Expired' && (
                <div style={{ marginTop: '20px', padding: '15px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fca5a5' }}>
                  <h3 style={{ color: '#dc2626', marginTop: 0 }}>⏰ Loan Request Expired</h3>
                  <p style={{ marginBottom: 0 }}>
                    The reveal deadline passed without enough bids being revealed. You can create a new loan request with adjusted terms.
                  </p>
                </div>
              )}

              {selectedLoanDetails.status === 'Cancelled' && (
                <div style={{ marginTop: '20px', padding: '15px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fca5a5' }}>
                  <h3 style={{ color: '#dc2626', marginTop: 0 }}>❌ Loan Request Cancelled</h3>
                  <p style={{ marginBottom: 0 }}>
                    This loan request was cancelled. You can create a new loan request if you still need funding.
                  </p>
                </div>
              )}

              {(selectedLoanDetails.status === 'Open' || selectedLoanDetails.status === 'Reveal') && selectedLoanDetails.bids === 0 && (
                <div style={{ marginTop: '20px', padding: '15px', background: 'transparent', borderRadius: '8px', border: '1px solid #fdba74' }}>
                  <h3 style={{ color: '#d97706', marginTop: 0 }}>⏳ No Bids Yet</h3>
                  <p style={{ marginBottom: 0 }}>
                    Wait for lenders to submit their bids. Check back closer to the reveal deadline.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Agreements Tab */}
      {tab === 'agreements' && (
        <div className="card">
          <h2>Loan Agreements</h2>
          <p style={{ color: '#718096', marginBottom: '20px' }}>
            View all loan agreements created after bid selection
          </p>

          {loanAgreements.length === 0 ? (
            <div className="alert" style={{ background: 'transparent', color: 'red' }}>
              <strong>No Agreements Yet !</strong>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Agreement ID</th>
                  <th>Marketplace ID</th>
                  <th>Lender</th>
                  <th>Amount</th>
                  <th>Interest Rate</th>
                  <th>Tenure</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loanAgreements.map((agreement) => (
                  <tr key={agreement.recordId}>
                    <td><strong>#{agreement.recordId}</strong></td>
                    <td>#{agreement.marketplaceId}</td>
                    <td>
                      <code style={{ fontSize: '11px' }}>
                        {agreement.lender.substring(0, 8)}...{agreement.lender.substring(38)}
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
                                   agreement.status === 'Repaid' ? '#e0f2fe' : 
                                   agreement.status === 'Disputed' ? '#fef3c7' : '#fee',
                        color: agreement.status === 'Active' ? '#22543d' : 
                               agreement.status === 'Repaid' ? '#0c4a6e' : 
                               agreement.status === 'Disputed' ? '#92400e' : '#742a2a'
                      }}>
                        {agreement.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '13px' }}>
                      {new Date(agreement.createdAt * 1000).toLocaleDateString()}
                    </td>
                    <td>
                      {agreement.status === 'Active' && (
                        <button
                          onClick={() => handleRecordRepayment(agreement)}
                          className="button-secondary"
                          style={{
                            padding: '6px 12px',
                            fontSize: '13px',
                            fontWeight: '600',
                            background: 'rgba(10, 108, 23, 1)',
                            width: '80%', 
                            color: 'white'
                          }}
                        >
                          Record Repayment
                        </button>
                      )}
                      {/* {(agreement.status === 'Active' || agreement.status === 'Disputed') && (
                        <button
                          onClick={() => handleRaiseIssue(agreement.recordId)}
                          className="button-secondary"
                          style={{
                            padding: '6px 12px',
                            fontSize: '13px', 
                            background: 'orange', width: '45%'
                          }}
                        >
                          ⚠️ Raise Issue
                        </button>
                      )} */}
                      {agreement.status === 'Repaid' && (
                        <span style={{ color: '#10b981', fontSize: '13px' }}>✅ Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Issues Tab */}
      {tab === 'issues' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2>Issues & Disputes</h2>
              <p style={{ color: '#718096', margin: 0 }}>
                Raise disputes and track resolution status
              </p>
            </div>
            <button
              onClick={() => handleRaiseIssue()}
              className="button"
              style={{ background: '#ef4444', color: 'white' }}
            >
              Raise New Issue
            </button>
          </div>

          {loadingIssues ? (
            <div className="alert" style={{ background: '#f7fafc', border: '1px solid #cbd5e0' }}>
              Loading issues...
            </div>
          ) : issues.length === 0 ? (
            <div className="alert" style={{ background: 'transparent', color: '#166534' }}>
              <strong>No Issues</strong><br/>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Issue ID</th>
                  <th>Loan Record</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Evidence</th>
                  <th>Resolution</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => (
                  <tr key={issue.issueId}>
                    <td><strong>#{issue.issueId}</strong></td>
                    <td>#{issue.recordId}</td>
                    <td style={{ maxWidth: '200px', wordWrap: 'break-word' }}>
                      {issue.reason}
                    </td>
                    <td>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        background: issue.status === 'Open' ? '#fef3c7' : 
                                   issue.status === 'Under Review' ? '#dbeafe' :
                                   issue.status === 'Resolved' ? '#d1fae5' : '#fee2e2',
                        color: issue.status === 'Open' ? '#92400e' : 
                               issue.status === 'Under Review' ? '#1e40af' :
                               issue.status === 'Resolved' ? '#065f46' : '#991b1b'
                      }}>
                        {issue.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '13px' }}>
                      {new Date(issue.createdAt * 1000).toLocaleDateString()}
                    </td>
                    <td>
                      {issue.evidenceHash && (
                        <a
                          href={`https://ipfs.io/ipfs/${issue.evidenceHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#667eea', textDecoration: 'none', fontSize: '13px' }}
                        >
                          📎 View Evidence
                        </a>
                      )}
                    </td>
                    <td>
                      {issue.status === 'Resolved' && issue.resolutionDetails ? (
                        <div style={{ fontSize: '13px' }}>
                          <a
                            href={`https://ipfs.io/ipfs/${issue.resolutionDetails}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#10b981', textDecoration: 'none' }}
                          >
                            📄 View Resolution
                          </a>
                          {issue.penalizedParty !== '0x0000000000000000000000000000000000000000' && (
                            <div style={{ marginTop: '5px', color: '#dc2626' }}>
                              Penalty: -{issue.penaltyAmount} reputation
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '13px', color: '#9ca3af' }}>Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div style={{ marginTop: '20px', padding: '15px', background: 'transparent', borderRadius: '8px', border: '1px solid #93c5fd' }}>
            <h4 style={{ marginTop: 0, color: '#1e40af' }}> How Issue Resolution Works</h4>
            <ol style={{ margin: 0, paddingLeft: '20px', color: 'white' }}>
              <li>You raise an issue with evidence (documents, screenshots, etc.)</li>
              <li>Governance reviews and marks the issue as "Under Review"</li>
              <li>The dispute is resolved off-chain (e.g., courts, arbitration, mediation)</li>
              <li>Governance records the final resolution on-chain</li>
              <li>Any penalties are automatically applied based on the court/arbitration decision</li>
            </ol>
          </div>
        </div>
      )}

      {/* Consensus Details Modal */}
      {showConsensusModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'black',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <h2 style={{ margin: 0, color: 'black'}}> Consensus Results</h2>
              <button
                onClick={() => setShowConsensusModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#718096'
                }}
              >
                ×
              </button>
            </div>

            {loadingConsensus ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>⏳</div>
                <p>Loading consensus details...</p>
              </div>
            ) : consensusDetails ? (
              <div>
                {/* Consensus Summary */}
                <div style={{
                  padding: '20px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  // background: 'transparent',
                  border: `2px solid ${consensusDetails.consensusReached
                    ? (consensusDetails.approved ? '#86efac' : '#fca5a5')
                    : '#cbd5e0'}`
                }}>
                  <h3 style={{ marginTop: 0, color: consensusDetails.consensusReached
                    ? (consensusDetails.approved ? '#16a34a' : '#dc2626')
                    : '#4a5568'
                  }}>
                    {consensusDetails.consensusReached
                      ? (consensusDetails.approved ? '✅ Attestation Approved' : '❌ Attestation Rejected')
                      : '⏳ Consensus Pending'
                    }
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>Total Oracles</div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{consensusDetails.totalOracles}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>Required for Consensus</div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                        {Math.ceil(consensusDetails.totalOracles * 0.66)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>Approvals</div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#16a34a' }}>
                        {consensusDetails.approvalCount}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>Rejections</div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc2626' }}>
                        {consensusDetails.rejectionCount}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Oracle Votes Breakdown */}
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ marginBottom: '15px' }}>
                    {consensusDetails.consensusReached ? 'Oracle Votes' : 'Assigned Oracles'}
                  </h3>
                  {consensusDetails.assignedOracles.map((oracle, index) => {
                    const isInMajority = consensusDetails.majorityOracles.includes(oracle);
                    const showVote = consensusDetails.consensusReached;
                    
                    return (
                      <div key={index} style={{
                        padding: '12px',
                        borderRadius: '6px',
                        marginBottom: '8px',
                        background: 'transparent',
                        border: showVote
                          ? `1px solid ${isInMajority ? '#86efac' : '#fca5a5'}`
                          : '1px solid #bae6fd',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '18px' }}>
                            {showVote ? (isInMajority ? '✅' : '❌') : '👤'}
                          </span>
                          <div>
                            <div style={{ fontSize: '12px', color: '#718096' }}>Oracle {index + 1}</div>
                            <code style={{ fontSize: '11px' }}>{oracle.substring(0, 10)}...{oracle.slice(-8)}</code>
                          </div>
                        </div>
                        {showVote && (
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            color: isInMajority ? '#16a34a' : '#dc2626',
                            background: isInMajority ? '#dcfce7' : '#fee2e2'
                          }}>
                            {isInMajority ? 'Approved' : 'Rejected'}
                          </span>
                        )}
                        {!showVote && (
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            color: '#0284c7',
                            background: '#e0f2fe'
                          }}>
                            Assigned
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Info Note */}
                <div style={{
                  padding: '15px',
                  borderRadius: '8px',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  fontSize: '13px',
                  color: '#1e40af'
                }}>
                  <strong>ℹ️ Note:</strong> This platform uses a 66% consensus threshold. 
                  At least {Math.ceil(consensusDetails.totalOracles * 0.66)} out of {consensusDetails.totalOracles} oracles 
                  must agree for consensus to be reached.
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
                <p>No consensus data available for this request.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Repayment Recording Modal */}
      {showRepaymentModal && selectedAgreementForRepayment && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'black',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h2 style={{ marginTop: 0 }}> Record Loan Repayment</h2>
            
            <div style={{ marginBottom: '20px', padding: '15px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #86efac' }}>
              <div style={{ fontSize: '14px', color: '#166534' }}>
                <strong>Agreement ID:</strong> #{selectedAgreementForRepayment.recordId}<br/>
                <strong>Amount:</strong> {selectedAgreementForRepayment.amount} CIT<br/>
                <strong>Interest Rate:</strong> {selectedAgreementForRepayment.ratePercent}% APR
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label className="label">Upload Proof of Repayment *</label>
              <p style={{ fontSize: '13px', color: '#718096', marginTop: '5px', marginBottom: '10px' }}>
                Upload bank transfer receipt, transaction screenshot, or payment confirmation
              </p>
              <input
                type="file"
                onChange={handleRepaymentFileChange}
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                style={{
                  padding: '10px',
                  border: '2px dashed #cbd5e0',
                  borderRadius: '8px',
                  width: '100%',
                  cursor: 'pointer'
                }}
              />
              {repaymentProofFile && (
                <div style={{ marginTop: '10px', fontSize: '13px', color: '#059669' }}>
                  ✓ Selected: {repaymentProofFile.name}
                </div>
              )}
            </div>

            {repaymentProofFile && !repaymentProofHash && (
              <button
                onClick={uploadRepaymentProofToIPFS}
                disabled={uploadingRepaymentProof}
                className="button"
                style={{
                  width: '100%',
                  marginBottom: '15px',
                  background: '#0891b2'
                }}
              >
                {uploadingRepaymentProof ? '⏳ Uploading...' : '📤 Upload to IPFS'}
              </button>
            )}

            {repaymentProofHash && (
              <div style={{
                marginBottom: '20px',
                padding: '12px',
                background: '#ecfdf5',
                borderRadius: '8px',
                border: '1px solid #6ee7b7'
              }}>
                <div style={{ fontSize: '13px', color: '#047857' }}>
                  <strong>✅ Proof Uploaded</strong><br/>
                  IPFS Hash: <code style={{ fontSize: '11px' }}>{repaymentProofHash}</code>
                </div>
              </div>
            )}

            <div style={{ marginTop: '20px', padding: '15px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #93c5fd' }}>
              <div style={{ fontSize: '13px', color: '#1e40af' }}>
                <strong>📊 Reputation Impact:</strong><br/>
                Your reputation will be updated based on repayment timing:
                <ul style={{ margin: '10px 0 0 0', paddingLeft: '20px' }}>
                  <li>Very Early (30+ days): +100 points</li>
                  <li>Early (7-29 days): +75 points</li>
                  <li>On Time (±6 days): +50 points</li>
                  <li>Slightly Late (7-30 days): -50 points</li>
                  <li>Late (31-90 days): -100 points</li>
                  <li>Very Late (90+ days): -150 points</li>
                </ul>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={submitRepayment}
                disabled={!repaymentProofHash || recordingRepayment}
                className="button"
                style={{
                  flex: 1,
                  background: repaymentProofHash ? '#10b981' : '#cbd5e0',
                  cursor: repaymentProofHash ? 'pointer' : 'not-allowed'
                }}
              >
                {recordingRepayment ? '⏳ Recording...' : '✅ Record Repayment'}
              </button>
              <button
                onClick={() => {
                  setShowRepaymentModal(false);
                  setSelectedAgreementForRepayment(null);
                  setRepaymentProofHash('');
                  setRepaymentProofFile(null);
                }}
                className="button-secondary"
                disabled={recordingRepayment}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Raise Issue Modal */}
      {showRaiseIssueModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'black',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h2 style={{ marginTop: 0 }}>⚠️ Raise Issue / Dispute</h2>
            
            <div style={{ marginBottom: '20px' }}>
              <label className="label">Loan Record ID *</label>
              <input
                type="number"
                className="input"
                value={issueRecordId}
                onChange={(e) => setIssueRecordId(e.target.value)}
                placeholder="Enter loan agreement ID"
                min="1"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label className="label">Reason for Issue *</label>
              <textarea
                className="input"
                value={issueReason}
                onChange={(e) => setIssueReason(e.target.value)}
                placeholder="Describe the issue in detail..."
                rows={4}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label className="label">Evidence Document *</label>
              <p style={{ fontSize: '13px', color: '#718096', marginTop: '5px', marginBottom: '10px' }}>
                Upload supporting evidence (contracts, emails, screenshots, etc.)
              </p>
              <input
                type="file"
                onChange={handleIssueEvidenceFileChange}
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt"
                style={{
                  padding: '10px',
                  border: '2px dashed #cbd5e0',
                  borderRadius: '8px',
                  width: '100%',
                  cursor: 'pointer'
                }}
              />
              {issueEvidenceFile && (
                <div style={{ marginTop: '10px', fontSize: '13px', color: '#059669' }}>
                  ✓ Selected: {issueEvidenceFile.name}
                </div>
              )}
            </div>

            {issueEvidenceFile && !issueEvidenceHash && (
              <button
                onClick={uploadIssueEvidenceToIPFS}
                disabled={uploadingIssueEvidence}
                className="button"
                style={{
                  width: '100%',
                  marginBottom: '15px',
                  background: '#0891b2'
                }}
              >
                {uploadingIssueEvidence ? '⏳ Uploading...' : '📤 Upload Evidence to IPFS'}
              </button>
            )}

            {issueEvidenceHash && (
              <div style={{
                marginBottom: '20px',
                padding: '12px',
                background: '#ecfdf5',
                borderRadius: '8px',
                border: '1px solid #6ee7b7'
              }}>
                <div style={{ fontSize: '13px', color: '#047857' }}>
                  <strong>✅ Evidence Uploaded</strong><br/>
                  IPFS Hash: <code style={{ fontSize: '11px' }}>{issueEvidenceHash}</code>
                </div>
              </div>
            )}

            <div style={{ marginTop: '20px', padding: '15px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fbbf24' }}>
              <div style={{ fontSize: '13px', color: '#92400e' }}>
                <strong>⚖️ What Happens Next:</strong><br/>
                <ol style={{ margin: '10px 0 0 0', paddingLeft: '20px' }}>
                  <li>Your issue will be recorded on the blockchain</li>
                  <li>Governance will review and mark as "Under Review"</li>
                  <li>The dispute will be resolved off-chain (courts/arbitration)</li>
                  <li>The final decision will be recorded on-chain</li>
                  <li>Any penalties will be automatically applied</li>
                </ol>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={submitIssue}
                disabled={!issueRecordId || !issueReason || !issueEvidenceHash || raisingIssue}
                className="button"
                style={{
                  flex: 1,
                  background: (issueRecordId && issueReason && issueEvidenceHash) ? '#ef4444' : '#cbd5e0',
                  cursor: (issueRecordId && issueReason && issueEvidenceHash) ? 'pointer' : 'not-allowed'
                }}
              >
                {raisingIssue ? '⏳ Submitting...' : '⚠️ Submit Issue'}
              </button>
              <button
                onClick={() => {
                  setShowRaiseIssueModal(false);
                  setIssueRecordId('');
                  setIssueReason('');
                  setIssueEvidenceFile(null);
                  setIssueEvidenceHash('');
                }}
                className="button-secondary"
                disabled={raisingIssue}
                style={{ flex: 1 }}
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

export default MSMEDashboard;
