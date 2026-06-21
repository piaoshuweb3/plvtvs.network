'use client';

import { useMemo } from 'react';
import { generatePixelAvatar, type PixelAvatarData } from '@/lib/plvtvs/pixelAvatar';

interface PixelAvatarProps {
  seed: string;
  size?: number;
  showHalo?: boolean;
  animate?: boolean;
}

export default function PixelAvatar({
  seed,
  size = 256,
  showHalo = true,
  animate = true,
}: PixelAvatarProps) {
  const data: PixelAvatarData = useMemo(() => generatePixelAvatar(seed), [seed]);

  const cellSize = size / 64;

  return (
    <div
      className="relative inline-block"
      style={{ width: size, height: size }}
    >
      {/* Background scanlines / grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,255,204,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,204,0.06) 1px, transparent 1px)',
          backgroundSize: `${cellSize}px ${cellSize}px`,
        }}
      />

      {/* Halo ring (always visible if showHalo and accessory === HALO) */}
      {showHalo && data.accessory === 'HALO' && (
        <svg
          className="absolute inset-0 pointer-events-none"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
        >
          <circle
            cx={size / 2}
            cy={size * 0.18}
            r={size * 0.13}
            fill="none"
            stroke="#00FFCC"
            strokeWidth="1.5"
            opacity="0.7"
            style={{
              filter: 'drop-shadow(0 0 4px #00FFCC)',
              ...(animate ? { animation: 'cyber-pulse 2.4s ease-in-out infinite' } : {}),
            }}
          />
        </svg>
      )}

      {/* Pixel grid */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="relative z-10"
        style={{ imageRendering: 'pixelated' }}
      >
        <rect width={size} height={size} fill="#000000" />
        {data.grid.map((row, y) =>
          row.map((on, x) =>
            on ? (
              <rect
                key={`${x}-${y}`}
                x={x * cellSize}
                y={y * cellSize}
                width={cellSize}
                height={cellSize}
                fill="#00FF66"
                style={{ filter: 'drop-shadow(0 0 1px rgba(0,255,102,0.6))' }}
              />
            ) : null
          )
        )}
      </svg>

      {/* HUD corner brackets */}
      <div className="cyber-hud-corner cyber-hud-corner-tl" />
      <div className="cyber-hud-corner cyber-hud-corner-tr" />
      <div className="cyber-hud-corner cyber-hud-corner-bl" />
      <div className="cyber-hud-corner cyber-hud-corner-br" />
    </div>
  );
}
