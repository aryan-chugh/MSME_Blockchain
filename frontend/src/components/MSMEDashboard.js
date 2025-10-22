import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getContractInstance, CONTRACT_ADDRESSES, parseTokens, formatTokens } from '../utils/contracts';

function MSMEDashboard({ account, provider, signer }) {
  const [identityAddress, setIdentityAddress] = useState('');
  const [attestations, setAttestations] = useState([]);
  const [loanRequests, setLoanRequests] = useState([]);
  const [tab, setTab] = useState('identity');

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

  // Load loan requests from blockchain
  useEffect(() => {
    loadMyLoanRequests();
    const interval = setInterval(loadMyLoanRequests, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, [provider, account]);

  const loadMyLoanRequests = async () => {
    if (!provider || !account) return;
    
    try {
      const loanContract = getContractInstance('LoanMarketplace', provider);
      const counter = await loanContract.requestCounter();
      const totalLoans = Number(counter);
      
      const myLoans = [];
      for (let i = 1; i <= totalLoans; i++) {
        try {
          const request = await loanContract.requests(i);
          
          // Only show loans created by this MSME
          if (request.msme.toLowerCase() === account.toLowerCase()) {
            const statusMap = ['Open', 'Reveal', 'Matched', 'Expired', 'Cancelled'];
            const status = statusMap[request.status] || 'Unknown';
            
            myLoans.push({
              id: i,
              amount: formatTokens(request.amount),
              amountRaw: request.amount,
              tenure: Number(request.tenureMonths),
              purpose: request.purpose,
              commitDeadline: Number(request.commitDeadline),
              revealDeadline: Number(request.revealDeadline),
              status: status,
              createdAt: Number(request.createdAt)
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

  // Load real attestations from blockchain
  useEffect(() => {
    const loadAttestations = async () => {
      if (!account || !provider) return;

      try {
        const attestationContract = getContractInstance('AttestationRegistry', provider);
        const attestationsData = await attestationContract.getAttestations(account);

        // Load rejections from localStorage
        const rejections = JSON.parse(localStorage.getItem('attestationRejections') || '[]');
        const myRejections = rejections.filter(r => r.msmeAddress === account);

        // Group by documentHash to combine verified and rejected for same document
        const documentGroups = {};

        // Process blockchain attestations (verified)
        if (attestationsData && attestationsData.length > 0) {
          for (const att of attestationsData) {
            // Decode to get documentHash
            let documentHash = '';
            try {
              const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
                ['string', 'string', 'bytes32', 'string'],
                att.data
              );
              documentHash = decoded[2];
            } catch (error) {
              console.error('Error decoding attestation data:', error);
              continue;
            }

            if (!documentGroups[documentHash]) {
              // Get schema details
              let schemaName = 'Unknown Schema';
              try {
                const schema = await attestationContract.getSchema(att.schemaId);
                schemaName = schema.name;
              } catch (error) {
                console.error('Error fetching schema:', error);
              }

              documentGroups[documentHash] = {
                documentHash,
                schema: schemaName,
                verified: [],
                rejected: [],
                timestamp: Number(att.timestamp) * 1000
              };
            }

            // Add to verified list
            documentGroups[documentHash].verified.push({
              oracle: att.issuer,
              timestamp: new Date(Number(att.timestamp) * 1000).toLocaleString(),
              revoked: att.revoked,
              expiryTime: new Date(Number(att.expiryTime) * 1000).toLocaleString()
            });
          }
        }

        // Process rejections
        for (const rejection of myRejections) {
          if (!documentGroups[rejection.documentHash]) {
            documentGroups[rejection.documentHash] = {
              documentHash: rejection.documentHash,
              schema: rejection.schema,
              verified: [],
              rejected: [],
              timestamp: rejection.timestamp
            };
          }

          documentGroups[rejection.documentHash].rejected.push({
            oracle: rejection.oracle,
            oracleTier: rejection.oracleTier,
            reason: rejection.reason,
            timestamp: new Date(rejection.timestamp).toLocaleString()
          });
        }

        // Convert to array format
        const formattedAttestations = Object.values(documentGroups).map((doc, index) => {
          const verifiedCount = doc.verified.filter(v => !v.revoked).length;
          const rejectedCount = doc.rejected.length;
          const totalCount = verifiedCount + rejectedCount;

          return {
            id: index,
            schema: doc.schema,
            documentHash: doc.documentHash,
            verifiedCount,
            rejectedCount,
            totalCount,
            verifiedBy: doc.verified,
            rejectedBy: doc.rejected,
            timestamp: new Date(doc.timestamp).toLocaleString(),
            status: verifiedCount > 0 ? 'Verified' : (rejectedCount > 0 ? 'Rejected' : 'Pending')
          };
        });

        setAttestations(formattedAttestations);
      } catch (error) {
        console.error('Error loading attestations:', error);
        setAttestations([]);
      }
    };

    loadAttestations();
    const interval = setInterval(loadAttestations, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [account, provider]);

  // Load attestation requests from localStorage
  useEffect(() => {
    const loadRequests = () => {
      const stored = localStorage.getItem('attestationRequests');
      if (stored) {
        const allRequests = JSON.parse(stored);
        // Filter only current user's requests
        const myRequests = allRequests.filter(req => req.msmeAddress === account);
        setAttestationRequests(myRequests);
      }
    };
    
    if (account) {
      loadRequests();
      // Check for updates every 3 seconds
      const interval = setInterval(loadRequests, 3000);
      return () => clearInterval(interval);
    }
  }, [account]);

  // Loan Request Form
  const [loanAmount, setLoanAmount] = useState('');
  const [loanTenure, setLoanTenure] = useState('12');
  const [loanPurpose, setLoanPurpose] = useState('');
  const [loanCategory, setLoanCategory] = useState('');
  const [collateralType, setCollateralType] = useState('');
  const [collateralValue, setCollateralValue] = useState('');
  const [expectedRate, setExpectedRate] = useState('');
  const [commitPeriod, setCommitPeriod] = useState('3600'); // 1 hour minimum (contract requirement)
  const [revealPeriod, setRevealPeriod] = useState('3600'); // 1 hour minimum (contract requirement)
  const [creatingLoan, setCreatingLoan] = useState(false);
  const [selectedLoanDetails, setSelectedLoanDetails] = useState(null);

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

  const openAttestationForm = (schemaType) => {
    setSelectedSchema(schemaType);
    setShowAttestationForm(true);
    // Pre-fill document type based on schema
    switch(schemaType) {
      case 'GST Revenue':
        setDocumentType('GST Return Filing');
        break;
      case 'Bank Statements':
        setDocumentType('Bank Statement PDF');
        break;
      case 'KYC Verification':
        setDocumentType('Aadhaar + PAN + Business Registration');
        break;
      case 'Credit Score':
        setDocumentType('Credit Bureau Report');
        break;
      default:
        setDocumentType('');
    }
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
      
      // Calculate attestation fee based on schema type
      const FEE_STRUCTURE = {
        'Credit Score': 150,
        'Bank Statements': 120,
        'GST Revenue': 100,
        'Tax Returns': 100,
        'KYC Verification': 80,
        'Business License': 80
      };
      
      const feeAmount = FEE_STRUCTURE[selectedSchema] || 100;
      
      // Ask for confirmation
      const confirmPayment = window.confirm(
        `💰 Attestation Fee Payment\n\n` +
        `Schema: ${selectedSchema}\n` +
        `Fee: ${feeAmount} CIT tokens\n\n` +
        `This fee will be held in escrow and paid to the oracle who verifies your document.\n\n` +
        `Continue?`
      );
      
      if (!confirmPayment) {
        setSubmittingAttestation(false);
        return;
      }

      // Transfer CIT tokens to platform (fee escrow)
      const tokenContract = getContractInstance('CIToken', signer);
      const feeInWei = parseTokens(feeAmount.toString());
      
      alert('Step 1/2: Paying attestation fee...\n\nPlease confirm the transaction in your wallet.');
      
      const feeTx = await tokenContract.transfer(CONTRACT_ADDRESSES.PlatformGovernance, feeInWei);
      await feeTx.wait();
      
      alert(`✅ Fee paid! Transaction: ${feeTx.hash.substring(0, 10)}...\n\nStep 2/2: Creating attestation request...`);
      
      // Create attestation request
      const request = {
        id: Date.now(),
        schema: selectedSchema,
        documentType,
        documentUrl,
        documentHash,
        additionalData,
        msmeAddress: account,
        status: 'Pending', // Pending, Verified, Rejected
        requestedAt: Date.now(),
        verifiedAt: null,
        oracle: null,
        fee: feeAmount,
        feePaid: true,
        feeTxHash: feeTx.hash
      };

      console.log('Submitting attestation request:', request);
      
      // Store in localStorage (shared with Oracle dashboard)
      const stored = localStorage.getItem('attestationRequests');
      const allRequests = stored ? JSON.parse(stored) : [];
      allRequests.push(request);
      localStorage.setItem('attestationRequests', JSON.stringify(allRequests));
      
      setAttestationRequests(prev => [...prev, request]);
      
      alert(
        `✅ Attestation request submitted!\n\n` +
        `Schema: ${selectedSchema}\n` +
        `Fee Paid: ${feeAmount} CIT\n` +
        `Document Hash: ${documentHash.substring(0, 20)}...\n\n` +
        `Oracles can now review and verify your documents.\n` +
        `View fee payment: https://sepolia.etherscan.io/tx/${feeTx.hash}`
      );
      
      // Reset form
      setShowAttestationForm(false);
      setSelectedSchema('');
      setDocumentType('');
      setDocumentUrl('');
      setDocumentHash('');
      setAdditionalData('');
      
    } catch (error) {
      console.error('Error submitting attestation request:', error);
      let errorMsg = error.code === 'ACTION_REJECTED' ? 'Transaction rejected by user' : error.message;
      alert('❌ Error: ' + errorMsg);
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
      const MIN_COMMIT_PERIOD = 3600; // 1 hour (contract requirement)
      const MIN_REVEAL_PERIOD = 3600; // 1 hour (contract requirement)
      const MAX_COMMIT_PERIOD = 7 * 24 * 3600; // 7 days
      
      if (commitPeriodSeconds < MIN_COMMIT_PERIOD || commitPeriodSeconds > MAX_COMMIT_PERIOD) {
        alert(`❌ Invalid Commit Period\n\nCommit period must be between 1 hour (3600s) and 7 days.\nCurrent: ${commitPeriodSeconds}s\n\nThis is enforced by the smart contract.`);
        setCreatingLoan(false);
        return;
      }
      
      if (revealPeriodSeconds < MIN_REVEAL_PERIOD || revealPeriodSeconds > MAX_COMMIT_PERIOD) {
        alert(`❌ Invalid Reveal Period\n\nReveal period must be between 1 hour (3600s) and 7 days.\nCurrent: ${revealPeriodSeconds}s\n\nThis is enforced by the smart contract.`);
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
      setCommitPeriod('3600'); // Reset to 1 hour (contract minimum)
      setRevealPeriod('3600'); // Reset to 1 hour (contract minimum)
      
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

  return (
    <div>
      <div className="card">
        <h1>🏢 MSME Dashboard</h1>
        <p style={{ color: '#718096' }}>
          Connected as: <strong>{account}</strong>
        </p>
      </div>

      {/* Tabs */}
      <div className="card">
        <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
          <button 
            className={`button ${tab === 'identity' ? '' : 'button-secondary'}`}
            onClick={() => setTab('identity')}
            style={{ background: tab === 'identity' ? '#667eea' : '#e2e8f0', color: tab === 'identity' ? 'white' : '#4a5568' }}
          >
            Identity
          </button>
          <button 
            className={`button ${tab === 'attestations' ? '' : 'button-secondary'}`}
            onClick={() => setTab('attestations')}
            style={{ background: tab === 'attestations' ? '#667eea' : '#e2e8f0', color: tab === 'attestations' ? 'white' : '#4a5568' }}
          >
            Attestations
          </button>
          <button 
            className={`button ${tab === 'loans' ? '' : 'button-secondary'}`}
            onClick={() => setTab('loans')}
            style={{ background: tab === 'loans' ? '#667eea' : '#e2e8f0', color: tab === 'loans' ? 'white' : '#4a5568' }}
          >
            Loan Requests
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
              <div className="alert alert-success">
                ✅ Identity Registered - Persists Across Sessions
              </div>
              <div style={{ background: '#f0fff4', padding: '16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #48bb78' }}>
                <div style={{ fontSize: '12px', color: '#22543d', marginBottom: '8px' }}>
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
                <div style={{ fontSize: '11px', color: '#22543d', marginTop: '8px' }}>
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
                
                <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                  <button 
                    className="button button-secondary"
                    onClick={() => {
                      if (window.confirm('⚠️ Reset Identity?\n\nThis will clear your current identity. You\'ll need to create a new one.\n\nNote: Your attestations and loans will remain linked to your wallet address.')) {
                        const storedIdentities = JSON.parse(localStorage.getItem('msmeIdentities') || '{}');
                        delete storedIdentities[account];
                        localStorage.setItem('msmeIdentities', JSON.stringify(storedIdentities));
                        setIdentityAddress('');
                        setBusinessName('');
                        setIndustry('');
                        setGstNumber('');
                        setPanNumber('');
                        setRegistrationYear('');
                        setAnnualRevenue('');
                        setEmployeeCount('');
                        setBusinessAddress('');
                      }
                    }}
                  >
                    🔄 Reset Identity
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Attestations Tab */}
      {tab === 'attestations' && (
        <div>
          <div className="card">
            <h2>Request Attestations</h2>
            <p style={{ color: '#718096', marginBottom: '20px' }}>
              Submit documents for verification by trusted oracles
            </p>
            
            <div className="grid">
              <button className="button" onClick={() => openAttestationForm('GST Revenue')}>
                🧾 GST Revenue
              </button>
              <button className="button" onClick={() => openAttestationForm('Bank Statements')}>
                🏦 Bank Statements
              </button>
              <button className="button" onClick={() => openAttestationForm('KYC Verification')}>
                ✅ KYC Verification
              </button>
              <button className="button" onClick={() => openAttestationForm('Credit Score')}>
                📊 Credit Score
              </button>
            </div>
          </div>

          {/* Attestation Request Form */}
          {showAttestationForm && (
            <div className="card" style={{ background: '#f7fafc', border: '2px solid #667eea' }}>
              <h2>Submit {selectedSchema} Attestation</h2>
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
                      <td><strong>{req.schema}</strong></td>
                      <td>{req.documentType}</td>
                      <td><code style={{ fontSize: '11px' }}>{req.documentHash.substring(0, 20)}...</code></td>
                      <td>
                        <span className={`status ${
                          req.status === 'Verified' ? 'status-active' : 
                          req.status === 'Rejected' ? 'status-error' : 
                          'status-warning'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td>{new Date(req.requestedAt).toLocaleDateString()}</td>
                      <td>
                        {req.status === 'Pending' && (
                          <span style={{ fontSize: '12px', color: '#718096' }}>
                            ⏳ Awaiting Oracle Verification
                          </span>
                        )}
                        {req.status === 'Verified' && req.txHash && (
                          <a 
                            href={`https://sepolia.etherscan.io/tx/${req.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '12px', color: '#667eea' }}
                          >
                            View Transaction →
                          </a>
                        )}
                        {req.status === 'Verified' && !req.txHash && (
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
            <p style={{ color: '#718096', marginBottom: '16px', fontSize: '14px' }}>
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
                        <strong style={{ color: '#2d3748' }}>{att.schema}</strong>
                      </td>
                      <td>
                        <code style={{ fontSize: '11px', background: '#f7fafc', padding: '2px 6px', borderRadius: '3px' }}>
                          {att.documentHash.substring(0, 20)}...
                        </code>
                      </td>
                      <td>
                        {att.verifiedCount > 0 ? (
                          <div>
                            <span style={{ 
                              background: '#48bb78', 
                              color: 'white', 
                              padding: '4px 10px', 
                              borderRadius: '12px',
                              fontWeight: 'bold',
                              fontSize: '12px'
                            }}>
                              ✅ {att.verifiedCount} Oracle{att.verifiedCount > 1 ? 's' : ''}
                            </span>
                            <div style={{ fontSize: '10px', color: '#718096', marginTop: '4px' }}>
                              {att.verifiedBy.slice(0, 2).map((v, i) => (
                                <div key={i}>{v.oracle.substring(0, 10)}...</div>
                              ))}
                              {att.verifiedBy.length > 2 && <div>+{att.verifiedBy.length - 2} more</div>}
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
                              background: '#e53e3e', 
                              color: 'white', 
                              padding: '4px 10px', 
                              borderRadius: '12px',
                              fontWeight: 'bold',
                              fontSize: '12px'
                            }}>
                              ❌ {att.rejectedCount} Oracle{att.rejectedCount > 1 ? 's' : ''}
                            </span>
                            <div style={{ fontSize: '10px', color: '#718096', marginTop: '4px' }}>
                              {att.rejectedBy.slice(0, 2).map((r, i) => (
                                <div key={i}>
                                  {r.oracle.substring(0, 10)}... (Tier {r.oracleTier})
                                  <div style={{ fontSize: '9px', fontStyle: 'italic' }}>{r.reason}</div>
                                </div>
                              ))}
                              {att.rejectedBy.length > 2 && <div>+{att.rejectedBy.length - 2} more</div>}
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
                    min="3600"
                    required
                  />
                  <small style={{ color: '#718096' }}>
                    Minimum: 3600s (1 hour) - Contract enforced
                  </small>
                </div>

                <div>
                  <label className="label">Reveal Period (seconds) *</label>
                  <input 
                    type="number"
                    className="input"
                    value={revealPeriod}
                    onChange={(e) => setRevealPeriod(e.target.value)}
                    min="3600"
                    required
                  />
                  <small style={{ color: '#718096' }}>
                    Minimum: 3600s (1 hour) - Contract enforced
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
                  <div key={loan.id} className="card" style={{ background: '#f7fafc', marginBottom: 0 }}>
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
                          <p style={{ margin: '4px 0' }}><strong>Created:</strong> {new Date(loan.createdAt).toLocaleDateString()}</p>
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
            <div className="card" style={{ background: '#f0f9ff', border: '2px solid #667eea' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>📋 Loan Request Details</h2>
                <button 
                  className="button button-secondary"
                  onClick={() => setSelectedLoanDetails(null)}
                >
                  ✕ Close
                </button>
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
                      {selectedLoanDetails.amount} ETH
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Tenure:</strong></td>
                    <td>{selectedLoanDetails.tenure} months</td>
                  </tr>
                  <tr>
                    <td><strong>Category:</strong></td>
                    <td>{selectedLoanDetails.category}</td>
                  </tr>
                  <tr>
                    <td><strong>Purpose:</strong></td>
                    <td>{selectedLoanDetails.purpose}</td>
                  </tr>
                  <tr>
                    <td><strong>Expected Rate:</strong></td>
                    <td>{selectedLoanDetails.expectedRate || 'N/A'}{selectedLoanDetails.expectedRate && '%'}</td>
                  </tr>
                  <tr>
                    <td><strong>Collateral Type:</strong></td>
                    <td>{selectedLoanDetails.collateralType}</td>
                  </tr>
                  <tr>
                    <td><strong>Collateral Value:</strong></td>
                    <td>{selectedLoanDetails.collateralValue} ETH</td>
                  </tr>
                  <tr>
                    <td><strong>Commit Period:</strong></td>
                    <td>{selectedLoanDetails.commitPeriod}s ({(selectedLoanDetails.commitPeriod / 3600).toFixed(1)} hours)</td>
                  </tr>
                  <tr>
                    <td><strong>Reveal Period:</strong></td>
                    <td>{selectedLoanDetails.revealPeriod}s ({(selectedLoanDetails.revealPeriod / 3600).toFixed(1)} hours)</td>
                  </tr>
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MSMEDashboard;
