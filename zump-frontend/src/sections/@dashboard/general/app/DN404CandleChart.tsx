// @mui
import { Card, CardProps, Typography, Box, Stack, CircularProgress } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { useMemo, useEffect, useState } from 'react';
// components
import Chart, { useChart } from '../../../../components/chart';
// services
import { getSupabaseService } from '../../../../services/supabaseService';
import { TradeEvent } from '../../../../@types/supabase';

// ----------------------------------------------------------------------

interface Props extends CardProps {
  height?: number;
  tokenSymbol?: string;
  tokenAddress?: string;
  poolAddress?: string;
}

interface PricePoint {
  timestamp: number;
  price: number;
}

// Generate mock price data for demo when no real data exists
function generateMockPriceData(basePrice: number = 0.0001, points: number = 50): number[] {
  const data: number[] = [];
  let price = basePrice;
  
  for (let i = 0; i < points; i += 1) {
    const change = (Math.random() - 0.48) * basePrice * 0.1;
    price = Math.max(basePrice * 0.5, price + change);
    data.push(price);
  }
  
  return data;
}

export default function DN404CandleChart({ 
  height, 
  tokenSymbol = 'TOKEN',
  tokenAddress,
  poolAddress,
}: Props) {
  const theme = useTheme();
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasRealData, setHasRealData] = useState(false);
  
  // Fetch trade history from Supabase
  useEffect(() => {
    const fetchTradeHistory = async () => {
      if (!tokenAddress && !poolAddress) return;
      
      setIsLoading(true);
      try {
        const supabaseService = getSupabaseService();
        const trades = await supabaseService.getTradeHistory({
          poolAddress,
          limit: 100,
        });
        
        if (trades.length > 0) {
          // Convert trades to price points
          const points: PricePoint[] = trades
            .filter((t: TradeEvent) => t.price && t.created_at)
            .map((t: TradeEvent) => ({
              timestamp: new Date(t.created_at!).getTime(),
              price: Number(t.price) / 1e18, // Convert from wei
            }))
            .sort((a: PricePoint, b: PricePoint) => a.timestamp - b.timestamp);
          
          setPriceHistory(points);
          setHasRealData(points.length > 0);
        } else {
          setHasRealData(false);
        }
      } catch (error) {
        console.error('Failed to fetch trade history:', error);
        setHasRealData(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTradeHistory();
  }, [tokenAddress, poolAddress]);
  
  // Use real data or generate mock data
  const chartData = useMemo(() => {
    if (hasRealData && priceHistory.length > 0) {
      return priceHistory.map(p => p.price);
    }
    return generateMockPriceData();
  }, [hasRealData, priceHistory]);
  
  // Calculate price change
  const priceChange = useMemo(() => {
    if (chartData.length < 2) return 0;
    const first = chartData[0];
    const last = chartData[chartData.length - 1];
    return ((last - first) / first) * 100;
  }, [chartData]);
  
  const currentPrice = chartData[chartData.length - 1] || 0;
  const isPositive = priceChange >= 0;
  
  const chartOptions = useChart({
    chart: {
      type: 'area',
      sparkline: {
        enabled: false,
      },
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false,
      },
    },
    stroke: {
      width: 2,
      curve: 'smooth',
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.1,
        stops: [0, 100],
      },
    },
    colors: [isPositive ? theme.palette.success.main : theme.palette.error.main],
    xaxis: {
      labels: {
        show: false,
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      labels: {
        show: true,
        formatter: (value: number) => value.toFixed(6),
        style: {
          colors: theme.palette.text.secondary,
          fontSize: '10px',
        },
      },
    },
    grid: {
      show: true,
      strokeDashArray: 3,
      borderColor: alpha(theme.palette.grey[500], 0.2),
    },
    tooltip: {
      enabled: true,
      y: {
        formatter: (value: number) => `${value.toFixed(8)} STRK`,
        title: {
          formatter: () => 'Price:',
        },
      },
    },
  });

  if (isLoading) {
    return (
      <Card sx={{ p: 2, height: height || '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={40} />
      </Card>
    );
  }

  return (
    <Card sx={{ p: 2, height: height || '100%' }}>
      <Stack spacing={1}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle2">
            {tokenSymbol} / STRK
          </Typography>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography 
              variant="caption" 
              sx={{ 
                color: isPositive ? 'success.main' : 'error.main',
                fontWeight: 'bold',
              }}
            >
              {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {hasRealData ? '24h' : 'demo'}
            </Typography>
          </Stack>
        </Stack>
        
        {/* Current Price */}
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          {currentPrice.toFixed(8)} STRK
        </Typography>
        
        {/* Chart */}
        <Box sx={{ height: height ? height - 100 : 200 }}>
          <Chart
            type="area"
            series={[{ name: 'Price', data: chartData }]}
            options={chartOptions}
            height="100%"
          />
        </Box>
        
        {/* Footer */}
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary">
            {hasRealData ? `${priceHistory.length} trades` : 'No trades yet (demo data)'}
          </Typography>
          {!hasRealData && (
            <Typography variant="caption" sx={{ color: 'warning.main' }}>
              Be the first to trade!
            </Typography>
          )}
        </Stack>
      </Stack>
    </Card>
  );
}
