import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getContractInstance, CONTRACT_ADDRESSES, parseTokens, formatTokens } from '../utils/contracts';

function OracleDashboard({ account, provider, signer }) {
  const [stakeAmount, setStakeAmount] = useState('');
  const [staking, setStaking] = useState(false);
  const [isOracle, setIsOracle] = useState(false);
  const [oracleInfo, setOracleInfo] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [txStatus, setTxStatus] = useState('');
  const [attestationHistory, setAttestationHistory] = useState([]);

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
        
        // OracleInfo (deployed version): [stakedAmount, reputationScore, attestationCount, slashCount, registrationTime, isActive]
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
            attestations: oracleData[2].toString() // attestationCount
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

  // Load pending attestation requests
  useEffect(() => {
    const loadRequests = () => {
      const stored = localStorage.getItem('attestationRequests');
      if (stored) {
        const allRequests = JSON.parse(stored);
        // Show only pending requests
        const pending = allRequests.filter(req => req.status === 'Pending');
        setPendingRequests(pending);
      }
    };
    
    loadRequests();
    // Check for new requests every 3 seconds
    const interval = setInterval(loadRequests, 3000);
    return () => clearInterval(interval);
  }, []);

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

  const viewRequestDetails = (request) => {
    setSelectedRequest(request);
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

  const verifyAndAttest = async (requestId) => {
    try {
      // Get request details from localStorage
      const stored = localStorage.getItem('attestationRequests');
      if (!stored) {
        alert('❌ No attestation requests found');
        return;
      }

      const allRequests = JSON.parse(stored);
      const request = allRequests.find(req => req.id === requestId);
      
      if (!request) {
        alert('❌ Request not found');
        return;
      }

      // Check tier requirement for this schema
      const requiredTier = SCHEMA_TIER_REQUIREMENTS[request.schema] || 1;
      const currentTier = parseInt(oracleInfo.tier);

      if (currentTier < requiredTier) {
        alert(`❌ Insufficient Oracle Tier\n\nRequired: Tier ${requiredTier}\nYour Tier: ${currentTier}\n\nSchema "${request.schema}" requires Tier ${requiredTier} or higher.\n\nIncrease your stake to upgrade your tier.`);
        return;
      }

      setTxStatus('Preparing attestation...');

      // Get contract instance with signer
      const signer = await provider.getSigner();
      const attestationContract = getContractInstance('AttestationRegistry', signer);

      // Generate schema ID (hash of schema name)
      const schemaId = ethers.keccak256(ethers.toUtf8Bytes(request.schema));

      // Encode attestation data: [documentType, documentUrl, documentHash, additionalData]
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ['string', 'string', 'bytes32', 'string'],
        [
          request.schema, // documentType (e.g., "GST Revenue")
          request.documentUrl || '', // documentUrl
          request.documentHash, // documentHash (bytes32)
          request.additionalData || '' // additionalData
        ]
      );

      // Submit attestation on-chain (1 year validity = 365 * 24 * 60 * 60 seconds)
      setTxStatus('Submitting attestation to blockchain...');
      console.log('Submitting attestation for:', request.msmeAddress);
      console.log('Schema:', request.schema, 'SchemaId:', schemaId);
      
      const tx = await attestationContract.submitAttestation(
        request.msmeAddress,
        schemaId,
        data,
        365 * 24 * 60 * 60 // 1 year validity
      );

      setTxStatus('Waiting for confirmation...');
      const receipt = await tx.wait();
      console.log('Attestation submitted! Transaction:', receipt.hash);

      // Pay oracle fee (if MSME paid upfront)
      let feePaymentTx = null;
      if (request.fee && request.feePaid) {
        try {
          setTxStatus('Claiming attestation fee...');
          
          // Transfer fee from escrow (PlatformGovernance) to oracle
          const governanceContract = getContractInstance('PlatformGovernance', signer);
          const feeInWei = parseTokens(request.fee.toString());
          
          // Note: This requires PlatformGovernance to have CIT tokens and distributeAttest function
          // For now, we'll transfer directly from contract balance
          const tokenContract = getContractInstance('CIToken', signer);
          
          alert(`💰 Claiming your fee of ${request.fee} CIT...\n\nPlease confirm the transaction.`);
          
          // In production, PlatformGovernance would handle this
          // For now, skip if no permission - just track in localStorage
          console.log(`Oracle earned ${request.fee} CIT for attestation`);
          
        } catch (error) {
          console.error('Error claiming fee:', error);
          // Continue even if fee claim fails
        }
      }

      // Update request status in localStorage
      const updatedRequests = allRequests.map(req => 
        req.id === requestId 
          ? { 
              ...req, 
              status: 'Verified', 
              verifiedAt: Date.now(), 
              oracle: account, 
              txHash: receipt.hash,
              feeClaimedBy: account,
              feeClaimedAt: Date.now()
            }
          : req
      );
      localStorage.setItem('attestationRequests', JSON.stringify(updatedRequests));

      // Track oracle earnings
      const earnings = JSON.parse(localStorage.getItem('oracleEarnings') || '{}');
      if (!earnings[account]) earnings[account] = { total: 0, attestations: [] };
      earnings[account].total += (request.fee || 0);
      earnings[account].attestations.push({
        requestId,
        schema: request.schema,
        fee: request.fee || 0,
        msmeAddress: request.msmeAddress,
        timestamp: Date.now(),
        txHash: receipt.hash
      });
      localStorage.setItem('oracleEarnings', JSON.stringify(earnings));

      // Reload oracle info to get updated attestation count
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

      // Remove from pending list and close modal
      setPendingRequests(prev => prev.filter(req => req.id !== requestId));
      setSelectedRequest(null);
      setTxStatus('');
      
      const currentEarnings = JSON.parse(localStorage.getItem('oracleEarnings') || '{}');
      const totalEarned = currentEarnings[account]?.total || 0;
      
      alert(
        `✅ Attestation submitted successfully!\n\n` +
        `💰 Fee Earned: ${request.fee || 0} CIT\n` +
        `📊 Total Earned: ${totalEarned} CIT\n\n` +
        `Transaction: ${receipt.hash}\n\n` +
        `View on Etherscan:\nhttps://sepolia.etherscan.io/tx/${receipt.hash}`
      );
      
    } catch (error) {
      console.error('Error submitting attestation:', error);
      alert('Error: ' + error.message);
    }
  };

  return (
    <div>
      <div className="card">
        <h1>🔍 Oracle Dashboard</h1>
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
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr' }}>
            <div className="card" style={{ background: '#f0fff4' }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#48bb78' }}>
                {oracleInfo.stakedAmount.toLocaleString()}
              </div>
              <div style={{ color: '#718096', marginTop: '8px' }}>CIT Staked</div>
            </div>
            <div className="card" style={{ background: '#ebf8ff' }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#667eea' }}>
                {oracleInfo.reputation}
              </div>
              <div style={{ color: '#718096', marginTop: '8px' }}>Reputation</div>
            </div>
            <div className="card" style={{ background: '#fef5e7' }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
                {getTierBadge(oracleInfo.tier)}
              </div>
              <div style={{ color: '#718096', marginTop: '8px' }}>Oracle Tier</div>
            </div>
            <div className="card" style={{ background: '#faf5ff' }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#9f7aea' }}>
                {oracleInfo.attestations}
              </div>
              <div style={{ color: '#718096', marginTop: '8px' }}>Attestations</div>
            </div>
            <div className="card" style={{ background: '#fff7ed' }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f59e0b' }}>
                {(() => {
                  const earnings = JSON.parse(localStorage.getItem('oracleEarnings') || '{}');
                  return (earnings[account]?.total || 0).toLocaleString();
                })()}
              </div>
              <div style={{ color: '#718096', marginTop: '8px' }}>Total Earned (CIT)</div>
            </div>
          </div>

          <div className="card">
            <h2>Pending Attestation Requests</h2>
            <p style={{ color: '#718096', marginBottom: '20px' }}>
              {pendingRequests.length === 0 ? (
                'No pending requests. Check back later.'
              ) : (
                `${pendingRequests.length} MSME${pendingRequests.length > 1 ? 's' : ''} requesting verification`
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
                    <th>Document Type</th>
                    <th>Requested</th>
                    <th>Fee</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.map((req) => (
                    <tr key={req.id}>
                      <td><strong>{req.schema}</strong></td>
                      <td><code style={{ fontSize: '12px' }}>{req.msmeAddress.substring(0, 10)}...</code></td>
                      <td>{req.documentType}</td>
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
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Request Details Modal */}
          {selectedRequest && (
            <div className="card" style={{ background: '#f0fff4', border: '2px solid #48bb78' }}>
              <h2>📋 Attestation Request Details</h2>
              
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
                          fontWeight: 'bold'
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
                  </tbody>
                </table>
              </div>

              <div className="alert alert-info" style={{ marginBottom: '20px' }}>
                <strong>⚠️ Verification Steps:</strong>
                <ol style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
                  <li>Download and review the document from the provided URL</li>
                  <li>Verify the document hash matches (SHA-256)</li>
                  <li>Cross-check data with official sources (GST portal, bank, etc.)</li>
                  <li>If verified, submit attestation on-chain</li>
                  <li>If issues found, reject with reason</li>
                </ol>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  className="button"
                  style={{ flex: 1, background: '#48bb78' }}
                  onClick={() => verifyAndAttest(selectedRequest.id)}
                  disabled={parseInt(oracleInfo.tier) < (SCHEMA_TIER_REQUIREMENTS[selectedRequest.schema] || 1)}
                >
                  ✅ Verify & Submit Attestation
                </button>
                <button 
                  className="button"
                  style={{ flex: 1, background: '#f56565', color: 'white' }}
                  onClick={() => {
                    const reason = prompt('Enter rejection reason:', 'Document verification failed');
                    if (reason) rejectRequest(selectedRequest.id, reason);
                  }}
                >
                  ❌ Reject Request
                </button>
                <button 
                  className="button button-secondary"
                  onClick={() => setSelectedRequest(null)}
                >
                  Close
                </button>
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
