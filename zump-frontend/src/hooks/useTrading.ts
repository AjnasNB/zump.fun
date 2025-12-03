/**
 * useTrading Hook
 * Handles buy/sell operations through the bonding curve
 * SIMULATION MODE: Transfers real STRK but simulates token minting
 * Requirements: 5.1, 5.2, 6.1, 6.2
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAccount } from '@starknet-react/core';
import { Account, Contract, cairo } from 'starknet';
import { getContractService, TransactionResult } from '../services/contractService';
import { getContractAddresses } from '../config/contracts';
import { getSupabaseService } from '../services/supabaseService';
import { 
  parseContractError, 
  ERROR_MESSAGES, 
  TradingError,
  RecoveryOption,
} from '../utils/tradingErrors';

// Treasury address to receive STRK payments (can be changed to protocol owner)
const TREASURY_ADDRESS = '0x01361bf6bbb553110e559fdb344549a2bc86107d5a73266039e5541a28c37838';
// Treasury private key for sell payouts (TESTNET ONLY - never use in production!)
const TREASURY_PRIVATE_KEY = '0x01b9bec0ba4101fe4cdf3663ee6f7b2c5cfacb907a5960bfdac69db76b934328';

// Local storage key for simulated balances
const getSimulatedBalanceKey = (userAddress: string) => `simulated_balances_${userAddress}`;

// ERC20 Transfer ABI - amount split into low/high for u256
const ERC20_TRANSFER_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'recipient', type: 'felt' },
      { name: 'amount_low', type: 'felt' },
      { name: 'amount_high', type: 'felt' },
    ],
    outputs: [{ type: 'felt' }],
    state_mutability: 'external',
  },
];

// ===========================================
// Types (Re-export from tradingErrors)
// ===========================================

export type { TradingError, RecoveryOption };

export interface UseTradingOptions {
  poolAddress: string;
  tokenAddress: string;
  onSuccess?: (result: TransactionResult) => void;
  onError?: (error: TradingError) => void;
}

export interface UseTradingReturn {
  // Cost/Return calculations
  getBuyCost: (amount: bigint) => Promise<bigint>;
  getSellReturn: (amount: bigint) => Promise<bigint>;
  
  // Trading operations
  buy: (amount: bigint, maxCost?: bigint) => Promise<TransactionResult>;
  sell: (amount: bigint, minReturn?: bigint) => Promise<TransactionResult>;
  
  // State
  isBuying: boolean;
  isSelling: boolean;
  isCalculating: boolean;
  error: TradingError | null;
  
  // Helpers
  clearError: () => void;
  userTokenBalance: bigint | null;
  userQuoteBalance: bigint | null;
  refreshBalances: () => Promise<void>;
}

// ===========================================
// Hook Implementation
// ===========================================

/**
 * Hook for trading operations on bonding curve pools
 * SIMULATION MODE: Real STRK transfer + simulated token balance
 * 
 * Requirements:
 * - 5.1: Calculate buy cost using BondingCurvePool.get_buy_cost
 * - 5.2: Execute buy with STRK transfer (simulated token mint)
 * - 6.1: Calculate sell return using BondingCurvePool.get_sell_return
 * - 6.2: Execute sell (simulated)
 */
export function useTrading(options: UseTradingOptions): UseTradingReturn {
  const { poolAddress, tokenAddress, onSuccess, onError } = options;
  
  const { account, address } = useAccount();
  
  const [isBuying, setIsBuying] = useState(false);
  const [isSelling, setIsSelling] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<TradingError | null>(null);
  const [userTokenBalance, setUserTokenBalance] = useState<bigint | null>(null);
  const [userQuoteBalance, setUserQuoteBalance] = useState<bigint | null>(null);

  const contractService = useMemo(() => getContractService(), []);
  const addresses = useMemo(() => getContractAddresses(), []);

  // ===========================================
  // Simulated Balance Management
  // ===========================================

  /**
   * Get simulated balances from localStorage
   */
  const getSimulatedBalances = useCallback((): Record<string, string> => {
    if (!address) return {};
    try {
      const stored = localStorage.getItem(getSimulatedBalanceKey(address));
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }, [address]);

  /**
   * Save simulated balance to localStorage
   */
  const saveSimulatedBalance = useCallback((tokenAddr: string, balance: bigint) => {
    if (!address) return;
    const balances = getSimulatedBalances();
    const normalizedAddr = normalizeAddr(tokenAddr);
    balances[normalizedAddr] = balance.toString();
    localStorage.setItem(getSimulatedBalanceKey(address), JSON.stringify(balances));
    console.log('Saved balance for:', normalizedAddr, 'value:', balance.toString());
  }, [address, getSimulatedBalances]);

  /**
   * Normalize address for consistent storage key
   */
  const normalizeAddr = (addr: string): string => {
    if (!addr) return '0x0';
    const hex = addr.toLowerCase().replace(/^0x/, '').replace(/^0+/, '');
    if (!hex) return '0x0';
    return `0x${hex}`;
  };

  /**
   * Get simulated balance for a token
   */
  const getSimulatedBalance = useCallback((tokenAddr: string): bigint => {
    const balances = getSimulatedBalances();
    const normalizedAddr = normalizeAddr(tokenAddr);
    const bal = balances[normalizedAddr];
    console.log('Getting balance for:', normalizedAddr, 'found:', bal);
    return bal ? BigInt(bal) : BigInt(0);
  }, [getSimulatedBalances]);

  // Load simulated balance on mount and when address/token changes
  useEffect(() => {
    if (address && tokenAddress) {
      const simBal = getSimulatedBalance(tokenAddress);
      console.log('Loading token balance on mount:', {
        address,
        tokenAddress,
        normalizedToken: normalizeAddr(tokenAddress),
        balance: simBal.toString(),
      });
      setUserTokenBalance(simBal);
    }
  }, [address, tokenAddress, getSimulatedBalance]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Refresh user balances
   * Token balance = simulated (localStorage)
   * Quote balance = real STRK balance from chain
   */
  const refreshBalances = useCallback(async () => {
    if (!address) {
      setUserTokenBalance(null);
      setUserQuoteBalance(null);
      return;
    }

    try {
      // Token balance from simulation
      const simBal = getSimulatedBalance(tokenAddress);
      setUserTokenBalance(simBal);

      // Quote balance from chain (real STRK)
      const quoteBal = await contractService.getBalance(addresses.quoteToken, address);
      setUserQuoteBalance(quoteBal);
    } catch (err) {
      console.error('Failed to fetch balances:', err);
      // Still set simulated balance even if STRK fetch fails
      setUserTokenBalance(getSimulatedBalance(tokenAddress));
    }
  }, [address, tokenAddress, addresses.quoteToken, contractService, getSimulatedBalance]);

  /**
   * Get buy cost for a given amount of tokens
   * Requirements: 5.1
   */
  const getBuyCost = useCallback(async (amount: bigint): Promise<bigint> => {
    if (amount <= BigInt(0)) {
      return BigInt(0);
    }

    setIsCalculating(true);
    try {
      const cost = await contractService.getBuyCost(poolAddress, amount);
      return cost;
    } catch (err) {
      console.error('Failed to calculate buy cost:', err);
      throw err;
    } finally {
      setIsCalculating(false);
    }
  }, [poolAddress, contractService]);

  /**
   * Get sell return for a given amount of tokens
   * Requirements: 6.1
   */
  const getSellReturn = useCallback(async (amount: bigint): Promise<bigint> => {
    if (amount <= BigInt(0)) {
      return BigInt(0);
    }

    setIsCalculating(true);
    try {
      const returnAmount = await contractService.getSellReturn(poolAddress, amount);
      return returnAmount;
    } catch (err) {
      console.error('Failed to calculate sell return:', err);
      throw err;
    } finally {
      setIsCalculating(false);
    }
  }, [poolAddress, contractService]);

  /**
   * Buy tokens - SIMULATION MODE
   * 1. Transfer real STRK to treasury
   * 2. Record trade in Supabase
   * 3. Update simulated token balance in localStorage
   * Requirements: 5.2
   */
  const buy = useCallback(async (
    amount: bigint,
    maxCost?: bigint
  ): Promise<TransactionResult> => {
    if (!account || !address) {
      const tradingError: TradingError = {
        code: 'ACCOUNT_NOT_CONNECTED',
        message: ERROR_MESSAGES.ACCOUNT_NOT_CONNECTED,
      };
      setError(tradingError);
      onError?.(tradingError);
      throw new Error(tradingError.message);
    }

    setIsBuying(true);
    setError(null);

    try {
      // Calculate cost
      const cost = maxCost || await getBuyCost(amount);
      
      // Check user has enough STRK balance
      const quoteBalance = await contractService.getBalance(addresses.quoteToken, address);
      if (quoteBalance < cost) {
        const tradingError: TradingError = {
          code: 'INSUFFICIENT_BALANCE',
          message: `${ERROR_MESSAGES.INSUFFICIENT_BALANCE} Gerekli: ${cost.toString()}, Mevcut: ${quoteBalance.toString()}`,
        };
        setError(tradingError);
        onError?.(tradingError);
        throw new Error(tradingError.message);
      }

      // Create STRK transfer contract
      const strkContract = new Contract(
        ERC20_TRANSFER_ABI as any,
        addresses.quoteToken,
        account as unknown as Account
      );

      // Transfer STRK to treasury
      console.log('Transferring STRK to treasury:', {
        amount: cost.toString(),
        treasury: TREASURY_ADDRESS,
      });

      // Convert bigint to uint256 format - pass as two separate felt values
      const costLow = (cost & BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF')).toString();
      const costHigh = (cost >> BigInt(128)).toString();
      
      const transferTx = await strkContract.invoke('transfer', [
        TREASURY_ADDRESS,
        costLow,
        costHigh,
      ]);

      // Wait for transaction using starknet.js provider
      const { RpcProvider } = await import('starknet');
      const provider = new RpcProvider({ nodeUrl: 'https://rpc.starknet-testnet.lava.build' });
      const receipt = await provider.waitForTransaction(transferTx.transaction_hash);

      // Check if transaction succeeded (handle different receipt types)
      const isSuccess = 'execution_status' in receipt 
        ? receipt.execution_status === 'SUCCEEDED' 
        : !('transaction_failure_reason' in receipt);
      
      if (!isSuccess) {
        throw new Error('STRK transfer failed');
      }

      // Calculate price per token
      const pricePerToken = amount > BigInt(0) ? (cost * BigInt('1000000000000000000')) / amount : BigInt(0);

      // Record trade in Supabase
      try {
        const supabaseService = getSupabaseService();
        await supabaseService.cacheTradeEvent({
          pool_address: poolAddress,
          trader: address,
          trade_type: 'buy',
          amount: amount.toString(),
          price: pricePerToken.toString(),
          cost_or_return: cost.toString(),
          timestamp: new Date().toISOString(),
          tx_hash: transferTx.transaction_hash,
          block_number: null,
        });
        console.log('Trade recorded in Supabase');
      } catch (supabaseErr) {
        console.warn('Failed to record trade in Supabase:', supabaseErr);
        // Don't fail the whole operation if Supabase fails
      }

      // Update simulated token balance
      const currentSimBalance = getSimulatedBalance(tokenAddress);
      const newBalance = currentSimBalance + amount;
      saveSimulatedBalance(tokenAddress, newBalance);
      setUserTokenBalance(newBalance);

      console.log('Token balance updated:', {
        previous: currentSimBalance.toString(),
        added: amount.toString(),
        new: newBalance.toString(),
      });

      const result: TransactionResult = {
        hash: transferTx.transaction_hash,
        status: 'confirmed',
      };

      // Refresh STRK balance
      await refreshBalances();
      onSuccess?.(result);

      return result;
    } catch (err) {
      console.error('Buy failed:', err);
      const tradingError = parseContractError(err);
      setError(tradingError);
      onError?.(tradingError);
      throw err;
    } finally {
      setIsBuying(false);
    }
  }, [account, address, poolAddress, tokenAddress, addresses.quoteToken, contractService, getBuyCost, getSimulatedBalance, saveSimulatedBalance, refreshBalances, onSuccess, onError]);

  /**
   * Sell tokens - REAL STRK PAYOUT
   * 1. Check token balance
   * 2. Transfer STRK from treasury to user
   * 3. Update token balance
   * 4. Record trade in Supabase
   * Requirements: 6.2
   */
  const sell = useCallback(async (
    amount: bigint,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    minReturn?: bigint
  ): Promise<TransactionResult> => {
    if (!account || !address) {
      const tradingError: TradingError = {
        code: 'ACCOUNT_NOT_CONNECTED',
        message: ERROR_MESSAGES.ACCOUNT_NOT_CONNECTED,
      };
      setError(tradingError);
      onError?.(tradingError);
      throw new Error(tradingError.message);
    }

    setIsSelling(true);
    setError(null);

    try {
      // Check token balance
      const simBalance = getSimulatedBalance(tokenAddress);
      if (simBalance < amount) {
        const tradingError: TradingError = {
          code: 'INSUFFICIENT_BALANCE',
          message: `${ERROR_MESSAGES.INSUFFICIENT_BALANCE} Gerekli: ${amount.toString()}, Mevcut: ${simBalance.toString()}`,
        };
        setError(tradingError);
        onError?.(tradingError);
        throw new Error(tradingError.message);
      }

      // Calculate return amount
      const returnAmount = await getSellReturn(amount);
      
      console.log('Sell return calculated:', returnAmount);
      
      if (returnAmount === undefined || returnAmount === null) {
        throw new Error('Failed to calculate sell return');
      }
      
      const pricePerToken = amount > BigInt(0) ? (returnAmount * BigInt('1000000000000000000')) / amount : BigInt(0);

      console.log('Selling tokens:', {
        amount: amount.toString(),
        returnAmount: returnAmount.toString(),
        userAddress: address,
      });

      // Create treasury account to send STRK to user
      const starknetModule = await import('starknet');
      const provider = new starknetModule.RpcProvider({ nodeUrl: 'https://rpc.starknet-testnet.lava.build' });
      const treasuryAccount = new starknetModule.Account(provider, TREASURY_ADDRESS, TREASURY_PRIVATE_KEY);

      // Create STRK transfer contract with treasury account
      const strkContract = new starknetModule.Contract(
        ERC20_TRANSFER_ABI as any,
        addresses.quoteToken,
        treasuryAccount
      );

      // Convert return amount to u256 format
      const returnLow = (returnAmount & BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF')).toString();
      const returnHigh = (returnAmount >> BigInt(128)).toString();

      // Transfer STRK from treasury to user
      console.log('Transferring STRK from treasury to user...', {
        to: address,
        amountLow: returnLow,
        amountHigh: returnHigh,
      });
      
      let transferTx;
      try {
        transferTx = await strkContract.invoke('transfer', [
          address,
          returnLow,
          returnHigh,
        ]);
        console.log('Transfer response:', transferTx);
      } catch (invokeErr) {
        console.error('Invoke failed:', invokeErr);
        throw invokeErr;
      }
      
      const txHash = transferTx?.transaction_hash || (transferTx as any)?.hash;
      console.log('Transaction hash:', txHash);
      
      if (!txHash) {
        throw new Error('No transaction hash returned from transfer');
      }

      // Wait for transaction
      console.log('Waiting for transaction...');
      const receipt = await provider.waitForTransaction(txHash);
      console.log('Receipt:', receipt);
      
      const isSuccess = receipt && (
        ('execution_status' in receipt && receipt.execution_status === 'SUCCEEDED') ||
        ('status' in receipt && receipt.status === 'ACCEPTED_ON_L2') ||
        !('transaction_failure_reason' in receipt)
      );
      
      if (!isSuccess) {
        throw new Error('STRK payout failed');
      }

      console.log('STRK payout successful:', txHash);

      // Update token balance
      const newBalance = simBalance - amount;
      saveSimulatedBalance(tokenAddress, newBalance);
      setUserTokenBalance(newBalance);

      // Record trade in Supabase
      try {
        const supabaseService = getSupabaseService();
        await supabaseService.cacheTradeEvent({
          pool_address: poolAddress,
          trader: address,
          trade_type: 'sell',
          amount: amount.toString(),
          price: pricePerToken.toString(),
          cost_or_return: returnAmount.toString(),
          timestamp: new Date().toISOString(),
          tx_hash: txHash,
          block_number: null,
        });
        console.log('Sell trade recorded in Supabase');
      } catch (supabaseErr) {
        console.warn('Failed to record sell trade in Supabase:', supabaseErr);
      }

      console.log('Token balance updated:', {
        previous: simBalance.toString(),
        sold: amount.toString(),
        new: newBalance.toString(),
      });

      const result: TransactionResult = {
        hash: txHash,
        status: 'confirmed',
      };

      // Refresh STRK balance
      await refreshBalances();
      onSuccess?.(result);

      return result;
    } catch (err) {
      console.error('Sell failed:', err);
      const tradingError = parseContractError(err);
      setError(tradingError);
      onError?.(tradingError);
      throw err;
    } finally {
      setIsSelling(false);
    }
  }, [account, address, poolAddress, tokenAddress, addresses.quoteToken, getSimulatedBalance, getSellReturn, saveSimulatedBalance, refreshBalances, onSuccess, onError]);

  return {
    getBuyCost,
    getSellReturn,
    buy,
    sell,
    isBuying,
    isSelling,
    isCalculating,
    error,
    clearError,
    userTokenBalance,
    userQuoteBalance,
    refreshBalances,
  };
}

export default useTrading;
