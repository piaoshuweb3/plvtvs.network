'use client';

import { useCallback, useEffect, useState } from 'react';
import HeroSection from '@/components/plvtvs/HeroSection';
import ScanRitual from '@/components/plvtvs/ScanRitual';
import WealthScenes from '@/components/plvtvs/WealthScenes';
import BeyondAgents from '@/components/plvtvs/BeyondAgents';
import FinalCTA from '@/components/plvtvs/FinalCTA';
import Dashboard from '@/components/plvtvs/Dashboard';
import ErrorBoundary from '@/components/plvtvs/ErrorBoundary';
import { getAudioEngine } from '@/lib/plvtvs/audioEngine';
import { useAuthStore } from '@/lib/plvtvs/auth';

type AppPhase = 'void' | 'scanning' | 'deployed' | 'dashboard';

export default function Home() {
  const [phase, setPhase] = useState<AppPhase>('void');
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [avatarSeed, setAvatarSeed] = useState<string>('guest-initializing');
  const authUser = useAuthStore((s) => s.user);

  // Sync avatarSeed from sessionStorage after mount (avoids SSR mismatch)
  // This is a valid sync-with-external-state pattern; rule disabled for this case.
  useEffect(() => {
    const stored = sessionStorage.getItem('plvtvs-seed');
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAvatarSeed(stored);
    } else {
      const guest =
        'guest-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
      sessionStorage.setItem('plvtvs-seed', guest);
      setAvatarSeed(guest);
    }
  }, []);

  // When user authenticates, switch avatar seed to their wallet
  useEffect(() => {
    if (authUser?.walletAddress) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAvatarSeed(authUser.walletAddress);
      sessionStorage.setItem('plvtvs-seed', authUser.walletAddress);
    }
  }, [authUser?.walletAddress]);

  const handleDeploy = useCallback(() => {
    setPhase('scanning');
  }, []);

  const handleScanComplete = useCallback(
    (success: boolean, bioHash?: string) => {
      if (success) {
        // If face scan produced a bio-hash, use it as the avatar seed
        if (bioHash) {
          setAvatarSeed(bioHash);
          sessionStorage.setItem('plvtvs-seed', bioHash);
        }
        setPhase('deployed');
        // Smooth scroll down to the revelation section
        setTimeout(() => {
          const revelation = document.getElementById('revelation');
          if (revelation) revelation.scrollIntoView({ behavior: 'smooth' });
        }, 400);
        // Set audio phase to revelation
        const engine = getAudioEngine();
        engine.setPhase('revelation');
      }
    },
    []
  );

  const handleEnterDashboard = useCallback(() => {
    setPhase('dashboard');
    const engine = getAudioEngine();
    engine.setPhase('dashboard');
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  }, []);

  const handleJackOut = useCallback(() => {
    setPhase('void');
    const engine = getAudioEngine();
    engine.setPhase('void');
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  }, []);

  const handleToggleAudio = useCallback(() => {
    const engine = getAudioEngine();
    engine.init();
    engine.resume();
    const newMuted = audioEnabled;
    setAudioEnabled(!newMuted);
    engine.setMuted(newMuted);
    if (!newMuted) {
      engine.setPhase(phase === 'void' || phase === 'scanning' ? 'void' : 'revelation');
    }
  }, [audioEnabled, phase]);

  // Phase-based audio
  useEffect(() => {
    if (!audioEnabled) return;
    const engine = getAudioEngine();
    if (phase === 'void') engine.setPhase('void');
    else if (phase === 'scanning') engine.setPhase('ritual');
    else if (phase === 'deployed') engine.setPhase('revelation');
    else if (phase === 'dashboard') engine.setPhase('dashboard');
  }, [phase, audioEnabled]);

  if (phase === 'dashboard') {
    return <Dashboard avatarSeed={avatarSeed} onJackOut={handleJackOut} />;
  }

  return (
    <main className="bg-black text-white min-h-screen">
      <ErrorBoundary>
        <HeroSection
          onDeploy={handleDeploy}
          audioEnabled={audioEnabled}
          onToggleAudio={handleToggleAudio}
          phase={phase === 'deployed' ? 'deployed' : 'void'}
        />
      </ErrorBoundary>

      <BeyondAgents />

      <WealthScenes />

      <FinalCTA avatarSeed={avatarSeed} onEnterDashboard={handleEnterDashboard} />

      {/* Scan Ritual overlay (Phase 2) - only mount when scanning */}
      {phase === 'scanning' && (
        <ScanRitual
          active={phase === 'scanning'}
          onComplete={handleScanComplete}
          seedHint={avatarSeed}
        />
      )}
    </main>
  );
}
