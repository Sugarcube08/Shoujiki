import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useState, useEffect } from 'react';
import bs58 from 'bs58';
import { loginWallet } from '@/lib/api';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export function useWalletAuth() {
  const { connection } = useConnection();
  const { publicKey, signMessage, connected, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleAuthExpired = () => {
      setIsAuthenticated(false);
    };
    window.addEventListener('shoujiki-auth-expired', handleAuthExpired);
    return () => window.removeEventListener('shoujiki-auth-expired', handleAuthExpired);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('shoujiki_token');
    const authedWallet = localStorage.getItem('shoujiki_wallet');

    if (connected && publicKey) {
      const currentWallet = publicKey.toBase58();
      
      if (authedWallet && authedWallet !== currentWallet) {
        // Security Wipe: Different wallet detected, clear all old data
        localStorage.clear();
        setIsAuthenticated(false);
      } else if (token) {
        // Persistence: Same wallet or initial load with valid session
        // Basic JWT expiration check (proactive)
        try {
          const payloadBase64 = token.split('.')[1];
          const decodedPayload = JSON.parse(atob(payloadBase64));
          const isExpired = decodedPayload.exp * 1000 < Date.now();
          
          if (isExpired) {
            localStorage.removeItem('shoujiki_token');
            setIsAuthenticated(false);
          } else {
            setIsAuthenticated(true);
          }
        } catch (e) {
          console.error("Failed to parse auth token:", e);
          localStorage.removeItem('shoujiki_token');
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
    } else {
      setIsAuthenticated(false);
    }
  }, [connected, publicKey]);

  useEffect(() => {
    if (connected && publicKey) {
      const fetchBalance = async () => {
        try {
          const bal = await connection.getBalance(publicKey);
          setBalance(bal / LAMPORTS_PER_SOL);
        } catch (err) {
          console.error("Failed to fetch Solana balance:", err);
          setBalance(null);
        }
      };
      fetchBalance();
      const id = connection.onAccountChange(publicKey, (info) => {
        setBalance(info.lamports / LAMPORTS_PER_SOL);
      });
      return () => { connection.removeAccountChangeListener(id); };
    } else {
      setBalance(null);
    }
  }, [connected, publicKey, connection]);

  const login = async () => {
    if (!connected || !publicKey || !signMessage) {
      setVisible(true);
      return;
    }
    
    try {
      setLoading(true);
      const message = "Login to Shoujiki AgentOS";
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await signMessage(encodedMessage);
      const signatureStr = bs58.encode(signature);

      const res = await loginWallet(publicKey.toBase58(), signatureStr, message);
      
      // Store wallet address along with the token to enable persistence/wipe logic
      localStorage.setItem('shoujiki_wallet', publicKey.toBase58());
      setIsAuthenticated(true);
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
    disconnect();
  };

  return { isAuthenticated, login, logout, loading, publicKey, connected, balance };
}
