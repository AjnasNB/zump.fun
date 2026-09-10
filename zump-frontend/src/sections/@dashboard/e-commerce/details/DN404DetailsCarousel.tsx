import { Box, Card, Divider, Tab, Tabs } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useResponsive from 'src/hooks/useResponsive';
import { IDN404MetaData } from '../../../../@types/DN404';
import DN404CandleChart from '../../general/app/DN404CandleChart';

type Props = {
  product: IDN404MetaData;
  livePrice?: bigint;
};

export default function DN404DetailsCarousel({ product, livePrice }: Props) {
  const theme = useTheme();
  const isDesktop = useResponsive('up', 'md');
  const tokenAddress = product.contract || product.poolAddress;
  const tokenSymbol = (product.symbol || product.name || 'TOKEN').toUpperCase();

  return (
    <Box
      sx={{
        '& .slick-slide': {
          float: theme.direction === 'rtl' ? 'right' : 'left',
        },
      }}
    >
      <Card>
        <Tabs value="price" sx={{ px: 3, bgcolor: 'background.neutral' }}>
          <Tab value="price" label="Price" />
        </Tabs>
        <Divider />
        <Box>
          <Card sx={{ p: 1, height: isDesktop ? 600 : 300 }}>
            <DN404CandleChart
              tokenSymbol={tokenSymbol}
              tokenAddress={tokenAddress}
              poolAddress={product.poolAddress || product.contract}
              livePrice={livePrice}
              height={isDesktop ? 580 : 280}
            />
          </Card>
        </Box>
      </Card>
    </Box>
  );
}
