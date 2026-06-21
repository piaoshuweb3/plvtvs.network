# PLVTVS.NETWORK

> **Your Ghost in the Wireless Shell.**
> The sovereign avatar engineered to intercept, adapt, and monetize network value streams autonomously. Beyond Agents.

![PLVTVS](https://img.shields.io/badge/PHASE-OPERATIONAL-00FFCC?style=for-the-badge)
![V](https://img.shields.io/badge/V-2.0.26-FFCC00?style=for-the-badge)
![NETWORK](https://img.shields.io/badge/NETWORK-BASE_L2-0066FF?style=for-the-badge)

PLVTVS.NETWORK is a movie-grade cyberpunk web experience for digital avatars. Inspired by Polsia's high-end minimalist aesthetic, it weaves Greek mythology (Plutus, god of wealth) with cyberpunk futurism into a three-phase interactive ritual:

1. **The Void** — Absolute black screen with a 3D particle avatar (Three.js + custom GLSL shaders) that breathes, rotates, and responds to mouse proximity.
2. **The Ritual** — Click "Deploy Your Avatar" to trigger a biometric scan sequence with crosshair targeting, green laser sweep, code-tick audio, and a final particle explosion. A Lo-fi 64×64 pixel avatar is deterministically generated from your session seed.
3. **The Revelation** — Three parallel wealth-capture scenes unfold: Social Infiltration, Borderless Exchange, Algorithmic Harvest.

Then the experience culminates in a 4-module cyber dashboard:
- **Module 01**: The Cyber Ghost (radar-scanned pixel avatar)
- **Module 02**: Real-Time Valuation (live ETH/USD ticker with pulse waveform)
- **Module 03**: Active Sectors (draggable allocation sliders for Social/Ecom/Crypto)
- **Module 04**: Real-Time Activity Logs (Linux-style scrolling terminal)

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **React 19** + **TypeScript 5**
- **Tailwind CSS 4** + **shadcn/ui**
- **Three.js** + **@react-three/fiber** + **@react-three/drei** (3D particles)
- **Custom GLSL Shaders** (vertex + fragment, with uTime/uExplode/uMouse uniforms)
- **Web Audio API** (procedurally-synthesized ambient drone, scan ticks, quantum thud, glitch, pad)
- **GSAP** (animation timing)

## Color Palette

| Name | Hex | Usage |
|------|-----|-------|
| Absolute Black | `#000000` | Background |
| Hyper-Blue | `#0066FF` | Particle base / Social sector |
| Cyan | `#00FFCC` | Highlights / Crypto sector |
| Quantum Gold | `#FFCC00` | Wealth particles / Ecom sector |
| Matrix Green | `#00FF66` | Pixel avatar / Terminal text |

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with global error handler
│   ├── page.tsx            # Phase orchestrator (void/scanning/deployed/dashboard)
│   └── globals.css         # Cyberpunk utility classes
├── components/plvtvs/
│   ├── ParticleAvatar.tsx  # 3D particle field with custom GLSL shaders
│   ├── HeroSection.tsx     # Phase 1: The Void
│   ├── ScanRitual.tsx      # Phase 2: The Ritual (scan + explosion)
│   ├── PixelAvatar.tsx     # Lo-fi 64x64 pixel avatar renderer
│   ├── WealthScenes.tsx    # Phase 3: The Revelation (3 scenes)
│   ├── BeyondAgents.tsx    # Agent vs Avatar comparison section
│   ├── Dashboard.tsx       # 4-module cyber console
│   ├── FinalCTA.tsx        # Bottom CTA + SVG download + footer
│   └── ErrorBoundary.tsx   # Defensive error boundary
└── lib/plvtvs/
    ├── audioEngine.ts      # PlvtvsAudioEngine (Web Audio synth)
    └── pixelAvatar.ts      # Deterministic 64x64 avatar generator
```

## Key Features

### 3D Quantum Avatar
- 18,000 GPU-accelerated particles forming a humanoid bust silhouette
- Custom vertex shader with quantum breathing, mouse magnetic field, and explosion dynamics
- Custom fragment shader with circular point rendering, glow, glitch lines
- Smooth GLSL-based explode transition (1.5s power4.inOut easing)

### Biometric Scan Ritual
- Animated crosshair targeting with rotating outer/inner rings
- Vertical green laser sweep line
- Streaming code log output with realistic timing
- White flash + quantum thud on completion
- Deterministic 64×64 pixel avatar with 3 accessory variants:
  - 5% — Hologram Visor
  - 15% — Cyber Mask
  - 80% — Code Halo

### Cyber Dashboard
- Module 01: Radar disk with pulse rings + avatar
- Module 02: Real-time ETH/USD counter with `requestAnimationFrame` direct DOM updates (no React re-render) + canvas waveform
- Module 03: Three sliders with auto-rebalancing (must sum to 100%)
- Module 04: Streaming activity logs with sector-based color coding
- CRT power-off effect on Jack Out

### Procedural Audio (No External Files)
All sounds are synthesized at runtime via Web Audio API:
- 50Hz sub-bass drone + 60Hz analog hum (The Void)
- Cybernetic click + rapid code ticks + sweep filter (The Ritual)
- Quantum thud (sine sweep + noise burst)
- C-minor synth pad with lowpass filter (The Revelation)
- Glitch burst, data swoosh, success arpeggio

## Local Development

```bash
bun install
bun run dev
# Open http://localhost:3000
```

## Build

```bash
bun run build
bun run start
```

## Roadmap

- [ ] Wagmi + Viem integration for real Base Mainnet wallet connection
- [ ] On-chain subscription verification via PlvtvsSubscription smart contract
- [ ] Real biometric face capture via MediaPipe Face Mesh
- [ ] WebSocket-driven live activity logs from backend cluster
- [ ] ERC-4337 Session Key for autonomous on-chain execution

## License

© PLVTVS Core. All rights reserved. Beyond Agents.
