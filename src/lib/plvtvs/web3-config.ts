// ============================================================
// PLVTVS.NETWORK — Web3 Wallet Configuration (Base Network)
// Using RainbowKit + Wagmi v2 + Viem v2
// ============================================================
//
// WalletConnect Project ID
// ──────────────────────────
// To enable WalletConnect QR-code connections (mobile wallets), register a
// free project at https://cloud.walletconnect.com and set the ID as an env
// var: NEXT_PUBLIC_WC_PROJECT_ID=<your-id>
//
// Without a valid ID, the demo fallback is used. Injected wallets
// (MetaMask, Coinbase Wallet, Rabby, etc.) still work perfectly — only
// the remote WalletConnect Cloud metadata fetch will 403. The console
// warning is harmless.
// ============================================================

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, baseSepolia } from 'wagmi/chains';

export const WC_PROJECT_ID =
  process.env.NEXT_PUBLIC_WC_PROJECT_ID || '3dcdb6f9b9d4a7d8c5e2f1a0b9d8c7e6';

export const wagmiConfig = getDefaultConfig({
  appName: 'PLVTVS.NETWORK',
  projectId: WC_PROJECT_ID,
  chains: [baseSepolia, base],
  ssr: true,
  multiInjectedProviderDiscovery: true,
});
