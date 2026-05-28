# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Per-gig web platform for DJs. A monorepo with three packages: `server/` (Express + MongoDB API), `client/` (public attendee landing page), and `admin/` (private DJ dashboard). The full spec lives in `DJ_GIG_PLATFORM_SPEC.md` — read it before implementing anything.

## Dev Commands

From the repo root (requires `concurrently` installed at root):
```bash
npm run dev           # All three processes concurrently
npm run dev:server    # Express on :4000
npm run dev:client    # Vite on :5173
npm run dev:admin     # Vite on :5174
```

Per-package:
```bash
# server/
npm run dev           # ts-node-dev with hot reload
npm run build         # tsc output → dist/
npm start             # node dist/index.js

# client/ and admin/
npm run dev
npm run build         # tsc + vite build
npm run preview
```

## Architecture

Three independent packages sharing no build tooling, connected by HTTP and Socket.IO at runtime.

**server/** — Express 5, Mongoose 8, Socket.IO 4, JWT auth, Stripe, Cloudinary, Multer, Zod  
**client/** — React 18 + Vite, Axios, Socket.IO client; hits the server API + iTunes API directly from browser  
**admin/** — React 18 + Vite, Axios, Socket.IO client, Zustand for JWT auth state

### Data flow

- All REST calls go to `http://localhost:4000/api`
- Socket.IO: clients emit `join-event <eventId>` on connect → server scopes all emissions to `event:<eventId>` room — never broadcast globally
- iTunes search hits `https://itunes.apple.com/search` directly from the **browser** (not proxied through server)

### Key server files

| File | Responsibility |
|------|---------------|
| `server/src/config/env.ts` | Zod-validated env vars — startup fails if any required var is missing |
| `server/src/config/db.ts` | Mongoose connection |
| `server/src/middleware/auth.ts` | JWT guard for admin-only routes |
| `server/src/socket/handlers.ts` | All Socket.IO event handlers |
| `server/src/routes/tips.ts` | Stripe PaymentIntent creation + webhook handler |

### Auth

User-backed admin auth. On first matching bootstrap login, the server creates or uses a `User` from `ADMIN_EMAIL` / `ADMIN_PASSWORD`, stores a bcrypt password hash, and returns a JWT. Admin frontend stores the token in Zustand + `localStorage` and sends it as `Authorization: Bearer <token>` on every protected request.

### Real-time events

Server → client socket emissions: `event:updated`, `event:live-changed`, `request:new`, `request:voted`, `request:status-changed`, `tip:received`

## Critical Implementation Rules

- **TypeScript strict mode** — `"strict": true` in all `tsconfig.json`. No `any` types.
- **Stripe webhook** — must receive raw body. Use `express.raw({ type: 'application/json' })` on `/api/stripe/webhook` **before** `express.json()` applies globally.
- **CORS** — Express and Socket.IO both must allow `CLIENT_ORIGIN` and `ADMIN_ORIGIN` from env (not hardcoded).
- **Duplicate song requests** — `SongRequest` has a unique compound index `(eventId, itunesTrackId)`. Return `409 Conflict` with the existing doc when a duplicate is submitted; the client should vote instead.
- **Vote deduplication** — enforced server-side with `Vote` records keyed by request and hashed browser session. Client `localStorage` is only a UX helper.
- **`isLive` flag** — set only by the admin toggle (`PATCH /api/events/:id/live`). Never auto-compute from `event.date`.
- **Hero image upload** — Multer middleware: memory storage, 5 MB limit, images only. Upload buffer to Cloudinary folder `dj-gig-platform/heroes`.
- **Admin Vite port** — must run on `5174` to avoid collision with client on `5173`.
- **Async route handlers** — all must use try/catch or an async wrapper; `errorHandler` middleware returns `{ error: message }` JSON.

## Environment Variables

Three separate `.env` files (`.env.example` in each package). Key vars:

- `server/`: `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CLOUDINARY_*`, `CLIENT_ORIGIN`, `ADMIN_ORIGIN`, `TRUST_PROXY_HOPS`
- `client/`: `VITE_API_BASE_URL`, `VITE_SOCKET_URL`, `VITE_ITUNES_SEARCH_URL`, `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_EVENT_SLUG`
- `admin/`: `VITE_API_BASE_URL`, `VITE_SOCKET_URL`

## UI / Styling

Inline styles only — no CSS framework. Fonts: Bebas Neue (headings) + DM Sans (body) via Google Fonts. The component structure and all inline styles in `client/src/` and `admin/src/` are pre-designed — replicate exactly and wire up real data; do not redesign.
