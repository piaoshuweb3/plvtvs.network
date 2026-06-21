'use client';

import { useEffect, useRef, useState } from 'react';
import { getAudioEngine } from '@/lib/plvtvs/audioEngine';

interface ScanRitualProps {
  active: boolean;
  onComplete: (success: boolean) => void;
  seedHint?: string;
}

const SCAN_LINES = [
  '> [LOAD] Localizing biological identity... Done.',
  '> [LOAD] Mapping skeletal vectors... SUCCESS',
  '> [LOAD] Initializing bio-metric sync protocol...',
  '> [LOAD] Translating biological consciousness to Web3 node...',
  '> [LOAD] Generating sovereign ghost hash...',
  '> [LOAD] Establishing secure tunnel with Base RPC Node...',
  '> [LOAD] Encapsulating digital ghost into PLVTVS core...',
];

export default function ScanRitual({
  active,
  onComplete,
  seedHint = 'guest-unknown',
}: ScanRitualProps) {
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [flash, setFlash] = useState(false);
  const [scanning, setScanning] = useState(false);
  const completedRef = useRef(false);
  const logTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) return;

    // Reset for new run
    completedRef.current = false;
    setScanning(true);
    setProgress(0);
    setLogs([]);
    const engine = getAudioEngine();
    engine.init();
    engine.resume();
    engine.playClick();
    engine.setPhase('ritual');

    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 3.5 + 1.5;
      if (p >= 100) p = 100;
      setProgress(p);
      // Tick sound
      if (Math.random() > 0.5) engine.playCodeTick();

      if (p >= 100 && !completedRef.current) {
        completedRef.current = true;
        clearInterval(interval);
        // White flash
        setFlash(true);
        engine.playQuantumThud();
        setLogs((prev) => [
          ...prev,
          '[SUCCESS] Biological Ghost Encapsulated.',
          '[OK] Quantum Sync Bridge: ESTABLISHED.',
          '[OK] Avatar forked into Base Layer-2.',
        ]);
        setTimeout(() => {
          setFlash(false);
          engine.playSuccess();
          onComplete(true);
        }, 1200);
      }
    }, 120);

    // Stream logs
    let logIdx = 0;
    const streamLog = () => {
      if (logIdx < SCAN_LINES.length) {
        setLogs((prev) => [...prev, SCAN_LINES[logIdx]]);
        logIdx++;
        logTimerRef.current = setTimeout(streamLog, 380 + Math.random() * 320);
      }
    };
    streamLog();

    return () => {
      clearInterval(interval);
      if (logTimerRef.current) clearTimeout(logTimerRef.current);
    };
  }, [active, onComplete, seedHint]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black flex flex-col items-center justify-center overflow-hidden">
      {/* White flash overlay */}
      {flash && (
        <div className="absolute inset-0 bg-white z-50 animate-[cyber-flicker_0.4s_ease-out]" />
      )}

      {/* Subtle grid */}
      <div className="absolute inset-0 cyber-grid-bg opacity-40" />

      {/* Crosshair targeting */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <svg width="640" height="640" viewBox="0 0 640 640" className="opacity-70">
          {/* Outer ring */}
          <circle
            cx="320"
            cy="320"
            r="280"
            fill="none"
            stroke="#00FFCC"
            strokeWidth="1"
            strokeDasharray="4 8"
            opacity="0.6"
            className="cyber-rotate-slow"
            style={{ transformOrigin: '320px 320px' }}
          />
          <circle
            cx="320"
            cy="320"
            r="200"
            fill="none"
            stroke="#0066FF"
            strokeWidth="1"
            strokeDasharray="2 6"
            opacity="0.5"
            className="cyber-rotate-reverse"
            style={{ transformOrigin: '320px 320px' }}
          />
          {/* Crosshair lines */}
          <line x1="0" y1="320" x2="640" y2="320" stroke="#00FFCC" strokeWidth="0.5" opacity="0.4" strokeDasharray="2 4" />
          <line x1="320" y1="0" x2="320" y2="640" stroke="#00FFCC" strokeWidth="0.5" opacity="0.4" strokeDasharray="2 4" />
          {/* Corner brackets */}
          {[
            [60, 60, 1, 1],
            [580, 60, -1, 1],
            [60, 580, 1, -1],
            [580, 580, -1, -1],
          ].map(([x, y, dx, dy], i) => (
            <g key={i}>
              <line x1={x} y1={y} x2={x + 30 * dx} y2={y} stroke="#00FFCC" strokeWidth="2" />
              <line x1={x} y1={y} x2={x} y2={y + 30 * dy} stroke="#00FFCC" strokeWidth="2" />
            </g>
          ))}
          {/* Central scan window */}
          <rect x="180" y="180" width="280" height="280" fill="none" stroke="#00FFCC" strokeWidth="1" opacity="0.7" />
        </svg>
      </div>

      {/* Horizontal scan laser line */}
      <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00FFCC] to-transparent cyber-scan-line shadow-[0_0_24px_rgba(0,255,204,0.8)]" />

      {/* Central content */}
      <div className="relative z-10 w-full max-w-2xl px-6 flex flex-col items-center">
        <div className="cyber-mono text-xs text-[#00FFCC] tracking-[0.4em] mb-2 cyber-flicker">
          PLVTVS.core // BIO-METRIC SYNC
        </div>
        <h2 className="cyber-mono text-2xl md:text-3xl font-bold text-white text-center mb-1">
          ENCAPSULATING BIOLOGICAL GHOST
        </h2>
        <p className="cyber-mono text-[10px] text-[#666] tracking-[0.3em] mb-8">
          PLEASE HOLD IDENTITY STEADY
        </p>

        {/* Progress bar */}
        <div className="w-full max-w-md mb-3">
          <div className="flex justify-between cyber-mono text-xs mb-2">
            <span className="text-[#00FFCC]">CONSCIOUSNESS UPLOAD</span>
            <span className="text-white">{progress.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-[#0A0A0A] border border-[#1a1a1a] relative overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 transition-all duration-150"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #0066FF, #00FFCC)',
                boxShadow: '0 0 12px #00FFCC',
              }}
            />
          </div>
        </div>

        {/* Log stream */}
        <div className="w-full max-w-md h-40 bg-black/80 border border-[#1a1a1a] p-3 cyber-mono text-[11px] text-[#00FF66] overflow-hidden relative">
          <div className="absolute top-0 right-0 px-2 py-1 text-[9px] text-[#00FFCC] border-l border-b border-[#1a1a1a] bg-black/60">
            STDOUT
          </div>
          <div className="overflow-y-auto h-full pr-1">
            {logs.map((log, i) => {
              if (typeof log !== 'string') return null;
              const className =
                log.startsWith('[SUCCESS]')
                  ? 'text-[#00FFCC] cyber-text-glow-cyan'
                  : log.startsWith('[OK]')
                  ? 'text-[#FFCC00] cyber-text-glow-gold'
                  : 'text-[#00FF66]';
              return (
                <div key={i} className={className}>
                  {log}
                </div>
              );
            })}
            {scanning && (
              <div className="text-white">
                <span className="cyber-blink">▊</span>
              </div>
            )}
          </div>
        </div>

        <div className="cyber-mono text-[10px] text-[#444] tracking-[0.2em] mt-6">
          {'// DO NOT CLOSE THIS WINDOW DURING ENCAPSULATION'}
        </div>
      </div>
    </div>
  );
}
