import {useEffect,useState} from 'react';
import {Helmet} from 'react-helmet-async';
import {useParams, useLocation} from 'react-router-dom';
// @mui
import {Box,Card,Container,Divider,Grid,Link,Stack,Tab,Tabs,Typography,LinearProgress,Alert,Chip} from '@mui/material';
import {alpha} from '@mui/material/styles';
// redux
import {Notpump_DN404} from 'src/descriptions/DN404';
import {addToCart,getProduct,gotoStep} from '../../redux/slices/DN404';
import {useDispatch,useSelector} from '../../redux/store';
// hooks
import { useTokenDetail } from '../../hooks/useTokenDetail';
// utils
import { formatBigIntWithDecimals } from '../../utils/bondingCurveUtils';
import { formatAddress } from '../../utils/formatAddress';
import { explorerAddress } from '../../config/contracts';
// routes
// @types
import {ICheckoutCartItem} from '../../@types/DN404';
// components
import CustomBreadcrumbs from '../../components/custom-breadcrumbs';
import Iconify from '../../components/iconify';
import Markdown from '../../components/markdown';
import {useSettingsContext} from '../../components/settings';
import {SkeletonProductDetails} from '../../components/skeleton';
import Label from '../../components/label';
// sections
import CartWidget from '../../sections/@dashboard/e-commerce/CartWidget';
import {
  DN404DetailsCarousel,
  DN404DetailsSummary,
  ProductDetailsReview,
} from '../../sections/@dashboard/e-commerce/details';
import DN404TradeHistory from './DN404TradeHistory';

// ----------------------------------------------------------------------

const SUMMARY = [
  {
    title: '100% Original',
    description: 'Chocolate bar candy canes ice cream toffee cookie halvah.',
    icon: 'ic:round-verified',
  },
  {
    title: '10 Day Replacement',
    description: 'Marshmallow biscuit donut dragée fruitcake wafer.',
    icon: 'eva:clock-fill',
  },
  {
    title: 'Year Warranty',
    description: 'Cotton candy gingerbread cake I love sugar sweet.',
    icon: 'ic:round-verified-user',
  },
];

// ----------------------------------------------------------------------

export default function DN404DetailsPage() {
  const { themeStretch } = useSettingsContext();

  const { name } = useParams();
  const location = useLocation();

  const dispatch = useDispatch();

  const { product, isLoading: reduxLoading, error: reduxError, checkout } = useSelector((state) => state.product);

  const [currentTab, setCurrentTab] = useState('trade_history');

  const routeToken =
    (location.state as any)?.tokenAddress ||
    (location.state as any)?.poolAddress ||
    product?.contract ||
    product?.poolAddress;

  const {
    token: onChainToken,
    error: onChainError,
    refetch: refetchOnChain,
  } = useTokenDetail(routeToken, routeToken, {
    autoFetch: Boolean(routeToken),
    pollingInterval: 10000,
  });

  const tokenAddress = onChainToken?.tokenAddress || routeToken;
  const poolAddress = onChainToken?.poolAddress || tokenAddress;

  const isLoading = reduxLoading && !product;

  useEffect(() => {
    if (name) {
      dispatch(getProduct(name as string));
    }
  }, [dispatch, name]);

  const handleAddCart = (newProduct: ICheckoutCartItem) => {
    dispatch(addToCart(newProduct));
  };

  const handleGotoStep = (step: number) => {
    dispatch(gotoStep(step));
  };

  // Use on-chain data if available, otherwise fall back to Redux product
  const displayName =
    onChainToken?.name && onChainToken.name !== 'Unknown Token'
      ? onChainToken.name
      : product?.name || 'Token';
  const displaySymbol =
    onChainToken?.symbol && onChainToken.symbol !== '???'
      ? onChainToken.symbol
      : product?.symbol || '';
  const displayDescription =
    onChainToken?.description || product?.description || 'No description has been published for this token.';
  const isMigrated = onChainToken?.migrated || product?.isMigrated || false;
  const creatorAddress = onChainToken?.creatorAddress || product?.wallet;
  const creatorIsUnknown =
    !creatorAddress ||
    creatorAddress === '0x0' ||
    creatorAddress.toLowerCase() === '0x0000000000000000000000000000000000000000';

  const resolvedProduct = product
    ? {
        ...product,
        name: displayName,
        symbol: displaySymbol || product.symbol,
        wallet: creatorIsUnknown ? product.wallet : creatorAddress,
        contract: tokenAddress || product.contract,
        poolAddress: poolAddress || product.poolAddress,
        description: displayDescription,
      }
    : null;
  const progress = onChainToken?.progress || product?.bondingCurveProccess || 0;
  const currentPrice = onChainToken?.currentPrice;
  const tokensSold = onChainToken?.tokensSold;
  const maxSupply = onChainToken?.maxSupply;

  const TABS = [
    {
      value: 'trade_history',
      label: `Trade history`,
      component: tokenAddress ? <DN404TradeHistory poolAddress={tokenAddress} /> : null,
    },
    {
      value: 'description',
      label: 'description',
      component: <Markdown children={displayDescription} />,
    },
 
  ];

  return (
    <>
      <Helmet>
        <title>{`Token ${displaySymbol} / (${displayName}) | Zump.fun`}</title>
      </Helmet>

      <Container maxWidth={themeStretch ? false : 'lg'}>
        <CustomBreadcrumbs
          heading={`${displaySymbol} / (${displayName})`}
          links={[
            {
              name: Notpump_DN404
            },
          ]}
        />

        <CartWidget totalItems={checkout.totalItems} />

        {/* On-chain error alert */}
        {onChainError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Failed to fetch on-chain data: {onChainError.message}. Showing cached data.
          </Alert>
        )}

        {/* Migrated pool status - Requirements: 4.4 */}
        {isMigrated && (
          <Alert 
            severity="info" 
            sx={{ mb: 2 }}
            action={
              <Chip 
                label="Trade on DEX" 
                color="primary" 
                size="small" 
                onClick={() => {
                  // TODO: Redirect to DEX
                  window.open('https://dex.botchain.ai/swap', '_blank');
                }}
              />
            }
          >
            This token has been migrated to a public DEX. Bonding curve trading is no longer available.
          </Alert>
        )}

        {resolvedProduct && (
          <>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6} lg={7}>
                <DN404DetailsCarousel product={resolvedProduct} livePrice={currentPrice} />
                
                {/* On-chain Pool State Card - Requirements: 4.1, 4.2, 4.3 */}
                {onChainToken && (
                  <Card sx={{ p: 3, mt: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      On-Chain Pool State
                    </Typography>
                    
                    {/* Bonding Curve Progress Bar - Requirements: 4.3 */}
                    <Box sx={{ mb: 3 }}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Bonding Curve Progress
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {progress.toFixed(2)}%
                        </Typography>
                      </Stack>
                      <LinearProgress 
                        variant="determinate" 
                        value={progress} 
                        sx={{ 
                          height: 10, 
                          borderRadius: 5,
                          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 5,
                            bgcolor: isMigrated ? 'success.main' : 'primary.main',
                          }
                        }}
                      />
                      <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {tokensSold ? formatBigIntWithDecimals(tokensSold, 18, 2) : '0'} sold
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {maxSupply ? formatBigIntWithDecimals(maxSupply, 18, 2) : '0'} max
                        </Typography>
                      </Stack>
                    </Box>

                    {/* Pool Metrics Grid */}
                    <Grid container spacing={2}>
                      {/* Current Price - Requirements: 4.2 */}
                      <Grid item xs={6}>
                        <Box sx={{ p: 2, bgcolor: 'background.neutral', borderRadius: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Current Price
                          </Typography>
                          <Typography variant="h6">
                            {currentPrice ? formatBigIntWithDecimals(currentPrice, 18, 6) : '0'} BOT
                          </Typography>
                        </Box>
                      </Grid>

                      {/* Market Cap */}
                      <Grid item xs={6}>
                        <Box sx={{ p: 2, bgcolor: 'background.neutral', borderRadius: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Market Cap
                          </Typography>
                          <Typography variant="h6">
                            {onChainToken.marketCap ? formatBigIntWithDecimals(onChainToken.marketCap, 18, 4) : '0'} BOT
                          </Typography>
                        </Box>
                      </Grid>

                      {/* Reserve Balance */}
                      <Grid item xs={6}>
                        <Box sx={{ p: 2, bgcolor: 'background.neutral', borderRadius: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Pool Reserve
                          </Typography>
                          <Typography variant="h6">
                            {onChainToken.reserveBalance ? formatBigIntWithDecimals(onChainToken.reserveBalance, 18, 4) : '0'} BOT
                          </Typography>
                        </Box>
                      </Grid>

                      {/* Status */}
                      <Grid item xs={6}>
                        <Box sx={{ p: 2, bgcolor: 'background.neutral', borderRadius: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Status
                          </Typography>
                          <Box sx={{ mt: 0.5 }}>
                            <Label 
                              variant="soft" 
                              color={isMigrated ? 'success' : 'primary'}
                            >
                              {isMigrated ? 'Migrated to DEX' : 'Active'}
                            </Label>
                          </Box>
                        </Box>
                      </Grid>
                    </Grid>

                    {/* Token Contract - Requirements: 4.5 (privacy preserved) */}
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'background.neutral', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Token Contract
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        {tokenAddress ? (
                          <Link href={explorerAddress(tokenAddress)} target="_blank" rel="noopener" color="inherit">
                            {tokenAddress}
                          </Link>
                        ) : (
                          'Unknown'
                        )}
                      </Typography>
                      <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                        Creator:{' '}
                        {creatorIsUnknown ? (
                          'Unknown'
                        ) : (
                          <Link href={explorerAddress(creatorAddress)} target="_blank" rel="noopener" color="inherit">
                            {formatAddress(creatorAddress)}
                          </Link>
                        )}
                      </Typography>
                    </Box>
                  </Card>
                )}
              </Grid>

              <Grid item xs={12} md={6} lg={5}>
                <DN404DetailsSummary
                  product={resolvedProduct}
                  cart={checkout.cart}
                  onAddCart={handleAddCart}
                  onGotoStep={handleGotoStep}
                  poolAddress={poolAddress}
                  tokenAddress={tokenAddress}
                  currentPrice={currentPrice}
                  isMigrated={isMigrated}
                  onTradeSuccess={refetchOnChain}
                />
              </Grid>
            </Grid>

            <Box
              gap={2}
              display="grid"
              gridTemplateColumns={{
                xs: 'repeat(1, 1fr)',
                md: 'repeat(3, 1fr)',
              }}
              sx={{ my: 1 }}
            >
              {/* Placeholder for future content */}
            </Box>

            <Card>
              <Tabs
                value={currentTab}
                onChange={(event, newValue) => setCurrentTab(newValue)}
                sx={{ px: 3, bgcolor: 'background.neutral' }}
              >
                {TABS.map((tab) => (
                  <Tab key={tab.value} value={tab.value} label={tab.label} />
                ))}
              </Tabs>

              <Divider />

              {TABS.map(
                (tab) =>
                  tab.value === currentTab && (
                    <Box
                      key={tab.value}
                      sx={{
                        ...(currentTab === 'description' && {
                          p: 3,
                        }),
                      }}
                    >
                      {tab.component}
                    </Box>
                  )
              )}
            </Card>
          </>
        )}

        {isLoading && <SkeletonProductDetails />}

        {!isLoading && !resolvedProduct && (
          <Alert severity="error">
            {reduxError ? String((reduxError as any)?.message || reduxError) : 'Token not found on BOT Chain.'}
          </Alert>
        )}
      </Container>
    </>
  );
}
