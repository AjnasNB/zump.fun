// @mui
import { Card, CardProps, Typography, Box, Stack } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { useMemo } from 'react';
// components
import Chart, { useChart } from '../../../../components/chart';

// ----------------------------------------------------------------------

interface Props extends CardProps {
  height?: number;
  tokenSymbol?: string;
  priceData?: number[];
}

// Generate mock price data for demo
function generateMockPriceData(points: number = 50): number[] {
  const data: number[] = [];
  let price = 0.0001; // Starting price
  
  for (let i = 0; i < points; i += 1) {
    // Random walk with slight upward bias
    const change = (Math.random() - 0.48) * 0.00002;
    price = Math.max(0.00001, price + change);
    data.push(price);
  }
  
  return data;
}

export default function DN404CandleChart({ height, tokenSymbol = 'TOKEN', priceData }: Props) {
  const theme = useTheme();
  
  // Use provided data or generate mock data
  const chartData = useMemo(() => priceData || generateMockPriceData(), [priceData]);
  
  // Calculate price change
  const priceChange = useMemo(() => {
    if (chartData.length < 2) return 0;
    const first = chartData[0];
    const last = chartData[chartData.length - 1];
    return ((last - first) / first) * 100;
  }, [chartData]);
  
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
        formatter: (value: number) => `${value.toFixed(8)} ETH`,
        title: {
          formatter: () => 'Price:',
        },
      },
    },
  });

  return (
    <Card sx={{ p: 2, height: height || '100%' }}>
      <Stack spacing={1}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle2">
            {tokenSymbol} / ETH
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
              24h
            </Typography>
          </Stack>
        </Stack>
        
        {/* Current Price */}
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          {chartData[chartData.length - 1]?.toFixed(8) || '0.00000000'} ETH
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
            Price chart (Demo data)
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Real data coming soon
          </Typography>
        </Stack>
      </Stack>
    </Card>
  );
}
