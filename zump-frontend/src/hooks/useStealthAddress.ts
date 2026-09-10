import { useState, useCallback, useEffect } from 'react';
import { useAccount } from '../providers/BotChainProvider';
import { StealthAddress } from '../@types/privacy';

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

export function useStealthAddress(): UseStealthAddressReturn {
  useAccount();
  const [stealthAddresses, setStealthAddresses] = useState<StealthAddress[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STEALTH_STORAGE_KEY);
      setStealthAddresses(stored ? JSON.parse(stored) : []);
    } catch {
      setStealthAddresses([]);
    }
  }, []);

  const persist = (next: StealthAddress[]) => {
    setStealthAddresses(next);
    localStorage.setItem(STEALTH_STORAGE_KEY, JSON.stringify(next));
  };

  const generateStealthAddress = useCallback(async () => null, []);
  const generateStealthAddressOnChain = useCallback(async () => null, []);

  const removeStealthAddress = useCallback(
    (address: string) => {
      persist(stealthAddresses.filter((s) => s.address !== address));
    },
    [stealthAddresses]
  );

  const clearAllStealthAddresses = useCallback(() => persist([]), []);

  const getStealthAddressByViewTag = useCallback(
    (viewTag: string) => stealthAddresses.find((s) => s.viewTag === viewTag),
    [stealthAddresses]
  );

  const validateStealthAddress = useCallback(async () => false, []);

  return {
    stealthAddresses,
    isGenerating: false,
    error: null,
    isContractAvailable: false,
    generateStealthAddress,
    generateStealthAddressOnChain,
    removeStealthAddress,
    clearAllStealthAddresses,
    getStealthAddressByViewTag,
    validateStealthAddress,
  };
}

export default useStealthAddress;
