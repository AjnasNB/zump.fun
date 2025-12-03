import { Helmet } from 'react-helmet-async';
// @mui
import { useTheme } from '@mui/material/styles';
import { Container, Grid, Stack, Button, Skeleton, Alert, Box } from '@mui/material';
// auth
import { AnalyticsConversionRates } from 'src/sections/@dashboard/general/analytics';
import { useAuthContext } from '../../auth/useAuthContext';
// hooks
import { useDashboardStats } from '../../hooks/useDashboardStats';
// components
import { useSettingsContext } from '../../components/settings';
// sections
import {
  AppWidget,
  AppWelcome,
  AppFeatured,
  AppNewInvoice,
  AppTopAuthors,
  AppTopRelated,
  DN404LineChart,
  AppWidgetSummary,
  AppCurrentDownload,
  AppTopInstalledCountries,
} from '../../sections/@dashboard/general/app';
// assets
import { SeoIllustration } from '../../assets/illustrations';
import DN404TradeHistory from './DN404TradeHistory';

// ----------------------------------------------------------------------

export default function GeneralAppPage() {
  const { user } = useAuthContext();
  const theme = useTheme();
  const { themeStretch } = useSettingsContext();
  
  // Fetch real dashboard stats from Supabase (auto-refresh every 30 seconds)
  const { stats, isLoading, error, refresh, isSupabaseAvailable } = useDashboardStats(30000);

  // Convert trending tokens to the format expected by AppTopRelated
  const trendingTokensList = stats?.trendingTokens?.map(token => ({
    id: token.id,
    name: token.name,
    system: token.symbol,
    price: token.volume24h,
    rating: token.priceChange24h,
    review: token.trades24h,
    shortcut: token.imageUrl || '/assets/images/token-placeholder.png',
  })) || [];

  return (
    <>
      <Helmet>
        <title> Zump.fun - Dashboard</title>
      </Helmet>

      <Container maxWidth={themeStretch ? false : 'xl'}>
        {/* Show warning if Supabase not configured */}
        {!isSupabaseAvailable && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Supabase is not configured. Showing placeholder data. Configure REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY for real data.
          </Alert>
        )}
        
        {error && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {error}
            <Button size="small" onClick={refresh} sx={{ ml: 2 }}>
              Retry
            </Button>
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Stats Widgets */}
          <Grid item xs={12} md={3}>
            {isLoading ? (
              <Skeleton variant="rounded" height={160} />
            ) : (
              <AppWidgetSummary
                title="Total Active Users"
                percent={stats?.activeUsersChange || 0}
                total={stats?.totalActiveUsers || 0}
                chart={{
                  colors: [theme.palette.primary.main],
                  series: stats?.activeUsersChart || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                }}
              />
            )}
          </Grid>

          <Grid item xs={12} md={3}>
            {isLoading ? (
              <Skeleton variant="rounded" height={160} />
            ) : (
              <AppWidgetSummary
                title="Total Trades Volume"
                percent={stats?.tradesVolumeChange || 0}
                total={stats?.totalTradesVolume || 0}
                chart={{
                  colors: [theme.palette.info.main],
                  series: stats?.tradesVolumeChart || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                }}
              />
            )}
          </Grid>

          <Grid item xs={12} md={3}>
            {isLoading ? (
              <Skeleton variant="rounded" height={160} />
            ) : (
              <AppWidgetSummary
                title="Total Tokens Launched"
                percent={0}
                total={stats?.totalTokens || 0}
                chart={{
                  colors: [theme.palette.warning.main],
                  series: stats?.derivativeVolumeChart || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                }}
              />
            )}
          </Grid>

          <Grid item xs={12} md={3}>
            {isLoading ? (
              <Skeleton variant="rounded" height={160} />
            ) : (
              <AppWidgetSummary
                title="Total Value Locked"
                percent={stats?.valueLockChange || 0}
                total={stats?.totalValueLock || 0}
                chart={{
                  colors: [theme.palette.success.main],
                  series: stats?.valueLockChart || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                }}
              />
            )}
          </Grid>

          {/* Volume Breakdown Pie Chart */}
          <Grid item xs={12} md={6} lg={4}>
            {isLoading ? (
              <Skeleton variant="rounded" height={400} />
            ) : (
              <AppCurrentDownload
                title="Total Volume ($)"
                chart={{
                  colors: [
                    theme.palette.success.main,
                    theme.palette.error.main,
                    theme.palette.info.main,
                    theme.palette.warning.main,
                  ],
                  series: stats?.volumeBreakdown || [
                    { label: 'Buy', value: 0 },
                    { label: 'Sell', value: 0 },
                    { label: 'Bullish', value: 0 },
                    { label: 'Bearish', value: 0 },
                  ],
                }}
              />
            )}
          </Grid>

          {/* Long/Short Ratio Chart */}
          <Grid item xs={12} md={6} lg={8}>
            {isLoading ? (
              <Skeleton variant="rounded" height={400} />
            ) : (
              <DN404LineChart
                title="Buy/Sell Ratio"
                subheader="Daily trading ratio distribution"
                chart={{
                  categories: stats?.longShortRatio?.categories || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                  series: [
                    {
                      year: new Date().getFullYear().toString(),
                      data: [
                        { 
                          name: 'Buy ratio', 
                          data: stats?.longShortRatio?.longRatio || [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5] 
                        },
                        { 
                          name: 'Sell ratio', 
                          data: stats?.longShortRatio?.shortRatio || [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5] 
                        },
                      ],
                    },
                  ],
                }}
              />
            )}
          </Grid>

          {/* Top Active Volume by Region */}
          <Grid item xs={12} lg={8}>
            {isLoading ? (
              <Skeleton variant="rounded" height={400} />
            ) : (
              <AnalyticsConversionRates
                title="Top Active Volume"
                subheader="Volume distribution by activity ($)"
                chart={{
                  series: stats?.volumeBreakdown?.length 
                    ? stats.volumeBreakdown.map(item => ({
                        label: item.label,
                        value: item.value,
                      }))
                    : [
                        { label: 'No data', value: 0 },
                      ],
                }}
              />
            )}
          </Grid>

          {/* Trending Tokens */}
          <Grid item xs={12} md={6} lg={4}>
            {isLoading ? (
              <Skeleton variant="rounded" height={400} />
            ) : (
              <AppTopRelated 
                title="Trending Tokens" 
                list={trendingTokensList.length > 0 ? trendingTokensList : [
                  {
                    id: '1',
                    name: 'No tokens yet',
                    system: 'Launch a token to see it here',
                    price: 0,
                    rating: 0,
                    review: 0,
                    shortcut: '/assets/images/token-placeholder.png',
                  }
                ]} 
              />
            )}
          </Grid>
        </Grid>
      </Container>
    </>
  );
}
