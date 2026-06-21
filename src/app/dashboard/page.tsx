'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Dashboard from '@/components/plvtvs/Dashboard';
import WalletButton from '@/components/plvtvs/WalletButton';
import { useAuthStore } from '@/lib/plvtvs/auth';
import { getAudioEngine } from '@/lib/plvtvs/audioEngine';

// ============================================================
// /dashboard — standalone user dashboard route
// Shows the existing Dashboard component but with auth gating
// + top bar with wallet button + admin link if user is operator+
// ============================================================

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [avatarSeed, setAvatarSeed] = useState('guest');
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (user?.walletAddress) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAvatarSeed(user.walletAddress);
    } else {
      // Try to read from sessionStorage
      const stored = sessionStorage.getItem('plvtvs-seed');
      if (stored) setAvatarSeed(stored);
    }
    setAuthChecked(true);
  }, [user]);

  const handleJackOut = useCallback(() => {
    getAudioEngine().playClick();
    router.push('/');
  }, [router]);

  // Show loading state while auth is being checked
  if (!authChecked) {
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
      {/* Floating top-right auth bar (overlay) */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        {user && (user.role === 'OPERATOR' || user.role === 'SUPER_ADMIN') && (
          <button
            onClick={() => {
              getAudioEngine().playClick();
              router.push('/admin');
            }}
            className="cyber-btn cyber-btn-gold !py-2 !px-3 !text-[10px]"
            title="Open Admin Console"
          >
            ⊞ ADMIN
          </button>
        )}
        <WalletButton compact />
      </div>

      <Dashboard avatarSeed={avatarSeed} onJackOut={handleJackOut} />
    </div>
  );
}
