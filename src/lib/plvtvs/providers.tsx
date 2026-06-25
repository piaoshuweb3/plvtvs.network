'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import {
  RainbowKitProvider,
  darkTheme,
  type Locale,
  connectorsForWallets,
} from '@rainbow-me/rainbowkit';
import {
  injectedWallet,
  metaMaskWallet,
  coinbaseWallet,
  rainbowWallet,
  rabbyWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { base, baseSepolia } from 'wagmi/chains';
import {
  HAS_WALLETCONNECT,
  WC_PROJECT_ID,
  PLVTVS_CHAINS,
  PLVTVS_APP_NAME,
} from './web3-config';
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

function buildInjectedOnlyConfig() {
  const connectors = connectorsForWallets(
    [
      {
        groupName: 'Browser Wallets',
        wallets: [injectedWallet],
      },
    ],
    {
      appName: PLVTVS_APP_NAME,
      projectId: 'injected-only',
    }
  );

  return createConfig({
    chains: PLVTVS_CHAINS,
    transports: {
      [baseSepolia.id]: http(),
      [base.id]: http(),
    },
    connectors,
    ssr: true,
    multiInjectedProviderDiscovery: true,
  });
}

function buildFullConfig() {
  const connectors = connectorsForWallets(
    [
      {
        groupName: 'Recommended',
        wallets: [
          metaMaskWallet,
          coinbaseWallet,
          rainbowWallet,
          rabbyWallet,
          walletConnectWallet,
          injectedWallet,
        ],
      },
    ],
    {
      appName: PLVTVS_APP_NAME,
      projectId: WC_PROJECT_ID,
    }
  );

  return createConfig({
    chains: PLVTVS_CHAINS,
    transports: {
      [baseSepolia.id]: http(),
      [base.id]: http(),
    },
    connectors,
    ssr: true,
    multiInjectedProviderDiscovery: true,
  });
}

const activeConfig = HAS_WALLETCONNECT
  ? buildFullConfig()
  : buildInjectedOnlyConfig();

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
    <WagmiProvider config={activeConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={customTheme}
          locale={initialLocale}
          modalSize="compact"
          appContext={{
            title: PLVTVS_APP_NAME,
            logo: undefined,
            description: HAS_WALLETCONNECT
              ? 'Your Ghost in the Wireless Shell. Connect wallet to deploy your sovereign digital avatar.'
              : 'Your Ghost in the Wireless Shell. Browser-injected wallets (MetaMask/Coinbase) supported. Set NEXT_PUBLIC_WC_PROJECT_ID to enable WalletConnect QR.',
          }}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
