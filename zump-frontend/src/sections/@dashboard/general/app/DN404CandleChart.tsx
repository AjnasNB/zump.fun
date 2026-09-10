import { Card, CardProps, Typography, Box, Stack, CircularProgress } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { useMemo, useEffect, useState } from 'react';
import Chart, { useChart } from '../../../../components/chart';
import { getSupabaseService } from '../../../../services/supabaseService';
import { TradeEvent } from '../../../../@types/supabase';

interface Props extends CardProps {
  height?: number;
  tokenSymbol?: string;
  tokenAddress?: string;
  poolAddress?: string;
  livePrice?: bigint;
}

interface PricePoint {
  timestamp: number;
  price: number;
}

function toBot(value?: bigint): number {
  if (value === undefined) return 0;
  return Number(value) / 1e18;
}

export default function DN404CandleChart({
  height,
  tokenSymbol = 'TOKEN',
  tokenAddress,
  poolAddress,
  livePrice,
}: Props) {
  const theme = useTheme();
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasTradeData, setHasTradeData] = useState(false);

  const livePriceBot = toBot(livePrice);

  useEffect(() => {
    const fetchTradeHistory = async () => {
      if (!tokenAddress && !poolAddress) return;

      setIsLoading(true);
      try {
        const supabaseService = getSupabaseService();
        const trades = await supabaseService.getTradeHistory({
          poolAddress: poolAddress || tokenAddress,
          limit: 100,
        });

        if (trades.length > 0) {
          const points: PricePoint[] = trades
            .filter((t: TradeEvent) => t.price)
            .map((t: TradeEvent) => ({
              timestamp: new Date(t.timestamp || t.created_at || Date.now()).getTime(),
              price: Number(t.price) / 1e18,
            }))
            .sort((a: PricePoint, b: PricePoint) => a.timestamp - b.timestamp);

          setPriceHistory(points);
          setHasTradeData(points.length > 0);
        } else {
          setPriceHistory([]);
          setHasTradeData(false);
        }
      } catch (error) {
        console.error('Failed to fetch trade history:', error);
        setHasTradeData(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTradeHistory();
  }, [tokenAddress, poolAddress]);

  const chartData = useMemo(() => {
    if (hasTradeData && priceHistory.length > 0) {
      return priceHistory.map((p) => p.price);
    }
    if (livePriceBot > 0) {
      return [livePriceBot, livePriceBot];
    }
    return [];
  }, [hasTradeData, priceHistory, livePriceBot]);

  const priceChange = useMemo(() => {
    if (chartData.length < 2 || chartData[0] === 0) return 0;
    const first = chartData[0];
    const last = chartData[chartData.length - 1];
    return ((last - first) / first) * 100;
  }, [chartData]);

  const displayedPrice = livePriceBot || chartData[chartData.length - 1] || 0;
  const isPositive = priceChange >= 0;

  const chartOptions = useChart({
    chart: {
      type: 'area',
      sparkline: { enabled: false },
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    stroke: { width: 2, curve: 'smooth' },
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
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
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
      min: displayedPrice > 0 ? displayedPrice * 0.95 : undefined,
      max: displayedPrice > 0 ? displayedPrice * 1.05 : undefined,
    },
    grid: {
      show: true,
      strokeDashArray: 3,
      borderColor: alpha(theme.palette.grey[500], 0.2),
    },
    tooltip: {
      enabled: true,
      y: {
        formatter: (value: number) => `${value.toFixed(8)} BOT`,
        title: { formatter: () => 'Price:' },
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
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle2">{tokenSymbol} / BOT</Typography>
          <Typography variant="caption" color="text.secondary">
            {hasTradeData ? `${priceHistory.length} trades` : 'Live price'}
          </Typography>
        </Stack>

        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          {displayedPrice.toFixed(8)} BOT
        </Typography>

        <Box sx={{ height: height ? height - 100 : 200 }}>
          {chartData.length > 0 ? (
            <Chart
              type="area"
              series={[{ name: 'Price', data: chartData }]}
              options={chartOptions}
              height="100%"
            />
          ) : (
            <Stack height="100%" alignItems="center" justifyContent="center">
              <Typography variant="body2" color="text.secondary">
                Price will appear after the first trade.
              </Typography>
            </Stack>
          )}
        </Box>
      </Stack>
    </Card>
  );
}
