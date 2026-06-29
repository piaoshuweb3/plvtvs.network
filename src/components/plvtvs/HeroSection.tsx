'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { getAudioEngine } from '@/lib/plvtvs/audioEngine';
import WalletButton from './WalletButton';

const ParticleAvatar = dynamic(() => import('./ParticleAvatar'), { ssr: false });

interface HeroSectionProps {
  onDeploy: () => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  phase: 'void' | 'deployed';
}

export default function HeroSection({
  onDeploy,
  audioEnabled,
  onToggleAudio,
  phase,
}: HeroSectionProps) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [booted, setBooted] = useState(false);
  const [bootStep, setBootStep] = useState(0);
  const [dataRain, setDataRain] = useState<
    { duration: number; delay: number; bits: string[] }[]
  >([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize data rain client-side only (avoids hydration mismatch)
  useEffect(() => {
    const cols = Array.from({ length: 24 }).map(() => ({
      duration: 6 + Math.random() * 8,
      delay: Math.random() * 6,
      bits: Array.from({ length: 18 }).map(() => (Math.random() > 0.5 ? '1' : '0')),
    }));
    setDataRain(cols);
  }, []);

  // Boot sequence
  useEffect(() => {
    const steps = [
      '> Localizing biological identity...',
      '> Localizing biological identity... Done.',
      '> Establishing Base RPC Node tunnel...',
      '> Establishing Base RPC Node tunnel... Done.',
      '> Loading PLVTVS Core v2.0.26...',
    ];
    let i = 0;
    const interval = setInterval(() => {
      setBootStep(i);
      i++;
      if (i >= steps.length) {
        clearInterval(interval);
        setTimeout(() => setBooted(true), 400);
      }
    }, 350);
    return () => clearInterval(interval);
  }, []);

  // Mouse tracking for 3D particle field
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -((e.clientY / window.innerHeight) * 2 - 1);
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  const handleDeployClick = () => {
    const engine = getAudioEngine();
    engine.init();
    engine.resume();
    if (!audioEnabled) {
      // first click also enables audio
      onToggleAudio();
    }
    engine.playClick();
    setTimeout(() => onDeploy(), 200);
  };

  const bootLines = [
    '> Localizing biological identity...',
    '> Localizing biological identity... Done.',
    '> Establishing Base RPC Node tunnel...',
    '> Establishing Base RPC Node tunnel... Done.',
    '> Loading PLVTVS Core v2.0.26...',
  ];

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen w-full overflow-hidden flex flex-col"
      style={{ background: '#000000' }}
    >
      {/* Background grid */}
      <div className="absolute inset-0 cyber-grid-bg opacity-30 pointer-events-none" />

      {/* Data rain (subtle) - rendered client-only to avoid hydration mismatch */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30" suppressHydrationWarning>
        {dataRain.map((col, i) => (
          <div
            key={i}
            className="absolute top-0 cyber-mono text-[10px] text-[#00FFCC]"
            style={{
              left: `${(i * 4.2) % 100}%`,
              animation: `cyber-data-rain ${col.duration}s linear ${col.delay}s infinite`,
            }}
          >
            {col.bits.map((bit, j) => (
              <div key={j} suppressHydrationWarning>{bit}</div>
            ))}
          </div>
        ))}
      </div>

      {/* Boot sequence overlay */}
      {!booted && (
        <div className="absolute inset-0 z-50 bg-black flex flex-col items-start justify-center px-8 md:px-16">
          <div className="cyber-mono text-xs md:text-sm text-[#00FF66] space-y-2 max-w-md">
            {bootLines.slice(0, bootStep + 1).map((line, i) => (
              <div key={i} className="cyber-flicker">
                {line}
              </div>
            ))}
            <div className="cyber-blink">_</div>
          </div>
        </div>
      )}

      {/* Top NAV bar */}
      <nav className="relative z-20 flex items-center justify-between gap-2 px-3 sm:px-6 md:px-10 py-3 sm:py-5">
        <div className="cyber-mono text-base sm:text-lg md:text-xl font-black tracking-[0.2em] text-[#FFCC00] cyber-text-glow-gold flex-shrink-0">
          PLVTVS
        </div>
        <div className="hidden lg:flex items-center gap-6 cyber-mono text-[10px] text-[#666] tracking-[0.3em]">
          <span className="flex items-center gap-1">
            <span className="cyber-pulse inline-block w-1.5 h-1.5 rounded-full bg-[#00FFCC]" />
            SYSTEM STATUS: OPERATIONAL
          </span>
          <span>IDENTITY SYNC: 99.8%</span>
          <span>BLOCK: #18,924,402</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <button
            onClick={onToggleAudio}
            className="cyber-mono text-[9px] sm:text-[10px] text-[#888] hover:text-[#00FFCC] transition-colors flex items-center gap-1"
            aria-label="Toggle audio"
          >
            {audioEnabled ? (
              <>
                <span className="flex items-end gap-px h-3">
                  <span className="w-px bg-[#00FFCC]" style={{ height: '30%', animation: 'cyber-pulse 0.6s infinite' }} />
                  <span className="w-px bg-[#00FFCC]" style={{ height: '70%', animation: 'cyber-pulse 0.4s infinite' }} />
                  <span className="w-px bg-[#00FFCC]" style={{ height: '50%', animation: 'cyber-pulse 0.8s infinite' }} />
                  <span className="w-px bg-[#00FFCC]" style={{ height: '90%', animation: 'cyber-pulse 0.5s infinite' }} />
                </span>
                <span className="hidden sm:inline">AUDIO</span>
              </>
            ) : (
              <span className="hidden sm:inline">MUTED</span>
            )}
          </button>
          <WalletButton />
        </div>
      </nav>

      {/* Main hero content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-3 sm:px-6 -mt-5 sm:-mt-10">
        {/* 3D Particle Avatar */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-full h-full max-w-3xl max-h-3xl opacity-90">
            <ParticleAvatar exploded={phase === 'deployed'} mousePos={mousePos} />
          </div>
        </div>

        {/* Center content overlay */}
        <div className="relative z-20 flex flex-col items-center text-center max-w-3xl px-2">
          {/* Subtitle above title */}
          <div className="cyber-mono text-[8px] sm:text-xs text-[#00FFCC] tracking-[0.3em] sm:tracking-[0.5em] mb-4 sm:mb-8 cyber-flicker">
            QUANTUM MONETIZATION CORE · V: 2.0.26
          </div>

          {/* Main H1 */}
          <h1 className="cyber-mono text-2xl sm:text-4xl md:text-6xl lg:text-7xl font-black text-white leading-[1.1] mb-4 sm:mb-6 cyber-text-glow-cyan">
            YOUR soul IN
            <br />
            THE WIRELESS SHELL.
          </h1>

          {/* H2 */}
          <p className="cyber-mono text-[10px] sm:text-sm md:text-base text-[#888] leading-relaxed max-w-xl mb-3">
            The sovereign avatar engineered to intercept, adapt, and monetize
            network value streams autonomously.
          </p>
          <p className="cyber-mono text-sm sm:text-base md:text-lg text-[#00FFCC] tracking-[0.2em] sm:tracking-[0.3em] mb-6 sm:mb-10 cyber-text-glow-cyan">
            BEYOND AGENTS.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center w-full sm:w-auto">
            <button onClick={handleDeployClick} className="cyber-btn cyber-btn-gold w-full sm:w-auto sm:min-w-[260px] !text-[9px] sm:!text-[13px]">
              ▶ DEPLOY YOUR AVATAR
            </button>
            <a href="#beyond-agents" className="cyber-btn w-full sm:w-auto sm:min-w-[260px] !text-[9px] sm:!text-[13px]">
              READ THE PROTOCOL
            </a>
          </div>

          {/* Status hint */}
          <div className="mt-6 sm:mt-12 cyber-mono text-[8px] sm:text-xs text-[#444] tracking-[0.2em] sm:tracking-[0.3em] cyber-flicker text-center">
            HUMAN PRESENCE DETECTED · NETWORK CAPACITY: UNLIMITED
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative z-20 flex items-center justify-between px-3 sm:px-6 md:px-10 py-3 sm:py-5 cyber-mono text-[8px] sm:text-[10px] text-[#444] tracking-[0.2em]">
        <span className="truncate">V: 2.0.26 // QUANTUM MONETIZATION CORE</span>
        <a href="#revelation" className="flex items-center gap-2 hover:text-[#00FFCC] transition-colors flex-shrink-0">
          <span className="hidden sm:inline">SCROLL</span>
          <span className="cyber-blink">▽</span>
        </a>
      </div>
    </section>
  );
}
