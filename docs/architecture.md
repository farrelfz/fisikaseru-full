# FisikaSeru Architecture

## Goals
- Vanilla JS + HTML/CSS (Tailwind build only)
- Simulation modules as folders (not separate apps)
- Shared core utilities under `public/js/core/`
- Secure auth handled by backend (`server/index.js`) using OAuth 2.0 Authorization Code Flow

## High-level layout
- Frontend pages: `pages/`
  - Landing and hub pages
  - Simulation modules under `pages/simulations/<domain>/<module>/`
- Shared client JS: `public/js/`
  - `core/`: physics/math/unit helpers
  - `ui/`: reusable UI primitives
  - `auth.js`: auth state + gated navigation
- Backend: `server/`
  - OAuth providers
  - Session via HTTP-only cookie

## Data model (v0)
- Session cookie: `fs_session` (JWT)
- LocalStorage:
  - Preliminary gate: `prelim:<uid>:<simKey>`

## Future (planned)
- Replace in-memory user store with DB
- Replace LocalStorage with IndexedDB for large datasets
- Add per-user lab history / reports
