'use client';

import { useEffect, useRef, useState } from 'react';
import { getAudioEngine } from '@/lib/plvtvs/audioEngine';

interface WealthScene {
  id: string;
  index: string;
  title: string;
  subtitle: string;
  body: string;
  color: string;
  glowClass: string;
  icon: 'social' | 'ecommerce' | 'crypto';
}

const SCENES: WealthScene[] = [
  {
    id: 'infiltration',
    index: '01',
    title: 'INFILTRATION',
    subtitle: 'Social Matrix · Attention Capture',
    body: 'Your Avatar spawns thousands of digital echoes across social matrix. Generating attention streams, engineering virality, and capturing liquid ad-revenue 24/7 without your physical voice.',
    color: '#0066FF',
    glowClass: 'cyber-text-glow-blue',
    icon: 'social',
  },
  {
    id: 'exchange',
    index: '02',
    title: 'BORDERLESS EXCHANGE',
    subtitle: 'Cross-Border Commerce · Autonomous Clearance',
    body: 'Operating beyond sovereign borders. Automated arbitrage across digital storefronts, supply nodes, and virtual marketplaces. The ghost handles logistics; you pocket the difference.',
    color: '#FFCC00',
    glowClass: 'cyber-text-glow-gold',
    icon: 'ecommerce',
  },
  {
    id: 'harvest',
    index: '03',
    title: 'ALGORITHMIC HARVEST',
    subtitle: 'DeFi · MEV · Yield Farming',
    body: 'Plunging into the dark pools of DeFi and Memecoin matrix. Detecting anomalies, front-running market inefficiencies, and farming yields at microsecond speed on Base Layer-2.',
    color: '#00FFCC',
    glowClass: 'cyber-text-glow-cyan',
    icon: 'crypto',
  },
];

function SceneIcon({ type, color }: { type: WealthScene['icon']; color: string }) {
  if (type === 'social') {
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Network of nodes representing social matrix */}
        {[
          [20, 30], [50, 20], [80, 30], [25, 70], [50, 80], [75, 70], [50, 50],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={i === 6 ? 4 : 3} fill={color} opacity={i === 6 ? 1 : 0.8}>
            <animate
              attributeName="opacity"
              values="0.3;1;0.3"
              dur={`${1.5 + i * 0.2}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}
        {[
          [20, 30, 50, 50], [50, 20, 50, 50], [80, 30, 50, 50],
          [25, 70, 50, 50], [50, 80, 50, 50], [75, 70, 50, 50],
          [20, 30, 50, 20], [50, 20, 80, 30], [25, 70, 75, 70],
        ].map(([x1, y1, x2, y2], i) => (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={color}
            strokeWidth="0.5"
            opacity="0.4"
          />
        ))}
      </svg>
    );
  }
  if (type === 'ecommerce') {
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Globe with shipping lanes */}
        <circle cx="50" cy="50" r="35" fill="none" stroke={color} strokeWidth="0.8" opacity="0.6" />
        <ellipse cx="50" cy="50" rx="35" ry="15" fill="none" stroke={color} strokeWidth="0.5" opacity="0.4" />
        <ellipse cx="50" cy="50" rx="15" ry="35" fill="none" stroke={color} strokeWidth="0.5" opacity="0.4" />
        <ellipse cx="50" cy="50" rx="30" ry="35" fill="none" stroke={color} strokeWidth="0.5" opacity="0.3" />
        {/* Trade routes */}
        {[
          [20, 30, 80, 70],
          [30, 70, 75, 25],
          [25, 50, 80, 45],
        ].map(([x1, y1, x2, y2], i) => (
          <path
            key={i}
            d={`M ${x1} ${y1} Q 50 20 ${x2} ${y2}`}
            fill="none"
            stroke={color}
            strokeWidth="1"
            strokeDasharray="2 3"
            opacity="0.8"
          >
            <animate
              attributeName="stroke-dashoffset"
              values="0;-10"
              dur="1s"
              repeatCount="indefinite"
            />
          </path>
        ))}
        {/* Port markers */}
        {[[20, 30], [80, 70], [30, 70], [75, 25]].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="2" fill={color}>
            <animate attributeName="r" values="2;4;2" dur="2s" repeatCount="indefinite" />
          </circle>
        ))}
      </svg>
    );
  }
  // crypto: candlestick chart + hexagon block
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {/* K-line candles */}
      {[
        { x: 15, h: 25, dir: 1 },
        { x: 25, h: 18, dir: -1 },
        { x: 35, h: 30, dir: 1 },
        { x: 45, h: 22, dir: -1 },
        { x: 55, h: 28, dir: 1 },
        { x: 65, h: 15, dir: -1 },
        { x: 75, h: 35, dir: 1 },
      ].map((c, i) => (
        <g key={i}>
          <line
            x1={c.x}
            y1={50 - c.h - 5}
            x2={c.x}
            y2={50 + c.h - 5}
            stroke={c.dir > 0 ? color : '#ff4444'}
            strokeWidth="0.6"
          />
          <rect
            x={c.x - 2.5}
            y={50 - (c.dir > 0 ? c.h : 0) - 5}
            width="5"
            height={c.h}
            fill={c.dir > 0 ? color : '#ff4444'}
            opacity="0.85"
          />
        </g>
      ))}
      {/* Hexagon smart contract block */}
      <polygon
        points="85,70 92,75 92,85 85,90 78,85 78,75"
        fill="none"
        stroke={color}
        strokeWidth="1"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 85 80"
          to="360 85 80"
          dur="8s"
          repeatCount="indefinite"
        />
      </polygon>
    </svg>
  );
}

function SceneCard({
  scene,
  index,
  onHover,
}: {
  scene: WealthScene;
  index: number;
  onHover: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={cardRef}
      className="cyber-panel p-8 group relative overflow-hidden transition-all duration-500 hover:scale-[1.01]"
      style={{
        borderColor: `${scene.color}33`,
        boxShadow: `0 0 40px ${scene.color}10`,
      }}
      onMouseEnter={onHover}
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none transition-opacity group-hover:opacity-40"
        style={{
          backgroundImage: `linear-gradient(${scene.color}11 1px, transparent 1px), linear-gradient(90deg, ${scene.color}11 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Flowing top line */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${scene.color}, transparent)` }}
      />

      <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start">
        {/* Left: index + icon */}
        <div className="flex-shrink-0">
          <div className="cyber-mono text-xs text-[#666] tracking-[0.3em] mb-3">
            SCENE / {scene.index}
          </div>
          <div className="w-28 h-28 relative">
            <SceneIcon type={scene.icon} color={scene.color} />
          </div>
        </div>

        {/* Right: content */}
        <div className="flex-1">
          <h3
            className={`cyber-mono text-2xl md:text-3xl font-bold mb-1 ${scene.glowClass}`}
            style={{ color: scene.color }}
          >
            {scene.title}
          </h3>
          <div className="cyber-mono text-[11px] text-[#888] tracking-[0.2em] mb-4">
            {scene.subtitle}
          </div>
          <p className="text-[#bbb] text-sm leading-relaxed mb-6">
            {scene.body}
          </p>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[#1a1a1a]">
            {[
              { label: 'NODES', value: ['1,420', '2,840', '7,910'][index] },
              { label: 'EFFICIENCY', value: ['78%', '92%', '64%'][index] },
              { label: 'STATUS', value: 'LIVE' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="cyber-mono text-[9px] text-[#444] tracking-wider">
                  {stat.label}
                </div>
                <div
                  className="cyber-mono text-sm font-bold"
                  style={{ color: stat.value === 'LIVE' ? scene.color : '#fff' }}
                >
                  {stat.value}
                  {stat.value === 'LIVE' && (
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full ml-1 cyber-pulse"
                      style={{ background: scene.color }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom data flow lines */}
      <div className="absolute bottom-0 left-0 right-0 h-px overflow-hidden">
        <div
          className="h-full animate-pulse"
          style={{
            background: `linear-gradient(90deg, transparent, ${scene.color}, transparent)`,
            animation: 'cyber-flow 3s linear infinite',
            backgroundSize: '200% 100%',
          }}
        />
      </div>
    </div>
  );
}

export default function WealthScenes() {
  const [visibleCards, setVisibleCards] = useState<Set<number>>(new Set());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.idx);
            setVisibleCards((prev) => new Set(prev).add(idx));
          }
        });
      },
      { threshold: 0.2 }
    );
    document.querySelectorAll('[data-scene-card]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="revelation" className="relative py-32 px-6 md:px-12">
      {/* Section header */}
      <div className="max-w-6xl mx-auto mb-20 text-center">
        <div className="cyber-mono text-xs text-[#00FFCC] tracking-[0.4em] mb-4 cyber-flicker">
          {'// PHASE 03 — THE REVELATION'}
        </div>
        <h2 className="cyber-mono text-4xl md:text-6xl font-black mb-6 text-white">
          THREE VECTORS OF
          <br />
          <span className="cyber-text-glow-cyan text-[#00FFCC]">NETWORK HARVEST</span>
        </h2>
        <p className="cyber-mono text-sm text-[#888] max-w-2xl mx-auto leading-relaxed">
          Your sovereign ghost now traverses three parallel digital worlds, intercepting
          value streams across social, commercial, and cryptographic domains.
        </p>
      </div>

      {/* Cards */}
      <div className="max-w-6xl mx-auto space-y-8">
        {SCENES.map((scene, idx) => (
          <div
            key={scene.id}
            data-scene-card
            data-idx={idx}
            className={`transition-all duration-700 ${
              visibleCards.has(idx)
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: `${idx * 100}ms` }}
          >
            <SceneCard
              scene={scene}
              index={idx}
              onHover={() => getAudioEngine().playGlitch()}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
