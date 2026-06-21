'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import {
  RainbowKitProvider,
  darkTheme,
  type Locale,
} from '@rainbow-me/rainbowkit';
import { wagmiConfig } from './web3-config';
import type { ReactNode } from 'react';

// ============================================================
// PLVTVS Providers — RainbowKit + Wagmi + React Query
// ============================================================

const customTheme = {
  ...darkTheme({
    accentColor: '#00FFCC',
    accentColorForeground: '#000000',
    connectButtonBackground: '#000000',
    connectButtonBackgroundError: '#ff4444',
    connectButtonInnerBackground: '#000000',
    connectButtonText: '#00FFCC',
    connectButtonTextError: '#ffffff',
    modalBackground: '#000000',
    modalBorder: '#1a1a1a',
    modalText: '#ffffff',
    modalTextDim: '#666666',
    modalTextSecondary: '#888888',
  }),
  fonts: {
    body: 'monospace, monospace',
  },
  radii: {
    ...darkTheme().radii,
    connectButton: '0px',
    modal: '2px',
    modalMobile: '2px',
  },
};

export default function PlvtvsProviders({
  children,
  initialLocale = 'en-US',
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: false, retry: 1 },
        },
      })
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={customTheme}
          locale={initialLocale}
          modalSize="compact"
          appContext={{
            title: 'PLVTVS.NETWORK',
            logo: undefined,
            description:
              'Your Ghost in the Wireless Shell. Connect wallet to deploy your sovereign digital avatar.',
          }}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
