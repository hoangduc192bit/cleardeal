import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { type Address } from 'viem';

const LOCAL_WALLET_KEY = 'arcstream:agent:wallet:privateKey';
const ARC_TESTNET_RPC = 'https://rpc.testnet.arc.network';
const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';

const USDC_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)'
];

export function useAgentWallet() {
  const [address, setAddress] = useState<Address | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [isInitializing, setIsInitializing] = useState(true);

  const getWallet = useCallback(() => {
    let pk = localStorage.getItem(LOCAL_WALLET_KEY);
    if (!pk) {
      const wallet = ethers.Wallet.createRandom();
      pk = wallet.privateKey;
      localStorage.setItem(LOCAL_WALLET_KEY, pk);
    }
    const provider = new ethers.JsonRpcProvider(ARC_TESTNET_RPC);
    return new ethers.Wallet(pk, provider);
  }, []);

  const refreshBalance = useCallback(async () => {
    try {
      const wallet = getWallet();
      setAddress(wallet.address as Address);
      const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet.provider);
      const decimals = await usdc.decimals();
      const bal = await usdc.balanceOf(wallet.address);
      setBalance(ethers.formatUnits(bal, decimals));
    } catch (err) {
      console.error("Failed to fetch agent balance:", err);
    } finally {
      setIsInitializing(false);
    }
  }, [getWallet]);

  useEffect(() => {
    refreshBalance();
    // Set up a polling interval to keep balance updated
    const interval = setInterval(refreshBalance, 5000);
    return () => clearInterval(interval);
  }, [refreshBalance]);

  const payInvoice = async (to: string, amountStr: string): Promise<string> => {
    const wallet = getWallet();
    const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet);
    const decimals = await usdc.decimals();
    const amount = ethers.parseUnits(amountStr, decimals);
    
    // Check balance first
    const bal = await usdc.balanceOf(wallet.address);
    if (bal < amount) {
      throw new Error(`Số dư Ví Agent không đủ. Cần thêm ${amountStr} USDC.`);
    }

    const tx = await usdc.transfer(to, amount);
    await tx.wait(1); // Wait for 1 confirmation
    await refreshBalance();
    return tx.hash;
  };

  return { address, balance, isInitializing, refreshBalance, payInvoice };
}
