'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useAccount as useWagmiAccount, useDisconnect as useWagmiDisconnect } from 'wagmi';
import { useAuthStore } from '@/lib/plvtvs/auth';
import { getAudioEngine } from '@/lib/plvtvs/audioEngine';
import { usePathname, useRouter } from 'next/navigation';

// ============================================================
// WalletButton — top-right cyberpunk wallet login
//
// Lifecycle:
//   1. SSR / first paint → CONNECT WALLET (no auth)
//   2. User clicks → openConnectModal()
//   3. Wallet connects (wagmi fires isConnected=true) → trigger authenticate()
//   4. authenticate() calls /api/auth/login → setUser() → button re-renders as connected
//   5. On page reload: sessionStorage rehydrates user; if wallet address matches, no re-auth needed
//   6. Disconnect: clear wagmi + auth state, navigate to '/'
//
// Safeguards:
//   - Skip authenticate() if already authenticated with the same wallet
//   - Skip authenticate() if authenticating right now (in-flight ref)
//   - If authenticate() fails, leave wagmi connected but show error
//     (don't auto-disconnect — let user retry or switch wallet)
// ============================================================

export default function WalletButton({ compact = false }: { compact?: boolean }) {
  const { address, isConnected, isConnecting, isReconnecting } = useWagmiAccount();
  const { disconnect } = useWagmiDisconnect();
  const { openConnectModal } = useConnectModal();
  const { user, setUser, setLoading, logout, isOperator, isSuperAdmin } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Refs to prevent duplicate / race-condition auth calls
  const inFlightWalletRef = useRef<string | null>(null);

  // ============================================================
  // authenticate — POST wallet to /api/auth/login, store user
  // ============================================================
  const authenticate = useCallback(
    async (walletAddress: string) => {
      // Guard: already in-flight for this wallet
      if (inFlightWalletRef.current === walletAddress) return;
      inFlightWalletRef.current = walletAddress;

      setAuthenticating(true);
      setError(null);
      setLoading(true);
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Auth failed' }));
          throw new Error(err.error || 'Authentication failed');
        }
        const data = await res.json();
        setUser(data.user);
        getAudioEngine().playSuccess();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        setError(msg);
        // Do NOT auto-logout here — keep wagmi connected so user can retry.
        // Only clear user state if it was set.
        if (user) logout();
      } finally {
        setAuthenticating(false);
        setLoading(false);
        inFlightWalletRef.current = null;
      }
    },
    [setUser, setLoading, logout, user]
  );

  // ============================================================
  // React to wagmi connect / disconnect
  // ============================================================
  useEffect(() => {
    if (!isConnected || !address) {
      // Wallet disconnected (and not just reconnecting on mount)
      if (!isReconnecting && user) {
        logout();
      }
      return;
    }

    // Wallet is connected — check if we already have a matching user
    const sameWallet =
      user && user.walletAddress.toLowerCase() === address.toLowerCase();

    if (!sameWallet && !authenticating) {
      // New wallet (or first connect) → authenticate
      authenticate(address);
    }
  }, [isConnected, isReconnecting, address, user, authenticating, authenticate, logout]);

  // ============================================================
  // Rehydrate auth on mount: if we have a stored user but wagmi not yet
  // connected, that's fine — user can re-connect. If wagmi auto-reconnects
  // (persisted connector) and matches stored user, no action needed.
  // ============================================================
  useEffect(() => {
    // If wallet is connected but user was cleared (e.g. after page reload
    // where sessionStorage kept the wagmi connection but zustand rehydrated
    // to null), re-authenticate.
    if (isConnected && address && !user && !authenticating && !isReconnecting) {
      authenticate(address);
    }
  }, [isConnected, address, user, authenticating, isReconnecting, authenticate]);

  // ============================================================
  // Handlers
  // ============================================================
  const handleConnect = () => {
    setError(null);
    getAudioEngine().init();
    getAudioEngine().resume();
    getAudioEngine().playClick();

    if (openConnectModal) {
      openConnectModal();
    } else {
      // Fallback: if modal isn't ready yet, show a hint
      setError('Wallet modal not ready. Please retry in a moment.');
    }
  };

  const handleDisconnect = async () => {
    setDropdownOpen(false);
    getAudioEngine().playClick();

    // Call logout API (stateless, but kept for future server-side session invalidation)
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      /* noop */
    }

    // Clear local auth state first, then disconnect wallet
    logout();

    try {
      disconnect();
    } catch {
      /* noop */
    }

    // Navigate to home if not already there
    if (pathname !== '/') {
      router.push('/');
    }
  };

  const goToDashboard = () => {
    setDropdownOpen(false);
    getAudioEngine().playClick();
    router.push('/dashboard');
  };

  const goToAdmin = () => {
    setDropdownOpen(false);
    getAudioEngine().playClick();
    router.push('/admin');
  };

  const goToHome = () => {
    setDropdownOpen(false);
    getAudioEngine().playClick();
    router.push('/');
  };

  // Close dropdown on route change
  useEffect(() => {
    setDropdownOpen(false);
  }, [pathname]);

  // ============================================================
  // Render states
  // ============================================================

  // Loading state
  if (isConnecting || (authenticating && !error)) {
    return (
      <button
        disabled
        className="cyber-btn cyber-btn-blue !py-2 !px-4 !text-[10px] flex items-center gap-2 cursor-wait"
      >
        <span className="cyber-blink">▊</span>
        {isConnecting ? 'CONNECTING' : 'AUTHENTICATING'}
      </button>
    );
  }

  // Disconnected state
  if (!isConnected || !address) {
    return (
      <div className="relative">
        <button
          onClick={handleConnect}
          className="cyber-btn cyber-btn-blue !py-2 !px-4 !text-[10px] flex items-center gap-2"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="1" y="2.5" width="10" height="7" stroke="currentColor" strokeWidth="1" />
            <circle cx="6" cy="6" r="1.2" fill="currentColor" />
          </svg>
          CONNECT WALLET
        </button>
        {error && (
          <div className="absolute right-0 top-full mt-1 cyber-mono text-[9px] text-[#ff4444] whitespace-nowrap z-50">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Wallet connected but auth failed → show retry state
  if (!user) {
    return (
      <div className="relative">
        <button
          onClick={() => authenticate(address)}
          className="cyber-btn !py-2 !px-4 !text-[10px] flex items-center gap-2"
          style={{ borderColor: '#ff4444', color: '#ff4444' }}
        >
          <span className="cyber-blink">!</span> RETRY AUTH
        </button>
        {error && (
          <div className="absolute right-0 top-full mt-1 cyber-mono text-[9px] text-[#ff4444] whitespace-nowrap z-50 max-w-[260px]">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Fully connected + authenticated state
  const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;
  const roleLabel =
    user.role === 'SUPER_ADMIN'
      ? 'SUPER_ADMIN'
      : user.role === 'OPERATOR'
      ? 'OPERATOR'
      : user.subscriptionTier > 0
      ? 'SUBSCRIBER'
      : 'GHOST';
  const roleColor =
    user.role === 'SUPER_ADMIN'
      ? '#FFCC00'
      : user.role === 'OPERATOR'
      ? '#0066FF'
      : '#00FFCC';

  return (
    <div className="relative">
      <button
        onClick={() => {
          setDropdownOpen(!dropdownOpen);
          getAudioEngine().playClick();
        }}
        className="cyber-mono text-[10px] flex items-center gap-2 px-3 py-2 border border-[#1a1a1a] hover:border-[#00FFCC] bg-black/60 transition-colors"
        style={{ minWidth: compact ? 140 : 180 }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full cyber-pulse"
          style={{ background: roleColor, boxShadow: `0 0 6px ${roleColor}` }}
        />
        <span className="flex-1 text-left">
          <div className="text-white">{shortAddr}</div>
          {!compact && (
            <div className="text-[8px] text-[#666] tracking-wider">{roleLabel}</div>
          )}
        </span>
        <svg
          width="8"
          height="8"
          viewBox="0 0 8 8"
          fill="none"
          style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none' }}
        >
          <path d="M1 2.5L4 5.5L7 2.5" stroke="currentColor" strokeWidth="1" />
        </svg>
      </button>

      {dropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setDropdownOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-50 w-64 bg-black border border-[#1a1a1a] cyber-panel">
            <div className="p-3 border-b border-[#1a1a1a]">
              <div className="cyber-mono text-[9px] text-[#444] tracking-wider mb-1">
                AUTHENTICATED GHOST
              </div>
              <div className="cyber-mono text-xs text-[#00FFCC] break-all">
                {shortAddr}
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span
                  className="cyber-mono text-[9px] px-1.5 py-0.5 border"
                  style={{ color: roleColor, borderColor: roleColor }}
                >
                  {roleLabel}
                </span>
                {user.subscriptionTier > 0 && (
                  <span className="cyber-mono text-[9px] text-[#FFCC00]">
                    TIER {user.subscriptionTier}
                  </span>
                )}
              </div>
              <div className="cyber-mono text-[9px] text-[#666] mt-2">
                TOTAL YIELD:{' '}
                <span className="text-[#FFCC00]">
                  {user.totalYield.toFixed(5)} ETH
                </span>
              </div>
              {user.subscriptionExpiresAt && (
                <div className="cyber-mono text-[9px] text-[#666] mt-1">
                  SUB EXPIRES:{' '}
                  <span className="text-[#bbb]">
                    {new Date(user.subscriptionExpiresAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            <div className="py-1">
              {/* Always show home link (unless already home) */}
              {pathname !== '/' && (
                <button
                  onClick={goToHome}
                  className="w-full text-left px-3 py-2 cyber-mono text-[11px] text-[#bbb] hover:text-[#00FFCC] hover:bg-[#00FFCC11] transition-colors flex items-center gap-2"
                >
                  <span>▣</span> HOME
                </button>
              )}

              {/* Dashboard link (unless already on dashboard) */}
              {pathname !== '/dashboard' && (
                <button
                  onClick={goToDashboard}
                  className="w-full text-left px-3 py-2 cyber-mono text-[11px] text-[#bbb] hover:text-[#00FFCC] hover:bg-[#00FFCC11] transition-colors flex items-center gap-2"
                >
                  <span>◉</span> CORE DASHBOARD
                </button>
              )}

              {/* Admin link — only for operators+ (unless already on admin) */}
              {(isOperator() || isSuperAdmin()) && pathname !== '/admin' && (
                <button
                  onClick={goToAdmin}
                  className="w-full text-left px-3 py-2 cyber-mono text-[11px] text-[#FFCC00] hover:bg-[#FFCC0011] transition-colors flex items-center gap-2"
                >
                  <span>⊞</span> ADMIN CONSOLE
                </button>
              )}

              <div className="border-t border-[#1a1a1a] my-1" />

              <button
                onClick={handleDisconnect}
                className="w-full text-left px-3 py-2 cyber-mono text-[11px] text-[#ff4444] hover:bg-[#ff444411] transition-colors flex items-center gap-2"
              >
                <span>✕</span> JACK OUT / DISCONNECT
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
