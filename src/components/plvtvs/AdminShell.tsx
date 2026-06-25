'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useAuthStore } from '@/lib/plvtvs/auth';
import WalletButton from './WalletButton';
import { getAudioEngine } from '@/lib/plvtvs/audioEngine';

interface AdminShellProps {
  children: React.ReactNode;
  requiredRole: 'OPERATOR' | 'SUPER_ADMIN';
  title: string;
  subtitle?: string;
}

export default function AdminShell({
  children,
  requiredRole,
  title,
  subtitle,
}: AdminShellProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { isConnected: walletConnected } = useAccount();
  const [booted, setBooted] = useState(false);
  const [bootStep, setBootStep] = useState(0);

  // Boot sequence
  useEffect(() => {
    const lines = [
      '> Verifying admin credentials...',
      '> Loading admin kernel...',
      '> Mounting privileged subsystems...',
    ];
    let i = 0;
    const interval = setInterval(() => {
      setBootStep(i);
      i++;
      if (i >= lines.length) {
        clearInterval(interval);
        setTimeout(() => setBooted(true), 300);
      }
    }, 250);
    return () => clearInterval(interval);
  }, []);

  // Auto-redirect ONLY if no wallet is connected AND user hasn't authenticated
  // after the boot sequence + 15s grace period (gives time for wagmi auto-reconnect).
  // Once a wallet is connected (even if not admin), do NOT auto-redirect —
  // show the appropriate access-denied UI so the user can choose what to do.
  useEffect(() => {
    if (!walletConnected && !isAuthenticated && booted) {
      const t = setTimeout(() => {
        // Only redirect if still unauthenticated
        const stillUnauth = !useAuthStore.getState().isAuthenticated;
        if (stillUnauth) router.push('/');
      }, 15000);
      return () => clearTimeout(t);
    }
  }, [walletConnected, isAuthenticated, booted, router]);

  // Check role
  const hasAccess =
    user &&
    (requiredRole === 'OPERATOR'
      ? user.role === 'OPERATOR' || user.role === 'SUPER_ADMIN'
      : user.role === 'SUPER_ADMIN');

  if (!booted) {
    const lines = [
      '> Verifying admin credentials...',
      '> Loading admin kernel...',
      '> Mounting privileged subsystems...',
    ];
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-8">
        <div className="cyber-mono text-xs text-[#00FF66] space-y-2 max-w-md">
          {lines.slice(0, bootStep + 1).map((line, i) => (
            <div key={i} className="cyber-flicker">
              {line}
            </div>
          ))}
          <div className="cyber-blink">_</div>
        </div>
      </div>
    );
  }

  if (!walletConnected || !user) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-8 text-center">
        <div className="cyber-mono text-xs text-[#FFCC00] tracking-[0.4em] mb-4 cyber-flicker">
          {'// ADMIN ACCESS REQUIRED'}
        </div>
        <h1 className="cyber-mono text-2xl text-white mb-4">
          CONNECT YOUR ADMIN WALLET
        </h1>
        <p className="cyber-mono text-sm text-[#666] mb-8 max-w-md">
          Administrative access requires wallet authentication. Connect an
          operator or super-admin wallet to continue.
        </p>
        <WalletButton />
        <button
          onClick={() => router.push('/')}
          className="cyber-mono text-[10px] text-[#666] hover:text-[#00FFCC] mt-6"
        >
          ← BACK TO PLVTVS.ONE
        </button>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-8 text-center">
        <div className="cyber-mono text-xs text-[#ff4444] tracking-[0.4em] mb-4 cyber-flicker">
          {'// ACCESS DENIED'}
        </div>
        <h1 className="cyber-mono text-2xl text-white mb-4">
          INSUFFICIENT PRIVILEGES
        </h1>
        <p className="cyber-mono text-sm text-[#666] mb-2 max-w-md">
          Your ghost does not have <span className="text-[#FFCC00]">{requiredRole}</span> clearance.
        </p>
        <p className="cyber-mono text-[10px] text-[#444] mb-8">
          Connected: {user.walletAddress.slice(0, 10)}...{user.walletAddress.slice(-4)} · Role: {user.role}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="cyber-btn !py-2 !px-4 !text-[10px]"
          >
            GO TO USER DASHBOARD
          </button>
          <button
            onClick={() => router.push('/')}
            className="cyber-btn cyber-btn-blue !py-2 !px-4 !text-[10px]"
          >
            BACK TO HOME
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top status bar */}
      <div className="cyber-panel m-4 p-4 flex flex-col md:flex-row gap-4 md:items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              getAudioEngine().playClick();
              router.push('/');
            }}
            className="cyber-mono text-lg font-black text-[#FFCC00] cyber-text-glow-gold tracking-[0.2em] hover:opacity-80"
          >
            PLVTVS<span className="text-[#666] text-xs">.admin</span>
          </button>
          <span
            className="cyber-mono text-[10px] px-2 py-0.5 border"
            style={{
              color: user.role === 'SUPER_ADMIN' ? '#FFCC00' : '#0066FF',
              borderColor: user.role === 'SUPER_ADMIN' ? '#FFCC00' : '#0066FF',
            }}
          >
            {user.role}
          </span>
          <span className="cyber-mono text-[10px] text-[#00FFCC] cyber-pulse">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00FFCC] mr-1" />
            SECURE
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="cyber-mono text-[10px] text-[#888] hover:text-[#00FFCC] transition-colors"
          >
            USER VIEW →
          </button>
          <WalletButton compact />
        </div>
      </div>

      {/* Page header */}
      <div className="px-4 md:px-6 mb-4">
        <div className="cyber-mono text-xs text-[#FFCC00] tracking-[0.4em] mb-2 cyber-flicker">
          {'// ADMIN CONSOLE'}
        </div>
        <h1 className="cyber-mono text-2xl md:text-3xl font-black text-white mb-1">
          {title}
        </h1>
        {subtitle && (
          <p className="cyber-mono text-xs text-[#666]">{subtitle}</p>
        )}
      </div>

      {/* Page body */}
      <div className="px-4 md:px-6 pb-8">{children}</div>
    </div>
  );
}
