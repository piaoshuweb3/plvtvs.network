'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Dashboard from '@/components/plvtvs/Dashboard';
import WalletButton from '@/components/plvtvs/WalletButton';
import { useAuthStore } from '@/lib/plvtvs/auth';
import { getAudioEngine } from '@/lib/plvtvs/audioEngine';

// ============================================================
// /dashboard — standalone user dashboard route
// Auth-aware: shows the cyber console once authenticated,
// otherwise shows a "connect wallet" prompt.
// ============================================================

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [avatarSeed, setAvatarSeed] = useState('guest');
  const [mounted, setMounted] = useState(false);

  // Mount-only flag to avoid SSR/CSR mismatch
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Sync avatar seed from auth user or sessionStorage
  useEffect(() => {
    if (user?.walletAddress) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAvatarSeed(user.walletAddress);
      sessionStorage.setItem('plvtvs-seed', user.walletAddress);
    } else {
      const stored = sessionStorage.getItem('plvtvs-seed');
      if (stored) {
        setAvatarSeed(stored);
      }
    }
  }, [user]);

  const handleJackOut = useCallback(() => {
    getAudioEngine().playClick();
    router.push('/');
  }, [router]);

  const handleGoToAdmin = useCallback(() => {
    getAudioEngine().playClick();
    router.push('/admin');
  }, [router]);

  // SSR / first paint — render a placeholder
  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="cyber-mono text-xs text-[#00FFCC] cyber-flicker">
          <span className="cyber-blink">▊</span> INITIALIZING DASHBOARD...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* Floating top-right auth bar */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        {user && (user.role === 'OPERATOR' || user.role === 'SUPER_ADMIN') && (
          <button
            onClick={handleGoToAdmin}
            className="cyber-btn cyber-btn-gold !py-2 !px-3 !text-[10px]"
            title="Open Admin Console"
          >
            ⊞ ADMIN
          </button>
        )}
        <WalletButton compact />
      </div>

      {/* If not authenticated, show connect prompt above the dashboard */}
      {!user && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 cyber-panel p-3 max-w-md w-full mx-4">
          <div className="cyber-mono text-[10px] text-[#FFCC00] tracking-[0.3em] mb-1 cyber-flicker text-center">
            {'// GUEST MODE'}
          </div>
          <div className="cyber-mono text-xs text-[#888] text-center">
            Connect your wallet (top-right) to persist your ghost across sessions.
          </div>
        </div>
      )}

      <Dashboard avatarSeed={avatarSeed} onJackOut={handleJackOut} />
    </div>
  );
}
