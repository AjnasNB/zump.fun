export type NetworkId = 'botchain';

export interface ContractAddresses {
  pumpFactory: string;
}

export interface ContractConfig {
  addresses: ContractAddresses;
  rpcUrl: string;
  wsUrl: string;
  explorerUrl: string;
  chainId: number;
  chainIdHex: string;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  dexUrl: string;
}

const BOT_CHAIN_CONFIG: ContractConfig = {
  addresses: {
    pumpFactory:
      process.env.REACT_APP_PUMP_FACTORY_ADDRESS ||
      '0x9C27B5d31e48a9a477283D6BE344A6c49441Cc66',
  },
  rpcUrl: process.env.REACT_APP_BOT_RPC_URL || 'https://rpc.botchain.ai',
  wsUrl: process.env.REACT_APP_BOT_WS_URL || 'wss://ws-rpc.botchain.ai',
  explorerUrl: process.env.REACT_APP_BOT_EXPLORER_URL || 'https://scan.botchain.ai',
  chainId: Number(process.env.REACT_APP_BOT_CHAIN_ID || 677),
  chainIdHex: '0x2a5',
  chainName: 'BOT Chain',
  nativeCurrency: {
    name: 'BOT',
    symbol: 'BOT',
    decimals: 18,
  },
  dexUrl: 'https://dex.botchain.ai/swap',
};

export const getCurrentNetwork = (): NetworkId => 'botchain';

export const getContractConfig = (_network?: NetworkId): ContractConfig => BOT_CHAIN_CONFIG;

export const getContractAddresses = (_network?: NetworkId): ContractAddresses =>
  getContractConfig().addresses;

export const isValidContractAddress = (address: string): boolean =>
  Boolean(address) && address !== '0x0' && address.startsWith('0x') && address.length === 42;

export const explorerTx = (hash: string): string =>
  `${getContractConfig().explorerUrl}/tx/${hash}`;

export const explorerAddress = (address: string): string =>
  `${getContractConfig().explorerUrl}/address/${address}`;

export const CONTRACT_CONFIG = getContractConfig();
export const CONTRACT_ADDRESSES = getContractAddresses();

export default CONTRACT_CONFIG;
