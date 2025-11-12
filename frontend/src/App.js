import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ethers } from 'ethers';
import { connectWallet, onAccountsChanged, onChainChanged, getCurrentAccount } from './utils/wallet';
import { checkNetwork, NETWORK_CONFIG } from './utils/contracts';

// Components
import Home from './components/pages/Home';
import MSMEDashboard from './components/pages/MSMEDashboard';
import LenderDashboard from './components/pages/LenderDashboard';
import OracleDashboard from './components/pages/OracleDashboard';
import Marketplace from './components/pages/Marketplace';

function App() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [networkError, setNetworkError] = useState(null);

  useEffect(() => {
    checkIfWalletIsConnected();
    
    // Listen for account changes
    onAccountsChanged((newAccount) => {
      if (newAccount) {
        setAccount(newAccount);
        initializeProvider();
      } else {
        handleDisconnect();
      }
    });

    // Listen for network changes
    onChainChanged(() => {
      window.location.reload();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkIfWalletIsConnected = async () => {
    try {
      const currentAccount = await getCurrentAccount();
      
      if (currentAccount) {
        setAccount(currentAccount);
        await initializeProvider();
      }
    } catch (error) {
      console.error('Error checking wallet connection:', error);
    }
  };

  const initializeProvider = async () => {
    try {
      if (!window.ethereum) return;
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();
      
      setProvider(provider);
      setSigner(signer);
      setChainId(network.chainId.toString());
      
      // Check if on correct network
      const isCorrectNetwork = await checkNetwork(provider);
      if (!isCorrectNetwork) {
        setNetworkError(`Please switch to ${NETWORK_CONFIG.chainName} network`);
      } else {
        setNetworkError(null);
      }
    } catch (error) {
      console.error('Error initializing provider:', error);
    }
  };

  const handleConnectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert('Please install Rabby or MetaMask wallet!');
        return;
      }

      setIsConnecting(true);
      
      const { provider: newProvider, signer: newSigner, account: newAccount } = await connectWallet();
      
      setProvider(newProvider);
      setSigner(newSigner);
      setAccount(newAccount);
      
      const network = await newProvider.getNetwork();
      setChainId(network.chainId.toString());
      
      setNetworkError(null);
      console.log('Connected to:', newAccount);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      if (error.message) {
        alert(error.message);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setChainId(null);
    setNetworkError(null);
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <Router>
      <div className="App">
        <header className="header">
          <div className="header-content">
            <Link to="/" className="logo" style={{ textDecoration: 'none' }}>
              MSME Credit Platform
            </Link>
            
            <nav className="nav">
              <Link to="/" className="nav-link">Home</Link>
              <Link to="/marketplace" className="nav-link">Marketplace</Link>
              <Link to="/msme" className="nav-link">MSME</Link>
              <Link to="/lender" className="nav-link">Lender</Link>
              <Link to="/oracle" className="nav-link">Oracle</Link>
            </nav>

            <div>
              {networkError && (
                <div className="network-status network-status-error">
                  ⚠️ {networkError}
                </div>
              )}
              {account ? (
                <div className="d-flex gap-3 align-center">
                  <span className={parseInt(NETWORK_CONFIG.chainId, 16).toString() === chainId ? 'network-status network-status-connected' : 'network-status network-status-error'}>
                    {parseInt(NETWORK_CONFIG.chainId, 16).toString() === chainId ? `🟢 ${NETWORK_CONFIG.chainName}` : '🔴 Wrong Network'}
                  </span>
                  <span className="account-address">
                    {formatAddress(account)}
                  </span>
                  <button 
                    onClick={handleDisconnect}
                    className="btn-disconnect"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleConnectWallet}
                  className="button"
                  disabled={isConnecting}
                >
                  {isConnecting ? 'Connecting...' : '🦊 Connect Wallet'}
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="container">
          <Routes>
            <Route path="/" element={<Home account={account} provider={provider} />} />
            <Route path="/marketplace" element={
              <Marketplace 
                account={account} 
                provider={provider}
                signer={signer}
              />
            } />
            <Route path="/msme" element={
              <MSMEDashboard 
                account={account}
                provider={provider}
                signer={signer}
              />
            } />
            <Route path="/lender" element={
              <LenderDashboard 
                account={account}
                provider={provider}
                signer={signer}
              />
            } />
            <Route path="/oracle" element={
              <OracleDashboard 
                account={account}
                provider={provider}
                signer={signer}
              />
            } />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
