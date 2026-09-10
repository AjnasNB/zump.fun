import { useMemo } from 'react';
import { Stack, Button, Tooltip, Avatar, Typography } from '@mui/material';
import { Web3ModalWalletButton } from 'src/auth/Web3ModalButtons';
import { useAccount } from 'src/providers/BotChainProvider';
import { useWallet } from 'src/hooks/useWallet';
import { ethers } from 'ethers';
import Iconify from 'src/components/iconify';
import useResponsive from 'src/hooks/useResponsive';
import { getContractConfig } from 'src/config/contracts';

export default function AccountPopover() {
  const isDesktop = useResponsive('up', 'lg');
  const config = getContractConfig();
  const { address, isConnected } = useAccount();
  const { balance } = useWallet();

  const formattedBalance = useMemo(() => {
    if (balance === null) return null;
    return Number(ethers.utils.formatEther(balance.toString())).toFixed(4);
  }, [balance]);

  return (
    <Stack direction="row" alignItems="center" spacing={2}>
      {isConnected && address && (
        <Stack direction="row" spacing={1} alignItems="center">
          {formattedBalance !== null && (
            <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
              {formattedBalance} BOT
            </Typography>
          )}
          <Tooltip title="Swap on BDEX" arrow>
            <Button
              color="inherit"
              sx={{ color: 'text.disabled' }}
              variant="outlined"
              href={config.dexUrl}
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<Avatar sx={{ width: 18, height: 18 }} src="https://cdn.1inch.io/logo.png" />}
              endIcon={<Iconify icon="eva:info-outline" color="gray" width={16} />}
            >
              {isDesktop ? 'Swap' : ''}
            </Button>
          </Tooltip>
        </Stack>
      )}
      <Web3ModalWalletButton />
    </Stack>
  );
}
