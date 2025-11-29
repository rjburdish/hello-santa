# Hello Santa

Real-time chat with a 3D Santa featuring lip-sync via viseme blendshapes.

## V0 (Proof of Concept)

Audio-only conversation with browser-rendered 3D Santa. No recording, no paywall, child-safety-first.

## Prerequisites

- Node 20+
- pnpm (install globally: `npm i -g pnpm`)

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development servers (web + media-gateway)
pnpm run dev
```

- Web app: http://localhost:3000
- Media gateway: http://localhost:8787

## Project Structure

```
santa/
├── apps/
│   ├── web/              # Next.js + React Three Fiber
│   └── media-gateway/    # Fastify + WebSocket server
└── packages/
    └── shared/           # Shared types and contracts
```

## Available Scripts

- `pnpm run dev` - Start both web and gateway in development mode
- `pnpm run dev:web` - Start web app only
- `pnpm run dev:gateway` - Start media gateway only
- `pnpm run build` - Build all packages
- `pnpm run lint` - Lint all packages
- `pnpm run typecheck` - Type check all packages

## Security & Safety

- HTTPS/WSS only (even in development)
- No camera, audio-only
- No storage of audio/transcripts
- Child-safety-first system prompt
- Input sanitization and rate limiting

## Development Roadmap

**V0.0** ✓ Monorepo scaffolding
**V0.1** ✓ Render placeholder head + fake visemes (current)
**V0.1b** - Replace placeholder with production Santa GLB model [REQUIRED FOR PRODUCTION]
**V0.2** - WebSocket skeleton with echo path
**V0.3** - Mic capture
**V0.4** - Real ASR → LLM → TTS pipeline
**V0.5** - Stability & latency hardening
**V0.6** - Safety & UX improvements
**V0.7** - Field testing & bugfixes

**V1** - Production (Stripe, enhanced safety, observability, optional recording)

## V0.1 Features

- ✓ 3D placeholder head with R3F (React Three Fiber)
- ✓ Viseme store with weighted morph targets
- ✓ Fake viseme generator cycling through all OVR visemes
- ✓ Critically damped animation (smooth, no snapping)
- ✓ Performance monitor (targeting 30+ FPS)
- ✓ Lighting setup optimized for head/shoulders view
