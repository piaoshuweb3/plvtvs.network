'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { ConnectButton, useConnectModal, useAccountModal } from '@rainbow-me/rainbowkit';
import { useAccount as useWagmiAccount, useDisconnect as useWagmiDisconnect } from 'wagmi';
import { useAuthStore } from '@/lib/plvtvs/auth';
import { getAudioEngine } from '@/lib/plvtvs/audioEngine';
import { usePathname, useRouter } from 'next/navigation';

interface WalletButtonProps { compact?: boolean; }

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
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ walletAddress: w }) });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Auth failed'); }
      const data = await res.json();
      setUser(data.user); lastAuth.current = w; getAudioEngine().playSuccess();
    } catch (e) { setError(e instanceof Error ? e.message : 'Error'); lastAuth.current = null; }
    finally { setAuthenticating(false); setLoading(false); inFlight.current = null; }
  }, [setUser, setLoading, user]);

  useEffect(() => {
    if (!isConnected || !address) { if (!isReconnecting && user) { logout(); lastAuth.current = null; } return; }
    const w = address.toLowerCase();
    if (lastAuth.current !== w && !authenticating && !isReconnecting) authenticate(address);
  }, [isConnected, isReconnecting, address, user, authenticating, authenticate, logout]);

  const handleConnect = () => {
    setError(null);
    getAudioEngine().init(); getAudioEngine().resume(); getAudioEngine().playClick();
    if (openConnectModal) { openConnectModal(); }
    else { setError('Wallet not ready. Please retry.'); }
  };

  const handleDisconnect = () => {
    setDropdownOpen(false); getAudioEngine().playClick();
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    logout(); lastAuth.current = null;
    try { disconnect(); } catch {}
    if (pathname !== '/') router.push('/');
  };

  const goTo = (p: string) => { setDropdownOpen(false); getAudioEngine().playClick(); router.push(p); };
  useEffect(() => { setDropdownOpen(false); }, [pathname]);

  // SSR placeholder
  if (!mounted) return (
    <button disabled className="cyber-btn cyber-btn-blue !py-2 !px-3 !text-[9px] sm:!text-[10px] opacity-50">···</button>
  );

  // Loading
  if (isConnecting || (authenticating && !error)) return (
    <button disabled className="cyber-btn cyber-btn-blue !py-2 !px-3 !text-[9px] sm:!text-[10px] cursor-wait">
      <span className="cyber-blink">▊</span><span className="hidden sm:inline">{isConnecting ? 'CONNECTING' : 'AUTH'}</span>
    </button>
  );

  // Disconnected
  if (!isConnected || !address) return (
    <div className="relative">
      <button onClick={handleConnect} className="cyber-btn cyber-btn-blue !py-2 !px-3 !text-[9px] sm:!text-[10px] flex items-center gap-1.5">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="2.5" width="10" height="7" stroke="currentColor" strokeWidth="1"/><circle cx="6" cy="6" r="1.2" fill="currentColor"/></svg>
        <span className="hidden sm:inline">CONNECT WALLET</span><span className="sm:hidden">CW</span>
      </button>
      {error && <div className="absolute right-0 top-full mt-1 cyber-mono text-[9px] text-[#ff4444] z-50">{error}</div>}
    </div>
  );

  // Auth failed
  if (!user) return (
    <div className="relative">
      <button onClick={() => authenticate(address)} className="cyber-btn !py-2 !px-3 !text-[9px] sm:!text-[10px]" style={{ borderColor: '#ff4444', color: '#ff4444' }}>
        <span className="cyber-blink">!</span><span className="hidden sm:inline">RETRY</span>
      </button>
      {error && <div className="absolute right-0 top-full mt-1 cyber-mono text-[9px] text-[#ff4444] z-50">{error}</div>}
    </div>
  );

  // Connected + authenticated
  const short = `${address.slice(0, 6)}...${address.slice(-4)}`;
  const role = user.role;
  const rc = role === 'SUPER_ADMIN' ? '#FFCC00' : role === 'OPERATOR' ? '#0066FF' : '#00FFCC';
  const rl = role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : role === 'OPERATOR' ? 'OPERATOR' : user.subscriptionTier > 0 ? 'SUBSCRIBER' : 'GHOST';

  return (
    <div className="relative">
      {/* Hidden ConnectButton to keep RainbowKit context alive */}
      <div style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1, overflow: 'hidden', opacity: 0.01, pointerEvents: 'none' }}>
        <ConnectButton />
      </div>
      <button onClick={() => { setDropdownOpen(!dropdownOpen); getAudioEngine().playClick(); }}
        className="cyber-mono text-[9px] sm:text-[10px] flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 border border-[#1a1a1a] hover:border-[#00FFCC] bg-black/60 transition-colors"
        style={{ minWidth: compact ? 100 : 140 }}>
        <span className="w-1.5 h-1.5 rounded-full cyber-pulse flex-shrink-0" style={{ background: rc, boxShadow: `0 0 6px ${rc}` }} />
        <span className="flex-1 text-left min-w-0">
          <div className="text-white truncate">{short}</div>
          {!compact && <div className="text-[7px] sm:text-[8px] text-[#666]">{rl}</div>}
        </span>
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="flex-shrink-0" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none' }}>
          <path d="M1 2.5L4 5.5L7 2.5" stroke="currentColor" strokeWidth="1"/>
        </svg>
      </button>
      {dropdownOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-52 sm:w-64 bg-black border border-[#1a1a1a]">
            <div className="p-3 border-b border-[#1a1a1a]">
              <div className="cyber-mono text-[9px] text-[#444] mb-1">AUTHENTICATED GHOST</div>
              <div className="cyber-mono text-xs text-[#00FFCC] break-all">{short}</div>
            </div>
            <div className="py-1">
              {pathname !== '/' && <button onClick={() => goTo('/')} className="w-full text-left px-3 py-2 cyber-mono text-[11px] text-[#bbb] hover:text-[#00FFCC] hover:bg-[#00FFCC11] flex items-center gap-2"><span>▣</span> HOME</button>}
              {pathname !== '/dashboard' && <button onClick={() => goTo('/dashboard')} className="w-full text-left px-3 py-2 cyber-mono text-[11px] text-[#bbb] hover:text-[#00FFCC] hover:bg-[#00FFCC11] flex items-center gap-2"><span>◉</span> DASHBOARD</button>}
              {(isOperator() || isSuperAdmin()) && pathname !== '/admin' && <button onClick={() => goTo('/admin')} className="w-full text-left px-3 py-2 cyber-mono text-[11px] text-[#FFCC00] hover:bg-[#FFCC0011] flex items-center gap-2"><span>⊞</span> ADMIN</button>}
              <div className="border-t border-[#1a1a1a] my-1" />
              <button onClick={() => { setDropdownOpen(false); openAccountModal?.(); }} className="w-full text-left px-3 py-2 cyber-mono text-[11px] text-[#888] hover:text-[#00FFCC] hover:bg-[#00FFCC11] flex items-center gap-2"><span>⟳</span> SETTINGS</button>
              <button onClick={handleDisconnect} className="w-full text-left px-3 py-2 cyber-mono text-[11px] text-[#ff4444] hover:bg-[#ff444411] flex items-center gap-2"><span>✕</span> DISCONNECT</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
