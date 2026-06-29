'use client';

import { useEffect, useRef, useState } from 'react';
import PixelAvatar from './PixelAvatar';
import { pixelAvatarToSvg } from '@/lib/plvtvs/pixelAvatar';
import { generatePixelAvatar } from '@/lib/plvtvs/pixelAvatar';
import { getAudioEngine } from '@/lib/plvtvs/audioEngine';

interface FinalCTAProps {
  avatarSeed: string;
  onEnterDashboard: () => void;
}

export default function FinalCTA({ avatarSeed, onEnterDashboard }: FinalCTAProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { threshold: 0.3 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  const handleDownload = () => {
    const data = generatePixelAvatar(avatarSeed);
    const svg = pixelAvatarToSvg(data, 512);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plvtvs-soul-${avatarSeed.slice(0, 8)}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    getAudioEngine().playSuccess();
  };

  return (
    <section
      ref={sectionRef}
      id="final-cta"
      className="relative py-32 px-6 md:px-12 border-t border-[#0A0A0A] overflow-hidden"
    >
      {/* Background radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(0,255,204,0.08), transparent 60%)',
        }}
      />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        {/* Pixel avatar appears here */}
        <div
          className={`flex justify-center mb-8 transition-all duration-1000 ${
            visible ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
          }`}
        >
          <div className="relative">
            <PixelAvatar seed={avatarSeed} size={192} />
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 cyber-mono text-[9px] text-[#00FFCC] tracking-[0.3em] whitespace-nowrap cyber-flicker">
              YOUR BIOLOGICAL SOUL // ENCAPSULATED
            </div>
          </div>
        </div>

        <div className="cyber-mono text-xs text-[#FFCC00] tracking-[0.4em] mb-4 cyber-flicker">
          {'// INITIALIZATION COMPLETE'}
        </div>

        <h2 className="cyber-mono text-3xl md:text-5xl font-black mb-6 text-white leading-tight">
          Your PLVTVS Avatar is
          <br />
          <span className="cyber-text-glow-cyan text-[#00FFCC]">FULLY INITIALIZED.</span>
        </h2>

        <p className="cyber-mono text-base text-[#888] mb-12">
          Ready for network insertion.
        </p>

        {/* CTAs */}
        <div className="flex flex-col md:flex-row gap-4 justify-center items-center mb-10">
          <button
            onClick={onEnterDashboard}
            className="cyber-btn cyber-btn-gold min-w-[300px]"
          >
            ▶ ENTER CORE DASHBOARD
          </button>
          <button
            onClick={handleDownload}
            className="cyber-btn min-w-[300px]"
          >
            ↓ DOWNLOAD YOUR DIGITAL SOUL (.SVG)
          </button>
        </div>

        {/* Tip */}
        <p className="cyber-mono text-[11px] text-[#444] max-w-xl mx-auto leading-relaxed">
          {'// Use your digital soul as your Twitter/X or Discord avatar.'}
          <br />
          {'// Become a node in the sovereign PLVTVS.network — viral propagation is inevitable.'}
        </p>

        {/* Tech badges */}
        <div className="mt-16 flex flex-wrap justify-center gap-3">
          {['BASE L2', 'ERC-4337', 'THREE.JS', 'GLSL', 'WEB AUDIO', 'QUANTUM SYNC'].map((tech) => (
            <span
              key={tech}
              className="cyber-mono text-[10px] text-[#666] border border-[#1a1a1a] px-3 py-1.5 hover:border-[#00FFCC] hover:text-[#00FFCC] transition-colors"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-32 pt-8 border-t border-[#1a1a1a]">
        <div className="max-w-7xl mx-auto px-2 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
          <div>
            <div className="cyber-mono text-2xl font-black text-[#FFCC00] cyber-text-glow-gold mb-2">
              PLVTVS<span className="text-[#666] text-base">.network</span>
            </div>
            <p className="cyber-mono text-[10px] text-[#444] tracking-wider">
              YOUR SOUL IN THE WIRELESS SHELL · © {new Date().getFullYear()} · BEYOND AGENTS
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 cyber-mono text-[10px] text-[#666] tracking-wider">
            <a href="#beyond-agents" className="hover:text-[#00FFCC]">PROTOCOL</a>
            <a href="#revelation" className="hover:text-[#00FFCC]">VECTORS</a>
            <a href="#" className="hover:text-[#00FFCC]">CONTRACT</a>
            <a href="#" className="hover:text-[#00FFCC]">GITHUB</a>
            <a href="#" className="hover:text-[#00FFCC]">DOCS</a>
            <span className="text-[#444]">|</span>
            <span className="text-[#00FFCC]">0xPLVTVS</span>
          </div>
        </div>
      </footer>
    </section>
  );
}
