import { useCallback, useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers';
import { useBotChain } from '../providers/BotChainProvider';
import { getContractService } from '../services/contractService';

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  chainId: bigint | undefined;
  connector: string | null;
  stealthAddresses: string[];
  balance: bigint | null;
}

export interface UseWalletReturn extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  shortAddress: string | null;
  refreshBalance: () => Promise<void>;
}

export function useWallet(): UseWalletReturn {
  const { address, isConnected, chainId, connector, status, connect, disconnect, provider } =
    useBotChain();
  const [balance, setBalance] = useState<bigint | null>(null);

  const isConnecting = status === 'connecting' || status === 'reconnecting';

  const shortAddress = useMemo(() => {
    if (!address) return null;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, [address]);

  const refreshBalance = useCallback(async () => {
    if (!address) {
      setBalance(null);
      return;
    }
    try {
      const raw = provider
        ? await provider.getBalance(address)
        : await getContractService().getNativeBalance(address);
      setBalance(BigInt(ethers.BigNumber.from(raw).toString()));
    } catch (err) {
      console.error('Failed to fetch BOT balance:', err);
    }
  }, [address, provider]);

  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  return {
    address: address || null,
    isConnected,
    isConnecting,
    chainId,
    connector: connector?.name || null,
    stealthAddresses: [],
    balance,
    shortAddress,
    connect,
    disconnect,
    refreshBalance,
  };
}

export default useWallet;
