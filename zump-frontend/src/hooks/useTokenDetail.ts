import { useState, useEffect, useCallback } from 'react';
import { getContractService, PoolState, PoolConfig } from '../services/contractService';
import { getSupabaseService } from '../services/supabaseService';
import { TokenMetadata } from '../@types/supabase';
import { calculatePrice, calculateProgress, calculateMarketCap } from '../utils/bondingCurveUtils';

export interface TokenDetail {
  tokenAddress: string;
  poolAddress: string;
  quoteToken: string;
  currentPrice: bigint;
  tokensSold: bigint;
  maxSupply: bigint;
  reserveBalance: bigint;
  migrated: boolean;
  basePrice: bigint;
  slope: bigint;
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  creatorAddress: string;
  createdAt: Date;
  tags: string[];
  marketCap: bigint;
  progress: number;
}

export interface UseTokenDetailOptions {
  autoFetch?: boolean;
  pollingInterval?: number;
}

export interface UseTokenDetailReturn {
  token: TokenDetail | null;
  poolState: PoolState | null;
  poolConfig: PoolConfig | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

function isPlaceholderName(value?: string | null): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  return trimmed === '' || trimmed === 'Unknown Token' || trimmed === '???';
}

export function useTokenDetail(
  tokenAddress: string | undefined,
  poolAddress: string | undefined,
  options: UseTokenDetailOptions = {}
): UseTokenDetailReturn {
  const { autoFetch = true, pollingInterval = 0 } = options;
  const lookupAddress = tokenAddress || poolAddress;

  const [token, setToken] = useState<TokenDetail | null>(null);
  const [poolState, setPoolState] = useState<PoolState | null>(null);
  const [poolConfig, setPoolConfig] = useState<PoolConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTokenDetail = useCallback(async () => {
    if (!lookupAddress) {
      setToken(null);
      setPoolState(null);
      setPoolConfig(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const contractService = getContractService();
      const launch = await contractService.getLaunchByToken(lookupAddress);

      const state: PoolState = {
        token: launch.token,
        quoteToken: launch.quoteToken,
        tokensSold: launch.tokensSold,
        reserveBalance: launch.reserveBalance,
        migrated: false,
      };
      const config: PoolConfig = {
        basePrice: launch.basePrice,
        slope: launch.slope,
        maxSupply: launch.maxSupply,
      };

      setPoolState(state);
      setPoolConfig(config);

      let metadata: TokenMetadata | null = null;
      try {
        metadata = await getSupabaseService().getTokenMetadata(launch.token);
      } catch (err) {
        console.warn('Failed to fetch metadata from Supabase:', err);
      }

      const currentPrice = calculatePrice(launch.basePrice, launch.slope, launch.tokensSold);
      const progress = calculateProgress(launch.tokensSold, launch.maxSupply);
      const marketCap = calculateMarketCap(currentPrice, launch.tokensSold);

      setToken({
        tokenAddress: launch.token,
        poolAddress: launch.token,
        quoteToken: launch.quoteToken,
        currentPrice,
        tokensSold: launch.tokensSold,
        maxSupply: launch.maxSupply,
        reserveBalance: launch.reserveBalance,
        migrated: false,
        basePrice: launch.basePrice,
        slope: launch.slope,
        name: isPlaceholderName(metadata?.name) ? launch.name : (metadata?.name as string),
        symbol: isPlaceholderName(metadata?.symbol) ? launch.symbol : (metadata?.symbol as string),
        description: metadata?.description || '',
        imageUrl: metadata?.image_url || '',
        creatorAddress: launch.creator,
        createdAt: new Date(Number(launch.createdAt) * 1000),
        tags: metadata?.tags || [],
        marketCap,
        progress,
      });
    } catch (err) {
      console.error('Failed to fetch token detail:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch token detail'));
    } finally {
      setIsLoading(false);
    }
  }, [lookupAddress]);

  useEffect(() => {
    if (autoFetch && lookupAddress) {
      fetchTokenDetail();
    }
  }, [autoFetch, lookupAddress, fetchTokenDetail]);

  useEffect(() => {
    if (pollingInterval > 0 && lookupAddress) {
      const interval = setInterval(fetchTokenDetail, pollingInterval);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [pollingInterval, lookupAddress, fetchTokenDetail]);

  return {
    token,
    poolState,
    poolConfig,
    isLoading,
    error,
    refetch: fetchTokenDetail,
  };
}

export default useTokenDetail;
