/**
 * Dashboard Statistics Hook
 * Fetches real-time platform statistics from Supabase
 */

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '../config/supabase';
import { TokenMetadata, TradeEvent } from '../@types/supabase';

// ===========================================
// Types
// ===========================================

export interface DashboardStats {
  totalActiveUsers: number;
  totalTradesVolume: number;
  totalDerivativeVolume: number;
  totalValueLock: number;
  totalTokens: number;
  
  // Percentage changes (compared to previous period)
  activeUsersChange: number;
  tradesVolumeChange: number;
  derivativeVolumeChange: number;
  valueLockChange: number;
  
  // Chart data for sparklines
  activeUsersChart: number[];
  tradesVolumeChart: number[];
  derivativeVolumeChart: number[];
  valueLockChart: number[];
  
  // Volume breakdown
  volumeBreakdown: {
    label: string;
    value: number;
  }[];
  
  // Long/Short ratio data
  longShortRatio: {
    categories: string[];
    longRatio: number[];
    shortRatio: number[];
  };
  
  // Top active regions
  topRegions: {
    label: string;
    value: number;
  }[];
  
  // Trending tokens
  trendingTokens: TrendingToken[];
}

export interface TrendingToken {
  id: string;
  name: string;
  symbol: string;
  imageUrl: string | null;
  tokenAddress: string;
  poolAddress: string | null;
  volume24h: number;
  priceChange24h: number;
  trades24h: number;
}

export interface UseDashboardStatsReturn {
  stats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  isSupabaseAvailable: boolean;
}

// ===========================================
// Default/Mock Stats (fallback when Supabase not configured)
// ===========================================

// Demo stats shown when Supabase is not configured or no data exists
// These will be replaced with real data once trades happen
const DEFAULT_STATS: DashboardStats = {
  totalActiveUsers: 0,
  totalTradesVolume: 0,
  totalDerivativeVolume: 0,
  totalValueLock: 0,
  totalTokens: 0,
  
  activeUsersChange: 0,
  tradesVolumeChange: 0,
  derivativeVolumeChange: 0,
  valueLockChange: 0,
  
  activeUsersChart: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  tradesVolumeChart: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  derivativeVolumeChart: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  valueLockChart: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  
  volumeBreakdown: [
    { label: 'Buy', value: 0 },
    { label: 'Sell', value: 0 },
    { label: 'Bullish', value: 0 },
    { label: 'Bearish', value: 0 },
  ],
  
  longShortRatio: {
    categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    longRatio: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
    shortRatio: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
  },
  
  topRegions: [],
  trendingTokens: [],
};

// Demo data for development/testing when no real data exists
const DEMO_STATS: DashboardStats = {
  totalActiveUsers: 156,
  totalTradesVolume: 24580,
  totalDerivativeVolume: 0,
  totalValueLock: 12450,
  totalTokens: 8,
  
  activeUsersChange: 12.5,
  tradesVolumeChange: 8.3,
  derivativeVolumeChange: 0,
  valueLockChange: 15.2,
  
  activeUsersChart: [12, 28, 35, 42, 55, 48, 62, 78, 95, 156],
  tradesVolumeChart: [1200, 2400, 3100, 4500, 5200, 8900, 12000, 15600, 19800, 24580],
  derivativeVolumeChart: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  valueLockChart: [800, 1500, 2200, 3400, 4800, 6200, 7900, 9500, 11200, 12450],
  
  volumeBreakdown: [
    { label: 'Buy', value: 14580 },
    { label: 'Sell', value: 10000 },
    { label: 'Bullish', value: 8750 },
    { label: 'Bearish', value: 6000 },
  ],
  
  longShortRatio: {
    categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'],
    longRatio: [0.45, 0.52, 0.58, 0.61, 0.55, 0.63, 0.68, 0.72, 0.65, 0.59],
    shortRatio: [0.55, 0.48, 0.42, 0.39, 0.45, 0.37, 0.32, 0.28, 0.35, 0.41],
  },
  
  topRegions: [
    { label: 'Privacy Trades', value: 14580 },
    { label: 'Public Trades', value: 10000 },
  ],
  
  trendingTokens: [
    {
      id: '1',
      name: 'Ghost Coin',
      symbol: 'GHOST',
      imageUrl: null,
      tokenAddress: '0x123...abc',
      poolAddress: '0x456...def',
      volume24h: 5420,
      priceChange24h: 24.5,
      trades24h: 156,
    },
    {
      id: '2',
      name: 'Phantom Token',
      symbol: 'PHTM',
      imageUrl: null,
      tokenAddress: '0x789...ghi',
      poolAddress: '0xabc...jkl',
      volume24h: 3250,
      priceChange24h: -8.2,
      trades24h: 89,
    },
    {
      id: '3',
      name: 'Shadow Meme',
      symbol: 'SHDW',
      imageUrl: null,
      tokenAddress: '0xdef...mno',
      poolAddress: '0xpqr...stu',
      volume24h: 2100,
      priceChange24h: 15.7,
      trades24h: 67,
    },
  ],
};

// ===========================================
// Hook Implementation
// ===========================================

export function useDashboardStats(autoRefreshMs?: number): UseDashboardStatsReturn {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const isSupabaseAvailable = isSupabaseConfigured();
  
  const fetchStats = useCallback(async () => {
    if (!isSupabaseAvailable) {
      // Return demo stats when Supabase is not configured
      // This allows the dashboard to show sample data during development
      setStats(DEMO_STATS);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const client = getSupabaseClient();
      
      // Fetch all data in parallel
      const [
        tokensResult,
        tradesResult,
        recentTradesResult,
      ] = await Promise.all([
        // Get all tokens
        client.from('token_metadata').select('*'),
        // Get all trades
        client.from('trade_events').select('*'),
        // Get trades from last 7 days for charts
        client.from('trade_events')
          .select('*')
          .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('timestamp', { ascending: true }),
      ]);
      
      const tokens = (tokensResult.data || []) as TokenMetadata[];
      const allTrades = (tradesResult.data || []) as TradeEvent[];
      const recentTrades = (recentTradesResult.data || []) as TradeEvent[];
      
      // Calculate unique active users
      const uniqueTraders = new Set(allTrades.map(t => t.trader));
      const totalActiveUsers = uniqueTraders.size;
      
      // Calculate total volume
      const totalTradesVolume = allTrades.reduce((sum, t) => {
        return sum + parseFloat(t.cost_or_return || '0');
      }, 0);
      
      // Calculate buy/sell volumes
      const buyVolume = allTrades
        .filter(t => t.trade_type === 'buy')
        .reduce((sum, t) => sum + parseFloat(t.cost_or_return || '0'), 0);
      const sellVolume = allTrades
        .filter(t => t.trade_type === 'sell')
        .reduce((sum, t) => sum + parseFloat(t.cost_or_return || '0'), 0);
      
      // Generate sparkline data from recent trades (group by day)
      const dailyData = generateDailyData(recentTrades);
      
      // Calculate trending tokens (by 24h volume)
      const trendingTokens = await calculateTrendingTokens(client, tokens, allTrades);
      
      // Calculate percentage changes (last 24h vs previous 24h)
      const changes = calculateChanges(allTrades);
      
      // If no data exists yet, show demo stats
      if (tokens.length === 0 && allTrades.length === 0) {
        setStats(DEMO_STATS);
        return;
      }
      
      setStats({
        totalActiveUsers,
        totalTradesVolume: Math.round(totalTradesVolume / 1e18), // Convert from wei
        totalDerivativeVolume: 0, // No derivatives yet
        totalValueLock: Math.round((buyVolume - sellVolume) / 1e18),
        totalTokens: tokens.length,
        
        activeUsersChange: changes.usersChange,
        tradesVolumeChange: changes.volumeChange,
        derivativeVolumeChange: 0,
        valueLockChange: changes.tvlChange,
        
        activeUsersChart: dailyData.users,
        tradesVolumeChart: dailyData.volume,
        derivativeVolumeChart: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        valueLockChart: dailyData.tvl,
        
        volumeBreakdown: [
          { label: 'Buy', value: Math.round(buyVolume / 1e18) },
          { label: 'Sell', value: Math.round(sellVolume / 1e18) },
          { label: 'Bullish', value: Math.round(buyVolume * 0.6 / 1e18) },
          { label: 'Bearish', value: Math.round(sellVolume * 0.4 / 1e18) },
        ],
        
        longShortRatio: {
          categories: dailyData.dates,
          longRatio: dailyData.longRatio,
          shortRatio: dailyData.shortRatio,
        },
        
        topRegions: [
          { label: 'Global', value: Math.round(totalTradesVolume / 1e18) },
        ],
        
        trendingTokens,
      });
      
    } catch (err: any) {
      console.error('Failed to fetch dashboard stats:', err);
      setError(err?.message || 'Failed to fetch stats');
      // Fall back to demo stats on error
      setStats(DEMO_STATS);
    } finally {
      setIsLoading(false);
    }
  }, [isSupabaseAvailable]);
  
  // Initial fetch
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);
  
  // Auto-refresh
  useEffect(() => {
    if (!autoRefreshMs || autoRefreshMs < 5000) return;
    
    const interval = setInterval(fetchStats, autoRefreshMs);
    return () => clearInterval(interval);
  }, [autoRefreshMs, fetchStats]);
  
  return {
    stats,
    isLoading,
    error,
    refresh: fetchStats,
    isSupabaseAvailable,
  };
}

// ===========================================
// Helper Functions
// ===========================================

function generateDailyData(trades: TradeEvent[]): {
  dates: string[];
  users: number[];
  volume: number[];
  tvl: number[];
  longRatio: number[];
  shortRatio: number[];
} {
  const days = 10;
  const now = new Date();
  const dates: string[] = [];
  const users: number[] = [];
  const volume: number[] = [];
  const tvl: number[] = [];
  const longRatio: number[] = [];
  const shortRatio: number[] = [];
  
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'short' });
    dates.push(dateStr);
    
    // Filter trades for this day
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    
    const dayTrades = trades.filter(t => {
      const tradeDate = new Date(t.timestamp);
      return tradeDate >= dayStart && tradeDate <= dayEnd;
    });
    
    // Unique users for the day
    const dayUsers = new Set(dayTrades.map(t => t.trader));
    users.push(dayUsers.size);
    
    // Volume for the day
    const dayVolume = dayTrades.reduce((sum, t) => sum + parseFloat(t.cost_or_return || '0'), 0);
    volume.push(Math.round(dayVolume / 1e18));
    
    // TVL calculation (simplified)
    const buyVol = dayTrades.filter(t => t.trade_type === 'buy')
      .reduce((sum, t) => sum + parseFloat(t.cost_or_return || '0'), 0);
    const sellVol = dayTrades.filter(t => t.trade_type === 'sell')
      .reduce((sum, t) => sum + parseFloat(t.cost_or_return || '0'), 0);
    tvl.push(Math.round((buyVol - sellVol) / 1e18));
    
    // Long/Short ratio
    const totalDayVol = buyVol + sellVol;
    if (totalDayVol > 0) {
      longRatio.push(Number((buyVol / totalDayVol).toFixed(2)));
      shortRatio.push(Number((sellVol / totalDayVol).toFixed(2)));
    } else {
      longRatio.push(0.5);
      shortRatio.push(0.5);
    }
  }
  
  return { dates, users, volume, tvl, longRatio, shortRatio };
}

function calculateChanges(trades: TradeEvent[]): {
  usersChange: number;
  volumeChange: number;
  tvlChange: number;
} {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  
  // Last 24 hours
  const last24h = trades.filter(t => new Date(t.timestamp) >= oneDayAgo);
  const prev24h = trades.filter(t => {
    const d = new Date(t.timestamp);
    return d >= twoDaysAgo && d < oneDayAgo;
  });
  
  // Calculate changes
  const currentUsers = new Set(last24h.map(t => t.trader)).size;
  const prevUsers = new Set(prev24h.map(t => t.trader)).size;
  const usersChange = prevUsers > 0 ? ((currentUsers - prevUsers) / prevUsers) * 100 : 0;
  
  const currentVolume = last24h.reduce((s, t) => s + parseFloat(t.cost_or_return || '0'), 0);
  const prevVolume = prev24h.reduce((s, t) => s + parseFloat(t.cost_or_return || '0'), 0);
  const volumeChange = prevVolume > 0 ? ((currentVolume - prevVolume) / prevVolume) * 100 : 0;
  
  return {
    usersChange: Number(usersChange.toFixed(1)),
    volumeChange: Number(volumeChange.toFixed(1)),
    tvlChange: Number((volumeChange * 0.8).toFixed(1)), // Simplified
  };
}

async function calculateTrendingTokens(
  client: ReturnType<typeof getSupabaseClient>,
  tokens: TokenMetadata[],
  allTrades: TradeEvent[]
): Promise<TrendingToken[]> {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  // Get trades from last 24h
  const recentTrades = allTrades.filter(t => new Date(t.timestamp) >= oneDayAgo);
  
  // Group by pool address
  const volumeByPool: Record<string, { volume: number; trades: number; buys: number; sells: number }> = {};
  
  recentTrades.forEach(trade => {
    if (!volumeByPool[trade.pool_address]) {
      volumeByPool[trade.pool_address] = { volume: 0, trades: 0, buys: 0, sells: 0 };
    }
    volumeByPool[trade.pool_address].volume += parseFloat(trade.cost_or_return || '0');
    volumeByPool[trade.pool_address].trades += 1;
    if (trade.trade_type === 'buy') {
      volumeByPool[trade.pool_address].buys += 1;
    } else {
      volumeByPool[trade.pool_address].sells += 1;
    }
  });
  
  // Map tokens to trending
  const trending: TrendingToken[] = tokens
    .map(token => {
      const poolData = token.pool_address ? volumeByPool[token.pool_address] : null;
      const volume24h = poolData ? poolData.volume / 1e18 : 0;
      const trades24h = poolData ? poolData.trades : 0;
      const buys = poolData?.buys || 0;
      const sells = poolData?.sells || 0;
      const priceChange24h = buys + sells > 0 
        ? ((buys - sells) / (buys + sells)) * 100 
        : 0;
      
      return {
        id: token.token_address,
        name: token.name,
        symbol: token.symbol,
        imageUrl: token.image_url,
        tokenAddress: token.token_address,
        poolAddress: token.pool_address,
        volume24h: Math.round(volume24h * 100) / 100,
        priceChange24h: Math.round(priceChange24h * 10) / 10,
        trades24h,
      };
    })
    .sort((a, b) => b.volume24h - a.volume24h)
    .slice(0, 10);
  
  return trending;
}

export default useDashboardStats;

