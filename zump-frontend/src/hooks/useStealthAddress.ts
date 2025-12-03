/**
 * useStealthAddress Hook
 * Manages stealth address generation and storage
 * Requirements: 2.1, 2.2, 2.3, 10.3
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAccount } from '@starknet-react/core';
import { Contract, RpcProvider } from 'starknet';
import { StealthAddress } from '../@types/privacy';
import { getContractAddresses, getContractConfig, isValidContractAddress } from '../config/contracts';
import { STEALTH_ADDRESS_GENERATOR_ABI } from '../abi';

// Storage key for stealth addresses
const STEALTH_STORAGE_KEY = 'zump_stealth_addresses';

export interface UseStealthAddressReturn {
  stealthAddresses: StealthAddress[];
  isGenerating: boolean;
  error: string | null;
  isContractAvailable: boolean;
  generateStealthAddress: () => Promise<StealthAddress | null>;
  generateStealthAddressOnChain: () => Promise<StealthAddress | null>;
  removeStealthAddress: (address: string) => void;
  clearAllStealthAddresses: () => void;
  getStealthAddressByViewTag: (viewTag: string) => StealthAddress | undefined;
  validateStealthAddress: (address: string) => Promise<boolean>;
}

/**
 * Custom hook for stealth address management
 * Supports both local (offline) and on-chain stealth address generation
 */
export function useStealthAddress(): UseStealthAddressReturn {
  const { address: walletAddress, isConnected, account } = useAccount();
  const [stealthAddresses, setStealthAddresses] = useState<StealthAddress[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get contract configuration
  const addresses = useMemo(() => getContractAddresses(), []);
  const config = useMemo(() => getContractConfig(), []);
  const isContractAvailable = useMemo(
    () => isValidContractAddress(addresses.stealthAddressGenerator),
    [addresses.stealthAddressGenerator]
  );

  // Create provider and contract instances
  const provider = useMemo(
    () => new RpcProvider({ nodeUrl: config.rpcUrl }),
    [config.rpcUrl]
  );

  const stealthContract = useMemo(() => {
    if (!isContractAvailable) return null;
    return new Contract(
      STEALTH_ADDRESS_GENERATOR_ABI,
      addresses.stealthAddressGenerator,
      account || provider
    );
  }, [isContractAvailable, addresses.stealthAddressGenerator, account, provider]);

  // Load stealth addresses from localStorage on mount
  useEffect(() => {
    if (walletAddress && isConnected) {
      loadStealthAddresses();
    } else {
      setStealthAddresses([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress, isConnected]);

  // Load stealth addresses from localStorage
  const loadStealthAddresses = useCallback(() => {
    if (!walletAddress) return;
    
    try {
      const storageKey = `${STEALTH_STORAGE_KEY}_${walletAddress}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as StealthAddress[];
        setStealthAddresses(parsed);
      }
    } catch (err) {
      console.error('Failed to load stealth addresses:', err);
    }
  }, [walletAddress]);

  // Save stealth addresses to localStorage
  const saveStealthAddresses = useCallback((newAddresses: StealthAddress[]) => {
    if (!walletAddress) return;
    
    try {
      const storageKey = `${STEALTH_STORAGE_KEY}_${walletAddress}`;
      localStorage.setItem(storageKey, JSON.stringify(newAddresses));
    } catch (err) {
      console.error('Failed to save stealth addresses:', err);
    }
  }, [walletAddress]);

  // Generate a new stealth address locally (offline mode)
  const generateStealthAddress = useCallback(async (): Promise<StealthAddress | null> => {
    if (!isConnected || !walletAddress) {
      setError('Wallet not connected');
      return null;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Generate random values for stealth address derivation
      const ephemeralRandom = generateRandomFelt();
      const viewingPubkey = generateRandomFelt();

      // Create local stealth address
      const newStealthAddress: StealthAddress = {
        address: generateLocalStealthAddress(walletAddress.toString(), stealthAddresses.length),
        viewTag: generateViewTag(viewingPubkey, ephemeralRandom),
        ephemeralPubkey: ephemeralRandom,
        createdAt: Date.now(),
      };

      const updatedAddresses = [...stealthAddresses, newStealthAddress];
      setStealthAddresses(updatedAddresses);
      saveStealthAddresses(updatedAddresses);

      return newStealthAddress;
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to generate stealth address';
      setError(errorMessage);
      console.error('Stealth address generation error:', err);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [isConnected, walletAddress, stealthAddresses, saveStealthAddresses]);

  // Generate stealth address on-chain via contract
  const generateStealthAddressOnChain = useCallback(async (): Promise<StealthAddress | null> => {
    if (!isConnected || !walletAddress || !account) {
      setError('Wallet not connected');
      return null;
    }

    if (!stealthContract || !isContractAvailable) {
      setError('Stealth contract not available');
      // Fallback to local generation
      return generateStealthAddress();
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Generate random values
      const spendingPubkey = generateRandomFelt();
      const viewingPubkey = generateRandomFelt();
      const ephemeralRandom = generateRandomFelt();

      // Call contract to generate stealth address
      const tx = await stealthContract.invoke('generate_stealth_address', [
        spendingPubkey,
        viewingPubkey,
        ephemeralRandom,
      ]);

      // Wait for transaction confirmation
      const receipt = await provider.waitForTransaction(tx.transaction_hash, {
        retryInterval: 2000,
      });

      // Extract data from events
      let stealthAddr = '0x0';
      let viewTag = '0x0';
      let ephemeralPubkey = ephemeralRandom;

      if (receipt && (receipt as any).events) {
        const events = (receipt as any).events;
        const event = events.find((e: any) => e.data && e.data.length >= 2);
        if (event) {
          stealthAddr = event.data[0]?.toString() || stealthAddr;
          viewTag = event.data[1]?.toString() || viewTag;
          ephemeralPubkey = event.data[2]?.toString() || ephemeralPubkey;
        }
      }

      // If we couldn't extract from events, generate locally
      if (stealthAddr === '0x0') {
        stealthAddr = generateLocalStealthAddress(walletAddress.toString(), stealthAddresses.length);
        viewTag = generateViewTag(viewingPubkey, ephemeralRandom);
      }

      const newStealthAddress: StealthAddress = {
        address: stealthAddr,
        viewTag,
        ephemeralPubkey,
        createdAt: Date.now(),
      };

      const updatedAddresses = [...stealthAddresses, newStealthAddress];
      setStealthAddresses(updatedAddresses);
      saveStealthAddresses(updatedAddresses);

      return newStealthAddress;
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to generate stealth address on-chain';
      setError(errorMessage);
      console.error('On-chain stealth address generation error:', err);
      
      // Fallback to local generation on error
      console.log('Falling back to local stealth address generation...');
      return generateStealthAddress();
    } finally {
      setIsGenerating(false);
    }
  }, [
    isConnected,
    walletAddress,
    account,
    stealthContract,
    isContractAvailable,
    stealthAddresses,
    saveStealthAddresses,
    provider,
    generateStealthAddress,
  ]);

  // Validate stealth address on-chain
  const validateStealthAddress = useCallback(async (address: string): Promise<boolean> => {
    if (!stealthContract || !isContractAvailable) {
      // If contract not available, check local list
      return stealthAddresses.some(sa => sa.address === address);
    }

    try {
      const result = await stealthContract.call('is_valid_stealth', [address]);
      return Boolean(result);
    } catch (err) {
      console.error('Failed to validate stealth address:', err);
      return false;
    }
  }, [stealthContract, isContractAvailable, stealthAddresses]);

  // Remove a stealth address
  const removeStealthAddress = useCallback((address: string) => {
    const updatedAddresses = stealthAddresses.filter(sa => sa.address !== address);
    setStealthAddresses(updatedAddresses);
    saveStealthAddresses(updatedAddresses);
  }, [stealthAddresses, saveStealthAddresses]);

  // Clear all stealth addresses
  const clearAllStealthAddresses = useCallback(() => {
    setStealthAddresses([]);
    if (walletAddress) {
      const storageKey = `${STEALTH_STORAGE_KEY}_${walletAddress}`;
      localStorage.removeItem(storageKey);
    }
  }, [walletAddress]);

  // Get stealth address by view tag
  const getStealthAddressByViewTag = useCallback((viewTag: string): StealthAddress | undefined => {
    return stealthAddresses.find(sa => sa.viewTag === viewTag);
  }, [stealthAddresses]);

  return {
    stealthAddresses,
    isGenerating,
    error,
    isContractAvailable,
    generateStealthAddress,
    generateStealthAddressOnChain,
    removeStealthAddress,
    clearAllStealthAddresses,
    getStealthAddressByViewTag,
    validateStealthAddress,
  };
}

// Helper: Generate random felt252 value
function generateRandomFelt(): string {
  const bytes = new Uint8Array(31); // 31 bytes to stay within felt252 range
  crypto.getRandomValues(bytes);
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper: Generate local stealth address (for offline/fallback mode)
function generateLocalStealthAddress(walletAddress: string, index: number): string {
  const timestamp = Date.now();
  const random = generateRandomFelt();
  const combined = `${walletAddress}_${index}_${timestamp}_${random}`;
  // Simple hash simulation - mimics Poseidon hash behavior
  let hash = BigInt(0);
  for (let i = 0; i < combined.length; i++) {
    const char = BigInt(combined.charCodeAt(i));
    hash = (hash * BigInt(31) + char) % BigInt('0x800000000000011000000000000000000000000000000000000000000000001');
  }
  return '0x' + hash.toString(16).padStart(64, '0');
}

// Helper: Generate view tag for efficient scanning
function generateViewTag(viewingPubkey: string, ephemeralPubkey: string): string {
  const combined = `${viewingPubkey}_${ephemeralPubkey}`;
  let hash = BigInt(0);
  for (let i = 0; i < combined.length; i++) {
    const char = BigInt(combined.charCodeAt(i));
    hash = (hash * BigInt(31) + char) % BigInt('0xFFFFFFFFFFFFFFFF');
  }
  return '0x' + hash.toString(16).padStart(16, '0');
}

export default useStealthAddress;
