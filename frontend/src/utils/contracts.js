// Contract addresses - Sepolia Testnet (Updated: Oct 22, 2025)
export const CONTRACT_ADDRESSES = {
  CIToken: process.env.REACT_APP_CIT_TOKEN || '0xf92e9e05D816962F856b8e0EaA3De4f57e2e5E3f',
  OracleStaking: process.env.REACT_APP_ORACLE_STAKING || '0x27193be71b8D84dB1fCd57D9A8D917155C71a574',
  AttestationRegistry: process.env.REACT_APP_ATTESTATION_REGISTRY || '0xf931D540fFB875ea6A5952dCf00c83260e94bE9f',
  LoanMarketplace: process.env.REACT_APP_LOAN_MARKETPLACE || '0x67fcDa4FFee9f0Da9657b81DC88d168eE9f5eBBd',
  LoanAgreementRegistry: process.env.REACT_APP_LOAN_AGREEMENT_REGISTRY || '0xff8F38601B4A0B2F467efB9862333705e1a8815F',
  PlatformGovernance: process.env.REACT_APP_PLATFORM_GOVERNANCE || '0xF560e4859f8294ae0d7BFaf29a674b2c12cDE465',
  MSMEIdentity: process.env.REACT_APP_MSME_IDENTITY || '0x9EA06d085DA5055f407d3eA0586C5B3EEca3C17E'
};

export const NETWORK_CONFIG = {
  chainId: '0xaa36a7', // 11155111 in hex
  chainName: 'Sepolia',
  rpcUrl: 'https://rpc.sepolia.org',
  blockExplorer: 'https://sepolia.etherscan.io'
};

export const RPC_URL = process.env.REACT_APP_RPC_URL || 'https://rpc.sepolia.org';

// Utility function to get contract instance
export const getContract = (address, abi, signerOrProvider) => {
  const { ethers } = require('ethers');
  return new ethers.Contract(address, abi, signerOrProvider);
};

// Format eth address
export const formatAddress = (address) => {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

// Format token amount
export const formatTokens = (amount, decimals = 18) => {
  const { ethers } = require('ethers');
  return ethers.formatUnits(amount, decimals);
};

// Parse token amount
export const parseTokens = (amount, decimals = 18) => {
  const { ethers } = require('ethers');
  return ethers.parseUnits(amount.toString(), decimals);
};

// Format date
export const formatDate = (timestamp) => {
  return new Date(Number(timestamp) * 1000).toLocaleDateString();
};

// Convert basis points to percentage
export const bpsToPercent = (bps) => {
  return (Number(bps) / 100).toFixed(2);
};

// Contract ABIs - Essential functions only
export const CONTRACT_ABIS = {
  CIToken: [
    "function balanceOf(address account) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)"
  ],
  
  OracleStaking: [
    "function stake(uint256 amount) external",
    "function withdraw(uint256 amount) external",
    "function initiateWithdrawal() external",
    "function completeWithdrawal() external",
    // Returns: stakedAmount, reputationScore, attestationCount, slashCount, registrationTime, isActive
    "function getOracleInfo(address oracle) view returns (uint256, uint256, uint256, uint256, uint256, bool)",
    "function isValidOracle(address oracle) view returns (bool)",
    // Note: getOracleTier() not in deployed contract - calculate tier locally based on staked amount
    "event OracleRegistered(address indexed oracle, uint256 amount)",
    "event StakeIncreased(address indexed oracle, uint256 amount, uint256 newTotal)",
    "event StakeWithdrawn(address indexed oracle, uint256 amount, uint256 remaining)"
  ],
  
  AttestationRegistry: [
    "function registerSchema(bytes32 schemaId, string calldata name, string calldata description) external",
    "function submitAttestation(address msmeId, bytes32 schemaId, bytes calldata data, uint256 validityPeriod) external",
    "function getAttestations(address msmeId) view returns (tuple(bytes32 schemaId, address issuer, bytes data, uint256 timestamp, uint256 expiryTime, bool revoked)[])",
    "function getAttestationsBySchema(address msmeId, bytes32 schemaId) view returns (tuple(bytes32 schemaId, address issuer, bytes data, uint256 timestamp, uint256 expiryTime, bool revoked)[])",
    "function isAttestationValid(address msmeId, uint256 attestationIndex) view returns (bool)",
    // Note: getValidAttestationCount() not in deployed contract - count manually from getAttestations() result
    "function getAllSchemas() view returns (bytes32[])",
    "function getSchema(bytes32 schemaId) view returns (tuple(string name, string description, bool active, uint256 createdAt))",
    "event SchemaRegistered(bytes32 indexed schemaId, string name)",
    "event AttestationMade(address indexed msmeId, address indexed issuer, bytes32 indexed schemaId, uint256 attestationIndex)",
    "event AttestationRevoked(address indexed msmeId, uint256 indexed attestationIndex, address indexed revoker)"
  ],
  
  LoanMarketplace: [
    "function createLoanRequest(uint256 amount, uint16 tenure, string calldata purpose, uint256 commitPeriod, uint256 revealPeriod) external returns (uint256)",
    "function commitBid(uint256 requestId, bytes32 commitment) external payable",
    "function revealBid(uint256 requestId, uint256 rateBP, bytes32 nonce) external",
    "function selectWinner(uint256 requestId) external",
    "function cancelRequest(uint256 requestId) external",
    "function requests(uint256 requestId) view returns (address msme, uint256 amount, uint16 tenureMonths, uint256 commitDeadline, uint256 revealDeadline, uint8 status, string purpose, uint256 createdAt)",
    "function commitments(uint256 requestId, address lender) view returns (bytes32)",
    "function revealedBids(uint256 requestId, uint256 index) view returns (address lender, uint256 rateBP, uint256 timestamp, bool withdrawn)",
    "function winningLenders(uint256 requestId) view returns (address)",
    "function winningRates(uint256 requestId) view returns (uint256)",
    "function bidDeposits(uint256 requestId, address lender) view returns (uint256)",
    "function requestCounter() view returns (uint256)",
    "event LoanRequestCreated(uint256 indexed requestId, address indexed msme, uint256 amount, uint16 tenure, string purpose)",
    "event BidCommitted(uint256 indexed requestId, address indexed lender, bytes32 commitment)",
    "event BidRevealed(uint256 indexed requestId, address indexed lender, uint256 rateBP)",
    "event LoanMatched(uint256 indexed requestId, address indexed msme, address indexed winningLender, uint256 rateBP)"
  ],
  
  LoanAgreementRegistry: [
    "function createAgreement(uint256 loanId, address lender, uint256 amount, uint256 rate, uint256 tenureMonths, bytes32 termsHash) external returns (uint256)",
    "function signAgreement(uint256 agreementId) external",
    "function getAgreement(uint256 agreementId) view returns (tuple(uint256 loanId, address msme, address lender, uint256 amount, uint256 rate, uint256 tenureMonths, bytes32 termsHash, bool msmeSigned, bool lenderSigned, bool isActive, uint256 createdAt))",
    "function getAgreementsByMSME(address msme) view returns (uint256[] memory)",
    "function getAgreementsByLender(address lender) view returns (uint256[] memory)"
  ],
  
  MSMEIdentity: [
    "function owner() view returns (address)",
    "function approveOperator(address operator) external",
    "function revokeOperator(address operator) external",
    "function isApprovedOperator(address operator) view returns (bool)",
    "function setData(bytes32 key, bytes calldata value) external",
    "function getData(bytes32 key) view returns (bytes memory)",
    "function setDataBatch(bytes32[] calldata keys, bytes[] calldata values) external",
    "event DataChanged(bytes32 indexed key, bytes value)",
    "event OperatorApproved(address indexed operator)",
    "event OperatorRevoked(address indexed operator)"
  ]
};

// Helper to get contract instance with ABI
export const getContractInstance = (contractName, signerOrProvider) => {
  const { ethers } = require('ethers');
  const address = CONTRACT_ADDRESSES[contractName];
  const abi = CONTRACT_ABIS[contractName];
  
  // Debug logging to verify correct address
  if (contractName === 'LoanMarketplace') {
    console.log('🔧 LoanMarketplace Address:', address);
    console.log('🔧 Expected NEW address: 0x67fcDa4FFee9f0Da9657b81DC88d168eE9f5eBBd');
  }
  
  if (!address || !abi) {
    throw new Error(`Contract ${contractName} not found`);
  }
  
  return new ethers.Contract(address, abi, signerOrProvider);
};

// Check if wallet is connected to correct network
export const checkNetwork = async (provider) => {
  const network = await provider.getNetwork();
  return network.chainId === 11155111n; // Sepolia
};

// Request network switch
export const switchToSepolia = async () => {
  if (!window.ethereum) return false;
  
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: NETWORK_CONFIG.chainId }],
    });
    return true;
  } catch (error) {
    console.error('Failed to switch network:', error);
    return false;
  }
};
