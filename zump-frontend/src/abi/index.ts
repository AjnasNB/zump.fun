/**
 * Contract ABIs Export
 * Provides typed ABIs for starknet.js Contract class
 * Requirements: 1.1, 1.3
 */

// eslint-disable-next-line import/order
import type { Abi } from 'starknet';

import PumpFactoryAbi from './PumpFactory.json';
import BondingCurvePoolAbi from './BondingCurvePool.json';
import MemecoinTokenAbi from './MemecoinToken.json';
import ProtocolConfigAbi from './ProtocolConfig.json';

// Export ABIs as typed Abi arrays
export const PUMP_FACTORY_ABI = PumpFactoryAbi as Abi;
export const BONDING_CURVE_POOL_ABI = BondingCurvePoolAbi as Abi;
export const MEMECOIN_TOKEN_ABI = MemecoinTokenAbi as Abi;
export const PROTOCOL_CONFIG_ABI = ProtocolConfigAbi as Abi;

// Re-export for convenience
export { PumpFactoryAbi, BondingCurvePoolAbi, MemecoinTokenAbi, ProtocolConfigAbi };

// ABI map for dynamic contract loading
export const CONTRACT_ABIS = {
  PumpFactory: PUMP_FACTORY_ABI,
  BondingCurvePool: BONDING_CURVE_POOL_ABI,
  MemecoinToken: MEMECOIN_TOKEN_ABI,
  ProtocolConfig: PROTOCOL_CONFIG_ABI,
} as const;

export type ContractName = keyof typeof CONTRACT_ABIS;
