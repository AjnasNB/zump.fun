import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { ethers } from 'ethers';
import { getContractConfig } from '../config/contracts';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export type WalletStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface BotAccount {
  address: string | undefined;
  isConnected: boolean;
  chainId: bigint | undefined;
  connector: { name: string } | null;
  status: WalletStatus;
  account: ethers.Signer | null;
  provider: ethers.providers.Web3Provider | ethers.providers.JsonRpcProvider | null;
}

interface BotChainContextValue extends BotAccount {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  ensureBotChain: () => Promise<boolean>;
}

const BotChainContext = createContext<BotChainContextValue | null>(null);

function makeReadProvider() {
  const config = getContractConfig();
  return new ethers.providers.JsonRpcProvider(config.rpcUrl);
}

function getInjectedProvider(): any | null {
  const eth = typeof window === 'undefined' ? null : window.ethereum;
  if (!eth) return null;
  if (Array.isArray(eth.providers) && eth.providers.length > 0) {
    return eth.providers.find((p: any) => p.isMetaMask) || eth.providers[0];
  }
  return eth;
}

function requestAnnouncedProvider(): Promise<any | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }
    const found: any[] = [];
    const onAnnounce = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.provider) found.push(detail.provider);
    };
    window.addEventListener('eip6963:announceProvider', onAnnounce);
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    window.setTimeout(() => {
      window.removeEventListener('eip6963:announceProvider', onAnnounce);
      const preferred =
        found.find((p) => p?.isMetaMask) || found[0] || getInjectedProvider();
      resolve(preferred || null);
    }, 150);
  });
}

function isMissingChainError(err: any): boolean {
  const code = err?.code ?? err?.data?.originalError?.code;
  return (
    code === 4902 ||
    code === -32603 ||
    String(err?.message || '').toLowerCase().includes('unrecognized chain') ||
    String(err?.message || '').toLowerCase().includes('added to wallet')
  );
}

async function switchOrAddBotChain(ethereum: any): Promise<boolean> {
  if (!ethereum?.request) return false;
  const config = getContractConfig();
  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: config.chainIdHex }],
    });
    return true;
  } catch (err: any) {
    if (err?.code === 4001) throw err;
    if (isMissingChainError(err)) {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: config.chainIdHex,
            chainName: config.chainName,
            nativeCurrency: config.nativeCurrency,
            rpcUrls: [config.rpcUrl],
            blockExplorerUrls: [config.explorerUrl],
          },
        ],
      });
      return true;
    }
    throw err;
  }
}

export function BotChainProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | undefined>(undefined);
  const [chainId, setChainId] = useState<bigint | undefined>(undefined);
  const [status, setStatus] = useState<WalletStatus>('disconnected');
  const [account, setAccount] = useState<ethers.Signer | null>(null);
  const [injected, setInjected] = useState<any | null>(() => getInjectedProvider());
  const [provider, setProvider] = useState<
    ethers.providers.Web3Provider | ethers.providers.JsonRpcProvider | null
  >(() => makeReadProvider());

  const syncFromEthereum = useCallback(async (ethereum?: any) => {
    const eth = ethereum || injected || getInjectedProvider();
    if (!eth) {
      setAddress(undefined);
      setAccount(null);
      setStatus('disconnected');
      setProvider(makeReadProvider());
      return;
    }

    const web3 = new ethers.providers.Web3Provider(eth, 'any');
    try {
      const network = await web3.getNetwork();
      setChainId(BigInt(network.chainId));
    } catch {
      setChainId(undefined);
    }

    const accounts: string[] = await eth.request({ method: 'eth_accounts' });
    if (accounts.length > 0) {
      setAddress(ethers.utils.getAddress(accounts[0]));
      setAccount(web3.getSigner());
      setProvider(web3);
      setInjected(eth);
      setStatus('connected');
    } else {
      setAddress(undefined);
      setAccount(null);
      setProvider(makeReadProvider());
      setStatus('disconnected');
    }
  }, [injected]);

  useEffect(() => {
    const eth = getInjectedProvider();
    if (eth) {
      setInjected(eth);
      syncFromEthereum(eth);
    }

    const onAccounts = (accounts: string[]) => {
      if (!accounts?.length) {
        setAddress(undefined);
        setAccount(null);
        setStatus('disconnected');
        setProvider(makeReadProvider());
        return;
      }
      syncFromEthereum(eth || getInjectedProvider());
    };
    const onChain = () => {
      syncFromEthereum(eth || getInjectedProvider());
    };

    eth?.on?.('accountsChanged', onAccounts);
    eth?.on?.('chainChanged', onChain);
    return () => {
      eth?.removeListener?.('accountsChanged', onAccounts);
      eth?.removeListener?.('chainChanged', onChain);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ensureBotChain = useCallback(async () => {
    const eth = injected || (await requestAnnouncedProvider());
    if (!eth) return false;
    const ok = await switchOrAddBotChain(eth);
    await syncFromEthereum(eth);
    return ok;
  }, [injected, syncFromEthereum]);

  const connect = useCallback(async () => {
    setStatus('connecting');
    try {
      const eth = (await requestAnnouncedProvider()) || getInjectedProvider();
      if (!eth) {
        const err = new Error('NO_WALLET');
        setStatus('disconnected');
        throw err;
      }
      setInjected(eth);

      // Ask for accounts first. Switching chains before this often fails silently
      // because the site is not authorized yet.
      await eth.request({ method: 'eth_requestAccounts' });

      try {
        await switchOrAddBotChain(eth);
      } catch (chainErr: any) {
        if (chainErr?.code === 4001) throw chainErr;
        console.warn('Could not switch to BOT Chain automatically:', chainErr);
      }

      await syncFromEthereum(eth);
    } catch (err) {
      setStatus('disconnected');
      throw err;
    }
  }, [syncFromEthereum]);

  const disconnect = useCallback(async () => {
    setAddress(undefined);
    setAccount(null);
    setStatus('disconnected');
    setProvider(makeReadProvider());
  }, []);

  const value = useMemo<BotChainContextValue>(
    () => ({
      address,
      isConnected: Boolean(address),
      chainId,
      connector: address ? { name: 'MetaMask' } : null,
      status,
      account,
      provider,
      connect,
      disconnect,
      ensureBotChain,
    }),
    [address, chainId, status, account, provider, connect, disconnect, ensureBotChain]
  );

  return <BotChainContext.Provider value={value}>{children}</BotChainContext.Provider>;
}

export function useBotChain(): BotChainContextValue {
  const ctx = useContext(BotChainContext);
  if (!ctx) {
    throw new Error('useBotChain must be used within BotChainProvider');
  }
  return ctx;
}

export function useAccount() {
  const ctx = useBotChain();
  return {
    address: ctx.address,
    isConnected: ctx.isConnected,
    chainId: ctx.chainId,
    connector: ctx.connector,
    status: ctx.status,
    account: ctx.account,
    provider: ctx.provider,
  };
}

export function useDisconnect() {
  const { disconnect } = useBotChain();
  return { disconnect, disconnectAsync: disconnect };
}

export function useConnect() {
  const { connect, status } = useBotChain();
  return { connect, connectAsync: connect, connectors: [{ name: 'MetaMask' }], status };
}

export default BotChainProvider;
