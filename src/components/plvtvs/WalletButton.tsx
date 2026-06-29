'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { ConnectButton, useConnectModal, useAccountModal } from '@rainbow-me/rainbowkit';
import { useAccount as useWagmiAccount, useDisconnect as useWagmiDisconnect } from 'wagmi';
import { useAuthStore } from '@/lib/plvtvs/auth';
import { getAudioEngine } from '@/lib/plvtvs/audioEngine';
import { usePathname, useRouter } from 'next/navigation';

interface WalletButtonProps { compact?: boolean; }

// ============================================================
// WalletButton — Professional Wallet Connection UI
// ============================================================

function LoadingSpinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.75" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="3" width="13" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M12 7.5h3v3h-3a1.5 1.5 0 0 1 0-3z" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="13.5" cy="9" r="0.8" fill="currentColor" />
    </svg>
  );
}

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
      <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ROLE_COLORS: Record<string, { dot: string; glow: string; border: string }> = {
  SUPER_ADMIN: { dot: '#FFCC00', glow: 'rgba(255,204,0,0.3)', border: 'rgba(255,204,0,0.4)' },
  OPERATOR:   { dot: '#0066FF', glow: 'rgba(0,102,255,0.3)',  border: 'rgba(0,102,255,0.4)' },
  SUBSCRIBER: { dot: '#00FFCC', glow: 'rgba(0,255,204,0.3)',  border: 'rgba(0,255,204,0.4)' },
  SOUL:      { dot: '#888888', glow: 'rgba(136,136,136,0.25)', border: 'rgba(136,136,136,0.3)' },
};

function getRoleLabel(role: string, tier: number): string {
  if (role === 'SUPER_ADMIN') return 'SUPER ADMIN';
  if (role === 'OPERATOR') return 'OPERATOR';
  if (tier > 0) return 'SUBSCRIBER';
  return 'SOUL';
}

function getRoleColors(role: string, tier: number) {
  if (role === 'SUPER_ADMIN') return ROLE_COLORS.SUPER_ADMIN;
  if (role === 'OPERATOR') return ROLE_COLORS.OPERATOR;
  if (tier > 0) return ROLE_COLORS.SUBSCRIBER;
  return ROLE_COLORS.SOUL;
}

export default function WalletButton({ compact = false }: WalletButtonProps) {
  const { address, isConnected, isConnecting, isReconnecting } = useWagmiAccount();
  const { disconnect } = useWagmiDisconnect();
  const { openConnectModal } = useConnectModal();
  const { openAccountModal } = useAccountModal();
  const { user, setUser, setLoading, logout, isOperator, isSuperAdmin } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const inFlight = useRef<string | null>(null);
  const lastAuth = useRef<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const authenticate = useCallback(async (wallet: string) => {
    const w = wallet.toLowerCase();
    if (inFlight.current === w) return;
    if (lastAuth.current === w && user) return;
    inFlight.current = w;
    setAuthenticating(true); setError(null); setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: w }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || 'Auth failed');
      }
      const data = await res.json();
      setUser(data.user);
      lastAuth.current = w;
      getAudioEngine().playSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      lastAuth.current = null;
    } finally {
      setAuthenticating(false);
      setLoading(false);
      inFlight.current = null;
    }
  }, [setUser, setLoading, user]);

  useEffect(() => {
    if (isConnected && address) {
      const w = address.toLowerCase();
      if (lastAuth.current !== w && !authenticating && !isReconnecting) {
        authenticate(address);
      }
    } else if (!isReconnecting && user) {
      logout();
      lastAuth.current = null;
    }
  }, [isConnected, isReconnecting, address, user, authenticating, authenticate, logout]);

  const handleConnect = () => {
    setError(null);
    getAudioEngine().init(); getAudioEngine().resume(); getAudioEngine().playClick();
    if (openConnectModal) { openConnectModal(); }
    else { setError('Wallet not ready — please refresh'); }
  };

  const handleDisconnect = () => {
    setDropdownOpen(false); getAudioEngine().playClick();
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    logout(); lastAuth.current = null;
    try { disconnect(); } catch { /* ignore */ }
    if (pathname !== '/') router.push('/');
  };

  const goTo = (p: string) => { setDropdownOpen(false); getAudioEngine().playClick(); router.push(p); };
  useEffect(() => { setDropdownOpen(false); }, [pathname]);

  // ─── SSR placeholder ──────────────────────────────────────
  if (!mounted) {
    return (
      <div className="h-9 w-32 rounded bg-white/5 animate-pulse" />
    );
  }

  // ─── Loading state ────────────────────────────────────────
  if (isConnecting || isReconnecting || (authenticating && !error)) {
    const loadingLabel = isConnecting ? 'Connecting wallet...' : isReconnecting ? 'Reconnecting...' : 'Authenticating...';
    return (
      <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 text-xs">
        <LoadingSpinner />
        <span className="text-xs font-medium tracking-wide">{loadingLabel}</span>
      </div>
    );
  }

  // ─── Disconnected state ───────────────────────────────────
  if (!isConnected || !address) {
    return (
      <div className="relative">
        <button
          onClick={handleConnect}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-[#00FFCC]/10 border border-[#00FFCC]/30
            hover:bg-[#00FFCC]/20 hover:border-[#00FFCC]/50 active:scale-[0.98]
            text-[#00FFCC] text-xs font-bold tracking-wider uppercase
            transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]/40"
        >
          <WalletIcon />
          <span>{compact ? 'Connect' : 'Connect Wallet'}</span>
        </button>
        {error && (
          <div className="absolute right-0 top-full mt-2 text-[10px] text-red-400 bg-red-400/10 border border-red-400/30 rounded px-2.5 py-1 whitespace-nowrap z-50">
            {error}
          </div>
        )}
      </div>
    );
  }

  // ─── Auth failed state ────────────────────────────────────
  if (!user) {
    return (
      <div className="relative">
        <button
          onClick={() => authenticate(address)}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30
            hover:bg-red-500/20 active:scale-[0.98]
            text-red-400 text-xs font-bold tracking-wider uppercase
            transition-all duration-200"
        >
          <span className="text-base leading-none">⚠</span>
          <span>Retry Auth</span>
        </button>
        {error && (
          <div className="absolute right-0 top-full mt-2 text-[10px] text-red-400 bg-red-400/10 border border-red-400/30 rounded px-2.5 py-1 whitespace-nowrap z-50">
            {error}
          </div>
        )}
      </div>
    );
  }

  // ─── Connected + Authenticated ─────────────────────────────
  const short = `${address.slice(0, 6)}...${address.slice(-4)}`;
  const role = user.role;
  const tier = user.subscriptionTier || 0;
  const roleLabel = getRoleLabel(role, tier);
  const colors = getRoleColors(role, tier);

  return (
    <div className="relative">
      {/* Hidden ConnectButton keeps RainbowKit context alive */}
      <div style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1, overflow: 'hidden', opacity: 0.01, pointerEvents: 'none' }}>
        <ConnectButton />
      </div>

      {/* Main button */}
      <button
        onClick={() => { setDropdownOpen(!dropdownOpen); getAudioEngine().playClick(); }}
        className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg
          bg-black/60 border transition-all duration-200
          hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/20 active:scale-[0.98]"
        style={{ borderColor: colors.border, minWidth: compact ? 130 : 170 }}
      >
        {/* Status dot */}
        <span className="relative flex-shrink-0 w-2 h-2">
          <span className="absolute inset-0 rounded-full"
            style={{ background: colors.dot }} />
          <span className="absolute inset-0 rounded-full animate-ping"
            style={{ background: colors.dot, opacity: 0.4 }} />
        </span>

        {/* Address + Role */}
        <span className="flex-1 text-left min-w-0">
          <span className="block text-xs font-bold text-white tracking-wide truncate">
            {short}
          </span>
          <span className="block text-[9px] font-medium tracking-wider uppercase opacity-60"
            style={{ color: colors.dot }}>
            {roleLabel}
          </span>
        </span>

        {/* Chevron */}
        <ChevronDown open={dropdownOpen} />
      </button>

      {/* Dropdown menu */}
      {dropdownOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-60 rounded-lg bg-[#0a0a0a] border border-white/10 shadow-2xl shadow-black/50 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/5">
              <div className="text-[9px] tracking-widest uppercase text-white/30 mb-0.5">Connected Wallet</div>
              <div className="text-[11px] font-bold text-white tracking-wide truncate">{short}</div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: colors.dot, boxShadow: `0 0 4px ${colors.dot}` }} />
                <span className="text-[9px] font-medium tracking-wider uppercase" style={{ color: colors.dot }}>
                  {roleLabel}
                </span>
              </div>
            </div>

            {/* Menu items */}
            <div className="py-1">
              {pathname !== '/' && (
                <DropdownItem onClick={() => goTo('/')} icon="▣" label="Home" />
              )}
              {pathname !== '/dashboard' && (
                <DropdownItem onClick={() => goTo('/dashboard')} icon="◉" label="Dashboard" />
              )}
              {(isOperator() || isSuperAdmin()) && pathname !== '/admin' && (
                <DropdownItem onClick={() => goTo('/admin')} icon="⊞" label="Admin Console" accent />
              )}
            </div>

            <div className="border-t border-white/5" />

            <div className="py-1">
              <button
                onClick={() => { setDropdownOpen(false); openAccountModal?.(); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[11px] text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors text-left"
              >
                <span className="w-4 text-center text-xs">⚙</span>
                <span>Wallet Settings</span>
              </button>
              <button
                onClick={handleDisconnect}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[11px] text-red-400/70 hover:text-red-400 hover:bg-red-400/5 transition-colors text-left"
              >
                <span className="w-4 text-center text-xs">✕</span>
                <span>Disconnect</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Dropdown item helper
function DropdownItem({ onClick, icon, label, accent }: {
  onClick: () => void;
  icon: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[11px] transition-colors text-left
        ${accent ? 'text-[#FFCC00]/80 hover:text-[#FFCC00] hover:bg-[#FFCC00]/5' : 'text-white/60 hover:text-white/90 hover:bg-white/5'}`}
    >
      <span className="w-4 text-center text-xs">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
