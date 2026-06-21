// ============================================================
// PLVTVS.NETWORK — Web3 Wallet Configuration (Base Network)
// Using RainbowKit + Wagmi v2 + Viem v2
// ============================================================

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, baseSepolia } from 'wagmi/chains';

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'plvtvs_demo_project_id';

export const wagmiConfig = getDefaultConfig({
  appName: 'PLVTVS.NETWORK',
  projectId,
  chains: [baseSepolia, base],
  ssr: true,
  multiInjectedProviderDiscovery: true,
});
