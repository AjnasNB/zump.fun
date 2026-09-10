import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BotChainProvider } from '../providers/BotChainProvider';

const queryClient = new QueryClient();

export function Web3ModalProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BotChainProvider>{children}</BotChainProvider>
    </QueryClientProvider>
  );
}
