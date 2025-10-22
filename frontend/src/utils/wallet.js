import { ethers } from 'ethers';
import { checkNetwork, switchToSepolia } from './contracts';

// Connect to wallet (Rabby, MetaMask, etc)
export const connectWallet = async () => {
  if (!window.ethereum) {
    throw new Error('Please install Rabby or MetaMask wallet');
  }

  try {
    // Request account access
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });

    // Create provider and signer
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const account = accounts[0];

    // Check network
    const isCorrectNetwork = await checkNetwork(provider);
    if (!isCorrectNetwork) {
      const switched = await switchToSepolia();
      if (!switched) {
        throw new Error('Please switch to Sepolia network');
      }
    }

    return { provider, signer, account };
  } catch (error) {
    console.error('Error connecting wallet:', error);
    throw error;
  }
};

// Listen for account changes
export const onAccountsChanged = (callback) => {
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => {
      if (accounts.length === 0) {
        callback(null);
      } else {
        callback(accounts[0]);
      }
    });
  }
};

// Listen for chain changes
export const onChainChanged = (callback) => {
  if (window.ethereum) {
    window.ethereum.on('chainChanged', (chainId) => {
      callback(chainId);
    });
  }
};

// Disconnect wallet
export const disconnectWallet = () => {
  // Most wallets don't support programmatic disconnect
  // User needs to disconnect from the wallet extension
  window.location.reload();
};

// Get current account
export const getCurrentAccount = async () => {
  if (!window.ethereum) return null;
  
  try {
    const accounts = await window.ethereum.request({ 
      method: 'eth_accounts' 
    });
    return accounts[0] || null;
  } catch (error) {
    console.error('Error getting account:', error);
    return null;
  }
};

// Sign message
export const signMessage = async (signer, message) => {
  try {
    const signature = await signer.signMessage(message);
    return signature;
  } catch (error) {
    console.error('Error signing message:', error);
    throw error;
  }
};

// Format balance
export const formatBalance = (balance) => {
  return ethers.formatEther(balance);
};

// Get ETH balance
export const getBalance = async (provider, address) => {
  const balance = await provider.getBalance(address);
  return formatBalance(balance);
};

// Get token balance
export const getTokenBalance = async (tokenContract, address) => {
  const balance = await tokenContract.balanceOf(address);
  return ethers.formatUnits(balance, 18);
};
