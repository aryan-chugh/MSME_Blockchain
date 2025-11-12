import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getContractInstance, CONTRACT_ADDRESSES, parseTokens, formatTokens } from '../../utils/contracts';

function OracleDashboard({ account, provider, signer }) {
  const [stakeAmount, setStakeAmount] = useState('');
  const [staking, setStaking] = useState(false);
  const [isOracle, setIsOracle] = useState(false);
  const [oracleInfo, setOracleInfo] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [txStatus, setTxStatus] = useState('');
  const [attestationHistory, setAttestationHistory] = useState([]);
  const [acceptedRequests, setAcceptedRequests] = useState(new Set()); // Track accepted requests by this oracle
  
  // Commit form state
  const [showCommitForm, setShowCommitForm] = useState(false);
  const [commitDecision, setCommitDecision] = useState('approve'); // 'approve' or 'reject'
  const [commitComments, setCommitComments] = useState('');
  const [commitValidityDays, setCommitValidityDays] = useState(365);
  
  // Oracle earnings and penalties from blockchain
  const [oracleEarnings, setOracleEarnings] = useState({ total: 0, count: 0 });
  const [oraclePenalties, setOraclePenalties] = useState({ total: 0, count: 0 });

  // Tab state
  const [tab, setTab] = useState('overview'); // 'overview' or 'collusion'
  
  // Collusion monitoring state
  const [collusionAlerts, setCollusionAlerts] = useState([]);
  const [loadingCollusion, setLoadingCollusion] = useState(false);

  // Calculate tier based on staked amount
  const calculateTier = (stakedAmount) => {
    const amount = ethers.toBigInt(stakedAmount);
    const tier1 = ethers.parseUnits('50000', 18);  // 50k CIT
    const tier2 = ethers.parseUnits('100000', 18); // 100k CIT
    const tier3 = ethers.parseUnits('200000', 18); // 200k CIT
    
    if (amount >= tier3) return 3;
    if (amount >= tier2) return 2;
    if (amount >= tier1) return 1;
    return 0;
  };

  // Load oracle status from blockchain
  useEffect(() => {
    const loadOracleStatus = async () => {
      if (!account || !provider) return;
      
      try {
        const stakingContract = getContractInstance('OracleStaking', provider);
        const oracleData = await stakingContract.getOracleInfo(account);
        
        console.log('Oracle Data:', oracleData);
        console.log('Staked Amount (raw):', oracleData[0]);
        console.log('Staked Amount (toString):', oracleData[0]?.toString());
        
        // OracleInfo struct: [stakedAmount, reputationScore, attestationCount, slashCount, registrationTime, lastWithdrawTime, lastReputationUpdateTime, isActive, consensusAgreements, consensusDisagreements, perfectConsensusCount, noConsensusCount]
        // Check if oracleData exists and has stakedAmount (index 0)
        if (oracleData && oracleData[0] && oracleData[0] > 0) {
          // Calculate tier locally based on staked amount
          const tier = calculateTier(oracleData[0]);
          
          console.log('Oracle is staked! Tier:', tier);
          
          setIsOracle(true);
          setOracleInfo({
            stakedAmount: formatTokens(oracleData[0]), // stakedAmount
            reputation: oracleData[1].toString(), // reputationScore
            tier: tier.toString(),
            attestations: oracleData[2].toString(), // attestationCount
            slashCount: oracleData[3]?.toString() || '0', // slashCount
            consensusAgreements: oracleData[8]?.toString() || '0', // consensusAgreements
            consensusDisagreements: oracleData[9]?.toString() || '0', // consensusDisagreements
            perfectConsensusCount: oracleData[10]?.toString() || '0', // perfectConsensusCount
            noConsensusCount: oracleData[11]?.toString() || '0' // noConsensusCount
          });
        } else {
          console.log('No stake found');
          setIsOracle(false);
          setOracleInfo(null);
        }
      } catch (error) {
        console.error('Error loading oracle status:', error);
        // Set default state on error
        setIsOracle(false);
        setOracleInfo(null);
      }
    };
    
    loadOracleStatus();
    // Refresh every 10 seconds
    const interval = setInterval(loadOracleStatus, 10000);
    return () => clearInterval(interval);
  }, [account, provider]);

  // Load oracle earnings and penalties from blockchain events
  useEffect(() => {
    const loadEarningsAndPenalties = async () => {
      if (!account || !provider || !isOracle) {
        console.log('⏭️ Skipping earnings/penalties load:', { account: !!account, provider: !!provider, isOracle });
        return;
      }

      try {
        console.log('💰 Loading earnings and penalties for oracle:', account);
        
        // Get earnings from FeeDistributed events
        const attestationContract = getContractInstance('AttestationRegistry', provider);
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 100000); // Last ~2 weeks
        
        console.log(`📊 Querying FeeDistributed events from block ${fromBlock} to ${currentBlock}`);
        
        // Query FeeDistributed events
        const feeFilter = attestationContract.filters.FeeDistributed();
        const feeEvents = await attestationContract.queryFilter(feeFilter, fromBlock, 'latest');
        
        console.log(`✅ Found ${feeEvents.length} FeeDistributed events`);
        
        if (feeEvents.length > 0) {
          console.log('📋 FeeDistributed events details:');
          feeEvents.forEach((event, idx) => {
            console.log(`  Event ${idx + 1}:`, {
              requestId: event.args.requestId?.toString(),
              oracles: event.args.oracles,
              totalFee: ethers.formatUnits(event.args.totalFee, 18),
              blockNumber: event.blockNumber,
              includesThisOracle: event.args.oracles?.some(addr => addr.toLowerCase() === account.toLowerCase())
            });
          });
        }
        
        // Calculate total earnings for this oracle
        let totalEarned = ethers.toBigInt(0);
        let earnCount = 0;
        
        for (const event of feeEvents) {
          const { oracles: oracleAddresses, totalFee } = event.args;
          // Check if this oracle was in the list
          if (oracleAddresses && oracleAddresses.some(addr => addr.toLowerCase() === account.toLowerCase())) {
            // Fee is split equally among oracles
            const oracleCount = ethers.toBigInt(oracleAddresses.length);
            const sharePerOracle = totalFee / oracleCount;
            totalEarned += sharePerOracle;
            earnCount++;
            console.log(`  💵 Earned ${ethers.formatUnits(sharePerOracle, 18)} CIT from request`);
          }
        }
        
        console.log(`💰 Total earnings: ${ethers.formatUnits(totalEarned, 18)} CIT from ${earnCount} attestations`);
        
        setOracleEarnings({
          total: parseFloat(ethers.formatUnits(totalEarned, 18)).toFixed(2),
          count: earnCount
        });
        
        // Get penalties from OracleSlashed events
        const stakingContract = getContractInstance('OracleStaking', provider);
        const slashFilter = stakingContract.filters.OracleSlashed(account);
        const slashEvents = await stakingContract.queryFilter(slashFilter, fromBlock, 'latest');
        
        console.log(`⚠️ Found ${slashEvents.length} OracleSlashed events for ${account}`);
        
        // Calculate total slashed amount
        let totalSlashed = ethers.toBigInt(0);
        
        for (const event of slashEvents) {
          const { amount } = event.args;
          totalSlashed += amount;
          console.log(`  🔴 Slashed ${ethers.formatUnits(amount, 18)} CIT`);
        }
        
        console.log(`🔴 Total slashed: ${ethers.formatUnits(totalSlashed, 18)} CIT from ${slashEvents.length} incidents`);
        
        setOraclePenalties({
          total: parseFloat(ethers.formatUnits(totalSlashed, 18)).toFixed(2),
          count: slashEvents.length
        });
        
      } catch (error) {
        console.error('❌ Error loading earnings/penalties:', error);
      }
    };

    loadEarningsAndPenalties();
    const interval = setInterval(loadEarningsAndPenalties, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [account, provider, isOracle]);

  // Load attestation history from blockchain events
  useEffect(() => {
    const loadAttestationHistory = async () => {
      if (!account || !provider || !isOracle) return;

      try {
        const attestationContract = getContractInstance('AttestationRegistry', provider);
        
        // Query AttestationMade events where issuer is the current oracle
        const filter = attestationContract.filters.AttestationMade(null, account, null);
        
        console.log('Querying attestation history for oracle:', account);
        
        // Query last 50,000 blocks (roughly 1 week on Sepolia)
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 50000);
        
        const events = await attestationContract.queryFilter(filter, fromBlock, 'latest');
        
        console.log(`Found ${events.length} attestation events`);
        
        if (events.length === 0) {
          setAttestationHistory([]);
          return;
        }

        const history = await Promise.all(events.map(async (event) => {
          try {
            const { msmeId, schemaId, attestationIndex } = event.args;
            
            // Get schema details
            let schemaName = 'Unknown Schema';
            try {
              const schema = await attestationContract.getSchema(schemaId);
              schemaName = schema.name;
            } catch (error) {
              console.error('Error fetching schema:', error);
            }

            // Get attestation details
            const attestations = await attestationContract.getAttestations(msmeId);
            const attestation = attestations[Number(attestationIndex)];
            
            return {
              msmeAddress: msmeId,
              schemaName,
              timestamp: new Date(Number(attestation.timestamp) * 1000).toLocaleString(),
              revoked: attestation.revoked,
              txHash: event.transactionHash
            };
          } catch (error) {
            console.error('Error processing attestation event:', error);
            return null;
          }
        }));

        // Filter out any null entries from errors
        setAttestationHistory(history.filter(h => h !== null));
      } catch (error) {
        console.error('Error loading attestation history:', error);
        setAttestationHistory([]);
      }
    };

    loadAttestationHistory();
    const interval = setInterval(loadAttestationHistory, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [account, provider, isOracle]);

  // Auto-refresh selected request details to keep oracle count up-to-date
  useEffect(() => {
    if (!selectedRequest || !provider) return;
    
    const refreshInterval = setInterval(async () => {
      try {
        console.log('🔄 Auto-refreshing selected request:', selectedRequest.id);
        await viewRequestDetails(selectedRequest);
      } catch (error) {
        console.error('Error auto-refreshing request:', error);
      }
    }, 5000); // Refresh every 5 seconds while modal is open
    
    return () => clearInterval(refreshInterval);
  }, [selectedRequest?.id, provider]);

  // Load pending attestation requests FROM BLOCKCHAIN
  useEffect(() => {
    const loadRequests = async () => {
      if (!provider || !isOracle) return;

      try {
        const attestationContract = getContractInstance('AttestationRegistry', provider);
        
        // Get all pending request IDs from contract
        // Note: You may need to query events or have a getter function
        // For now, we'll try to get requests by querying events
        
        const filter = attestationContract.filters.AttestationRequested();
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 50000); // Last ~50k blocks
        
        const events = await attestationContract.queryFilter(filter, fromBlock, 'latest');
        
        console.log(`Found ${events.length} attestation request events`);
        
        if (events.length === 0) {
          setPendingRequests([]);
          return;
        }
        
        // Get details for each request
        const requests = await Promise.all(
          events.map(async (event) => {
            try {
              const requestId = event.args.requestId;
              const details = await attestationContract.getRequestDetails(requestId);
              
              // Only show requests where:
              // 1. Status is Pending (0) - can accept
              // 2. Status is OraclesAssigned (1) and you're assigned - can commit
              // 3. Status is Committing (2) and you're assigned - can commit/reveal
              // 4. Status is Revealing (3) and you're assigned - can reveal
              const requestStatus = Number(details.status);
              const assignedOracles = details.assignedOracles || [];
              // CRITICAL: Use case-insensitive comparison for Ethereum addresses
              const isAssigned = assignedOracles.some(oracle => 
                oracle.toLowerCase() === account.toLowerCase()
              );
              
              console.log(`Request ${requestId}: Status=${requestStatus}, AssignedOracles=[${assignedOracles.join(', ')}], IsAssigned=${isAssigned}, YourAccount=${account}`);
              
              // Show all requests where you're assigned (including completed ones for transparency)
              // Status 0 (Pending) - anyone can see and accept
              // Status > 0 and assigned - show request at any stage
              if (requestStatus === 0 || (requestStatus > 0 && isAssigned)) {
                console.log(`  ✅ Including request ${requestId}`);
              } else {
                console.log(`  ❌ Skipping - Not pending and not assigned`);
                return null;
              }
              
              // Get schema name from schemaId
              let schemaName = 'Unknown Schema';
              try {
                const schema = await attestationContract.getSchema(details.schemaId);
                schemaName = schema.name;
              } catch (e) {
                console.log('Could not get schema name for', details.schemaId);
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
              
              return {
                id: Number(details.id),
                msmeAddress: details.msme,
                schema: schemaName,
                schemaId: details.schemaId,
                documentHash: details.documentHash,
                documentUrl: details.documentUrl,
                additionalData: additionalDataStr,
                fee: formatTokens(details.feePaid),
                requestedAt: Number(details.timestamp) * 1000,
                status: details.status,
                documentType: schemaName,
                assignedOracles: details.assignedOracles || [],
                requiredOracles: Number(details.requiredOracles),
                acceptedBy: details.assignedOracles || [], // Use blockchain data
                committedBy: [], // Track in localStorage
                revealedBy: [] // Track in localStorage
              };
            } catch (error) {
              console.error('Error loading request details:', error);
              return null;
            }
          })
        );
        
        // Filter out nulls and merge with localStorage tracking
        const validRequests = requests.filter(r => r !== null);
        
        // Merge with localStorage for UI tracking (acceptedBy, committedBy, revealedBy)
        const stored = localStorage.getItem('oracleRequestTracking');
        if (stored) {
          const tracking = JSON.parse(stored);
          validRequests.forEach(req => {
            const tracked = tracking[req.id];
            if (tracked) {
              req.acceptedBy = tracked.acceptedBy || [];
              req.committedBy = tracked.committedBy || [];
              req.revealedBy = tracked.revealedBy || [];
            }
          });
        }
        
        setPendingRequests(validRequests);
        
        console.log(`📊 Total requests loaded for ${account}: ${validRequests.length}`);
        validRequests.forEach(req => {
          console.log(`  - Request ${req.id}: Status=${req.status}, Assigned=${req.assignedOracles?.length}/${req.requiredOracles}`);
        });
        
        // Initialize acceptedRequests Set from blockchain data
        const accepted = new Set();
        validRequests.forEach(req => {
          // CRITICAL: Use case-insensitive comparison for Ethereum addresses
          const isAssignedToThis = req.assignedOracles?.some(oracle => 
            oracle.toLowerCase() === account.toLowerCase()
          );
          if (isAssignedToThis) {
            accepted.add(req.id);
          }
        });
        setAcceptedRequests(accepted);
        
      } catch (error) {
        console.error('Error loading requests from blockchain:', error);
        setPendingRequests([]);
      }
    };
    
    loadRequests();
    // Check for new requests every 10 seconds
    const interval = setInterval(loadRequests, 10000);
    return () => clearInterval(interval);
  }, [provider, isOracle]);

  // Load collusion alerts when tab is switched
  useEffect(() => {
    if (tab === 'collusion' && provider) {
      loadCollusionAlerts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, provider]);

  if (!account) {
    return (
      <div className="card">
        <h2>Oracle Dashboard</h2>
        <div className="alert alert-info">
          Please connect your wallet to access the oracle dashboard
        </div>
      </div>
    );
  }

  const stakeTokens = async (e) => {
    e.preventDefault();
    
    if (!stakeAmount || parseFloat(stakeAmount) < 50000) {
      alert('Minimum stake is 50,000 CIT tokens');
      return;
    }

    if (!signer) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      setStaking(true);
      setTxStatus('Preparing transaction...');
      
      // Get contract instances
      const tokenContract = getContractInstance('CIToken', signer);
      const stakingContract = getContractInstance('OracleStaking', signer);
      
      const amount = parseTokens(stakeAmount);
      
      // Step 1: Check balance
      setTxStatus('Checking token balance...');
      const balance = await tokenContract.balanceOf(account);
      if (balance < amount) {
        throw new Error(`Insufficient CIT balance. You have ${formatTokens(balance)} CIT`);
      }
      
      // Step 2: Check allowance
      setTxStatus('Checking token allowance...');
      const allowance = await tokenContract.allowance(account, CONTRACT_ADDRESSES.OracleStaking);
      
      // Step 3: Approve if needed
      if (allowance < amount) {
        setTxStatus('Approving tokens... (1/2) - Confirm in wallet');
        const approveTx = await tokenContract.approve(CONTRACT_ADDRESSES.OracleStaking, amount);
        setTxStatus('Waiting for approval confirmation...');
        await approveTx.wait();
        setTxStatus('✅ Tokens approved!');
      }
      
      // Step 4: Stake tokens
      setTxStatus('Staking tokens... (2/2) - Confirm in wallet');
      const stakeTx = await stakingContract.stake(amount);
      setTxStatus('Waiting for staking confirmation...');
      const receipt = await stakeTx.wait();
      
      // Step 5: Success!
      const txHash = receipt.hash;
      setTxStatus(`✅ Successfully staked ${stakeAmount} CIT!`);
      
      alert(`✅ Successfully staked ${stakeAmount} CIT tokens!\n\nTransaction: ${txHash.substring(0, 10)}...\n\nView on Etherscan:\nhttps://sepolia.etherscan.io/tx/${txHash}`);
      
      setTxStatus('Updating oracle info...');
      
      // Reload oracle info immediately
      try {
        const stakingContractRead = getContractInstance('OracleStaking', provider);
        const oracleData = await stakingContractRead.getOracleInfo(account);
        const tier = calculateTier(oracleData[0]);
        
        console.log('New oracle data:', oracleData);
        
        setIsOracle(true);
        setOracleInfo({
          stakedAmount: formatTokens(oracleData[0]), // stakedAmount
          reputation: oracleData[1].toString(), // reputationScore
          tier: tier.toString(),
          attestations: oracleData[2].toString() // attestationCount
        });
        setStakeAmount('');
        setTxStatus('');
      } catch (reloadError) {
        console.error('Error reloading oracle info:', reloadError);
        setStakeAmount('');
        setTxStatus('');
      }
      
    } catch (error) {
      console.error('Error staking:', error);
      let errorMsg = 'Transaction failed';
      
      if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        errorMsg = 'Transaction rejected by user';
      } else if (error.message.includes('insufficient funds')) {
        errorMsg = 'Insufficient SepoliaETH for gas fees';
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      alert(`❌ Error: ${errorMsg}`);
      setTxStatus('');
    } finally {
      setStaking(false);
    }
  };

  const getTier = (amount) => {
    const amt = parseFloat(amount);
    if (amt >= 1000000) return 4;
    if (amt >= 500000) return 3;
    if (amt >= 200000) return 2;
    if (amt >= 50000) return 1;
    return 0;
  };

  const getTierBadge = (tier) => {
    const badges = {
      1: { class: 'badge-tier1', label: 'Tier 1' },
      2: { class: 'badge-tier2', label: 'Tier 2' },
      3: { class: 'badge-tier3', label: 'Tier 3' },
      4: { class: 'badge-tier4', label: 'Tier 4' }
    };
    const badge = badges[tier] || badges[1];
    return <span className={`badge ${badge.class}`}>{badge.label}</span>;
  };

  const increaseStake = async () => {
    const additionalAmount = prompt('Enter additional CIT tokens to stake:');
    if (!additionalAmount || parseFloat(additionalAmount) <= 0) return;

    if (!signer) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      setTxStatus('Increasing stake...');
      
      const tokenContract = getContractInstance('CIToken', signer);
      const stakingContract = getContractInstance('OracleStaking', signer);
      
      const amount = parseTokens(additionalAmount);
      
      // Check balance
      const balance = await tokenContract.balanceOf(account);
      if (balance < amount) {
        throw new Error(`Insufficient CIT balance. You have ${formatTokens(balance)} CIT`);
      }
      
      // Check and approve if needed
      const allowance = await tokenContract.allowance(account, CONTRACT_ADDRESSES.OracleStaking);
      if (allowance < amount) {
        setTxStatus('Approving tokens... Confirm in wallet');
        const approveTx = await tokenContract.approve(CONTRACT_ADDRESSES.OracleStaking, amount);
        await approveTx.wait();
      }
      
      // Use stake() function to increase stake (deployed contract reuses stake() for both initial and increase)
      setTxStatus('Increasing stake... Confirm in wallet');
      const tx = await stakingContract.stake(amount);
      setTxStatus('Waiting for confirmation...');
      await tx.wait();
      
      alert(`✅ Successfully increased stake by ${additionalAmount} CIT!\n\nView on Etherscan:\nhttps://sepolia.etherscan.io/tx/${tx.hash}`);
      
      setTxStatus('Updating oracle info...');
      
      // Reload oracle info immediately
      try {
        const stakingContractRead = getContractInstance('OracleStaking', provider);
        const oracleData = await stakingContractRead.getOracleInfo(account);
        const tier = calculateTier(oracleData[0]);
        
        console.log('Updated oracle data:', oracleData);
        
        setOracleInfo({
          stakedAmount: formatTokens(oracleData[0]), // stakedAmount
          reputation: oracleData[1].toString(), // reputationScore
          tier: tier.toString(),
          attestations: oracleData[2].toString() // attestationCount
        });
        setTxStatus('');
      } catch (reloadError) {
        console.error('Error reloading oracle info:', reloadError);
        setTxStatus('');
        // Info will be updated on next auto-refresh
      }
      
    } catch (error) {
      console.error('Error increasing stake:', error);
      let errorMsg = error.code === 'ACTION_REJECTED' ? 'Transaction rejected' : error.message;
      alert(`❌ Error: ${errorMsg}`);
      setTxStatus('');
    }
  };

  const withdrawStake = async () => {
    if (!window.confirm('Are you sure you want to withdraw your stake?\n\nThis will:\n- Remove oracle status\n- Require 24-hour cooldown\n- Clear all reputation')) {
      return;
    }

    if (!signer) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      setTxStatus('Initiating withdrawal...');
      
      const stakingContract = getContractInstance('OracleStaking', signer);
      
      setTxStatus('Confirm withdrawal in wallet...');
      const tx = await stakingContract.initiateWithdrawal();
      setTxStatus('Waiting for confirmation...');
      await tx.wait();
      
      alert('✅ Withdrawal initiated!\n\n⏰ 24-hour cooldown period started\n\nTokens will be available after cooldown.\n\nView on Etherscan:\nhttps://sepolia.etherscan.io/tx/' + tx.hash);
      
      // Reload oracle info
      setTimeout(async () => {
        const stakingContractRead = getContractInstance('OracleStaking', provider);
        const oracleData = await stakingContractRead.getOracleInfo(account);
        
        if (oracleData && oracleData[0] > 0) {
          const tier = calculateTier(oracleData[0]);
          setOracleInfo({
            stakedAmount: formatTokens(oracleData[0]), // stakedAmount
            reputation: oracleData[1].toString(), // reputationScore
            tier: tier.toString(),
            attestations: oracleData[2].toString() // attestationCount
          });
        } else {
          setIsOracle(false);
          setOracleInfo(null);
        }
        setTxStatus('');
      }, 2000);
      
    } catch (error) {
      console.error('Error withdrawing stake:', error);
      let errorMsg = error.code === 'ACTION_REJECTED' ? 'Transaction rejected' : error.message;
      alert(`❌ Error: ${errorMsg}`);
      setTxStatus('');
    }
  };

  const viewRequestDetails = async (request) => {
    try {
      // Reload request from blockchain to get latest state
      const attestationContract = getContractInstance('AttestationRegistry', provider);
      const details = await attestationContract.getRequestDetails(request.id);
      
      // Get schema name
      let schemaName = request.schema || 'Unknown Schema';
      try {
        const schema = await attestationContract.getSchema(details.schemaId);
        schemaName = schema.name;
      } catch (e) {
        console.log('Could not get schema name');
      }
      
      // Safely decode additionalData
      let additionalDataStr = '';
      try {
        if (details.additionalData && details.additionalData !== '0x' && details.additionalData !== '0x00') {
          additionalDataStr = ethers.toUtf8String(details.additionalData);
        }
      } catch (e) {
        additionalDataStr = details.additionalData || '';
      }
      
      // Get localStorage tracking
      const tracking = JSON.parse(localStorage.getItem('oracleRequestTracking') || '{}');
      const requestTracking = tracking[request.id] || { acceptedBy: [], committedBy: [], revealedBy: [] };
      
      // Check commitment status from blockchain for current account
      let hasCommittedOnChain = false;
      let hasRevealedOnChain = false;
      try {
        const commitment = await attestationContract.getOracleCommitment(request.id, account);
        // Commitment is returned as object with named properties
        console.log('🔍 VIEW REQUEST - Raw commitment from blockchain:', commitment);
        
        if (commitment) {
          hasCommittedOnChain = commitment.hasCommitted || false;
          hasRevealedOnChain = commitment.hasRevealed || false;
          console.log('🔍 VIEW REQUEST - Commitment status from blockchain:', { 
            requestId: request.id, 
            account,
            hasCommittedOnChain, 
            hasRevealedOnChain,
            commitmentHash: commitment.commitmentHash,
            commitTimestamp: commitment.commitTimestamp?.toString(),
            attestationData: commitment.attestationData || '0x'
          });
        } else {
          console.log('🔍 VIEW REQUEST - No commitment found for this oracle yet');
        }
      } catch (e) {
        console.log('Could not fetch commitment status from blockchain (oracle may not have committed yet):', e.message);
      }
      
      // Build updated request with fresh blockchain data
      const updatedRequest = {
        id: Number(details.id),
        msmeAddress: details.msme,
        schema: schemaName,
        schemaId: details.schemaId,
        documentHash: details.documentHash,
        documentUrl: details.documentUrl,
        additionalData: additionalDataStr,
        fee: formatTokens(details.feePaid),
        requestedAt: Number(details.timestamp) * 1000,
        status: details.status,
        documentType: schemaName,
        assignedOracles: details.assignedOracles || [],
        requiredOracles: Number(details.requiredOracles),
        acceptedBy: details.assignedOracles || [], // From blockchain
        committedBy: hasCommittedOnChain ? [account] : [], // From blockchain
        revealedBy: hasRevealedOnChain ? [account] : [], // From blockchain
        hasCommittedOnChain, // Add blockchain flag
        hasRevealedOnChain // Add blockchain flag
      };
      
      console.log('Loaded fresh request details:', updatedRequest);
      setSelectedRequest(updatedRequest);
    } catch (error) {
      console.error('Error loading request details:', error);
      // Fallback to the request passed in
      setSelectedRequest(request);
    }
  };

  // Define tier requirements for each schema type
  const SCHEMA_TIER_REQUIREMENTS = {
    'GST Revenue': 2,
    'Bank Statements': 2,
    'Credit Score': 3,
    'KYC Verification': 1,
    'Business License': 1,
    'Tax Returns': 2
  };

  const rejectRequest = async (requestId, reason) => {
    try {
      const stored = localStorage.getItem('attestationRequests');
      if (!stored) return;

      const allRequests = JSON.parse(stored);
      const request = allRequests.find(req => req.id === requestId);
      
      if (!request) {
        alert('❌ Request not found');
        return;
      }

      // Track rejections
      const rejections = JSON.parse(localStorage.getItem('attestationRejections') || '[]');
      rejections.push({
        requestId: request.id,
        msmeAddress: request.msmeAddress,
        schema: request.schema,
        documentHash: request.documentHash,
        oracle: account,
        oracleTier: oracleInfo.tier,
        reason: reason || 'Document verification failed',
        timestamp: Date.now()
      });
      localStorage.setItem('attestationRejections', JSON.stringify(rejections));

      // Update request status
      const updatedRequests = allRequests.map(req => 
        req.id === requestId 
          ? { ...req, status: 'Rejected', rejectedBy: account, rejectedAt: Date.now(), rejectionReason: reason }
          : req
      );
      localStorage.setItem('attestationRequests', JSON.stringify(updatedRequests));

      // Remove from pending list
      setPendingRequests(prev => prev.filter(req => req.id !== requestId));
      setSelectedRequest(null);

      alert(`❌ Attestation request rejected.\n\nReason: ${reason || 'Document verification failed'}`);
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Error: ' + error.message);
    }
  };

  // STEP 0: Accept attestation request (required before commit)
  const handleAcceptRequest = async (requestId) => {
    try {
      // FIRST CHECK: Already accepted in this session
      if (acceptedRequests.has(requestId)) {
        alert(`❌ You have already accepted this request in this session.\n\nPlease refresh the page to see the updated status.`);
        return;
      }

      setTxStatus('Validating request...');

      // Get contract instances
      const signer = await provider.getSigner();
      const attestationContract = getContractInstance('AttestationRegistry', signer);
      const stakingContract = getContractInstance('OracleStaking', provider);

      // Pre-flight checks
      try {
        // Check request details
        const details = await attestationContract.getRequestDetails(requestId);
        
        console.log('Request Details:', {
          id: requestId,
          status: Number(details.status),
          assignedOracles: details.assignedOracles?.length,
          requiredOracles: Number(details.requiredOracles),
          assignmentDeadline: Number(details.assignmentDeadline),
          currentTime: Math.floor(Date.now() / 1000)
        });
        
        // Check 1: Request must be Pending (status 0)
        if (Number(details.status) !== 0) {
          const statusLabels = ['Pending', 'Oracles Assigned', 'Committing', 'Revealing', 'Consensus Reached', 'No Consensus', 'Completed', 'Rejected', 'Cancelled', 'Disputed'];
          alert(`❌ Cannot accept this request\n\nRequest status: ${statusLabels[Number(details.status)]}\n\nYou can only accept requests with status "Pending".`);
          setTxStatus('');
          return;
        }
        
        // Check 2: All oracles not already assigned
        const assignedCount = details.assignedOracles?.length || 0;
        const requiredCount = Number(details.requiredOracles);
        
        if (assignedCount >= requiredCount) {
          alert(`❌ Cannot accept this request\n\nAll required oracles (${requiredCount}) have already been assigned.`);
          setTxStatus('');
          return;
        }
        
        // Check 3: Already assigned
        // CRITICAL: Use case-insensitive comparison for Ethereum addresses
        const alreadyAssigned = details.assignedOracles?.some(oracle => 
          oracle.toLowerCase() === account.toLowerCase()
        );
        if (alreadyAssigned) {
          alert(`❌ You have already accepted this request\n\nYou are already assigned to this attestation request.`);
          setTxStatus('');
          return;
        }
        
        // Check 4: Assignment deadline
        const currentTime = Math.floor(Date.now() / 1000);
        if (currentTime > Number(details.assignmentDeadline)) {
          alert(`❌ Assignment period expired\n\nThe deadline for accepting this request has passed.`);
          setTxStatus('');
          return;
        }
        
        // Check 5: Oracle eligibility
        const oracleData = await stakingContract.getOracleInfo(account);
        
        if (!oracleData.isActive) {
          alert(`❌ Oracle not active\n\nYour oracle account is not active. Please check your staking status.`);
          setTxStatus('');
          return;
        }
        
        const minimumStake = await stakingContract.MINIMUM_STAKE();
        if (oracleData.stakedAmount < minimumStake) {
          alert(`❌ Insufficient stake\n\nMinimum required: ${ethers.formatUnits(minimumStake, 18)} CIT\nYour stake: ${ethers.formatUnits(oracleData.stakedAmount, 18)} CIT`);
          setTxStatus('');
          return;
        }
        
        if (Number(oracleData.slashCount) >= 3) {
          alert(`❌ Too many slashes\n\nYour oracle has been slashed ${oracleData.slashCount} times. Maximum allowed is 2.`);
          setTxStatus('');
          return;
        }
        
        // Check 6: Cooldown period for this MSME
        try {
          const lastAttestationTime = await attestationContract.lastAttestationTime(account, details.msme);
          const cooldownPeriod = await attestationContract.ORACLE_MSME_COOLDOWN();
          const lastTime = Number(lastAttestationTime);
          const cooldown = Number(cooldownPeriod);
          const currentTime = Math.floor(Date.now() / 1000);
          
          console.log('Cooldown check:', {
            lastAttestationTime: lastTime,
            lastAttestationDate: lastTime > 0 ? new Date(lastTime * 1000).toLocaleString() : 'Never',
            cooldownPeriod: cooldown,
            cooldownDays: cooldown / (24 * 60 * 60),
            currentTime: currentTime,
            timeElapsed: currentTime - lastTime,
            cooldownEnds: lastTime + cooldown,
            cooldownEndsDate: new Date((lastTime + cooldown) * 1000).toLocaleString(),
            canAccept: currentTime >= (lastTime + cooldown)
          });
          
          if (lastTime > 0 && currentTime < (lastTime + cooldown)) {
            const timeRemaining = (lastTime + cooldown) - currentTime;
            const daysRemaining = Math.ceil(timeRemaining / (24 * 60 * 60));
            const cooldownEndsDate = new Date((lastTime + cooldown) * 1000);
            const lastAttestDate = new Date(lastTime * 1000);
            
            alert(
              `❌ Cooldown Period Active\n\n` +
              `You attested for this MSME on:\n${lastAttestDate.toLocaleString()}\n\n` +
              `Cooldown Period: 30 days\n` +
              `Time Remaining: ${daysRemaining} day(s)\n\n` +
              `You can accept again on:\n${cooldownEndsDate.toLocaleString()}\n\n` +
              `This prevents oracles from repeatedly attesting for the same MSME.`
            );
            setTxStatus('');
            return;
          }
        } catch (cooldownError) {
          console.warn('Could not check cooldown (might not be implemented):', cooldownError);
          // Continue - cooldown check is optional if not in contract
        }
        
        console.log('✅ All pre-flight checks passed');
        
      } catch (error) {
        console.error('Pre-flight validation error:', error);
        alert('❌ Error validating request:\n\n' + (error.message || 'Unknown error'));
        setTxStatus('');
        return;
      }

      setTxStatus('Accepting request...');
      console.log('Calling acceptRequest for:', requestId);
      console.log('Contract address:', attestationContract.target);
      console.log('Account:', account);
      
      // Double-check request state right before transaction
      try {
        const finalCheck = await attestationContract.getRequestDetails(requestId);
        console.log('Final state check before accept:', {
          requestId: requestId,
          status: Number(finalCheck.status),
          statusName: ['Pending', 'OraclesAssigned', 'Committing', 'Revealing', 'ConsensusReached', 'NoConsensus', 'Completed', 'Rejected', 'Cancelled', 'Disputed'][Number(finalCheck.status)],
          assignedOracles: finalCheck.assignedOracles,
          assignedCount: finalCheck.assignedOracles?.length,
          requiredCount: Number(finalCheck.requiredOracles),
          alreadyAssigned: finalCheck.assignedOracles?.some(o => o.toLowerCase() === account.toLowerCase()),
          assignmentDeadline: Number(finalCheck.assignmentDeadline),
          currentTime: Math.floor(Date.now() / 1000),
          deadlineExpired: Math.floor(Date.now() / 1000) > Number(finalCheck.assignmentDeadline)
        });
        
        // Check if already assigned (case-insensitive)
        if (finalCheck.assignedOracles?.some(o => o.toLowerCase() === account.toLowerCase())) {
          alert('❌ You have already accepted this request.\n\nYou are in the assignedOracles array.\n\nRefresh the page to see updated status.');
          setTxStatus('');
          return;
        }
        
        if (Number(finalCheck.status) !== 0) {
          const statusNames = ['Pending', 'OraclesAssigned', 'Committing', 'Revealing', 'ConsensusReached', 'NoConsensus', 'Completed', 'Rejected', 'Cancelled', 'Disputed'];
          alert(`❌ Request status has changed.\n\nCurrent Status: ${statusNames[Number(finalCheck.status)]}\n\nYou can only accept requests with status "Pending".\n\nPlease refresh the page.`);
          setTxStatus('');
          return;
        }
        
        if (finalCheck.assignedOracles?.length >= Number(finalCheck.requiredOracles)) {
          alert(`❌ All required oracles already assigned.\n\nAssigned: ${finalCheck.assignedOracles.length}\nRequired: ${Number(finalCheck.requiredOracles)}\n\nRefresh the page.`);
          setTxStatus('');
          return;
        }
        
        if (Math.floor(Date.now() / 1000) > Number(finalCheck.assignmentDeadline)) {
          alert(`❌ Assignment deadline has expired.\n\nDeadline: ${new Date(Number(finalCheck.assignmentDeadline) * 1000).toLocaleString()}\n\nCurrent: ${new Date().toLocaleString()}`);
          setTxStatus('');
          return;
        }
      } catch (checkError) {
        console.error('Final check error:', checkError);
        alert('❌ Error checking request state:\n\n' + checkError.message);
        setTxStatus('');
        return;
      }

      // Try staticCall first to get better error message
      try {
        console.log('Attempting staticCall...');
        await attestationContract.acceptRequest.staticCall(requestId);
        console.log('✅ Static call successful - transaction should work');
      } catch (staticError) {
        console.error('❌ Static call failed:', staticError);
        console.error('Static error details:', {
          code: staticError.code,
          message: staticError.message,
          data: staticError.data,
          reason: staticError.reason
        });
        
        let errorMsg = '❌ Transaction will fail:\n\n';
        
        // Check if it's a "missing revert data" error
        if (staticError.code === 'CALL_EXCEPTION' && staticError.message.includes('missing revert data')) {
          errorMsg += 'Contract reverted without error message.\n\n';
          errorMsg += 'Possible causes:\n';
          errorMsg += '• Contract might be paused\n';
          errorMsg += '• You may have already accepted (check console logs)\n';
          errorMsg += '• Request may be in wrong state\n';
          errorMsg += '• Gas estimation failed\n\n';
          errorMsg += 'Check browser console (F12) for detailed logs.';
        } else if (staticError.message.includes('Request does not exist')) {
          errorMsg += 'Request does not exist on blockchain.';
        } else if (staticError.message.includes('Request not pending')) {
          errorMsg += 'Request is no longer in Pending status.\nIt may have already been assigned to oracles.';
        } else if (staticError.message.includes('Assignment period expired')) {
          errorMsg += 'Assignment period has expired for this request.';
        } else if (staticError.message.includes('All oracles assigned')) {
          errorMsg += 'All required oracles have already been assigned.';
        } else if (staticError.message.includes('Already assigned')) {
          errorMsg += 'You have already accepted this request.';
        } else if (staticError.message.includes('Oracle not active')) {
          errorMsg += 'Your oracle is not active. Check staking status.';
        } else if (staticError.message.includes('Insufficient stake')) {
          errorMsg += 'Insufficient stake amount.';
        } else if (staticError.message.includes('Too many slashes')) {
          errorMsg += 'Your oracle has been slashed too many times.';
        } else if (staticError.message.includes('Insufficient reputation')) {
          errorMsg += 'Insufficient reputation for this complexity tier.';
        } else if (staticError.message.includes('Cooldown period')) {
          errorMsg += 'Cooldown period not over for this MSME.';
        } else {
          errorMsg += 'Error details:\n' + staticError.message;
        }
        
        alert(errorMsg);
        setTxStatus('');
        return;
      }

      // Call acceptRequest on blockchain
      const tx = await attestationContract.acceptRequest(requestId);

      setTxStatus('Waiting for confirmation...');
      const receipt = await tx.wait();
      console.log('Request accepted! Transaction:', receipt.hash);

      // Reload request details from blockchain to get updated assignedOracles
      setTxStatus('Reloading request details...');
      const updatedDetails = await attestationContract.getRequestDetails(requestId);
      
      // Get schema name
      let schemaName = selectedRequest?.schema || 'Unknown Schema';
      try {
        const schema = await attestationContract.getSchema(updatedDetails.schemaId);
        schemaName = schema.name;
      } catch (e) {
        console.log('Could not get schema name');
      }
      
      // Safely decode additionalData
      let additionalDataStr = '';
      try {
        if (updatedDetails.additionalData && updatedDetails.additionalData !== '0x' && updatedDetails.additionalData !== '0x00') {
          additionalDataStr = ethers.toUtf8String(updatedDetails.additionalData);
        }
      } catch (e) {
        additionalDataStr = updatedDetails.additionalData || '';
      }

      // Update tracking in localStorage
      const tracking = JSON.parse(localStorage.getItem('oracleRequestTracking') || '{}');
      if (!tracking[requestId]) {
        tracking[requestId] = { acceptedBy: [], committedBy: [], revealedBy: [] };
      }
      if (!tracking[requestId].acceptedBy.includes(account)) {
        tracking[requestId].acceptedBy.push(account);
      }
      tracking[requestId].acceptTxHash = receipt.hash;
      localStorage.setItem('oracleRequestTracking', JSON.stringify(tracking));
      
      // Update selectedRequest with BLOCKCHAIN data
      const updatedRequest = {
        id: Number(updatedDetails.id),
        msmeAddress: updatedDetails.msme,
        schema: schemaName,
        schemaId: updatedDetails.schemaId,
        documentHash: updatedDetails.documentHash,
        documentUrl: updatedDetails.documentUrl,
        additionalData: additionalDataStr,
        fee: formatTokens(updatedDetails.feePaid),
        requestedAt: Number(updatedDetails.timestamp) * 1000,
        status: updatedDetails.status,
        documentType: schemaName,
        assignedOracles: updatedDetails.assignedOracles || [],
        requiredOracles: Number(updatedDetails.requiredOracles),
        acceptedBy: updatedDetails.assignedOracles || [],
        committedBy: tracking[requestId].committedBy || [],
        revealedBy: tracking[requestId].revealedBy || [],
        acceptTxHash: receipt.hash
      };
      
      setSelectedRequest(updatedRequest);

      // Mark as accepted in this session
      setAcceptedRequests(prev => new Set([...prev, requestId]));

      setTxStatus('');
      
      const assignedCount = updatedDetails.assignedOracles?.length || 0;
      const requiredCount = Number(updatedDetails.requiredOracles) || 0;
      
      alert(
        `✅ Request accepted successfully!\n\n` +
        `You are now assigned to this attestation request.\n` +
        `Oracle Assignment: ${assignedCount}/${requiredCount}\n\n` +
        (assignedCount >= requiredCount 
          ? `✅ All required oracles assigned - You can now commit!\n\n`
          : `⏳ Waiting for ${requiredCount - assignedCount} more oracle(s) to accept before committing.\n\n`) +
        `Transaction: ${receipt.hash}`
      );
      
    } catch (error) {
      console.error('Error accepting request:', error);
      setTxStatus('');
      alert('Error accepting request: ' + (error.reason || error.message));
    }
  };

  // Open commit form modal
  const openCommitForm = (requestId) => {
    if (!selectedRequest || selectedRequest.id !== requestId) {
      alert('❌ Request not found');
      return;
    }
    
    // Reset form
    setCommitDecision('approve');
    setCommitComments('');
    setCommitValidityDays(365);
    setShowCommitForm(true);
  };

  // PHASE 1: Commit attestation hash (without revealing actual decision)
  const handleCommitAttestation = async (requestId) => {
    try {
      // Get request details from selectedRequest (already loaded from blockchain)
      if (!selectedRequest || selectedRequest.id !== requestId) {
        alert('❌ Request not found');
        return;
      }

      const request = selectedRequest;

      // Check tier requirement for this schema
      const requiredTier = SCHEMA_TIER_REQUIREMENTS[request.schema] || 1;
      const currentTier = parseInt(oracleInfo.tier);

      if (currentTier < requiredTier) {
        alert(`❌ Insufficient Oracle Tier\n\nRequired: Tier ${requiredTier}\nYour Tier: ${currentTier}\n\nSchema "${request.schema}" requires Tier ${requiredTier} or higher.\n\nIncrease your stake to upgrade your tier.`);
        return;
      }

      setTxStatus('Verifying oracle assignment...');

      // Get contract instance with signer
      const signer = await provider.getSigner();
      const attestationContract = getContractInstance('AttestationRegistry', signer);

      // Verify oracle is assigned to this request on blockchain
      try {
        const details = await attestationContract.getRequestDetails(requestId);
        const assignedOracles = details.assignedOracles || [];
        const requiredOracles = Number(details.requiredOracles);
        const requestStatus = Number(details.status);
        
        // CRITICAL: Use case-insensitive comparison for Ethereum addresses
        const isAssignedToRequest = assignedOracles.some(oracle => 
          oracle.toLowerCase() === account.toLowerCase()
        );
        
        if (!isAssignedToRequest) {
          alert('❌ You are not assigned to this request.\n\nPlease accept the request first before committing.');
          setTxStatus('');
          return;
        }
        
        // Check if enough oracles have accepted
        if (assignedOracles.length < requiredOracles) {
          alert(
            `⚠️ Waiting for more oracles to accept\n\n` +
            `Current: ${assignedOracles.length}/${requiredOracles} oracles accepted\n\n` +
            `You have accepted this request, but you cannot commit until all ${requiredOracles} required oracles have accepted.\n\n` +
            `Please wait for other oracles to accept this request.`
          );
          setTxStatus('');
          return;
        }
        
        // Check if request is in correct status (OraclesAssigned=1 or Committing=2)
        if (requestStatus !== 1 && requestStatus !== 2) {
          const statusLabels = [
            'Pending', 'Oracles Assigned', 'Committing', 'Revealing', 
            'Consensus Reached', 'No Consensus', 'Completed', 'Rejected', 'Cancelled', 'Disputed'
          ];
          alert(
            `❌ Request not in commit phase\n\n` +
            `Current Status: ${statusLabels[requestStatus] || 'Unknown'}\n\n` +
            `You can only commit when status is "Oracles Assigned" or "Committing".`
          );
          setTxStatus('');
          return;
        }
        
        // Check if already committed
        const commitment = await attestationContract.getOracleCommitment(requestId, account);
        // Commitment is returned as object with named properties
        if (commitment.hasCommitted) {
          alert('❌ You have already committed to this request.\n\nYou can only commit once. Please wait to reveal.');
          setTxStatus('');
          return;
        }
      } catch (error) {
        console.error('Error verifying assignment:', error);
        alert('❌ Error verifying oracle assignment.\n\nPlease make sure you have accepted this request first.');
        setTxStatus('');
        return;
      }

      setTxStatus('Preparing commitment...');

      // Encode attestation data with oracle's decision: [approved, comments, documentHash, schema]
      const attestationData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['bool', 'string', 'bytes32', 'string'],
        [
          commitDecision === 'approve', // true for approve, false for reject
          commitComments || 'No additional comments',
          request.documentHash,
          request.schema
        ]
      );

      console.log('Attestation Data:', {
        approved: commitDecision === 'approve',
        comments: commitComments,
        documentHash: request.documentHash,
        schema: request.schema
      });

      // Generate random secret for commit-reveal
      const secret = ethers.hexlify(ethers.randomBytes(32));
      
      // Create commitment hash: keccak256(attestationData + secret)
      const commitmentHash = ethers.keccak256(ethers.concat([attestationData, secret]));

      console.log('Committing attestation for request:', requestId);
      console.log('Commitment hash:', commitmentHash);

      // Submit commitment to blockchain
      setTxStatus('Submitting commitment to blockchain...');
      const tx = await attestationContract.commitAttestation(requestId, commitmentHash);

      setTxStatus('Waiting for confirmation...');
      const receipt = await tx.wait();
      console.log('Commitment submitted! Transaction:', receipt.hash);

      // Store secret and attestation data in localStorage for later reveal
      const commitmentKey = `commitment_${requestId}_${account}`;
      localStorage.setItem(commitmentKey, JSON.stringify({
        requestId,
        oracle: account,
        attestationData: attestationData,
        validityPeriod: commitValidityDays * 24 * 60 * 60, // Convert days to seconds
        secret: secret,
        commitmentHash: commitmentHash,
        decision: commitDecision,
        comments: commitComments,
        committedAt: Date.now(),
        txHash: receipt.hash
      }));

      // Update tracking in localStorage
      const tracking = JSON.parse(localStorage.getItem('oracleRequestTracking') || '{}');
      if (!tracking[requestId]) {
        tracking[requestId] = { acceptedBy: [], committedBy: [], revealedBy: [] };
      }
      if (!tracking[requestId].committedBy.includes(account)) {
        tracking[requestId].committedBy.push(account);
      }
      tracking[requestId].commitTxHash = receipt.hash;
      localStorage.setItem('oracleRequestTracking', JSON.stringify(tracking));
      
      // Fetch updated commitment status from blockchain
      const attestationContractRead = getContractInstance('AttestationRegistry', provider);
      let hasCommittedOnChain = false;
      let hasRevealedOnChain = false;
      try {
        const commitment = await attestationContractRead.getOracleCommitment(requestId, account);
        // Commitment is returned as object with named properties
        if (commitment) {
          hasCommittedOnChain = commitment.hasCommitted || false;
          hasRevealedOnChain = commitment.hasRevealed || false;
          console.log('🔍 AFTER COMMIT - Blockchain commitment state:', {
            requestId,
            account,
            commitmentHash: commitment.commitmentHash,
            commitTimestamp: commitment.commitTimestamp?.toString() || '0',
            hasCommitted: commitment.hasCommitted,
            hasRevealed: commitment.hasRevealed,
            attestationData: commitment.attestationData || '0x',
            secret: commitment.secret
          });
        }
      } catch (e) {
        console.log('Could not fetch updated commitment status:', e.message);
      }
      
      // Update selectedRequest with blockchain data
      if (selectedRequest && selectedRequest.id === requestId) {
        setSelectedRequest({
          ...selectedRequest,
          committedBy: hasCommittedOnChain ? [account] : tracking[requestId].committedBy,
          hasCommittedOnChain: hasCommittedOnChain,
          commitTxHash: receipt.hash
        });
      }

      setTxStatus('');
      setShowCommitForm(false); // Close the commit form
      
      alert(
        `✅ Commitment submitted successfully!\n\n` +
        `Decision: ${commitDecision === 'approve' ? '✅ APPROVED' : '❌ REJECTED'}\n` +
        `Comments: ${commitComments || 'None'}\n\n` +
        `⚠️ IMPORTANT: You must return later to REVEAL your attestation.\n\n` +
        `Your decision is now hidden on-chain as a hash.\n` +
        `Wait for other oracles to commit, then come back to reveal.\n\n` +
        `Transaction: ${receipt.hash}`
      );
      
    } catch (error) {
      console.error('Error committing attestation:', error);
      setTxStatus('');
      
      let errorMsg = 'Error committing attestation:\n\n';
      
      if (error.code === 'ACTION_REJECTED') {
        errorMsg += 'Transaction rejected by user';
      } else if (error.code === 'CALL_EXCEPTION' || error.message.includes('missing revert data')) {
        errorMsg += 'Contract rejected the transaction. Possible reasons:\n\n';
        errorMsg += '• You have not accepted this request yet\n';
        errorMsg += '• You have already committed\n';
        errorMsg += '• Request is not in the correct status\n';
        errorMsg += '• Verification period has ended\n\n';
        errorMsg += 'Please make sure you have accepted the request first.';
      } else {
        errorMsg += error.reason || error.message;
      }
      
      alert(errorMsg);
    }
  };

  // PHASE 2: Reveal attestation (after all oracles have committed)
  const handleRevealAttestation = async (requestId) => {
    try {
      // Retrieve stored commitment
      const commitmentKey = `commitment_${requestId}_${account}`;
      const stored = localStorage.getItem(commitmentKey);
      
      if (!stored) {
        alert('❌ No commitment found for this request.\n\nYou must commit before revealing.');
        return;
      }

      const commitment = JSON.parse(stored);
      
      setTxStatus('Preparing reveal...');

      // Get contract instance with signer
      const signer = await provider.getSigner();
      const attestationContract = getContractInstance('AttestationRegistry', signer);

      console.log('Revealing attestation for request:', requestId);
      console.log('Commitment details:', commitment);

      // Submit reveal to blockchain (attestationData, validityPeriod, secret)
      setTxStatus('Revealing attestation on blockchain...');
      const validityPeriod = commitment.validityPeriod || (365 * 24 * 60 * 60); // Use stored or default to 1 year
      const tx = await attestationContract.revealAttestation(
        requestId,
        commitment.attestationData,
        validityPeriod,
        commitment.secret
      );

      setTxStatus('Waiting for confirmation...');
      const receipt = await tx.wait();
      console.log('Attestation revealed! Transaction:', receipt.hash);

      // Update tracking in localStorage
      const tracking = JSON.parse(localStorage.getItem('oracleRequestTracking') || '{}');
      if (!tracking[requestId]) {
        tracking[requestId] = { acceptedBy: [], committedBy: [], revealedBy: [] };
      }
      if (!tracking[requestId].revealedBy.includes(account)) {
        tracking[requestId].revealedBy.push(account);
      }
      tracking[requestId].revealTxHash = receipt.hash;
      localStorage.setItem('oracleRequestTracking', JSON.stringify(tracking));
      
      // Fetch updated commitment status from blockchain
      const attestationContractRead = getContractInstance('AttestationRegistry', provider);
      let hasRevealedOnChain = false;
      try {
        const commitment = await attestationContractRead.getOracleCommitment(requestId, account);
        // Commitment is returned as object with named properties
        if (commitment) {
          hasRevealedOnChain = commitment.hasRevealed || false;
          console.log('🔍 AFTER REVEAL - Updated reveal status from blockchain:', {
            requestId,
            account,
            hasRevealed: commitment.hasRevealed,
            attestationData: commitment.attestationData || '0x'
          });
        }
      } catch (e) {
        console.log('Could not fetch updated commitment status:', e.message);
      }
      
      // Update selectedRequest with blockchain data
      if (selectedRequest && selectedRequest.id === requestId) {
        setSelectedRequest({
          ...selectedRequest,
          revealedBy: hasRevealedOnChain ? [account] : tracking[requestId].revealedBy,
          hasRevealedOnChain: hasRevealedOnChain,
          revealTxHash: receipt.hash
        });
      }

      // Clear commitment from localStorage
      localStorage.removeItem(commitmentKey);

      // Reload oracle info
      try {
        const stakingContractRead = getContractInstance('OracleStaking', provider);
        const oracleData = await stakingContractRead.getOracleInfo(account);
        
        if (oracleData && oracleData[0] > 0) {
          const tier = calculateTier(oracleData[0]);
          setOracleInfo({
            stakedAmount: formatTokens(oracleData[0]),
            reputation: oracleData[1].toString(),
            tier: tier.toString(),
            attestations: oracleData[2].toString()
          });
        }
      } catch (error) {
        console.error('Error reloading oracle info:', error);
      }

      setTxStatus('');
      
      alert(
        `✅ Attestation revealed successfully!\n\n` +
        `🎯 Waiting for consensus calculation...\n\n` +
        `Once all oracles reveal, consensus will be calculated automatically.\n\n` +
        `Transaction: ${receipt.hash}`
      );
      
      // Remove from pending list
      setPendingRequests(prev => prev.filter(req => req.id !== requestId));
      setSelectedRequest(null);
      
    } catch (error) {
      console.error('Error revealing attestation:', error);
      setTxStatus('');
      alert('Error: ' + error.message);
    }
  };

  // Load collusion alerts from blockchain
  const loadCollusionAlerts = async () => {
    if (!provider) return;
    
    try {
      setLoadingCollusion(true);
      const stakingContract = await getContractInstance('OracleStaking', provider);
      
      // Query CollusionDetected events
      const filter = stakingContract.filters.CollusionDetected();
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 100000); // Last ~100k blocks
      
      const events = await stakingContract.queryFilter(filter, fromBlock, 'latest');
      
      console.log(`Found ${events.length} collusion detection events`);
      
      const alerts = await Promise.all(events.map(async (event) => {
        try {
          const { oracle1, oracle2, similarityPercentage, timestamp } = event.args;
          
          return {
            oracle1: oracle1,
            oracle2: oracle2,
            similarityPercentage: Number(similarityPercentage),
            timestamp: new Date(Number(timestamp) * 1000).toLocaleString(),
            txHash: event.transactionHash,
            blockNumber: event.blockNumber
          };
        } catch (error) {
          console.error('Error processing collusion event:', error);
          return null;
        }
      }));
      
      setCollusionAlerts(alerts.filter(a => a !== null).reverse()); // Most recent first
    } catch (error) {
      console.error('Error loading collusion alerts:', error);
    } finally {
      setLoadingCollusion(false);
    }
  };

  return (
    <div>
      <div className="card">
        <h1>Oracle Dashboard</h1>
        <p style={{ color: '#718096' }}>
          Connected as: <strong>{account}</strong>
        </p>
      </div>

      {!isOracle ? (
        <div className="card">
          <h2>Become an Oracle</h2>
          <p style={{ color: '#718096', marginBottom: '20px' }}>
            Stake CIT tokens to become a trusted oracle and earn fees from attestations
          </p>

          <div className="alert alert-info" style={{ marginBottom: '20px' }}>
            <strong>Requirements:</strong>
            <ul style={{ marginTop: '8px', marginBottom: 0 }}>
              <li>Minimum stake: 50,000 CIT tokens</li>
              <li>Higher stakes unlock higher-value attestations</li>
              <li>Earn fees for each attestation provided</li>
              <li>Build reputation over time</li>
            </ul>
          </div>

          <form onSubmit={stakeTokens}>
            <label className="label">Stake Amount (CIT)</label>
            <input 
              type="number"
              className="input"
              placeholder="50000"
              step="1000"
              min="50000"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              required
            />

            <div style={{ marginTop: '12px', marginBottom: '20px', color: '#718096' }}>
              {stakeAmount && parseFloat(stakeAmount) >= 50000 && (
                <div>
                  <strong>Your Tier:</strong> {getTierBadge(getTier(stakeAmount))}
                </div>
              )}
            </div>

            {txStatus && (
              <div className="alert" style={{ 
                background: txStatus.includes('✅') ? '#f0fff4' : '#bee3f8',
                color: txStatus.includes('✅') ? '#22543d' : '#2c5282',
                marginBottom: '20px',
                padding: '12px',
                borderRadius: '8px'
              }}>
                {txStatus}
              </div>
            )}

            <button 
              type="submit"
              className="button"
              disabled={staking}
            >
              {staking ? 'Processing Transaction...' : 'Stake & Become Oracle'}
            </button>
          </form>

          <div style={{ marginTop: '30px' }}>
            <h3>Oracle Tiers</h3>
            <table>
              <thead>
                <tr>
                  <th>Tier</th>
                  <th>Stake Required</th>
                  <th>Max Attestation Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{getTierBadge(1)}</td>
                  <td>50,000 CIT</td>
                  <td>₹10 Lakh</td>
                </tr>
                <tr>
                  <td>{getTierBadge(2)}</td>
                  <td>200,000 CIT</td>
                  <td>₹50 Lakh</td>
                </tr>
                <tr>
                  <td>{getTierBadge(3)}</td>
                  <td>500,000 CIT</td>
                  <td>₹1 Crore</td>
                </tr>
                <tr>
                  <td>{getTierBadge(4)}</td>
                  <td>1,000,000 CIT</td>
                  <td>₹5 Crore</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="stat-box-success">
              <div className="stat-value stat-value-success">
                {oracleInfo.stakedAmount.toLocaleString()}
              </div>
              <div className="stat-label">CIT Staked</div>
              <div className="text-muted text-xs mt-1">
                Current active stake
              </div>
            </div>
            <div className="stat-box-warning">
              <div className="stat-value text-2xl font-bold" style={{marginBottom:'20px'}}>
                {getTierBadge(oracleInfo.tier)}
              </div>
              <div className="stat-label">Oracle Tier</div>
              <div className="text-muted text-xs mt-1">
                Based on stake amount
              </div>
            </div>
            <div className="stat-box-warning">
              <div className="stat-value stat-value-warning">
                {parseFloat(oracleEarnings.total || 0).toLocaleString()}
              </div>
              <div className="stat-label">
                Total Earned (CIT)
              </div>
              <div className="text-muted text-xs mt-1">
                {oracleEarnings.count > 0 
                  ? `From ${oracleEarnings.count} attestation${oracleEarnings.count !== 1 ? 's' : ''}` 
                  : 'No earnings yet'}
              </div>
            </div>
            <div className="stat-box-warning" style={{ borderColor: 'var(--accent-error)' }}>
              <div className="stat-value stat-value-error">
                {parseFloat(oraclePenalties.total || 0).toLocaleString()}
              </div>
              <div style={{ color: 'white', marginTop: '8px', fontSize: '14px' }}>
                Total Slashed (CIT)
              </div>
              <div style={{ color: 'white', marginTop: '4px', fontSize: '12px' }}>
                {oraclePenalties.count > 0 
                  ? `From ${oraclePenalties.count} incident${oraclePenalties.count !== 1 ? 's' : ''}` 
                  : 'No penalties yet'}
              </div>
            </div>
          </div>

          <div className="info-box info-box-info mt-4 mb-4">
            <p className="mb-2">
              <strong>Earnings:</strong> You earn fees from attestations where you're in the majority consensus.
            </p>
            <p className="mb-0">
              <strong>Slashing:</strong> If you're in the minority (disagreed with consensus), you lose a small penalty (5,000 CIT per attestation). 
              Your staked amount automatically decreases when slashed.
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="card" style={{ padding: '0', marginTop: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0' }}>
              <button
                onClick={() => setTab('overview')}
                style={{
                  flex: 1,
                  padding: '15px',
                  background: tab === 'overview' ? '#667eea' : 'transparent',
                  color: tab === 'overview' ? 'white' : '#4a5568',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: tab === 'overview' ? 'bold' : 'normal',
                  transition: 'all 0.3s'
                }}
              >
                📊 Attestation Requests
              </button>
              <button
                onClick={() => setTab('collusion')}
                style={{
                  flex: 1,
                  padding: '15px',
                  background: tab === 'collusion' ? '#667eea' : 'transparent',
                  color: tab === 'collusion' ? 'white' : '#4a5568',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: tab === 'collusion' ? 'bold' : 'normal',
                  transition: 'all 0.3s'
                }}
              >
                🚨 Collusion Monitoring
              </button>
            </div>
          </div>

          {tab === 'overview' && (
          <>
          <div className="card">
            <h2>Attestation Requests</h2>
            <p style={{ color: '#718096', marginBottom: '20px' }}>
              {pendingRequests.length === 0 ? (
                'No actionable requests. Check back later.'
              ) : (
                `${pendingRequests.length} request${pendingRequests.length > 1 ? 's' : ''} requiring your action`
              )}
            </p>

            {pendingRequests.length === 0 ? (
              <div className="alert alert-info">
                No attestation requests at the moment. MSMEs can submit documents for verification from their dashboard.
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Schema</th>
                    <th>MSME Address</th>
                    <th>Status</th>
                    <th>Requested</th>
                    <th>Fee</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.map((req) => {
                    const statusLabels = {
                      0: { text: 'Pending', color: '#f59e0b', bg: 'transparent' },
                      1: { text: 'Ready to Commit', color: '#10b981', bg: 'transparent' },
                      2: { text: 'Committing', color: '#3b82f6', bg: 'transparent' },
                      3: { text: 'Revealing', color: '#8b5cf6', bg: 'transparent' },
                      4: { text: 'Consensus Reached', color: '#10b981', bg: 'transparent' },
                      5: { text: 'No Consensus', color: '#ef4444', bg: 'transparent' },
                      6: { text: 'Completed', color: '#22c55e', bg: 'transparent' },
                      7: { text: 'Rejected', color: '#dc2626', bg: 'transparent' },
                      8: { text: 'Cancelled', color: '#6b7280', bg: 'transparent' },
                      9: { text: 'Disputed', color: '#f59e0b', bg: 'transparent' }
                    };
                    const status = statusLabels[Number(req.status)] || { text: 'Unknown', color: '#6b7280', bg: '#f3f4f6' };
                    
                    return (
                      <tr key={req.id}>
                        <td><strong>{req.schema}</strong></td>
                        <td><code style={{ fontSize: '12px' }}>{req.msmeAddress.substring(0, 10)}...</code></td>
                        <td>
                          <span style={{ 
                            background: status.bg, 
                            color: status.color, 
                            padding: '4px 8px', 
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold'
                          }}>
                            {status.text}
                          </span>
                        </td>
                        <td>{new Date(req.requestedAt).toLocaleDateString()}</td>
                        <td>
                          <span style={{ color: '#48bb78', fontWeight: 'bold' }}>
                            {req.fee || 100} CIT
                          </span>
                        </td>
                        <td>
                          <button 
                            className="button" 
                            style={{ fontSize: '12px', padding: '6px 12px' }}
                            onClick={() => viewRequestDetails(req)}
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Request Details Modal */}
          {selectedRequest && (
            <div className="card" style={{ background: 'transparent', border: '2px solid #48bb78' }}>
              <h2>Attestation Request Details</h2>
              
              <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                <h3>{selectedRequest.schema} Verification</h3>
                
                <table style={{ marginTop: '15px' }}>
                  <tbody>
                    <tr>
                      <td><strong>MSME Address:</strong></td>
                      <td><code>{selectedRequest.msmeAddress}</code></td>
                    </tr>
                    <tr>
                      <td><strong>Document Type:</strong></td>
                      <td>{selectedRequest.documentType}</td>
                    </tr>
                    <tr>
                      <td><strong>Document URL:</strong></td>
                      <td>
                        <a 
                          href={selectedRequest.documentUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ color: '#667eea', textDecoration: 'underline' }}
                        >
                          {selectedRequest.documentUrl}
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Document Hash:</strong></td>
                      <td><code style={{ fontSize: '11px' }}>{selectedRequest.documentHash}</code></td>
                    </tr>
                    <tr>
                      <td><strong>Additional Info:</strong></td>
                      <td>{selectedRequest.additionalData || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td><strong>Requested On:</strong></td>
                      <td>{new Date(selectedRequest.requestedAt).toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td><strong>Fee:</strong></td>
                      <td style={{ color: '#48bb78', fontWeight: 'bold' }}>
                        {selectedRequest.schema === 'Bank Statements' ? '150' : 
                         selectedRequest.schema === 'GST Revenue' ? '100' :
                         selectedRequest.schema === 'Credit Score' ? '120' : '80'} CIT
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Required Oracle Tier:</strong></td>
                      <td>
                        <span style={{ 
                          padding: '4px 10px', 
                          background: parseInt(oracleInfo.tier) >= (SCHEMA_TIER_REQUIREMENTS[selectedRequest.schema] || 1) ? '#48bb78' : '#e53e3e',
                          color: 'white',
                          borderRadius: '12px',
                          fontSize: '13px',
                          fontWeight: 'bold', 
                        }}>
                          Tier {SCHEMA_TIER_REQUIREMENTS[selectedRequest.schema] || 1}+
                        </span>
                        {parseInt(oracleInfo.tier) < (SCHEMA_TIER_REQUIREMENTS[selectedRequest.schema] || 1) && (
                          <div style={{ color: '#e53e3e', fontSize: '12px', marginTop: '4px' }}>
                            ❌ Your tier ({oracleInfo.tier}) is insufficient
                          </div>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Oracle Assignment:</strong></td>
                      <td>
                        {(() => {
                          const accepted = selectedRequest.acceptedBy?.length || 0;
                          const required = selectedRequest.requiredOracles || 3;
                          const progress = `${accepted}/${required}`;
                          const allAssigned = accepted >= required;
                          const assignedOracles = selectedRequest.assignedOracles || [];
                          
                          return (
                            <div>
                              <span style={{ 
                                padding: '4px 10px', 
                                background: allAssigned ? '#48bb78' : '#f59e0b',
                                color: 'white',
                                borderRadius: '12px',
                                fontSize: '13px',
                                fontWeight: 'bold'
                              }}>
                                {progress} Oracles {allAssigned ? 'Assigned' : 'Accepted'}
                              </span>
                              {!allAssigned && (
                                <div style={{ color: '#f59e0b', fontSize: '12px', marginTop: '4px' }}>
                                  ⏳ Waiting for {required - accepted} more oracle(s) to accept
                                </div>
                              )}
                              {allAssigned && (
                                <div style={{ color: '#48bb78', fontSize: '12px', marginTop: '4px' }}>
                                  ✅ All required oracles assigned - Ready to commit!
                                </div>
                              )}
                              
                              {/* Show list of assigned oracles */}
                              {assignedOracles.length > 0 && (
                                <div style={{ 
                                  marginTop: '12px', 
                                  padding: '12px', 
                                  background: 'transparent', 
                                  borderRadius: '6px',
                                  border: '1px solid #e2e8f0'
                                }}>
                                  <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: 'white' }}>
                                    Assigned Oracles ({assignedOracles.length}):
                                  </div>
                                  {assignedOracles.map((oracleAddr, idx) => {
                                    const isYou = oracleAddr.toLowerCase() === account.toLowerCase();
                                    return (
                                      <div 
                                        key={idx}
                                        style={{ 
                                          fontSize: '12px', 
                                          padding: '6px 8px',
                                          marginBottom: idx < assignedOracles.length - 1 ? '4px' : '0',
                                          background: isYou ? '#d1fae5' : 'white',
                                          border: isYou ? '2px solid #10b981' : '1px solid #e2e8f0',
                                          borderRadius: '4px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '8px'
                                        }}
                                      >
                                        <span style={{ fontWeight: 'bold', color: isYou ? '#059669' : '#718096' }}>
                                          #{idx + 1}
                                        </span>
                                        <code style={{ 
                                          flex: 1,
                                          fontSize: '11px',
                                          color: isYou ? '#047857' : '#4a5568'
                                        }}>
                                          {oracleAddr}
                                        </code>
                                        {isYou && (
                                          <span style={{ 
                                            fontSize: '11px', 
                                            fontWeight: 'bold',
                                            color: '#059669',
                                            background: '#a7f3d0',
                                            padding: '2px 8px',
                                            borderRadius: '10px'
                                          }}>
                                            YOU
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="alert alert-info" style={{ marginBottom: '20px' }}>
                <ol style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
                  <li>Download and review the document from the provided URL</li>
                  <li>Verify the document hash matches (SHA-256)</li>
                  <li>Cross-check data with official sources (GST portal, bank, etc.)</li>
                  <li>If verified, submit attestation on-chain</li>
                  <li>If issues found, reject with reason</li>
                </ol>
              </div>

              {/* Check if oracle has accepted this request */}
              {(() => {
                // Check if current account is in the assignedOracles array (blockchain source of truth)
                // CRITICAL: Use case-insensitive comparison for Ethereum addresses
                const isAssignedOnChain = selectedRequest.assignedOracles?.some(oracle => 
                  oracle.toLowerCase() === account.toLowerCase()
                );
                
                // Use blockchain data if available, fallback to localStorage
                const hasCommitted = selectedRequest.hasCommittedOnChain ?? selectedRequest.committedBy?.includes(account);
                const hasRevealed = selectedRequest.hasRevealedOnChain ?? selectedRequest.revealedBy?.includes(account);
                
                const requestStatus = Number(selectedRequest.status) || 0;
                const statusLabels = ['Pending', 'Oracles Assigned', 'Committing', 'Revealing', 'Consensus Reached', 'No Consensus', 'Completed', 'Rejected', 'Cancelled', 'Disputed'];
                
                // Calculate button states
                const canCommit = (requestStatus === 1 || requestStatus === 2) && !hasCommitted;
                const canReveal = (requestStatus === 3 || requestStatus === 2) && hasCommitted && !hasRevealed;
                
                // Debug logging
                console.log('🎯 Button Logic Check:', {
                  account,
                  assignedOracles: selectedRequest.assignedOracles,
                  isAssignedOnChain,
                  hasCommitted,
                  hasCommittedOnChain: selectedRequest.hasCommittedOnChain,
                  hasRevealed,
                  hasRevealedOnChain: selectedRequest.hasRevealedOnChain,
                  requestStatus,
                  statusLabel: statusLabels[requestStatus],
                  canCommit: canCommit ? '✅ YES' : '❌ NO',
                  canReveal: canReveal ? '✅ YES' : '❌ NO',
                  reason: !canCommit ? (
                    hasCommitted ? 'Already committed' :
                    requestStatus === 0 ? 'Waiting for oracles' :
                    requestStatus === 3 ? 'Reveal phase started' :
                    requestStatus >= 4 ? 'Request completed' :
                    'Unknown'
                  ) : 'Can commit'
                });

                // If request status is beyond Pending and you're not assigned, show cannot participate
                if (!isAssignedOnChain && requestStatus >= 1) {
                  return (
                    <>
                      <div className="alert" style={{ background: '#fed7d7', color: '#9b2c2c', marginBottom: '20px' }}>
                        <strong>❌ Cannot Participate</strong>
                        <p style={{ marginTop: '8px', marginBottom: 0 }}>
                          This request (Status: {statusLabels[requestStatus]}) has already been assigned to other oracles. You cannot accept it anymore.
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <button 
                          className="button button-secondary"
                          style={{ minWidth: '100px' }}
                          onClick={() => setSelectedRequest(null)}
                        >
                          Close
                        </button>
                      </div>
                    </>
                  );
                }

                // If you're assigned (accepted), show commit/reveal workflow
                if (isAssignedOnChain) {
                  const allOraclesCount = selectedRequest.requiredOracles || 0;
                  const assignedCount = selectedRequest.assignedOracles?.length || 0;
                  const allAssigned = assignedCount >= allOraclesCount;
                  
                  // Check if request is completed/finished (status >= 4)
                  const isCompleted = requestStatus >= 4; // ConsensusReached(4), NoConsensus(5), Completed(6), etc.
                  
                  console.log('🔍 Commit Button Debug:', {
                    requestId: selectedRequest.id,
                    allOraclesCount,
                    assignedCount,
                    allAssigned,
                    hasCommitted,
                    hasRevealed,
                    requestStatus,
                    isCompleted,
                    assignedOracles: selectedRequest.assignedOracles
                  });
                  
                  // If request is completed, show completion message
                  if (isCompleted) {
                    return (
                      <>
                        <div className="alert" style={{ 
                          background: 'transparent',
                          color: requestStatus === 6 ? '#065f46' : '#92400e',
                          marginBottom: '20px' 
                        }}>
                          <strong>✅ Request Completed</strong>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          <button 
                            className="button"
                            style={{ minWidth: '120px', background: '#38b2ac' }}
                            onClick={() => viewRequestDetails(selectedRequest)}
                            title="Reload request details from blockchain"
                          >
                            🔄 Refresh
                          </button>
                          <button 
                            className="button button-secondary"
                            style={{ minWidth: '100px' }}
                            onClick={() => setSelectedRequest(null)}
                          >
                            Close
                          </button>
                        </div>
                      </>
                    );
                  }
                  
                  // Determine if commit/reveal should be enabled based on status
                  // Status 1 (OraclesAssigned) or 2 (Committing): Can commit
                  // Status 3 (Revealing): Can reveal
                  const canCommit = (requestStatus === 1 || requestStatus === 2) && !hasCommitted;
                  const canReveal = (requestStatus === 3 || requestStatus === 2) && hasCommitted && !hasRevealed;
                  
                  return (
                    <>
                      {/* Status indicator */}
                      <div className="alert" style={{ 
                        background: allAssigned ? 'transparent' : 'transparent', 
                        color: allAssigned ? '#22543d' : '#744210',
                        marginBottom: '20px' 
                      }}>
                        <p style={{ marginTop: '8px', marginBottom: 0 }}>
                          {allAssigned 
                            ? `All ${allOraclesCount} oracles assigned - Ready to commit!`
                            : `Oracle Assignment: ${assignedCount}/${allOraclesCount} - Waiting for ${allOraclesCount - assignedCount} more oracle(s)`
                          }
                        </p>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <button 
                          className="button"
                          style={{ 
                            flex: 1, 
                            minWidth: '200px', 
                            background: hasCommitted ? '#a0aec0' : (canCommit ? '#667eea' : '#cbd5e0'),
                            color: hasCommitted ? 'black' : (canCommit ? 'white' : 'black'),
                            cursor: canCommit ? 'pointer' : 'not-allowed'
                          }}
                          onClick={() => openCommitForm(selectedRequest.id)}
                          disabled={!canCommit || parseInt(oracleInfo.tier) < (SCHEMA_TIER_REQUIREMENTS[selectedRequest.schema] || 1)}
                          title={
                            hasCommitted ? 'You have already committed' :
                            requestStatus === 0 ? 'Waiting for all oracles to accept' :
                            requestStatus === 3 ? 'Commit phase ended, now in reveal phase' :
                            !allAssigned ? `Waiting for all ${allOraclesCount} oracles to accept (${assignedCount}/${allOraclesCount})` : 
                            'Click to commit your attestation'
                          }
                        >
                          {hasCommitted 
                            ? '✅ Already Committed' 
                            : requestStatus === 0 
                              ? `⏳ Waiting for Oracles (${assignedCount}/${allOraclesCount})` 
                              : requestStatus === 3
                                ? '🚫 Commit Phase Ended'
                                : '🔒 Phase 1: Commit Hash'}
                        </button>
                        <button 
                          className="button"
                          style={{ 
                            flex: 1, 
                            minWidth: '200px', 
                            background: hasRevealed ? '#a0aec0' : (canReveal ? '#48bb78' : '#cbd5e0'),
                            color: hasRevealed ? 'black' : (canReveal ? 'white' : 'black'),
                            cursor: canReveal ? 'pointer' : 'not-allowed'
                          }}
                          onClick={() => handleRevealAttestation(selectedRequest.id)}
                          disabled={!canReveal || parseInt(oracleInfo.tier) < (SCHEMA_TIER_REQUIREMENTS[selectedRequest.schema] || 1)}
                          title={
                            hasRevealed ? 'You have already revealed' :
                            !hasCommitted ? 'You must commit before revealing' :
                            requestStatus !== 3 ? 'Wait for all oracles to commit first' :
                            'Click to reveal your attestation'
                          }
                        >
                          {hasRevealed 
                            ? '✅ Already Revealed' 
                            : !hasCommitted 
                              ? '🔒 Must Commit First'
                              : requestStatus !== 3
                                ? '⏳ Waiting for All Commits'
                                : '🔓 Phase 2: Reveal Decision'}
                        </button>
                        <button 
                          className="button"
                          style={{ minWidth: '120px', background: '#38b2ac' }}
                          onClick={() => viewRequestDetails(selectedRequest)}
                          title="Reload request details from blockchain"
                        >
                          🔄 Refresh
                        </button>
                        <button 
                          className="button button-secondary"
                          style={{ minWidth: '100px' }}
                          onClick={() => setSelectedRequest(null)}
                        >
                          Close
                        </button>
                      </div>

                      <div className="alert alert-info" style={{ marginTop: '20px', fontSize: '13px' }}>
                        <ol style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
                          <li><strong>Phase 1 - Commit:</strong> Submit your attestation decision as a hidden hash (prevents influence)</li>
                          <li><strong>Wait:</strong> All oracles must commit before any reveals</li>
                          <li><strong>Phase 2 - Reveal:</strong> Return later to reveal your actual decision</li>
                          <li><strong>Consensus:</strong> System calculates consensus after all reveals</li>
                        </ol>
                      </div>
                    </>
                  );
                }
                
                // Not assigned yet - show Accept and Reject buttons (only for Pending status)
                if (!isAssignedOnChain) {
                  // Show Accept and Reject buttons (only for Pending requests)
                  return (
                    <>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <button 
                          className="button"
                          style={{ flex: 1, minWidth: '200px', background: '#008cffff', color: 'white'}}
                          onClick={() => handleAcceptRequest(selectedRequest.id)}
                          disabled={
                            !!txStatus || 
                            acceptedRequests.has(selectedRequest.id) ||
                            parseInt(oracleInfo.tier) < (SCHEMA_TIER_REQUIREMENTS[selectedRequest.schema] || 1)
                          }
                        >
                          {acceptedRequests.has(selectedRequest.id) 
                            ? '✅ Already Accepted (Refresh)' 
                            : txStatus 
                              ? '⏳ Processing...' 
                              : ' Accept Request'}
                        </button>
                        <button 
                          className="button"
                          style={{ flex: 1, minWidth: '150px', background: '#f56565', color: 'white' }}
                          onClick={() => {
                            const reason = prompt('Enter rejection reason:', 'Document verification failed');
                            if (reason) rejectRequest(selectedRequest.id, reason);
                          }}
                          disabled={!!txStatus}
                        >
                           Reject Request
                        </button>
                        <button 
                          className="button button-secondary"
                          style={{ minWidth: '100px' }}
                          onClick={() => setSelectedRequest(null)}
                          disabled={!!txStatus}
                        >
                          Close
                        </button>
                      </div>
                      
                      {txStatus && (
                        <div className="alert" style={{ 
                          background: '#bee3f8', 
                          color: '#2c5282', 
                          marginTop: '20px' 
                        }}>
                          <strong>⏳ {txStatus}</strong>
                        </div>
                      )}
                      
                      <div className="alert alert-info" style={{ marginTop: '20px', fontSize: '13px' }}>
                        <strong>⚠️ First Step:</strong> You must accept this request before you can commit your attestation.
                      </div>
                    </>
                  );
                }
              })()}

            </div>
          )}

          {/* Commit Decision Form Modal */}
          {showCommitForm && selectedRequest && (
            <div className="card" style={{ background: 'transparent', border: '2px solid #f59e0b', marginBottom: '20px' }}>
              <h2>🔒 Phase 1: Commit Your Decision</h2>
              
              <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                <h3>Document Verification for: {selectedRequest.schema}</h3>
                
                <div style={{ marginBottom: '20px', padding: '15px', background: 'transparent', borderRadius: '6px' }}>
                  <strong>Document Details:</strong>
                  <div style={{ marginTop: '8px', fontSize: '13px' }}>
                    <div>📄 MSME: <code>{selectedRequest.msmeAddress}</code></div>
                    <div>🔗 URL: <a href={selectedRequest.documentUrl} target="_blank" rel="noopener noreferrer">{selectedRequest.documentUrl}</a></div>
                    <div>🔐 Hash: <code style={{ fontSize: '11px' }}>{selectedRequest.documentHash}</code></div>
                  </div>
                </div>

                <div className="alert" style={{ background: '#fef5e7', color: '#744210', marginBottom: '20px' }}>
                  Your decision will be hidden on-chain as a hash. After all oracles commit, you must return to reveal your actual decision.
                </div>

                <label className="label">
                  <strong>Your Verification Decision *</strong>
                </label>
                <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                  <label style={{ 
                    flex: 1, 
                    padding: '15px', 
                    border: commitDecision === 'approve' ? '3px solid #48bb78' : '2px solid #e2e8f0',
                    borderRadius: '8px',
                    background: commitDecision === 'approve' ? '#f0fff4' : 'white',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}>
                    <input 
                      type="radio" 
                      name="decision" 
                      value="approve"
                      checked={commitDecision === 'approve'}
                      onChange={(e) => setCommitDecision(e.target.value)}
                      style={{ marginRight: '8px' }}
                    />
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: commitDecision === 'approve' ? '#22543d' : '#4a5568' }}>
                      ✅ APPROVE
                    </span>
                    <div style={{ fontSize: '12px', marginTop: '4px', color: '#718096' }}>
                      Document is valid and verified
                    </div>
                  </label>
                  
                  <label style={{ 
                    flex: 1, 
                    padding: '15px', 
                    border: commitDecision === 'reject' ? '3px solid #f56565' : '2px solid #e2e8f0',
                    borderRadius: '8px',
                    background: commitDecision === 'reject' ? '#fff5f5' : 'white',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}>
                    <input 
                      type="radio" 
                      name="decision" 
                      value="reject"
                      checked={commitDecision === 'reject'}
                      onChange={(e) => setCommitDecision(e.target.value)}
                      style={{ marginRight: '8px' }}
                    />
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: commitDecision === 'reject' ? '#9b2c2c' : '#4a5568' }}>
                      ❌ REJECT
                    </span>
                    <div style={{ fontSize: '12px', marginTop: '4px', color: '#718096' }}>
                      Document has issues or is invalid
                    </div>
                  </label>
                </div>

                <label className="label">
                  Verification Comments (Optional)
                </label>
                <textarea 
                  className="input"
                  placeholder="Add any notes about your verification (e.g., 'GST number verified on portal', 'Document date mismatch', etc.)"
                  rows={3}
                  value={commitComments}
                  onChange={(e) => setCommitComments(e.target.value)}
                  style={{ marginBottom: '20px' }}
                />

                <label className="label">
                  Validity Period (Days)
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
                  <input 
                    type="range"
                    min="30"
                    max="730"
                    step="30"
                    value={commitValidityDays}
                    onChange={(e) => setCommitValidityDays(parseInt(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span style={{ 
                    fontWeight: 'bold', 
                    minWidth: '80px',
                    color: '#667eea'
                  }}>
                    {commitValidityDays} days
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#718096', marginBottom: '20px' }}>
                  How long this attestation should remain valid ({Math.floor(commitValidityDays / 30)} months)
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    className="button"
                    style={{ flex: 1, background: '#667eea' }}
                    onClick={() => handleCommitAttestation(selectedRequest.id)}
                    disabled={!!txStatus}
                  >
                    {txStatus || '🔒 Submit Commitment'}
                  </button>
                  <button 
                    className="button button-secondary"
                    style={{ minWidth: '120px' }}
                    onClick={() => setShowCommitForm(false)}
                    disabled={!!txStatus}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <h2>📜 My Attestation History</h2>
            <p style={{ color: '#718096', marginBottom: '20px' }}>
              {attestationHistory.length === 0 ? (
                'No attestations submitted yet'
              ) : (
                `You have verified ${attestationHistory.length} document${attestationHistory.length > 1 ? 's' : ''}`
              )}
            </p>

            {attestationHistory.length === 0 ? (
              <div className="alert alert-info">
                Your attestation history will appear here once you start verifying MSME documents.
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Schema Type</th>
                    <th>MSME Address</th>
                    <th>Verified On</th>
                    <th>Status</th>
                    <th>Transaction</th>
                  </tr>
                </thead>
                <tbody>
                  {attestationHistory.map((attestation, index) => (
                    <tr key={index}>
                      <td>
                        <span style={{ 
                          padding: '4px 8px', 
                          background: '#ebf8ff', 
                          borderRadius: '4px',
                          fontSize: '13px',
                          fontWeight: '500'
                        }}>
                          {attestation.schemaName}
                        </span>
                      </td>
                      <td>
                        <code style={{ fontSize: '12px' }}>
                          {attestation.msmeAddress.slice(0, 10)}...{attestation.msmeAddress.slice(-8)}
                        </code>
                      </td>
                      <td>{attestation.timestamp}</td>
                      <td>
                        {attestation.revoked ? (
                          <span style={{ color: '#e53e3e' }}>❌ Revoked</span>
                        ) : (
                          <span style={{ color: '#48bb78' }}>✅ Active</span>
                        )}
                      </td>
                      <td>
                        <a 
                          href={`https://sepolia.etherscan.io/tx/${attestation.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#667eea', fontSize: '13px' }}
                        >
                          View on Etherscan →
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          </>
          )}

          {/* Collusion Monitoring Tab */}
          {tab === 'collusion' && (
            <div className="card">
              <h2>🚨 Collusion Detection Alerts</h2>
              <p style={{ color: '#718096', marginBottom: '20px' }}>
                Monitor oracle pairs with suspicious voting patterns
              </p>

              {loadingCollusion ? (
                <div className="info-box info-box-info">
                  ⏳ Loading collusion alerts from blockchain...
                </div>
              ) : collusionAlerts.length === 0 ? (
                <div className="info-box info-box-success mb-4">
                  <strong className="text-primary">✅ No Collusion Detected</strong>
                  <p className="mt-2 mb-0">
                    No suspicious oracle pairs have been flagged. The system monitors oracle voting patterns automatically.
                  </p>
                </div>
              ) : (
                <>
                  <div className="info-box info-box-error mb-4">
                    <strong className="text-primary">⚠️ {collusionAlerts.length} Collusion Alert{collusionAlerts.length > 1 ? 's' : ''} Detected</strong>
                    <p className="mt-2 mb-0">
                      The following oracle pairs have been flagged for suspicious voting patterns. These alerts are automatically generated when oracles show high agreement rates.
                    </p>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Oracle 1</th>
                          <th>Oracle 2</th>
                          <th>Similarity %</th>
                          <th>Detected At</th>
                          <th style={{ padding: '12px', textAlign: 'left' }}>Block</th>
                          <th style={{ padding: '12px', textAlign: 'left' }}>Transaction</th>
                        </tr>
                      </thead>
                      <tbody>
                        {collusionAlerts.map((alert, index) => (
                          <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '0.85em' }}>
                              <div style={{
                                background: alert.oracle1.toLowerCase() === account?.toLowerCase() ? '#fef3c7' : 'transparent',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                display: 'inline-block'
                              }}>
                                {alert.oracle1.substring(0, 10)}...{alert.oracle1.substring(alert.oracle1.length - 8)}
                                {alert.oracle1.toLowerCase() === account?.toLowerCase() && (
                                  <span style={{ marginLeft: '8px', color: '#92400e', fontWeight: 'bold' }}>(You)</span>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '0.85em' }}>
                              <div style={{
                                background: alert.oracle2.toLowerCase() === account?.toLowerCase() ? '#fef3c7' : 'transparent',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                display: 'inline-block'
                              }}>
                                {alert.oracle2.substring(0, 10)}...{alert.oracle2.substring(alert.oracle2.length - 8)}
                                {alert.oracle2.toLowerCase() === account?.toLowerCase() && (
                                  <span style={{ marginLeft: '8px', color: '#92400e', fontWeight: 'bold' }}>(You)</span>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '12px' }}>
                              <span style={{
                                padding: '4px 12px',
                                borderRadius: '12px',
                                fontSize: '0.9em',
                                fontWeight: 'bold',
                                background: alert.similarityPercentage >= 90 ? '#fee2e2' : 
                                          alert.similarityPercentage >= 80 ? '#fed7aa' : '#fef3c7',
                                color: alert.similarityPercentage >= 90 ? '#991b1b' : 
                                      alert.similarityPercentage >= 80 ? '#c2410c' : '#92400e'
                              }}>
                                {alert.similarityPercentage}%
                              </span>
                            </td>
                            <td style={{ padding: '12px', fontSize: '0.85em', color: '#718096' }}>
                              {alert.timestamp}
                            </td>
                            <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '0.85em' }}>
                              #{alert.blockNumber}
                            </td>
                            <td style={{ padding: '12px' }}>
                              <a 
                                href={`https://sepolia.etherscan.io/tx/${alert.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#667eea', textDecoration: 'underline', fontSize: '0.85em' }}
                              >
                                View on Etherscan →
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <div className="info-box info-box-info mt-4">
                <strong className="text-primary">📊 How Collusion Detection Works</strong>
                <ul className="mt-2 mb-0" style={{ paddingLeft: '20px' }}>
                  <li className="mb-2"><strong>Automatic Monitoring:</strong> The system tracks oracle voting patterns across attestations</li>
                  <li className="mb-2"><strong>Similarity Threshold:</strong> Pairs with ≥80% vote agreement over 5+ attestations are flagged</li>
                  <li className="mb-2"><strong>On-Chain Events:</strong> Collusion alerts are emitted as blockchain events for transparency</li>
                  <li className="mb-2"><strong>Governance Action:</strong> Platform governance can review and penalize colluding oracles</li>
                  <li className="mb-0"><strong>Reputation Impact:</strong> Flagged oracles may face stake slashing or removal</li>
                </ul>
              </div>
            </div>
          )}

          <div className="card">
            <h2>Manage Stake</h2>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="button" onClick={increaseStake}>Increase Stake</button>
              <button className="button" style={{ background: '#e2e8f0', color: '#4a5568' }} onClick={withdrawStake}>
                Withdraw
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OracleDashboard;
