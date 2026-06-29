// ============================================================
// PLVTVS.ONE — Web3 Wallet Configuration (Base Network)
// ============================================================

import { base, baseSepolia } from 'wagmi/chains';

const RAW_PROJECT_ID = process.env.NEXT_PUBLIC_WC_PROJECT_ID || '';

const isValidWCProjectId = (id: string): boolean =>
  /^[0-9a-f]{32}$/i.test(id);

export const WC_PROJECT_ID = isValidWCProjectId(RAW_PROJECT_ID)
  ? RAW_PROJECT_ID
  : '';

export const HAS_WALLETCONNECT = WC_PROJECT_ID.length > 0;

export const PLVTVS_CHAINS = [baseSepolia, base] as const;
export const PLVTVS_APP_NAME = 'PLVTVS.ONE';
