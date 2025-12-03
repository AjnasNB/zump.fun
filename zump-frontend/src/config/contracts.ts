/**
 * Contract Configuration
 * Contains addresses and configuration for Starknet contracts
 * Requirements: 1.1
 */

// Network types
export type NetworkId = 'mainnet' | 'sepolia';

// Contract addresses interface
export interface ContractAddresses {
  // Core contracts
  pumpFactory: string;
  protocolConfig: string;
  quoteToken: string; // STRK or ETH
  
  // Privacy contracts
  stealthAddressGenerator: string;
  nullifierRegistry: string;
  zkProofVerifier: string;
  commitmentTree: string;
  darkPoolMixer: string;
  privacyRelayer: string;
  encryptedStateManager: string;
  
  // Migration contracts
  liquidityMigration: string;
  zkDexHook: string;
}

// Full contract configuration
export interface ContractConfig {
  addresses: ContractAddresses;
  rpcUrl: string;
  explorerUrl: string;
  chainId: string;
}

// Sepolia testnet configuration - DEPLOYED 2025-12-03
const SEPOLIA_CONFIG: ContractConfig = {
  addresses: {
    // Core contracts
    pumpFactory: process.env.REACT_APP_PUMP_FACTORY_ADDRESS || '0x0101c880e4c5289d1db647c94cd0e83227c3b3c1b54814773905095554947814',
    protocolConfig: process.env.REACT_APP_PROTOCOL_CONFIG_ADDRESS || '0x008c776746428bad63e71142247ddb24963d8ea68de66733ca76f1f50006b34f',
    quoteToken: process.env.REACT_APP_QUOTE_TOKEN_ADDRESS || '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d', // STRK on Sepolia
    
    // Privacy contracts
    stealthAddressGenerator: process.env.REACT_APP_STEALTH_GENERATOR_ADDRESS || '0x064f0f550c2b7e64d26c21c0952db204eabc92b8f7c00bfe222e4e1081fed92f',
    nullifierRegistry: process.env.REACT_APP_NULLIFIER_REGISTRY_ADDRESS || '0x042025d0436d3fb24efc2f54bb80b96374834cb738ce0e97f1dc1403f20103f9',
    zkProofVerifier: process.env.REACT_APP_ZK_VERIFIER_ADDRESS || '0x058b44f91d29735df077a3c9a2dcf89b3a267e46516a7954687a307781291adf',
    commitmentTree: process.env.REACT_APP_COMMITMENT_TREE_ADDRESS || '0x026ef549f0fd89855c35802895f3cc4bdd682c1184defc8c30a57f091dc312ec',
    darkPoolMixer: process.env.REACT_APP_DARKPOOL_MIXER_ADDRESS || '0x04c0c9b0fcbb2f45b31ccda688fb95af193f8b745713fcedc6763f630b1b25e7',
    privacyRelayer: process.env.REACT_APP_PRIVACY_RELAYER_ADDRESS || '0x05933b0cc0bd3926730db1a9746f8610a474e820efacd625371a6fb1cfd1c744',
    encryptedStateManager: process.env.REACT_APP_ENCRYPTED_STATE_ADDRESS || '0x07067de4049e782c55c9dbd6157e5c97d1224ae76de3fe1912af4e59eed20a44',
    
    // Migration contracts
    liquidityMigration: process.env.REACT_APP_LIQUIDITY_MIGRATION_ADDRESS || '0x0066136ec75eced3807da383b287877a3ee40b78d3190de47b940e0666729790',
    zkDexHook: process.env.REACT_APP_ZK_DEX_HOOK_ADDRESS || '0x047db2d84db630911902930cc6f9286e4e0ae27fe1eb808fcebf2a45d604117b',
  },
  rpcUrl: process.env.REACT_APP_STARKNET_RPC_URL || 'https://rpc.starknet-testnet.lava.build',
  explorerUrl: 'https://sepolia.voyager.online',
  chainId: 'SN_SEPOLIA',
};

// Mainnet configuration (placeholder - not deployed yet)
const MAINNET_CONFIG: ContractConfig = {
  addresses: {
    // Core contracts
    pumpFactory: process.env.REACT_APP_PUMP_FACTORY_ADDRESS_MAINNET || '0x0',
    protocolConfig: process.env.REACT_APP_PROTOCOL_CONFIG_ADDRESS_MAINNET || '0x0',
    quoteToken: process.env.REACT_APP_QUOTE_TOKEN_ADDRESS_MAINNET || '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d', // STRK on Mainnet
    
    // Privacy contracts
    stealthAddressGenerator: process.env.REACT_APP_STEALTH_GENERATOR_ADDRESS_MAINNET || '0x0',
    nullifierRegistry: process.env.REACT_APP_NULLIFIER_REGISTRY_ADDRESS_MAINNET || '0x0',
    zkProofVerifier: process.env.REACT_APP_ZK_VERIFIER_ADDRESS_MAINNET || '0x0',
    commitmentTree: process.env.REACT_APP_COMMITMENT_TREE_ADDRESS_MAINNET || '0x0',
    darkPoolMixer: process.env.REACT_APP_DARKPOOL_MIXER_ADDRESS_MAINNET || '0x0',
    privacyRelayer: process.env.REACT_APP_PRIVACY_RELAYER_ADDRESS_MAINNET || '0x0',
    encryptedStateManager: process.env.REACT_APP_ENCRYPTED_STATE_ADDRESS_MAINNET || '0x0',
    
    // Migration contracts
    liquidityMigration: process.env.REACT_APP_LIQUIDITY_MIGRATION_ADDRESS_MAINNET || '0x0',
    zkDexHook: process.env.REACT_APP_ZK_DEX_HOOK_ADDRESS_MAINNET || '0x0',
  },
  rpcUrl: process.env.REACT_APP_STARKNET_RPC_URL_MAINNET || 'https://starknet-mainnet.public.blastapi.io',
  explorerUrl: 'https://starkscan.co',
  chainId: 'SN_MAIN',
};

// Network configurations map
const NETWORK_CONFIGS: Record<NetworkId, ContractConfig> = {
  mainnet: MAINNET_CONFIG,
  sepolia: SEPOLIA_CONFIG,
};

// Get current network from environment
export const getCurrentNetwork = (): NetworkId => {
  const network = process.env.REACT_APP_STARKNET_NETWORK as NetworkId;
  return network === 'mainnet' ? 'mainnet' : 'sepolia';
};

// Get contract configuration for current network
export const getContractConfig = (network?: NetworkId): ContractConfig => {
  const targetNetwork = network || getCurrentNetwork();
  return NETWORK_CONFIGS[targetNetwork];
};

// Get contract addresses for current network
export const getContractAddresses = (network?: NetworkId): ContractAddresses => {
  return getContractConfig(network).addresses;
};

// Validate contract address (non-zero)
export const isValidContractAddress = (address: string): boolean => {
  return address !== '0x0' && address !== '' && address.startsWith('0x');
};

// Export default configuration
export const CONTRACT_CONFIG = getContractConfig();
export const CONTRACT_ADDRESSES = getContractAddresses();

export default CONTRACT_CONFIG;
