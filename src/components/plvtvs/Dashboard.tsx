'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io as socketIo, type Socket } from 'socket.io-client';
import { getAudioEngine } from '@/lib/plvtvs/audioEngine';
import PixelAvatar from './PixelAvatar';
import SubscriptionPanel from './SubscriptionPanel';

interface DashboardProps {
  avatarSeed: string;
  onJackOut: () => void;
}

// === MODULE 1: Cyber Ghost Status ===
function CyberGhostModule({ seed }: { seed: string }) {
  const [echoNodes, setEchoNodes] = useState(0);
  const targetNodes = 1420;

  useEffect(() => {
    let n = 0;
    const interval = setInterval(() => {
      n += Math.ceil((targetNodes - n) * 0.06);
      if (n >= targetNodes) {
        n = targetNodes;
        clearInterval(interval);
      }
      setEchoNodes(n);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="cyber-panel p-5 relative">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[#00FFCC]">◉</span>
          <span className="cyber-mono text-[10px] tracking-[0.2em] text-[#888]">
            MODULE 01 // THE CYBER GHOST
          </span>
        </div>
        <span className="cyber-mono text-[9px] text-[#00FFCC] border border-[#00FFCC] px-1.5 py-0.5">
          OPERATIONAL
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          {/* Radar disk behind avatar */}
          <svg
            className="absolute inset-0 cyber-rotate-slow"
            style={{ width: '96px', height: '96px' }}
            viewBox="0 0 96 96"
          >
            <circle cx="48" cy="48" r="46" fill="none" stroke="#00FFCC" strokeWidth="0.5" opacity="0.3" />
            <circle cx="48" cy="48" r="32" fill="none" stroke="#00FFCC" strokeWidth="0.5" opacity="0.2" />
            <circle cx="48" cy="48" r="18" fill="none" stroke="#00FFCC" strokeWidth="0.5" opacity="0.2" />
            <line x1="48" y1="2" x2="48" y2="94" stroke="#00FFCC" strokeWidth="0.4" opacity="0.3" />
            <line x1="2" y1="48" x2="94" y2="48" stroke="#00FFCC" strokeWidth="0.4" opacity="0.3" />
            <line x1="14" y1="14" x2="82" y2="82" stroke="#00FFCC" strokeWidth="0.3" opacity="0.2" />
            <line x1="82" y1="14" x2="14" y2="82" stroke="#00FFCC" strokeWidth="0.3" opacity="0.2" />
          </svg>
          <PixelAvatar seed={seed} size={96} />
        </div>

        <div className="flex-1 space-y-2">
          <div>
            <div className="cyber-mono text-[9px] text-[#444] tracking-wider">GHOST HASH</div>
            <div className="cyber-mono text-sm text-[#00FFCC] cyber-text-glow-cyan">
              {seed.slice(0, 10)}...{seed.slice(-4)}
            </div>
          </div>
          <div>
            <div className="cyber-mono text-[9px] text-[#444] tracking-wider">ACTIVE ECHO NODES</div>
            <div className="cyber-mono text-2xl font-bold text-white">
              {echoNodes.toLocaleString()}<span className="text-[#444] text-sm"> / 2,000</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pulse rings */}
      <div className="absolute top-12 left-12 w-16 h-16 pointer-events-none">
        <div className="absolute inset-0 border border-[#00FFCC]/40 rounded-full cyber-pulse-ring" />
        <div className="absolute inset-0 border border-[#00FFCC]/40 rounded-full cyber-pulse-ring" style={{ animationDelay: '0.8s' }} />
      </div>
    </div>
  );
}

// === MODULE 2: Real-Time Valuation ===
function RealTimeValuation({ active }: { active: boolean }) {
  const ethRef = useRef<HTMLDivElement>(null);
  const usdRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentData = useRef({ eth: 0.428105, usd: 1520.12 });

  useEffect(() => {
    if (!active) return;

    const dataInterval = setInterval(() => {
      const ethInc = Math.random() * 0.000015;
      currentData.current.eth += ethInc;
      currentData.current.usd += ethInc * 3550;
    }, 800);

    let raf: number;
    const updateDisplay = () => {
      if (ethRef.current && usdRef.current) {
        const glitchSuffix = Math.floor(Math.random() * 900 + 100);
        const baseEthStr = currentData.current.eth.toFixed(5);
        const baseUsdStr = currentData.current.usd.toFixed(2);
        ethRef.current.innerHTML = `${baseEthStr}<span style="color:#00FFCC;font-size:0.8em">.${glitchSuffix}</span> ETH`;
        usdRef.current.innerText = `$ ${baseUsdStr}`;
      }
      raf = requestAnimationFrame(updateDisplay);
    };
    raf = requestAnimationFrame(updateDisplay);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    let waveTime = 0;
    const drawWave = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.lineWidth = 1.5;
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, '#0066FF');
      gradient.addColorStop(0.5, '#00FFCC');
      gradient.addColorStop(1, '#0066FF');
      ctx.strokeStyle = gradient;
      for (let x = 0; x < canvas.width; x++) {
        const y =
          canvas.height / 2 +
          Math.sin(x * 0.05 + waveTime) * 8 * Math.sin(x * 0.01) +
          (Math.random() - 0.5) * 2;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      waveTime += 0.15;
    };
    const waveInterval = setInterval(drawWave, 30);

    return () => {
      clearInterval(dataInterval);
      clearInterval(waveInterval);
      cancelAnimationFrame(raf);
    };
  }, [active]);

  return (
    <div className="cyber-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[#00FFCC]">≡</span>
          <span className="cyber-mono text-[10px] tracking-[0.2em] text-[#888]">
            MODULE 02 // REAL-TIME VALUATION
          </span>
        </div>
        <span className="cyber-mono text-[9px] text-[#00FFCC] border border-[#00FFCC] px-1.5 py-0.5 cyber-pulse">
          STREAMING
        </span>
      </div>

      <div className="mb-2">
        <div
          ref={ethRef}
          className="cyber-mono text-3xl md:text-4xl font-black text-white cyber-text-glow-cyan"
        >
          0.42810 ETH
        </div>
      </div>
      <div className="mb-4">
        <div ref={usdRef} className="cyber-mono text-base text-[#666]">
          $ 1520.12
        </div>
      </div>

      <div className="relative h-10 w-full">
        <canvas
          ref={canvasRef}
          width={500}
          height={40}
          className="w-full h-full"
        />
      </div>

      <div className="flex justify-between mt-3 cyber-mono text-[9px] text-[#444]">
        <span>NETWORK HARVESTING RANGE: MAXIMUM</span>
        <span>SYS_RATE: 99.4GB/S</span>
      </div>
    </div>
  );
}

// === MODULE 3: Active Sectors ===
function ActiveSectors({ onAdjust }: { onAdjust: () => void }) {
  const [social, setSocial] = useState(30);
  const [ecom, setEcom] = useState(35);
  const [crypto, setCrypto] = useState(35);

  const adjust = (sector: 'social' | 'ecom' | 'crypto', value: number) => {
    const total = social + ecom + crypto;
    const remaining = 100 - value;
    const others = total - (sector === 'social' ? social : sector === 'ecom' ? ecom : crypto);
    if (others === 0) return;
    const ratio = remaining / others;

    if (sector === 'social') {
      setSocial(value);
      setEcom(Math.floor(ecom * ratio));
      setCrypto(100 - value - Math.floor(ecom * ratio));
    } else if (sector === 'ecom') {
      setEcom(value);
      setSocial(Math.floor(social * ratio));
      setCrypto(100 - value - Math.floor(social * ratio));
    } else {
      setCrypto(value);
      setSocial(Math.floor(social * ratio));
      setEcom(100 - value - Math.floor(social * ratio));
    }
    onAdjust();
  };

  const sectors = [
    { id: 'social' as const, label: 'SOCIAL MATRIX', value: social, color: '#0066FF', efficiency: '78%' },
    { id: 'ecom' as const, label: 'ECOMMERCE BRIDGE', value: ecom, color: '#FFCC00', efficiency: '92%' },
    { id: 'crypto' as const, label: 'CRYPTO ARBITRAGE', value: crypto, color: '#00FFCC', efficiency: '64%' },
  ];

  return (
    <div className="cyber-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[#FFCC00]">⊞</span>
          <span className="cyber-mono text-[10px] tracking-[0.2em] text-[#888]">
            MODULE 03 // ACTIVE SECTORS
          </span>
        </div>
        <span className="cyber-mono text-[9px] text-[#666] border border-[#1a1a1a] px-1.5 py-0.5">
          DRAG TO ALLOCATE
        </span>
      </div>

      <div className="space-y-5">
        {sectors.map((s) => (
          <div key={s.id}>
            <div className="flex justify-between items-center mb-2">
              <span className="cyber-mono text-xs text-white">{s.label}</span>
              <span className="cyber-mono text-xs" style={{ color: s.color }}>
                {s.value}% · {s.efficiency} EFF
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={s.value}
              onChange={(e) => adjust(s.id, Number(e.target.value))}
              className="w-full h-2 appearance-none cursor-pointer bg-[#0A0A0A] border border-[#1a1a1a] cyber-slider"
              style={
                {
                  '--slider-color': s.color,
                  background: `linear-gradient(to right, ${s.color}66 0%, ${s.color}66 ${s.value}%, #0A0A0A ${s.value}%, #0A0A0A 100%)`,
                } as React.CSSProperties
              }
            />
          </div>
        ))}
      </div>

      <div className="mt-5 pt-3 border-t border-[#1a1a1a] flex justify-between cyber-mono text-[9px] text-[#444]">
        <span>TOTAL: 100%</span>
        <span>SYNCED ON BASE L2</span>
      </div>

      <style jsx>{`
        .cyber-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          background: var(--slider-color);
          border: 1px solid #000;
          cursor: pointer;
          box-shadow: 0 0 8px var(--slider-color);
        }
        .cyber-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          background: var(--slider-color);
          border: 1px solid #000;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

// === MODULE 4: Activity Logs Terminal (live from WebSocket service) ===

interface LiveLogEvent {
  id: string;
  sector: 'SOCIAL' | 'ECOM' | 'CRYPTO' | 'SYSTEM';
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  message: string;
  timestamp: string;
  source?: string;
}

// Fallback templates if WebSocket service is offline
const FALLBACK_LOG_TEMPLATES = [
  { sector: 'SOCIAL' as const, text: 'Spawning digital echo node #[ID]. Dispatched multi-threaded viral feed.' },
  { sector: 'SOCIAL' as const, text: 'Intercepting attention vector from Twitter/X API. Yielding ad-pool...' },
  { sector: 'ECOM' as const, text: 'Puppeteer cluster detected arbitrage discrepancy between upper/lower nodes.' },
  { sector: 'ECOM' as const, text: 'Shopify dynamic storefront cloned. Routing fulfillment automation.' },
  { sector: 'CRYPTO' as const, text: 'Mempool sniffer captured whale transaction on Base Layer-2 network.' },
  { sector: 'CRYPTO' as const, text: 'Executing flash-loan sandwich arbitrage via Aerodrome liquidity pool.' },
];

function ActivityLogs({ active }: { active: boolean }) {
  const [logs, setLogs] = useState<string[]>(() => [
    `[SYS_INIT] // PLVTVS.network Kernel Core v2.0.26 loaded.`,
    `[SYS_INIT] // Establishing secure tunnel with Base RPC Node... SUCCESS.`,
    `[SYS_INIT] // Account Abstraction Session Key: ACTIVE.`,
  ]);
  const [liveConnected, setLiveConnected] = useState(false);
  const [stats, setStats] = useState<{ totalLogs: number; activeClients: number } | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Format incoming WebSocket log events into display strings
  const formatLog = useCallback((ev: LiveLogEvent): string => {
    const time = new Date(ev.timestamp).toISOString().split('T')[1].slice(0, 8);
    return `[${time}] [${ev.sector}] > ${ev.message}`;
  }, []);

  // Fallback: simulate logs if WebSocket is offline
  const generateFallbackLog = useCallback((): string => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
    const t = FALLBACK_LOG_TEMPLATES[Math.floor(Math.random() * FALLBACK_LOG_TEMPLATES.length)];
    const text = t.text
      .replace('[ID]', String(Math.floor(Math.random() * 9000 + 1000)))
      .replace('[VAL]', (Math.random() * 2 + 0.1).toFixed(3));
    return `[${timestamp}] [${t.sector}] > ${text}`;
  }, []);

  useEffect(() => {
    if (!active) return;

    // Try to connect to the PLVTVS logs WebSocket service
    // The gateway forwards /?XTransformPort=3030 → localhost:3030
    let connected = false;
    try {
      const socket = socketIo('/?XTransformPort=3030', {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        timeout: 5000,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        connected = true;
        setLiveConnected(true);
        setLogs((prev) => [
          ...prev,
          `[SYS_INIT] // Live node cluster link established (WebSocket).`,
        ]);
      });

      socket.on('plvtvs:history', (data: { logs: LiveLogEvent[] }) => {
        if (data.logs && data.logs.length > 0) {
          setLogs((prev) => [...prev, ...data.logs.slice(-20).map(formatLog)].slice(-50));
        }
      });

      socket.on('plvtvs:log', (ev: LiveLogEvent) => {
        setLogs((prev) => [...prev, formatLog(ev)].slice(-50));
      });

      socket.on('plvtvs:stats', (s: { totalLogs: number; activeClients: number }) => {
        setStats(s);
      });

      socket.on('disconnect', () => {
        setLiveConnected(false);
      });

      socket.on('connect_error', () => {
        // Fall through to fallback mode
        if (!connected) {
          setLiveConnected(false);
        }
      });
    } catch (e) {
      console.warn('[ActivityLogs] WebSocket init failed:', e);
    }

    // Fallback: if not connected within 3s, start simulated logs
    const fallbackCheck = setTimeout(() => {
      if (!connected) {
        const triggerNext = () => {
          const delay = Math.random() * 1500 + 1000;
          fallbackTimerRef.current = setTimeout(() => {
            setLogs((prev) => [...prev, generateFallbackLog()].slice(-50));
            triggerNext();
          }, delay);
        };
        triggerNext();
      }
    }, 3000);

    return () => {
      clearTimeout(fallbackCheck);
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [active, formatLog, generateFallbackLog]);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <div className="cyber-panel p-5 flex flex-col" style={{ height: '320px' }}>
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#1a1a1a]">
        <span className="text-[#888]">▶</span>
        <span className="cyber-mono text-[10px] tracking-[0.2em] text-[#888]">
          MODULE 04 // REAL-TIME ACTIVITY LOGS
        </span>
        <span
          className="ml-auto cyber-mono text-[9px] px-1.5 py-0.5 border"
          style={{
            color: liveConnected ? '#00FFCC' : '#FFCC00',
            borderColor: liveConnected ? '#00FFCC' : '#FFCC00',
          }}
        >
          {liveConnected ? '◉ LIVE' : '○ FALLBACK'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto cyber-mono text-[11px] leading-relaxed pr-1">
        {logs.map((log, i) => {
          if (typeof log !== 'string') return null;
          let color = '#FFFFFF';
          if (log.includes('[SYS_INIT]')) color = '#888888';
          else if (log.includes('[SOCIAL]')) color = '#0066FF';
          else if (log.includes('[ECOM]')) color = '#FFCC00';
          else if (log.includes('[CRYPTO]')) color = '#00FFCC';
          else if (log.includes('[SYSTEM]')) color = '#888888';
          return (
            <div
              key={i}
              style={{
                color,
                textShadow: color !== '#888888' ? `0 0 4px ${color}44` : 'none',
              }}
            >
              {log}
            </div>
          );
        })}
        <div ref={terminalEndRef} />
      </div>

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#1a1a1a] cyber-mono text-[11px]">
        <div className="text-[#00FFCC] flex items-center">
          <span className="mr-1">$ plvtvs --status</span>
          <span className="cyber-blink inline-block w-2 h-3.5 bg-[#00FFCC]" />
        </div>
        {stats && (
          <div className="text-[#666] text-[9px]">
            {stats.totalLogs} TOTAL · {stats.activeClients} CLIENTS
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard({ avatarSeed, onJackOut }: DashboardProps) {
  const [jackingOut, setJackingOut] = useState(false);

  const handleJackOut = () => {
    setJackingOut(true);
    getAudioEngine().playClick();
    // CRT power-off effect
    setTimeout(() => {
      onJackOut();
    }, 800);
  };

  return (
    <section id="dashboard" className="relative min-h-screen py-12 px-4 md:px-8 border-t border-[#0A0A0A]">
      {/* Top status bar */}
      <div className="cyber-panel mb-6 p-4 flex flex-col md:flex-row gap-4 md:items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="cyber-mono text-lg font-black text-[#00FFCC] cyber-text-glow-cyan">
            PLVTVS CORE v2.0.26
          </div>
          <span className="cyber-mono text-[10px] text-[#00FFCC] border border-[#00FFCC] px-2 py-0.5 cyber-pulse">
            BASE MAINNET
          </span>
          <span className="cyber-mono text-[10px] text-[#888]">
            {avatarSeed.slice(0, 6)}...{avatarSeed.slice(-4)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="cyber-mono text-[10px] text-[#00FFCC]">
            <span className="cyber-pulse inline-block w-1.5 h-1.5 rounded-full bg-[#00FFCC] mr-1" />
            ACTIVE
          </span>
          <button onClick={handleJackOut} className="cyber-btn cyber-btn-gold !py-2 !px-4 !text-[10px]">
            JACK OUT
          </button>
        </div>
      </div>

      {/* Tab bar (decorative) */}
      <div className="cyber-panel mb-6 p-2 flex gap-1 overflow-x-auto">
        {['MONITOR', 'NODES', 'VALUATION', 'LOGS', 'PROTOCOL', 'SETTINGS'].map((tab, i) => (
          <div
            key={tab}
            className={`cyber-mono text-[10px] tracking-wider px-4 py-2 ${
              i === 0 ? 'text-[#00FFCC] border-b-2 border-[#00FFCC]' : 'text-[#666] hover:text-white cursor-pointer'
            }`}
          >
            {tab}
          </div>
        ))}
      </div>

      {/* 4-grid matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <CyberGhostModule seed={avatarSeed} />
        <RealTimeValuation active />
        <ActiveSectors onAdjust={() => getAudioEngine().playGlitch()} />
        <ActivityLogs active />
      </div>

      {/* On-chain subscription panel (full width) */}
      <div className="mt-6">
        <SubscriptionPanel />
      </div>

      {/* Bottom bar */}
      <div className="mt-6 cyber-panel p-3 flex justify-between items-center cyber-mono text-[10px] text-[#666]">
        <span>[TERMINAL] $ plvtvs --status</span>
        <span>SYSTEM TIME: {new Date().toUTCString().slice(17, 25)} UTC</span>
      </div>

      {/* CRT power-off effect on jack out */}
      {jackingOut && (
        <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
          <div
            className="bg-white"
            style={{
              width: '100%',
              height: '2px',
              animation: 'crt-shutdown 0.8s ease-in forwards',
            }}
          />
          <style>{`
            @keyframes crt-shutdown {
              0% { height: 100vh; opacity: 1; }
              50% { height: 100vh; opacity: 0.8; }
              80% { height: 2px; opacity: 1; }
              100% { height: 0; opacity: 0; }
            }
          `}</style>
        </div>
      )}
    </section>
  );
}
