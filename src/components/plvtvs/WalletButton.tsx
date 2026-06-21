'use client';

import { useEffect, useState, useCallback } from 'react';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useAccount as useWagmiAccount, useDisconnect as useWagmiDisconnect } from 'wagmi';
import { useAuthStore } from '@/lib/plvtvs/auth';
import { getAudioEngine } from '@/lib/plvtvs/audioEngine';
import { useRouter } from 'next/navigation';

// ============================================================
// WalletButton — top-right cyberpunk wallet login
// - Disconnected: shows CONNECT WALLET button
// - Connecting: shows spinner
// - Connected: shows short address + role badge + dropdown
// ============================================================

export default function WalletButton({ compact = false }: { compact?: boolean }) {
  const { address, isConnected, isConnecting, isReconnecting } = useWagmiAccount();
  const { disconnect } = useWagmiDisconnect();
  const { openConnectModal } = useConnectModal();
  const { user, setUser, setLoading, logout, isOperator, isSuperAdmin } = useAuthStore();
  const router = useRouter();
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const authenticate = useCallback(
    async (walletAddress: string) => {
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
        logout();
      } finally {
        setAuthenticating(false);
        setLoading(false);
      }
    },
    [setUser, setLoading, logout]
  );

  // React to wallet connect/disconnect
  useEffect(() => {
    if (isConnected && address) {
      if (!user || user.walletAddress.toLowerCase() !== address.toLowerCase()) {
        authenticate(address);
      }
    } else if (!isConnected && !isReconnecting) {
      if (user) logout();
    }
  }, [isConnected, isReconnecting, address, user, authenticate, logout]);

  const handleConnect = () => {
    setError(null);
    getAudioEngine().init();
    getAudioEngine().resume();
    getAudioEngine().playClick();
    openConnectModal?.();
  };

  const handleDisconnect = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      /* noop */
    }
    disconnect();
    logout();
    setDropdownOpen(false);
    getAudioEngine().playClick();
    router.push('/');
  };

  const goToDashboard = () => {
    setDropdownOpen(false);
    router.push('/dashboard');
  };

  const goToAdmin = () => {
    setDropdownOpen(false);
    router.push('/admin');
  };

  // === Loading state ===
  if (isConnecting || authenticating) {
    return (
      <button
        disabled
        className="cyber-btn cyber-btn-blue !py-2 !px-4 !text-[10px] flex items-center gap-2"
      >
        <span className="cyber-blink">▊</span>
        {isConnecting ? 'CONNECTING' : 'AUTHENTICATING'}
      </button>
    );
  }

  // === Disconnected state ===
  if (!isConnected || !user || !address) {
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
          <div className="absolute right-0 top-full mt-1 cyber-mono text-[9px] text-[#ff4444] whitespace-nowrap">
            {error}
          </div>
        )}
      </div>
    );
  }

  // === Connected state ===
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
              <div className="flex items-center gap-2 mt-2">
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
                TOTAL YIELD: <span className="text-[#FFCC00]">{user.totalYield.toFixed(5)} ETH</span>
              </div>
            </div>

            <div className="py-1">
              <button
                onClick={goToDashboard}
                className="w-full text-left px-3 py-2 cyber-mono text-[11px] text-[#bbb] hover:text-[#00FFCC] hover:bg-[#00FFCC11] transition-colors flex items-center gap-2"
              >
                <span>◉</span> CORE DASHBOARD
              </button>

              {(isOperator() || isSuperAdmin()) && (
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
