'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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

interface AuthState {
  user: PlvtvsUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  // Actions
  setUser: (user: PlvtvsUser | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
  isOperator: () => boolean;
  isSuperAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        }),
      setLoading: (loading) => set({ isLoading: loading }),
      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        }),
      hasRole: (...roles) => {
        const u = get().user;
        return !!u && roles.includes(u.role);
      },
      isOperator: () => {
        const u = get().user;
        return !!u && (u.role === 'OPERATOR' || u.role === 'SUPER_ADMIN');
      },
      isSuperAdmin: () => {
        const u = get().user;
        return !!u && u.role === 'SUPER_ADMIN';
      },
    }),
    {
      name: 'plvtvs-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Known admin wallets (in production, this would be managed via SystemConfig table)
export const SUPER_ADMIN_WALLETS: string[] = [
  '0x7a9f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a', // example super admin
  '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
];

export const OPERATOR_WALLETS: string[] = [
  '0xoperator1deadbeefdeadbeefdeadbeefdeadbeef',
  '0xoperator2deadbeefdeadbeefdeadbeefdeadbeef',
];

export function deriveRoleFromWallet(wallet: string): UserRole {
  const w = wallet.toLowerCase();
  if (SUPER_ADMIN_WALLETS.some((a) => a.toLowerCase() === w)) return 'SUPER_ADMIN';
  if (OPERATOR_WALLETS.some((a) => a.toLowerCase() === w)) return 'OPERATOR';
  return 'USER';
}
