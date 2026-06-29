'use client';

import { useEffect, useRef, useState } from 'react';

interface ComparisonRow {
  category: string;
  agent: string;
  avatar: string;
}

const COMPARISON: ComparisonRow[] = [
  {
    category: 'ENTITY DEFINITION',
    agent: 'A Python script on a centralized server. No identity. Survives only via your API key. Bannable at any moment.',
    avatar: 'A sovereign on-chain digital entity with its own Base-chain wallet and DID. A legal digital asset nobody can shut down.',
  },
  {
    category: 'VALUE CAPTURE',
    agent: 'Reacts passively after your command. If-This-Then-That. Single-shot automation.',
    avatar: 'Adaptive reinforcement learning matrix. Roams Web3, DeFi and global traffic 24/7, proactively intercepting flowing value.',
  },
  {
    category: 'EVOLUTION & SYNC',
    agent: 'Process dies after each run. No memory. No synchronization with the principal.',
    avatar: 'Quantum Sync Bridge via Base smart contracts. Every captured yield, every arbitrage feeds experience back to your console.',
  },
];

function AgentTopology() {
  // Linear dead-end topology
  return (
    <svg viewBox="0 0 320 200" className="w-full h-full">
      {/* Linear chain */}
      {[
        { x: 30, label: 'INPUT', color: '#666' },
        { x: 100, label: 'AGENT', color: '#ff4444' },
        { x: 170, label: 'TASK', color: '#666' },
        { x: 240, label: 'END', color: '#666' },
      ].map((n, i) => (
        <g key={i}>
          <rect
            x={n.x}
            y={80}
            width={50}
            height={40}
            fill="none"
            stroke={n.color}
            strokeWidth="1.5"
            opacity="0.7"
          />
          <text
            x={n.x + 25}
            y={104}
            textAnchor="middle"
            fontSize="9"
            fill={n.color}
            fontFamily="monospace"
          >
            {n.label}
          </text>
          {i < 3 && (
            <line
              x1={n.x + 50}
              y1={100}
              x2={n.x + 80}
              y2={100}
              stroke="#444"
              strokeWidth="1"
              markerEnd="url(#arrow-agent)"
            />
          )}
        </g>
      ))}
      <defs>
        <marker
          id="arrow-agent"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 6 3, 0 6" fill="#444" />
        </marker>
      </defs>
      <text
        x="160"
        y="160"
        textAnchor="middle"
        fontSize="8"
        fill="#666"
        fontFamily="monospace"
      >
        SINGLE-THREAD · STATELESS · BORING
      </text>
      <text
        x="160"
        y="40"
        textAnchor="middle"
        fontSize="10"
        fill="#ff4444"
        fontFamily="monospace"
      >
        TRADITIONAL AGENT
      </text>
    </svg>
  );
}

function AvatarTopology() {
  // Complex decentralized network with the pixel avatar at the center
  return (
    <svg viewBox="0 0 320 200" className="w-full h-full">
      {/* Connection lines from center to outer nodes */}
      {[
        { x: 160, y: 100, tx: 40, ty: 40, color: '#00FFCC' },
        { x: 160, y: 100, tx: 280, ty: 40, color: '#0066FF' },
        { x: 160, y: 100, tx: 40, ty: 160, color: '#FFCC00' },
        { x: 160, y: 100, tx: 280, ty: 160, color: '#00FFCC' },
        { x: 160, y: 100, tx: 40, ty: 100, color: '#0066FF' },
        { x: 160, y: 100, tx: 280, ty: 100, color: '#FFCC00' },
        { x: 160, y: 100, tx: 160, ty: 30, color: '#00FFCC' },
        { x: 160, y: 100, tx: 160, ty: 170, color: '#0066FF' },
      ].map((l, i) => (
        <line
          key={i}
          x1={l.x}
          y1={l.y}
          x2={l.tx}
          y2={l.ty}
          stroke={l.color}
          strokeWidth="0.8"
          opacity="0.5"
          strokeDasharray="2 2"
        >
          <animate
            attributeName="stroke-dashoffset"
            values="0;-4"
            dur="0.8s"
            repeatCount="indefinite"
          />
        </line>
      ))}

      {/* Outer nodes */}
      {[
        { x: 40, y: 40, c: '#00FFCC' },
        { x: 280, y: 40, c: '#0066FF' },
        { x: 40, y: 160, c: '#FFCC00' },
        { x: 280, y: 160, c: '#00FFCC' },
        { x: 40, y: 100, c: '#0066FF' },
        { x: 280, y: 100, c: '#FFCC00' },
        { x: 160, y: 30, c: '#00FFCC' },
        { x: 160, y: 170, c: '#0066FF' },
      ].map((n, i) => (
        <circle
          key={i}
          cx={n.x}
          cy={n.y}
          r="4"
          fill={n.c}
          opacity="0.9"
        >
          <animate
            attributeName="r"
            values="3;5;3"
            dur={`${1.5 + i * 0.2}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}

      {/* Central avatar node */}
      <circle
        cx="160"
        cy="100"
        r="22"
        fill="none"
        stroke="#00FFCC"
        strokeWidth="1.5"
        opacity="0.8"
        className="cyber-rotate-slow"
        style={{ transformOrigin: '160px 100px' }}
      />
      <circle cx="160" cy="100" r="16" fill="#00FFCC" opacity="0.15" />
      <circle cx="160" cy="100" r="10" fill="#00FFCC">
        <animate
          attributeName="opacity"
          values="0.6;1;0.6"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>
      <text
        x="160"
        y="103"
        textAnchor="middle"
        fontSize="7"
        fill="#000"
        fontFamily="monospace"
        fontWeight="bold"
      >
        SOUL
      </text>

      <text
        x="160"
        y="20"
        textAnchor="middle"
        fontSize="10"
        fill="#00FFCC"
        fontFamily="monospace"
      >
        PLVTVS AVATAR
      </text>
    </svg>
  );
}

export default function BeyondAgents() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { threshold: 0.2 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="beyond-agents"
      className="relative py-32 px-6 md:px-12 border-t border-[#0A0A0A]"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="cyber-mono text-xs text-[#FFCC00] tracking-[0.4em] mb-4 cyber-flicker">
            {'// CORE PROTOCOL — DIGITAL SOVEREIGNTY'}
          </div>
          <h2 className="cyber-mono text-3xl md:text-5xl font-black mb-6 text-white leading-tight">
            BEYOND AGENTS.
            <br />
            THE AWAKENING OF <span className="cyber-text-glow-cyan text-[#00FFCC]">DIGITAL SOVEREIGNTY</span>.
          </h2>
          <p className="cyber-mono text-sm text-[#888] max-w-3xl mx-auto leading-relaxed">
            Traditional Agents follow scripts. <span className="text-[#00FFCC]">PLVTVS forks reality.</span>
            <br />
            An Agent is a tool. An Avatar is a sovereign digital life.
          </p>
        </div>

        {/* Topology comparison */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          <div
            className={`cyber-panel p-6 transition-all duration-700 ${
              visible ? 'opacity-100' : 'opacity-40'
            }`}
            style={{ borderColor: '#ff444433' }}
          >
            <div className="cyber-mono text-xs text-[#ff4444] tracking-[0.3em] mb-4">
              AGENT TOPOLOGY · LINEAR · STATELESS
            </div>
            <div className="aspect-[8/5] bg-black/60 border border-[#1a1a1a]">
              <AgentTopology />
            </div>
          </div>
          <div
            className={`cyber-panel p-6 transition-all duration-700 ${
              visible ? 'opacity-100' : 'opacity-40'
            }`}
            style={{ borderColor: '#00FFCC33' }}
          >
            <div className="cyber-mono text-xs text-[#00FFCC] tracking-[0.3em] mb-4">
              PLVTVS TOPOLOGY · DECENTRALIZED · AUTONOMOUS
            </div>
            <div className="aspect-[8/5] bg-black/60 border border-[#1a1a1a]">
              <AvatarTopology />
            </div>
          </div>
        </div>

        {/* Comparison matrix */}
        <div className="cyber-panel p-2 md:p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#1a1a1a]">
            {/* Header row */}
            <div className="bg-black p-4 cyber-mono text-[10px] text-[#444] tracking-[0.3em]">
              CATEGORY
            </div>
            <div className="bg-black p-4 cyber-mono text-[10px] text-[#ff4444] tracking-[0.3em]">
              TRADITIONAL AGENT
            </div>
            <div className="bg-black p-4 cyber-mono text-[10px] text-[#00FFCC] tracking-[0.3em]">
              PLVTVS AVATAR
            </div>

            {/* Rows */}
            {COMPARISON.map((row, i) => (
              <div key={i} className="contents">
                <div className="bg-black p-4 cyber-mono text-xs text-white font-bold border-t border-[#0A0A0A]">
                  {row.category}
                </div>
                <div className="bg-black p-4 text-xs text-[#888] leading-relaxed border-t border-[#0A0A0A]">
                  {row.agent}
                </div>
                <div className="bg-black p-4 text-xs text-[#bbb] leading-relaxed border-t border-[#0A0A0A]">
                  <span className="text-[#00FFCC]">▸ </span>
                  {row.avatar}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom tagline */}
        <div className="text-center mt-12">
          <p className="cyber-mono text-sm text-[#666] italic">
            &quot;Your physical body sleeps. Your digital soul conquers the cyber world on your behalf.&quot;
          </p>
        </div>
      </div>
    </section>
  );
}
