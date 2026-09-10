import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { getSupabaseService } from '../services/supabaseService';
import { TradeEvent, TradeType } from '../@types/supabase';
import { isSupabaseConfigured } from '../config/supabase';

export interface ParsedTradeEvent {
  id: string;
  poolAddress: string;
  trader: string;
  type: TradeType;
  amountTokens: bigint;
  costOrReturn: bigint;
  feeQuote: bigint;
  price: bigint;
  timestamp: Date;
  txHash: string;
  blockNumber: number | null;
}

export interface TradeHistoryFilter {
  type?: TradeType | null;
  startTime?: Date | null;
  endTime?: Date | null;
}

export interface UseTradeHistoryOptions {
  poolAddress: string;
  autoFetch?: boolean;
  pollingInterval?: number;
}

export interface UseTradeHistoryReturn {
  trades: ParsedTradeEvent[];
  filteredTrades: ParsedTradeEvent[];
  isLoading: boolean;
  error: string | null;
  fetchTrades: () => Promise<void>;
  subscribe: () => void;
  unsubscribe: () => void;
  filter: TradeHistoryFilter;
  setFilter: (filter: TradeHistoryFilter) => void;
  clearFilter: () => void;
  totalBuys: number;
  totalSells: number;
  totalVolume: bigint;
}

function mapTrade(trade: TradeEvent): ParsedTradeEvent {
  return {
    id: trade.id,
    poolAddress: trade.pool_address,
    trader: trade.trader,
    type: trade.trade_type,
    amountTokens: BigInt(trade.amount || '0'),
    costOrReturn: BigInt(trade.cost_or_return || '0'),
    feeQuote: BigInt(0),
    price: BigInt(trade.price || '0'),
    timestamp: new Date(trade.timestamp),
    txHash: trade.tx_hash,
    blockNumber: trade.block_number,
  };
}

export function useTradeHistory(options: UseTradeHistoryOptions): UseTradeHistoryReturn {
  const { poolAddress, autoFetch = true, pollingInterval = 30000 } = options;

  const [trades, setTrades] = useState<ParsedTradeEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TradeHistoryFilter>({});
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const supabaseService = useMemo(() => {
    if (isSupabaseConfigured()) {
      return getSupabaseService();
    }
    return null;
  }, []);

  const fetchTrades = useCallback(async () => {
    if (!poolAddress) {
      setTrades([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      if (!supabaseService) {
        setTrades([]);
        return;
      }
      const cached = await supabaseService.getTradeHistory({
        poolAddress,
        limit: 200,
      });
      setTrades(cached.map(mapTrade));
    } catch (err) {
      console.warn('Trade history unavailable:', err);
      setTrades([]);
    } finally {
      setIsLoading(false);
    }
  }, [poolAddress, supabaseService]);

  const subscribe = useCallback(() => {
    if (pollingRef.current || pollingInterval <= 0) return;
    pollingRef.current = setInterval(fetchTrades, pollingInterval);
  }, [fetchTrades, pollingInterval]);

  const unsubscribe = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const clearFilter = useCallback(() => setFilter({}), []);

  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      if (filter.type && trade.type !== filter.type) return false;
      if (filter.startTime && trade.timestamp < filter.startTime) return false;
      if (filter.endTime && trade.timestamp > filter.endTime) return false;
      return true;
    });
  }, [trades, filter]);

  const totalBuys = useMemo(
    () => filteredTrades.filter((t) => t.type === 'buy').length,
    [filteredTrades]
  );
  const totalSells = useMemo(
    () => filteredTrades.filter((t) => t.type === 'sell').length,
    [filteredTrades]
  );
  const totalVolume = useMemo(
    () => filteredTrades.reduce((sum, t) => sum + t.costOrReturn, BigInt(0)),
    [filteredTrades]
  );

  useEffect(() => {
    if (autoFetch) {
      fetchTrades();
    }
  }, [autoFetch, fetchTrades]);

  useEffect(() => {
    if (pollingInterval > 0) {
      subscribe();
      return unsubscribe;
    }
    return undefined;
  }, [pollingInterval, subscribe, unsubscribe]);

  return {
    trades,
    filteredTrades,
    isLoading,
    error,
    fetchTrades,
    subscribe,
    unsubscribe,
    filter,
    setFilter,
    clearFilter,
    totalBuys,
    totalSells,
    totalVolume,
  };
}

export default useTradeHistory;
