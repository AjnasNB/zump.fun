/**
 * Starknet Provider Component
 * Wraps the application with StarknetConfig for wallet connectivity
 * Requirements: 1.2, 1.3
 */

import React, { ReactNode } from 'react';
import { StarknetConfig, jsonRpcProvider, argent, braavos } from '@starknet-react/core';
import { sepolia, mainnet } from '@starknet-react/chains';

// Supported chains - Sepolia FIRST for testnet deployment
const chains = [sepolia, mainnet];

// Custom RPC provider to avoid CORS issues with public endpoints
const rpcProvider = jsonRpcProvider({
  rpc: (chain) => {
    if (chain.id === sepolia.id) {
      // Use Lava RPC for Sepolia (CORS-friendly)
      return { 
        nodeUrl: process.env.REACT_APP_STARKNET_RPC_URL || 'https://rpc.starknet-testnet.lava.build'
      };
    }
    // Mainnet fallback (not used in testnet deployment)
    return { 
      nodeUrl: process.env.REACT_APP_STARKNET_RPC_URL_MAINNET || 'https://starknet-mainnet.public.blastapi.io/rpc/v0_7'
    };
  },
});

// Connectors: ArgentX, Braavos
const connectors = [
  argent(),
  braavos(),
];

interface StarknetProviderProps {
  children: ReactNode;
}

export function StarknetProvider({ children }: StarknetProviderProps) {
  return (
    <StarknetConfig
      chains={chains}
      provider={rpcProvider}
      connectors={connectors}
      autoConnect
    >
      {children}
    </StarknetConfig>
  );
}

export default StarknetProvider;
