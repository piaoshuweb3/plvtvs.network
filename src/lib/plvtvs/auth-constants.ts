// ============================================================
// PLVTVS.ONE — Admin wallet allowlists + role derivation
// ============================================================
// This file is isomorphic (safe for both server and client).
// The Zustand auth store lives in a separate 'use client' file.
// ============================================================

export type UserRole = 'USER' | 'OPERATOR' | 'SUPER_ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';

export interface PlvtvsUser {
  id: string;
  walletAddress: string;
  username?: string | null;
  email?: string | null;
  role: UserRole;
  status: UserStatus;
  avatarSeed?: string | null;
  subscriptionTier: number;
  subscriptionExpiresAt?: string | null;
  totalYield: number;
  lastLoginAt?: string | null;
  createdAt: string;
}

// ============================================================
// Admin wallet allowlists
// ============================================================
// SUPER_ADMIN — full system control (ban, promote, demote, configure)
// OPERATOR   — mid-level admin (manage users, view logs, restart nodes)
//
// To add more admins, either:
//   1. Append to these arrays (hard-coded, requires redeploy), OR
//   2. Use the admin console to promote a wallet in the database
//      (the DB role takes precedence once set by a super admin)
// ============================================================

export const SUPER_ADMIN_WALLETS: string[] = [
  // Primary project owner — ultimate control
  '0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1',
];

export const OPERATOR_WALLETS: string[] = [
  // Add operator wallets here as needed
  // '0x...',
];

export function deriveRoleFromWallet(wallet: string): UserRole {
  const w = wallet.toLowerCase();
  if (SUPER_ADMIN_WALLETS.some((a) => a.toLowerCase() === w)) return 'SUPER_ADMIN';
  if (OPERATOR_WALLETS.some((a) => a.toLowerCase() === w)) return 'OPERATOR';
  return 'USER';
}
