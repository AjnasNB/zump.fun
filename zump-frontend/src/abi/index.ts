/**
 * Contract ABIs Export
 * Provides typed ABIs for starknet.js Contract class
 * Requirements: 1.1, 1.3
 */

// eslint-disable-next-line import/order
import type { Abi } from 'starknet';

// Core contracts
import PumpFactoryAbi from './PumpFactory.json';
import BondingCurvePoolAbi from './BondingCurvePool.json';
import MemecoinTokenAbi from './MemecoinToken.json';
import ProtocolConfigAbi from './ProtocolConfig.json';

// Privacy contracts
import StealthAddressGeneratorAbi from './StealthAddressGenerator.json';
import NullifierRegistryAbi from './NullifierRegistry.json';
import ZKProofVerifierAbi from './ZKProofVerifier.json';
import CommitmentTreeAbi from './CommitmentTree.json';
import DarkPoolMixerAbi from './DarkPoolMixer.json';
import PrivacyRelayerAbi from './PrivacyRelayer.json';
import EncryptedStateManagerAbi from './EncryptedStateManager.json';

// Migration contracts
import LiquidityMigrationAbi from './LiquidityMigration.json';
import ZkDexHookAbi from './ZkDexHook.json';

// Export Core ABIs as typed Abi arrays
export const PUMP_FACTORY_ABI = PumpFactoryAbi as Abi;
export const BONDING_CURVE_POOL_ABI = BondingCurvePoolAbi as Abi;
export const MEMECOIN_TOKEN_ABI = MemecoinTokenAbi as Abi;
export const PROTOCOL_CONFIG_ABI = ProtocolConfigAbi as Abi;

// Export Privacy ABIs
export const STEALTH_ADDRESS_GENERATOR_ABI = StealthAddressGeneratorAbi as Abi;
export const NULLIFIER_REGISTRY_ABI = NullifierRegistryAbi as Abi;
export const ZK_PROOF_VERIFIER_ABI = ZKProofVerifierAbi as Abi;
export const COMMITMENT_TREE_ABI = CommitmentTreeAbi as Abi;
export const DARK_POOL_MIXER_ABI = DarkPoolMixerAbi as Abi;
export const PRIVACY_RELAYER_ABI = PrivacyRelayerAbi as Abi;
export const ENCRYPTED_STATE_MANAGER_ABI = EncryptedStateManagerAbi as Abi;

// Export Migration ABIs
export const LIQUIDITY_MIGRATION_ABI = LiquidityMigrationAbi as Abi;
export const ZK_DEX_HOOK_ABI = ZkDexHookAbi as Abi;

// Re-export for convenience
export { 
  PumpFactoryAbi, 
  BondingCurvePoolAbi, 
  MemecoinTokenAbi, 
  ProtocolConfigAbi,
  StealthAddressGeneratorAbi,
  NullifierRegistryAbi,
  ZKProofVerifierAbi,
  CommitmentTreeAbi,
  DarkPoolMixerAbi,
  PrivacyRelayerAbi,
  EncryptedStateManagerAbi,
  LiquidityMigrationAbi,
  ZkDexHookAbi,
};

// ABI map for dynamic contract loading
export const CONTRACT_ABIS = {
  // Core
  PumpFactory: PUMP_FACTORY_ABI,
  BondingCurvePool: BONDING_CURVE_POOL_ABI,
  MemecoinToken: MEMECOIN_TOKEN_ABI,
  ProtocolConfig: PROTOCOL_CONFIG_ABI,
  // Privacy
  StealthAddressGenerator: STEALTH_ADDRESS_GENERATOR_ABI,
  NullifierRegistry: NULLIFIER_REGISTRY_ABI,
  ZKProofVerifier: ZK_PROOF_VERIFIER_ABI,
  CommitmentTree: COMMITMENT_TREE_ABI,
  DarkPoolMixer: DARK_POOL_MIXER_ABI,
  PrivacyRelayer: PRIVACY_RELAYER_ABI,
  EncryptedStateManager: ENCRYPTED_STATE_MANAGER_ABI,
  // Migration
  LiquidityMigration: LIQUIDITY_MIGRATION_ABI,
  ZkDexHook: ZK_DEX_HOOK_ABI,
} as const;

export type ContractName = keyof typeof CONTRACT_ABIS;
