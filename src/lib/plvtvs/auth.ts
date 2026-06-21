'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserRole, UserStatus, PlvtvsUser } from './auth-constants';

// Re-export isomorphic types/constants for client convenience
export type { UserRole, UserStatus, PlvtvsUser } from './auth-constants';
export {
  SUPER_ADMIN_WALLETS,
  OPERATOR_WALLETS,
  deriveRoleFromWallet,
} from './auth-constants';

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
