'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount as useWagmiAccount, useDisconnect as useWagmiDisconnect } from 'wagmi';
import { useAuthStore } from '@/lib/plvtvs/auth';
import { getAudioEngine } from '@/lib/plvtvs/audioEngine';
import { usePathname, useRouter } from 'next/navigation';

// ============================================================
// WalletButton — top-right cyberpunk wallet login
//
// Uses ConnectButton.Custom with render prop. The ConnectButton
// is ALWAYS mounted so RainbowKit's modal context is always
// available. The render prop controls all UI states.
// ============================================================

interface WalletButtonProps {
  compact?: boolean;
}

export default function WalletButton({ compact = false }: WalletButtonProps) {
  const { address, isConnected, isConnecting, isReconnecting } = useWagmiAccount();
  const { disconnect } = useWagmiDisconnect();
  const { user, setUser, setLoading, logout, isOperator, isSuperAdmin } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const inFlightWalletRef = useRef<string | null>(null);
  const lastAuthWalletRef = useRef<string | null>(null);

  // ============================================================
  // authenticate
  // ============================================================
  const authenticate = useCallback(
    async (walletAddress: string) => {
      const walletLower = walletAddress.toLowerCase();
      if (inFlightWalletRef.current === walletLower) return;
      if (lastAuthWalletRef.current === walletLower && user) return;

      inFlightWalletRef.current = walletLower;
      setAuthenticating(true);
      setError(null);
      setLoading(true);
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress: walletLower }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Auth failed' }));
          throw new Error(err.error || 'Authentication failed');
        }
        const data = await res.json();
        setUser(data.user);
        lastAuthWalletRef.current = walletLower;
        getAudioEngine().playSuccess();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        setError(msg);
        lastAuthWalletRef.current = null;
      } finally {
        setAuthenticating(false);
        setLoading(false);
        inFlightWalletRef.current = null;
      }
    },
    [setUser, setLoading, user]
  );

  // React to wagmi connect
  useEffect(() => {
    if (!isConnected || !address) {
      if (!isReconnecting && user) {
        logout();
        lastAuthWalletRef.current = null;
      }
      return;
    }
    const walletLower = address.toLowerCase();
    const sameWallet = lastAuthWalletRef.current === walletLower;
    if (!sameWallet && !authenticating && !isReconnecting) {
      authenticate(address);
    }
  }, [isConnected, isReconnecting, address, user, authenticating, authenticate, logout]);

  const handleDisconnect = () => {
    setDropdownOpen(false);
    getAudioEngine().playClick();
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    logout();
    lastAuthWalletRef.current = null;
    try { disconnect(); } catch {}
    if (pathname !== '/') router.push('/');
  };

  const goTo = (path: string) => {
    setDropdownOpen(false);
    getAudioEngine().playClick();
    router.push(path);
  };

  useEffect(() => { setDropdownOpen(false); }, [pathname]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dropdownOpen]);

  // === Single ConnectButton.Custom — handles ALL states ===
  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, openAccountModal, openChainModal, mounted: rkMounted }) => {
        // Don't render anything until mounted (SSR safety)
        if (!rkMounted) {
          return (
            <button
              disabled
              className="cyber-btn cyber-btn-blue !py-2 !px-2 sm:!px-4 !text-[9px] sm:!text-[10px] flex items-center gap-1.5 opacity-50"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0">
                <rect x="1" y="2.5" width="10" height="7" stroke="currentColor" strokeWidth="1" />
                <circle cx="6" cy="6" r="1.2" fill="currentColor" />
              </svg>
              <span className="hidden xs:inline">···</span>
            </button>
          );
        }

        // Loading state
        if (isConnecting || (authenticating && !error)) {
          return (
            <button
              disabled
              className="cyber-btn cyber-btn-blue !py-2 !px-2 sm:!px-4 !text-[9px] sm:!text-[10px] flex items-center gap-1.5 cursor-wait"
            >
              <span className="cyber-blink">▊</span>
              <span className="hidden sm:inline">{isConnecting ? 'CONNECTING' : 'AUTH'}</span>
            </button>
          );
        }

        // === Disconnected: show CONNECT WALLET button ===
        if (!account || !isConnected) {
          return (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setError(null);
                  getAudioEngine().init();
                  getAudioEngine().resume();
                  getAudioEngine().playClick();
                  // Call openConnectModal in the next tick to ensure it's available
                  setTimeout(() => {
                    openConnectModal();
                  }, 0);
                }}
                className="cyber-btn cyber-btn-blue !py-2 !px-2 sm:!px-4 !text-[9px] sm:!text-[10px] flex items-center gap-1.5"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0">
                  <rect x="1" y="2.5" width="10" height="7" stroke="currentColor" strokeWidth="1" />
                  <circle cx="6" cy="6" r="1.2" fill="currentColor" />
                </svg>
                <span className="hidden sm:inline">CONNECT WALLET</span>
                <span className="sm:hidden">CW</span>
              </button>
              {error && (
                <div className="absolute right-0 top-full mt-1 cyber-mono text-[9px] text-[#ff4444] whitespace-nowrap z-50 max-w-[260px]">
                  {error}
                </div>
              )}
            </div>
          );
        }

        // === Connected but auth failed: show retry ===
        if (!user) {
          return (
            <div className="relative">
              <button
                onClick={() => address && authenticate(address)}
                className="cyber-btn !py-2 !px-2 sm:!px-4 !text-[9px] sm:!text-[10px] flex items-center gap-1.5"
                style={{ borderColor: '#ff4444', color: '#ff4444' }}
              >
                <span className="cyber-blink">!</span>
                <span className="hidden sm:inline">RETRY</span>
              </button>
              {error && (
                <div className="absolute right-0 top-full mt-1 cyber-mono text-[9px] text-[#ff4444] whitespace-nowrap z-50 max-w-[260px]">
                  {error}
                </div>
              )}
            </div>
          );
        }

        // === Fully connected + authenticated ===
        const addr = account.address || address || '';
        const shortAddr = `${addr.slice(0, 6)}...${addr.slice(-4)}`;
        const roleLabel =
          user.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN'
          : user.role === 'OPERATOR' ? 'OPERATOR'
          : user.subscriptionTier > 0 ? 'SUBSCRIBER'
          : 'GHOST';
        const roleColor =
          user.role === 'SUPER_ADMIN' ? '#FFCC00'
          : user.role === 'OPERATOR' ? '#0066FF'
          : '#00FFCC';

        return (
          <div className="relative">
            <button
              onClick={() => {
                setDropdownOpen(!dropdownOpen);
                getAudioEngine().playClick();
              }}
              className="cyber-mono text-[9px] sm:text-[10px] flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 border border-[#1a1a1a] hover:border-[#00FFCC] bg-black/60 transition-colors"
              style={{ minWidth: compact ? 100 : 140 }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full cyber-pulse flex-shrink-0"
                style={{ background: roleColor, boxShadow: `0 0 6px ${roleColor}` }}
              />
              <span className="flex-1 text-left min-w-0">
                <div className="text-white truncate">{shortAddr}</div>
                {!compact && (
                  <div className="text-[7px] sm:text-[8px] text-[#666] tracking-wider">{roleLabel}</div>
                )}
              </span>
              <svg
                width="8" height="8" viewBox="0 0 8 8" fill="none"
                className="flex-shrink-0"
                style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none' }}
              >
                <path d="M1 2.5L4 5.5L7 2.5" stroke="currentColor" strokeWidth="1" />
              </svg>
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 w-52 sm:w-64 bg-black border border-[#1a1a1a]">
                  <div className="p-3 border-b border-[#1a1a1a]">
                    <div className="cyber-mono text-[9px] text-[#444] tracking-wider mb-1">
                      AUTHENTICATED GHOST
                    </div>
                    <div className="cyber-mono text-xs text-[#00FFCC] break-all">{shortAddr}</div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span
                        className="cyber-mono text-[9px] px-1.5 py-0.5 border"
                        style={{ color: roleColor, borderColor: roleColor }}
                      >
                        {roleLabel}
                      </span>
                    </div>
                  </div>

                  <div className="py-1">
                    {pathname !== '/' && (
                      <button
                        onClick={() => goTo('/')}
                        className="w-full text-left px-3 py-2 cyber-mono text-[11px] text-[#bbb] hover:text-[#00FFCC] hover:bg-[#00FFCC11] transition-colors flex items-center gap-2"
                      >
                        <span>▣</span> HOME
                      </button>
                    )}
                    {pathname !== '/dashboard' && (
                      <button
                        onClick={() => goTo('/dashboard')}
                        className="w-full text-left px-3 py-2 cyber-mono text-[11px] text-[#bbb] hover:text-[#00FFCC] hover:bg-[#00FFCC11] transition-colors flex items-center gap-2"
                      >
                        <span>◉</span> DASHBOARD
                      </button>
                    )}
                    {(isOperator() || isSuperAdmin()) && pathname !== '/admin' && (
                      <button
                        onClick={() => goTo('/admin')}
                        className="w-full text-left px-3 py-2 cyber-mono text-[11px] text-[#FFCC00] hover:bg-[#FFCC0011] transition-colors flex items-center gap-2"
                      >
                        <span>⊞</span> ADMIN
                      </button>
                    )}
                    <div className="border-t border-[#1a1a1a] my-1" />
                    <button
                      onClick={() => { setDropdownOpen(false); openAccountModal(); }}
                      className="w-full text-left px-3 py-2 cyber-mono text-[11px] text-[#888] hover:text-[#00FFCC] hover:bg-[#00FFCC11] transition-colors flex items-center gap-2"
                    >
                      <span>⟳</span> SETTINGS
                    </button>
                    <button
                      onClick={handleDisconnect}
                      className="w-full text-left px-3 py-2 cyber-mono text-[11px] text-[#ff4444] hover:bg-[#ff444411] transition-colors flex items-center gap-2"
                    >
                      <span>✕</span> DISCONNECT
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
