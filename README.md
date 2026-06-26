# PLVTVS.ONE

> **Your Ghost in the Wireless Shell.**
> The sovereign avatar engineered to intercept, adapt, and monetize network value streams autonomously. Beyond Agents.

![PLVTVS](https://img.shields.io/badge/PHASE-OPERATIONAL-00FFCC?style=for-the-badge)
![V](https://img.shields.io/badge/V-2.0.26-FFCC00?style=for-the-badge)
![NETWORK](https://img.shields.io/badge/NETWORK-BASE_L2-0066FF?style=for-the-badge)

PLVTVS.ONE is a movie-grade cyberpunk web experience for digital avatars. Inspired by Polsia's high-end minimalist aesthetic, it weaves Greek mythology (Plutus, god of wealth) with cyberpunk futurism into a three-phase interactive ritual:

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

## Wallet Authentication & Admin System

### Wallet Login (top-right of every page)
- **RainbowKit + Wagmi v2 + Viem v2** on Base Mainnet + Base Sepolia
- Top-right `CONNECT WALLET` button → opens RainbowKit modal (MetaMask / Coinbase / WalletConnect)
- On connect, the wallet auto-registers (or signs in) via `POST /api/auth/login`
- Session is persisted in `sessionStorage` (Zustand + persist middleware)
- Connected button shows: short address + role badge + dropdown menu (Home / Dashboard / Admin / Disconnect)

### Three-Tier RBAC
| Role | Privileges |
|------|------------|
| `USER` | Standard subscriber — can use dashboard, deploy avatar, subscribe |
| `OPERATOR` | Mid-level admin — can view/manage users, see all logs, restart nodes; cannot ban other admins or change roles above their own |
| `SUPER_ADMIN` | Full control — can ban, suspend, promote/demote, change any user's role |

Roles are derived from:
1. Hard-coded wallet allowlists in `src/lib/plvtvs/auth.ts` (`SUPER_ADMIN_WALLETS`, `OPERATOR_WALLETS`)
2. Database `User.role` column (overridden by super-admin action via the admin console)

### Routes
| Route | Access | Description |
|-------|--------|-------------|
| `/` | Public | Hero experience + deploy ritual + revelation scenes |
| `/dashboard` | Public (guest mode) or authenticated | 4-module cyber console (Cyber Ghost / Valuation / Sectors / Logs) |
| `/admin` | OPERATOR+ only | Admin console with 4 tabs (Overview / Users / Logs / Admin Audit) |

### Admin Console Features (`/admin`)
- **OVERVIEW** — KPI cards (total ghosts, subscribers, online nodes, total yield) + user breakdown bars + node distribution by sector/status + 24h activity counts
- **USER MANAGEMENT** — Filterable user table (search, role, status) with per-row actions: SUSPEND / ACTIVATE / PROMOTE-TO-OPERATOR / DEMOTE / BAN
- **ACTIVITY LOGS** — Real-time scrolling activity log stream (color-coded by sector: SOCIAL/ECOM/CRYPTO/SYSTEM)
- **ADMIN AUDIT LOG** — All admin actions recorded with admin wallet + target user + action + reason

### API Surface
```
POST   /api/auth/login              # Wallet sign-in / auto-register
POST   /api/auth/logout             # Stateless logout
GET    /api/auth/me?wallet=0x...    # Get public user profile

GET    /api/admin/stats             # KPI overview (OPERATOR+)
GET    /api/admin/users             # List users with filters (OPERATOR+)
PATCH  /api/admin/users/[id]        # Update role/status/yield (SUPER_ADMIN for role)
DELETE /api/admin/users/[id]        # Ban user (SUPER_ADMIN)
GET    /api/admin/logs?type=        # Activity or admin audit logs (OPERATOR+)
GET    /api/admin/nodes             # List all nodes (OPERATOR+)
PATCH  /api/admin/nodes             # Bulk restart/online/offline (OPERATOR+)

GET    /api/user/subscription       # Get user's subscriptions
POST   /api/user/subscription       # Purchase/extend subscription (tier 1/2/3)
```

All admin endpoints are protected by the `requireOperator()` / `requireSuperAdmin()` middleware in `src/lib/plvtvs/admin-auth.ts`. The middleware reads the `x-plvtvs-wallet` header (sent by the client) and verifies the user's role from the database.

### WalletConnect Project ID
To enable WalletConnect QR-code connections (mobile wallets), register a free project at [cloud.walletconnect.com](https://cloud.walletconnect.com) and set:
```bash
# .env.local
NEXT_PUBLIC_WC_PROJECT_ID=your_project_id_here
```

Without this, injected wallets (MetaMask, Coinbase) still work perfectly — only the remote WalletConnect Cloud metadata fetch will return 403 (harmless console warning).

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

## Database

```bash
bun run db:push     # Apply schema to SQLite
bun run db:generate # Regenerate Prisma client
```

## Roadmap

- [x] Wagmi + Viem integration for real Base Mainnet wallet connection
- [x] Admin console with OPERATOR + SUPER_ADMIN RBAC
- [x] User / subscription / node / log management APIs
- [x] On-chain subscription verification via PlvtvsSubscription smart contract
- [x] Real biometric face capture via MediaPipe Face Mesh
- [ ] WebSocket-driven live activity logs from backend cluster
- [x] ERC-4337 Session Key for autonomous on-chain execution
- [x] Email/notification system for subscription expiry

## License

© PLVTVS Core. All rights reserved. Beyond Agents.
