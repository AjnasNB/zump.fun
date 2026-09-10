import { useState, useCallback, useEffect } from 'react';
import { useAccount } from '../providers/BotChainProvider';
import { getContractService, TransactionResult } from '../services/contractService';
import { getSupabaseService } from '../services/supabaseService';
import {
  parseContractError,
  ERROR_MESSAGES,
  TradingError,
  RecoveryOption,
} from '../utils/tradingErrors';

export type { TradingError, RecoveryOption };

export interface UseTradingOptions {
  poolAddress: string;
  tokenAddress: string;
  onSuccess?: (result: TransactionResult) => void;
  onError?: (error: TradingError) => void;
}

export interface UseTradingReturn {
  getBuyCost: (amount: bigint) => Promise<bigint>;
  getSellReturn: (amount: bigint) => Promise<bigint>;
  buy: (amount: bigint, maxCost?: bigint) => Promise<TransactionResult>;
  sell: (amount: bigint, minReturn?: bigint) => Promise<TransactionResult>;
  isBuying: boolean;
  isSelling: boolean;
  isCalculating: boolean;
  error: TradingError | null;
  clearError: () => void;
  userTokenBalance: bigint | null;
  userQuoteBalance: bigint | null;
  refreshBalances: () => Promise<void>;
}

export function useTrading(options: UseTradingOptions): UseTradingReturn {
  const { poolAddress, tokenAddress, onSuccess, onError } = options;
  const lookupAddress = tokenAddress || poolAddress;

  const { account, address } = useAccount();

  const [isBuying, setIsBuying] = useState(false);
  const [isSelling, setIsSelling] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<TradingError | null>(null);
  const [userTokenBalance, setUserTokenBalance] = useState<bigint | null>(null);
  const [userQuoteBalance, setUserQuoteBalance] = useState<bigint | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const refreshBalances = useCallback(async () => {
    if (!address || !lookupAddress) {
      setUserTokenBalance(null);
      setUserQuoteBalance(null);
      return;
    }
    const service = getContractService();
    try {
      const [tokenBal, botBal] = await Promise.all([
        service.getBalance(lookupAddress, address),
        service.getNativeBalance(address),
      ]);
      setUserTokenBalance(tokenBal);
      setUserQuoteBalance(botBal);
    } catch (err) {
      console.error('Failed to fetch balances:', err);
    }
  }, [address, lookupAddress]);

  useEffect(() => {
    refreshBalances();
  }, [refreshBalances]);

  const getBuyCost = useCallback(
    async (amount: bigint): Promise<bigint> => {
      if (amount <= BigInt(0) || !lookupAddress) return BigInt(0);
      setIsCalculating(true);
      try {
        return await getContractService().getBuyCost(lookupAddress, amount);
      } finally {
        setIsCalculating(false);
      }
    },
    [lookupAddress]
  );

  const getSellReturn = useCallback(
    async (amount: bigint): Promise<bigint> => {
      if (amount <= BigInt(0) || !lookupAddress) return BigInt(0);
      setIsCalculating(true);
      try {
        return await getContractService().getSellReturn(lookupAddress, amount);
      } finally {
        setIsCalculating(false);
      }
    },
    [lookupAddress]
  );

  const buy = useCallback(
    async (amount: bigint, _maxCost?: bigint): Promise<TransactionResult> => {
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
        const service = getContractService();
        service.setAccount(account);
        const cost = await service.getBuyCost(lookupAddress, amount);
        const quoteBalance = await service.getNativeBalance(address);
        if (quoteBalance < cost) {
          const tradingError: TradingError = {
            code: 'INSUFFICIENT_BALANCE',
            message: `${ERROR_MESSAGES.INSUFFICIENT_BALANCE} Required: ${cost.toString()}, available: ${quoteBalance.toString()}`,
          };
          setError(tradingError);
          onError?.(tradingError);
          throw new Error(tradingError.message);
        }

        const result = await service.buy(lookupAddress, amount);

        try {
          const supabaseService = getSupabaseService();
          const pricePerToken =
            amount > BigInt(0) ? (cost * BigInt('1000000000000000000')) / amount : BigInt(0);
          await supabaseService.cacheTradeEvent({
            pool_address: lookupAddress,
            trader: address,
            trade_type: 'buy',
            amount: amount.toString(),
            price: pricePerToken.toString(),
            cost_or_return: cost.toString(),
            timestamp: new Date().toISOString(),
            tx_hash: result.hash,
            block_number: result.blockNumber ?? null,
          });
        } catch (supabaseErr) {
          console.warn('Failed to record trade in Supabase:', supabaseErr);
        }

        await refreshBalances();
        onSuccess?.(result);
        return result;
      } catch (err) {
        const tradingError = parseContractError(err);
        setError(tradingError);
        onError?.(tradingError);
        throw err;
      } finally {
        setIsBuying(false);
      }
    },
    [account, address, lookupAddress, refreshBalances, onSuccess, onError]
  );

  const sell = useCallback(
    async (amount: bigint, _minReturn?: bigint): Promise<TransactionResult> => {
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
        const service = getContractService();
        service.setAccount(account);
        const tokenBal = await service.getBalance(lookupAddress, address);
        if (tokenBal < amount) {
          const tradingError: TradingError = {
            code: 'INSUFFICIENT_BALANCE',
            message: `${ERROR_MESSAGES.INSUFFICIENT_BALANCE} Required: ${amount.toString()}, available: ${tokenBal.toString()}`,
          };
          setError(tradingError);
          onError?.(tradingError);
          throw new Error(tradingError.message);
        }

        const returnAmount = await service.getSellReturn(lookupAddress, amount);
        const result = await service.sell(lookupAddress, amount);

        try {
          const supabaseService = getSupabaseService();
          const pricePerToken =
            amount > BigInt(0)
              ? (returnAmount * BigInt('1000000000000000000')) / amount
              : BigInt(0);
          await supabaseService.cacheTradeEvent({
            pool_address: lookupAddress,
            trader: address,
            trade_type: 'sell',
            amount: amount.toString(),
            price: pricePerToken.toString(),
            cost_or_return: returnAmount.toString(),
            timestamp: new Date().toISOString(),
            tx_hash: result.hash,
            block_number: result.blockNumber ?? null,
          });
        } catch (supabaseErr) {
          console.warn('Failed to record sell trade in Supabase:', supabaseErr);
        }

        await refreshBalances();
        onSuccess?.(result);
        return result;
      } catch (err) {
        const tradingError = parseContractError(err);
        setError(tradingError);
        onError?.(tradingError);
        throw err;
      } finally {
        setIsSelling(false);
      }
    },
    [account, address, lookupAddress, refreshBalances, onSuccess, onError]
  );

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
