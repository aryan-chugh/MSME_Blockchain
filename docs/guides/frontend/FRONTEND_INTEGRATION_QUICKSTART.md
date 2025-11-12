# 🎨 Frontend Integration Quick Start

Quick reference for integrating the new features into the frontend.

---

## 📦 Prerequisites

1. **ABIs Updated**: ✅ Already done
2. **Contracts Deployed**: ✅ localhost running
3. **Contract Addresses**: ✅ In `frontend/src/utils/contracts.js`

---

## 1️⃣ Repayment Recording (MSME Dashboard)

### Add Button to Loan Agreements Table

```jsx
// In MSMEDashboard.js - Loan Agreements Section
{agreements.map(agreement => (
  <tr key={agreement.recordId}>
    <td>{agreement.recordId}</td>
    <td>{formatAmount(agreement.loanAmount)}</td>
    <td>{formatDate(agreement.dueDate)}</td>
    <td>
      {!agreement.repaymentRecorded && (
        <button 
          onClick={() => handleRecordRepayment(agreement.recordId)}
          className="btn-primary"
        >
          Record Repayment
        </button>
      )}
      {agreement.repaymentRecorded && (
        <span className="badge-success">✅ Repaid</span>
      )}
    </td>
  </tr>
))}
```

### Add Modal and Handler

```jsx
const [showRepaymentModal, setShowRepaymentModal] = useState(false);
const [selectedRecordId, setSelectedRecordId] = useState(null);
const [repaymentFile, setRepaymentFile] = useState(null);
const [uploadingToIPFS, setUploadingToIPFS] = useState(false);

const handleRecordRepayment = (recordId) => {
  setSelectedRecordId(recordId);
  setShowRepaymentModal(true);
};

const submitRepayment = async () => {
  try {
    // 1. Upload to IPFS
    setUploadingToIPFS(true);
    const formData = new FormData();
    formData.append('file', repaymentFile);
    
    const ipfsResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'pinata_api_key': process.env.REACT_APP_PINATA_API_KEY,
        'pinata_secret_api_key': process.env.REACT_APP_PINATA_SECRET_KEY,
      },
      body: formData,
    });
    
    const { IpfsHash } = await ipfsResponse.json();
    setUploadingToIPFS(false);
    
    // 2. Call smart contract
    const loanAgreementContract = new ethers.Contract(
      contracts.LoanAgreementRegistry.address,
      contracts.LoanAgreementRegistry.abi,
      signer
    );
    
    const tx = await loanAgreementContract.recordRepayment(
      selectedRecordId,
      IpfsHash
    );
    
    toast.info('Recording repayment...');
    const receipt = await tx.wait();
    
    // 3. Parse event for reputation delta
    const event = receipt.events.find(e => e.event === 'RepaymentRecorded');
    const reputationDelta = event.args.reputationDelta;
    
    toast.success(
      `Repayment recorded! Reputation ${reputationDelta > 0 ? '+' : ''}${reputationDelta}`
    );
    
    setShowRepaymentModal(false);
    loadAgreements(); // Refresh
    
  } catch (error) {
    console.error('Error recording repayment:', error);
    toast.error('Failed to record repayment');
  }
};
```

### Add Modal JSX

```jsx
{showRepaymentModal && (
  <div className="modal">
    <div className="modal-content">
      <h3>Record Repayment</h3>
      <p>Upload proof of payment (bank transfer receipt, transaction screenshot, etc.)</p>
      
      <input 
        type="file" 
        onChange={(e) => setRepaymentFile(e.target.files[0])}
        accept=".pdf,.png,.jpg,.jpeg"
      />
      
      <div className="modal-actions">
        <button 
          onClick={submitRepayment}
          disabled={!repaymentFile || uploadingToIPFS}
          className="btn-primary"
        >
          {uploadingToIPFS ? 'Uploading to IPFS...' : 'Submit'}
        </button>
        <button 
          onClick={() => setShowRepaymentModal(false)}
          className="btn-secondary"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
```

---

## 2️⃣ Issue Raising (Both Dashboards)

### Add New Tab

```jsx
// Add to dashboard navigation
<div className="dashboard-tabs">
  <button onClick={() => setActiveTab('overview')}>Overview</button>
  <button onClick={() => setActiveTab('agreements')}>Loan Agreements</button>
  <button onClick={() => setActiveTab('issues')}>Issues</button>
</div>

{activeTab === 'issues' && (
  <IssuesTab 
    userAddress={account}
    loanAgreementContract={loanAgreementContract}
  />
)}
```

### Create IssuesTab Component

```jsx
// components/IssuesTab.js
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const IssuesTab = ({ userAddress, loanAgreementContract }) => {
  const [issues, setIssues] = useState([]);
  const [showRaiseIssueModal, setShowRaiseIssueModal] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  
  useEffect(() => {
    loadIssues();
  }, []);
  
  const loadIssues = async () => {
    try {
      // Fetch all issues (paginated)
      const allIssues = await loanAgreementContract.getAllIssues(0, 100);
      
      // Filter to show only user's issues
      const myIssues = allIssues.filter(issue => 
        issue.raiser.toLowerCase() === userAddress.toLowerCase()
      );
      
      setIssues(myIssues);
    } catch (error) {
      console.error('Error loading issues:', error);
    }
  };
  
  const handleRaiseIssue = async (recordId, reason, evidenceFile) => {
    try {
      // Upload evidence to IPFS
      const formData = new FormData();
      formData.append('file', evidenceFile);
      
      const ipfsResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'pinata_api_key': process.env.REACT_APP_PINATA_API_KEY,
          'pinata_secret_api_key': process.env.REACT_APP_PINATA_SECRET_KEY,
        },
        body: formData,
      });
      
      const { IpfsHash } = await ipfsResponse.json();
      
      // Call contract
      const tx = await loanAgreementContract.raiseIssue(
        recordId,
        reason,
        IpfsHash
      );
      
      await tx.wait();
      toast.success('Issue raised successfully');
      setShowRaiseIssueModal(false);
      loadIssues();
      
    } catch (error) {
      console.error('Error raising issue:', error);
      toast.error('Failed to raise issue');
    }
  };
  
  const getStatusBadge = (status) => {
    const statusMap = {
      0: { label: 'Open', class: 'badge-warning' },
      1: { label: 'Under Review', class: 'badge-info' },
      2: { label: 'Resolved', class: 'badge-success' },
    };
    const s = statusMap[status];
    return <span className={`badge ${s.class}`}>{s.label}</span>;
  };
  
  return (
    <div className="issues-tab">
      <div className="section-header">
        <h2>Issues & Disputes</h2>
        <button onClick={() => setShowRaiseIssueModal(true)} className="btn-primary">
          Raise Issue
        </button>
      </div>
      
      <table className="issues-table">
        <thead>
          <tr>
            <th>Issue ID</th>
            <th>Loan Record</th>
            <th>Reason</th>
            <th>Status</th>
            <th>Date</th>
            <th>Evidence</th>
            <th>Resolution</th>
          </tr>
        </thead>
        <tbody>
          {issues.length === 0 ? (
            <tr>
              <td colSpan="7" style={{ textAlign: 'center' }}>
                No issues raised
              </td>
            </tr>
          ) : (
            issues.map(issue => (
              <tr key={issue.issueId.toString()}>
                <td>{issue.issueId.toString()}</td>
                <td>{issue.recordId.toString()}</td>
                <td>{issue.reason}</td>
                <td>{getStatusBadge(issue.status)}</td>
                <td>{new Date(issue.timestamp * 1000).toLocaleDateString()}</td>
                <td>
                  {issue.evidenceHash && (
                    <a 
                      href={`https://ipfs.io/ipfs/${issue.evidenceHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-link"
                    >
                      View Evidence
                    </a>
                  )}
                </td>
                <td>
                  {issue.status === 2 && issue.resolutionDetails && (
                    <div className="resolution-info">
                      <a 
                        href={`https://ipfs.io/ipfs/${issue.resolutionDetails}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-link"
                      >
                        View Resolution
                      </a>
                      <p className="small">
                        Penalized: {issue.penalizedParty.slice(0, 6)}...{issue.penalizedParty.slice(-4)}
                      </p>
                      <p className="small">
                        Penalty: -{issue.penaltyAmount.toString()} reputation
                      </p>
                    </div>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      
      {showRaiseIssueModal && (
        <RaiseIssueModal 
          onClose={() => setShowRaiseIssueModal(false)}
          onSubmit={handleRaiseIssue}
        />
      )}
    </div>
  );
};

export default IssuesTab;
```

### Raise Issue Modal

```jsx
const RaiseIssueModal = ({ onClose, onSubmit }) => {
  const [recordId, setRecordId] = useState('');
  const [reason, setReason] = useState('');
  const [evidenceFile, setEvidenceFile] = useState(null);
  
  const handleSubmit = () => {
    if (!recordId || !reason || !evidenceFile) {
      toast.error('Please fill all fields');
      return;
    }
    onSubmit(recordId, reason, evidenceFile);
  };
  
  return (
    <div className="modal">
      <div className="modal-content">
        <h3>Raise Issue</h3>
        
        <label>Loan Record ID</label>
        <input 
          type="number"
          value={recordId}
          onChange={(e) => setRecordId(e.target.value)}
          placeholder="Enter loan record ID"
        />
        
        <label>Reason for Issue</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Describe the issue in detail..."
          rows={4}
        />
        
        <label>Evidence (PDF, Image, etc.)</label>
        <input 
          type="file"
          onChange={(e) => setEvidenceFile(e.target.files[0])}
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
        />
        
        <div className="modal-actions">
          <button onClick={handleSubmit} className="btn-primary">
            Submit Issue
          </button>
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## 3️⃣ Governance Dashboard (Multi-Sig Members)

### Check if User is Governance Member

```jsx
const [isGovernanceMember, setIsGovernanceMember] = useState(false);

useEffect(() => {
  checkGovernanceStatus();
}, [account]);

const checkGovernanceStatus = async () => {
  try {
    const isMember = await loanAgreementContract.isGovernanceMemberCheck(account);
    setIsGovernanceMember(isMember);
  } catch (error) {
    console.error('Error checking governance status:', error);
  }
};
```

### Show Governance Actions in Issues Tab

```jsx
{isGovernanceMember && (
  <div className="governance-actions">
    <h3>Governance Actions</h3>
    
    {/* Update Status */}
    <select onChange={(e) => updateIssueStatus(issue.issueId, e.target.value)}>
      <option value="">Change Status</option>
      <option value="1">Mark Under Review</option>
      <option value="2">Mark Resolved</option>
    </select>
    
    {/* Record Resolution */}
    <button onClick={() => openRecordResolutionModal(issue.issueId)}>
      Record Resolution
    </button>
  </div>
)}
```

### Update Issue Status

```jsx
const updateIssueStatus = async (issueId, newStatus) => {
  try {
    const tx = await loanAgreementContract.updateIssueStatus(issueId, newStatus);
    await tx.wait();
    toast.success('Issue status updated');
    loadIssues();
  } catch (error) {
    console.error('Error updating status:', error);
    toast.error('Failed to update status');
  }
};
```

### Record Resolution

```jsx
const recordResolution = async (issueId, resolutionFile, penalizedParty, penaltyAmount) => {
  try {
    // Upload resolution document to IPFS
    const formData = new FormData();
    formData.append('file', resolutionFile);
    
    const ipfsResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'pinata_api_key': process.env.REACT_APP_PINATA_API_KEY,
        'pinata_secret_api_key': process.env.REACT_APP_PINATA_SECRET_KEY,
      },
      body: formData,
    });
    
    const { IpfsHash } = await ipfsResponse.json();
    
    // Call contract
    const tx = await loanAgreementContract.recordIssueResolution(
      issueId,
      IpfsHash,
      penalizedParty,
      penaltyAmount
    );
    
    await tx.wait();
    toast.success('Resolution recorded successfully');
    loadIssues();
    
  } catch (error) {
    console.error('Error recording resolution:', error);
    toast.error('Failed to record resolution');
  }
};
```

---

## 4️⃣ Oracle Collusion Monitoring

### Add to Oracle Dashboard

```jsx
// OracleDashboard.js
const [collusionAlerts, setCollusionAlerts] = useState([]);

useEffect(() => {
  loadCollusionAlerts();
  
  // Listen for collusion detection events
  oracleStakingContract.on('CollusionDetected', (oracle1, oracle2, similarVotes, totalVotes) => {
    toast.warning(`⚠️ Collusion detected: ${oracle1.slice(0, 6)}... & ${oracle2.slice(0, 6)}...`);
    loadCollusionAlerts();
  });
  
  return () => {
    oracleStakingContract.removeAllListeners('CollusionDetected');
  };
}, []);

const loadCollusionAlerts = async () => {
  // Note: You'll need to query past events or maintain a list
  // of flagged pairs in the frontend state
  const filter = oracleStakingContract.filters.CollusionDetected();
  const events = await oracleStakingContract.queryFilter(filter);
  
  const alerts = await Promise.all(
    events.map(async (event) => {
      const { oracle1, oracle2 } = event.args;
      const record = await oracleStakingContract.getCollusionRecord(oracle1, oracle2);
      
      return {
        oracle1,
        oracle2,
        similarVotes: record.similarVotes.toString(),
        totalOpportunities: record.totalOpportunities.toString(),
        flagged: record.flaggedForReview,
        similarityPercent: (
          (parseInt(record.similarVotes) / parseInt(record.totalOpportunities)) * 100
        ).toFixed(2),
      };
    })
  );
  
  setCollusionAlerts(alerts);
};
```

### Display Collusion Alerts

```jsx
<div className="collusion-section">
  <h3>🚨 Collusion Alerts</h3>
  
  {collusionAlerts.length === 0 ? (
    <p>No suspicious patterns detected</p>
  ) : (
    <div className="alerts-grid">
      {collusionAlerts.map((alert, idx) => (
        <div key={idx} className="alert-card">
          <h4>Suspicious Voting Pattern</h4>
          <p><strong>Oracle 1:</strong> {alert.oracle1}</p>
          <p><strong>Oracle 2:</strong> {alert.oracle2}</p>
          <p><strong>Similarity:</strong> {alert.similarityPercent}%</p>
          <p><strong>Similar Votes:</strong> {alert.similarVotes}/{alert.totalOpportunities}</p>
          
          {isGovernanceMember && (
            <button 
              onClick={() => punishCollusion(alert.oracle1, alert.oracle2)}
              className="btn-danger"
            >
              Confirm & Punish
            </button>
          )}
        </div>
      ))}
    </div>
  )}
</div>
```

### Punish Collusion (Governance Only)

```jsx
const punishCollusion = async (oracle1, oracle2) => {
  if (!window.confirm('Are you sure you want to punish these oracles? This will slash 25% of their stake and deduct 200 reputation points.')) {
    return;
  }
  
  try {
    const tx = await oracleStakingContract.punishCollusion(oracle1, oracle2);
    await tx.wait();
    toast.success('Collusion punishment applied');
    loadCollusionAlerts();
  } catch (error) {
    console.error('Error punishing collusion:', error);
    toast.error('Failed to punish collusion');
  }
};
```

---

## 🎨 Styling Suggestions

### CSS Classes to Add

```css
/* Issue Status Badges */
.badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.badge-warning { background: #ffc107; color: #000; }
.badge-info { background: #17a2b8; color: #fff; }
.badge-success { background: #28a745; color: #fff; }

/* Collusion Alert Cards */
.alert-card {
  border: 2px solid #ff4444;
  border-radius: 8px;
  padding: 16px;
  background: #fff5f5;
  margin-bottom: 16px;
}

.alert-card h4 {
  color: #ff4444;
  margin-top: 0;
}

/* Modal Styles */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 24px;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

/* Resolution Info */
.resolution-info {
  font-size: 12px;
}

.resolution-info .small {
  margin: 4px 0;
  color: #666;
}
```

---

## 🧪 Quick Testing

### Test Repayment Recording

```javascript
// In browser console (with MetaMask connected as MSME)
const loanAgreementContract = new ethers.Contract(
  '0x525C7063E7C20997BaaE9bDa922159152D0e8417',
  LoanAgreementRegistryABI,
  signer
);

// Record repayment with test hash
await loanAgreementContract.recordRepayment(
  1, // recordId
  'QmTest123...' // IPFS hash
);
```

### Test Issue Raising

```javascript
await loanAgreementContract.raiseIssue(
  1, // recordId
  'Payment not received as agreed',
  'QmEvidence456...' // IPFS hash
);
```

### Check Collusion Record

```javascript
const oracleStakingContract = new ethers.Contract(
  '0xab16A69A5a8c12C732e0DEFF4BE56A70bb64c926',
  OracleStakingABI,
  provider
);

const [isSuspicious, similarityPercent] = await oracleStakingContract.checkCollusion(
  '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // oracle1
  '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'  // oracle2
);

console.log('Suspicious:', isSuspicious);
console.log('Similarity:', similarityPercent.toString() + '%');
```

---

## 📝 Environment Variables Needed

Add to `.env`:

```bash
# Pinata IPFS (for file uploads)
REACT_APP_PINATA_API_KEY=your_api_key
REACT_APP_PINATA_SECRET_KEY=your_secret_key

# Or use alternative IPFS service
REACT_APP_IPFS_UPLOAD_URL=https://api.pinata.cloud/pinning/pinFileToIPFS
```

---

## ✅ Integration Checklist

- [ ] Import updated ABIs from `contracts.js`
- [ ] Add Pinata API keys to `.env`
- [ ] Create `IssuesTab.js` component
- [ ] Add repayment recording button to MSME dashboard
- [ ] Add issues tab to both MSME and Lender dashboards
- [ ] Add governance check and actions
- [ ] Add collusion monitoring to Oracle dashboard
- [ ] Test file upload to IPFS
- [ ] Test contract calls with test data
- [ ] Add error handling and loading states
- [ ] Add success/error toast notifications
- [ ] Style modals and badges
- [ ] Test on localhost network

---

**Ready to integrate!** All smart contract functions are deployed and waiting for UI. 🚀
