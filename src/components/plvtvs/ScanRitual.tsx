'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { getAudioEngine } from '@/lib/plvtvs/audioEngine';

const FaceScanner = dynamic(() => import('./FaceScanner'), { ssr: false });

interface ScanRitualProps {
  active: boolean;
  onComplete: (success: boolean, bioHash?: string) => void;
  seedHint?: string;
}

const SCAN_LINES = [
  '> [LOAD] Localizing biological identity... Done.',
  '> [LOAD] Mapping skeletal vectors... SUCCESS',
  '> [LOAD] Initializing bio-metric sync protocol...',
  '> [LOAD] Capturing 468-point facial landmark mesh...',
  '> [LOAD] Translating biological consciousness to Web3 node...',
  '> [LOAD] Generating sovereign soul hash...',
  '> [LOAD] Establishing secure tunnel with Base RPC Node...',
  '> [LOAD] Encapsulating digital soul into PLVTVS core...',
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
  const [bioHash, setBioHash] = useState<string | null>(null);
  const [useRealFace, setUseRealFace] = useState(true);
  const completedRef = useRef(false);
  const logTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef(0);

  // ============================================================
  // Simulated progress (used when camera unavailable)
  // ============================================================
  useEffect(() => {
    if (!active || useRealFace) return;
    completedRef.current = false;
    setScanning(true);
    setProgress(0);
    setLogs([]);
    progressRef.current = 0;
    const engine = getAudioEngine();
    engine.init();
    engine.resume();
    engine.playClick();
    engine.setPhase('ritual');

    const interval = setInterval(() => {
      const p = Math.min(100, progressRef.current + Math.random() * 3.5 + 1.5);
      progressRef.current = p;
      setProgress(p);
      if (Math.random() > 0.5) engine.playCodeTick();

      if (p >= 100 && !completedRef.current) {
        completedRef.current = true;
        clearInterval(interval);
        triggerComplete();
      }
    }, 120);

    streamLogs();

    return () => {
      clearInterval(interval);
      if (logTimerRef.current) clearTimeout(logTimerRef.current);
    };
  }, [active, useRealFace]);

  // ============================================================
  // Real face scan mode — listen to FaceScanner progress
  // ============================================================
  useEffect(() => {
    if (!active || !useRealFace) return;
    completedRef.current = false;
    setScanning(true);
    setProgress(0);
    setLogs([]);
    progressRef.current = 0;
    const engine = getAudioEngine();
    engine.init();
    engine.resume();
    engine.playClick();
    engine.setPhase('ritual');

    streamLogs();

    return () => {
      if (logTimerRef.current) clearTimeout(logTimerRef.current);
    };
  }, [active, useRealFace]);

  // ============================================================
  // Stream log lines
  // ============================================================
  const streamLogs = () => {
    let logIdx = 0;
    const streamLog = () => {
      if (logIdx < SCAN_LINES.length) {
        setLogs((prev) => [...prev, SCAN_LINES[logIdx]]);
        logIdx++;
        logTimerRef.current = setTimeout(streamLog, 380 + Math.random() * 320);
      }
    };
    streamLog();
  };

  // ============================================================
  // Handle progress from FaceScanner
  // ============================================================
  const handleFaceProgress = useCallback((pct: number) => {
    progressRef.current = pct;
    setProgress(pct);
    if (Math.random() > 0.6) getAudioEngine().playCodeTick();
    if (pct >= 100 && !completedRef.current) {
      completedRef.current = true;
      triggerComplete();
    }
  }, []);

  const handleFaceHash = useCallback((hash: string) => {
    setBioHash(hash);
  }, []);

  // ============================================================
  // Completion (shared between real + simulated modes)
  // ============================================================
  const triggerComplete = () => {
    setFlash(true);
    getAudioEngine().playQuantumThud();
    setLogs((prev) => [
      ...prev,
      '[SUCCESS] Biological Soul Encapsulated.',
      '[OK] Quantum Sync Bridge: ESTABLISHED.',
      '[OK] Avatar forked into Base Layer-2.',
      bioHash ? `[HASH] Bio-signature: ${bioHash}` : '',
    ].filter(Boolean));
    setTimeout(() => {
      setFlash(false);
      getAudioEngine().playSuccess();
      onComplete(true, bioHash || undefined);
    }, 1200);
  };

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black flex flex-col items-center justify-center overflow-hidden">
      {/* White flash overlay */}
      {flash && (
        <div className="absolute inset-0 bg-white z-50 animate-[cyber-flicker_0.4s_ease-out]" />
      )}

      {/* Subtle grid */}
      <div className="absolute inset-0 cyber-grid-bg opacity-40" />

      {/* Real face scanner (camera + MediaPipe overlay) */}
      {useRealFace && (
        <FaceScanner
          active={active}
          onFaceHash={handleFaceHash}
          onProgress={handleFaceProgress}
        />
      )}

      {/* Crosshair targeting (only in simulated mode) */}
      {!useRealFace && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg width="640" height="640" viewBox="0 0 640 640" className="opacity-70">
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
            <line x1="0" y1="320" x2="640" y2="320" stroke="#00FFCC" strokeWidth="0.5" opacity="0.4" strokeDasharray="2 4" />
            <line x1="320" y1="0" x2="320" y2="640" stroke="#00FFCC" strokeWidth="0.5" opacity="0.4" strokeDasharray="2 4" />
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
            <rect x="180" y="180" width="280" height="280" fill="none" stroke="#00FFCC" strokeWidth="1" opacity="0.7" />
          </svg>
          <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00FFCC] to-transparent cyber-scan-line shadow-[0_0_24px_rgba(0,255,204,0.8)]" />
        </div>
      )}

      {/* Central content */}
      <div className="relative z-10 w-full max-w-2xl px-3 sm:px-6 flex flex-col items-center pointer-events-none">
        <div className="cyber-mono text-xs text-[#00FFCC] tracking-[0.4em] mb-2 cyber-flicker">
          PLVTVS.core // BIO-METRIC SYNC
        </div>
        <h2 className="cyber-mono text-lg sm:text-2xl md:text-3xl font-bold text-white text-center mb-1">
          ENCAPSULATING BIOLOGICAL SOUL
        </h2>
        <p className="cyber-mono text-[10px] text-[#666] tracking-[0.3em] mb-8">
          {useRealFace ? 'ALIGN FACE WITH CAMERA · HOLD STEADY' : 'PLEASE HOLD IDENTITY STEADY'}
        </p>

        {/* Progress bar */}
        <div className="w-full max-w-md mb-3 pointer-events-auto">
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
        <div className="w-full max-w-md h-40 bg-black/80 border border-[#1a1a1a] p-3 cyber-mono text-[11px] text-[#00FF66] overflow-hidden relative pointer-events-auto">
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
                  : log.startsWith('[HASH]')
                  ? 'text-[#0066FF] break-all'
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

        {/* Toggle: real face vs simulated */}
        <div className="mt-6 pointer-events-auto flex items-center gap-3">
          <button
            onClick={() => setUseRealFace(!useRealFace)}
            className="cyber-mono text-[9px] text-[#666] hover:text-[#00FFCC] border border-[#1a1a1a] hover:border-[#00FFCC] px-3 py-1.5"
          >
            {useRealFace ? '◉ FACE MESH MODE' : '○ SIMULATION MODE'}
          </button>
          <span className="cyber-mono text-[9px] text-[#444]">
            {useRealFace ? '// CAMERA + MEDIAPIPE 468-LANDMARK' : '// NO CAMERA REQUIRED'}
          </span>
        </div>

        <div className="cyber-mono text-[10px] text-[#444] tracking-[0.2em] mt-4">
          {'// DO NOT CLOSE THIS WINDOW DURING ENCAPSULATION'}
        </div>
      </div>
    </div>
  );
}
