import React, { useState } from 'react';
import { Stack, Button, CircularProgress } from '@mui/material';
import { useAccount, useDisconnect, useConnect } from '../providers/BotChainProvider';
import { getContractConfig } from '../config/contracts';
import { useSnackbar } from '../components/snackbar';

function formatConnectError(err: any): string {
  const code = err?.code;
  if (err?.message === 'NO_WALLET' || !window.ethereum) {
    return 'No wallet found. Install MetaMask and refresh this page.';
  }
  if (code === 4001) {
    return 'Connection rejected in the wallet.';
  }
  return err?.message || 'Failed to connect wallet.';
}

export function Web3ModalWalletButton() {
  const { address, isConnected, status } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect } = useConnect();
  const { enqueueSnackbar } = useSnackbar();
  const [busy, setBusy] = useState(false);

  const isConnecting = busy || status === 'connecting';

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleConnect = async () => {
    if (isConnecting) return;
    setBusy(true);
    try {
      await connect();
    } catch (err: any) {
      const message = formatConnectError(err);
      enqueueSnackbar(message, { variant: 'error' });
      if (err?.message === 'NO_WALLET') {
        window.open('https://metamask.io/download/', '_blank', 'noopener,noreferrer');
      }
    } finally {
      setBusy(false);
    }
  };

  if (isConnected && address) {
    return (
      <Stack direction="row" spacing={1}>
        <Button
          type="button"
          variant="outlined"
          color="inherit"
          onClick={() => disconnect()}
          sx={{ color: 'text.primary' }}
        >
          {formatAddress(address)}
        </Button>
      </Stack>
    );
  }

  return (
    <Stack>
      <Button
        type="button"
        variant="contained"
        color="primary"
        disabled={isConnecting}
        onClick={handleConnect}
        startIcon={isConnecting ? <CircularProgress size={16} color="inherit" /> : undefined}
      >
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </Button>
    </Stack>
  );
}

export function Web3ModalNetworkButton() {
  const { isConnected } = useAccount();
  const config = getContractConfig();

  if (!isConnected) return null;

  return (
    <Stack>
      <Button type="button" variant="text" color="inherit" size="small">
        {config.chainName}
      </Button>
    </Stack>
  );
}
