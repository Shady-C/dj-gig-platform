# DJ Gig Platform Project Context

Current Phase: 1
Phase Status: in_progress
Jira Epic: N/A
Confluence Space: N/A

## What This Is

DJ Gig Platform is a per-gig web platform for DJs. Each event has a public attendee page and a private DJ admin dashboard backed by a shared Express/MongoDB API.

Attendees can view event details, request songs through iTunes search, vote on requests, and tip the DJ when the event is live. DJs can log in, manage event details, control the event lifecycle, moderate the request queue, and view tip totals in real time.

The detailed build specification lives in `docs/DJ_GIG_PLATFORM_SPEC.md`. This file is the phase and scope source of truth for day-to-day implementation decisions.

## Tech Stack

| Area | Choice | Notes |
| --- | --- | --- |
| Runtime | Node.js 20+ | Three package monorepo |
| Language | TypeScript strict mode | Server, client, and admin |
| Server | Express 5 | REST API and Stripe webhook |
| Database | MongoDB with Mongoose 8 | User, event, request, vote, and tip records |
| Real time | Socket.IO 4 | Event-scoped public/admin rooms |
| Auth | JWT, bcrypt | User-backed admin login with bootstrap admin credentials |
| Public frontend | React 18 + Vite | Attendee gig page |
| Admin frontend | React 18 + Vite | DJ dashboard |
| HTTP client | Axios | Browser-to-API calls |
| Admin state | Zustand | JWT persistence |
| Payments | Stripe | Tip PaymentIntent and webhook flow |
| Music search | iTunes Search API | Direct browser call; no server proxy |
| Uploads | Multer + Cloudinary | Hero image uploads stream to Cloudinary in all environments |
| Validation | Zod | Environment validation and request validation |
| Styling | Inline styles | No CSS framework |

## Architecture

The repository is a monorepo with three independently runnable packages:

| Package | Purpose | Local URL |
| --- | --- | --- |
| `server/` | Express API, MongoDB models, Socket.IO, auth, Stripe, Cloudinary | `http://localhost:4000` |
| `client/` | Public attendee gig page | `http://localhost:5173` |
| `admin/` | Private DJ dashboard | `http://localhost:5174` |

Runtime connections:

- REST calls use `http://localhost:4000/api`.
- Public event pages load events by slug through `/api/gigs/:slug`.
- Admin views load events by MongoDB event ID through `/api/admin/events/:eventId`.
- Socket.IO joins event-scoped rooms and must not broadcast globally.
- iTunes search runs directly from the browser using `https://itunes.apple.com/search`.
- Stripe webhooks require the raw request body before global JSON parsing.

## Database Schema

### User

User-backed authentication was introduced by ADR-0001.

Required fields:

- `email`
- `passwordHash`
- `displayName`
- `role`: `dj` or `admin`
- timestamps

Bootstrap behavior:

- On first login, the server creates or uses an admin user from `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

### Event

Required/core fields:

- `ownerId`
- `slug`
- `djName`
- `eventName`
- `tagline`
- `genre`
- `date`
- `startTime`
- `endTime`
- `timezone`
- `venue`
- `address`
- `coverInfo`
- `ticketLink`
- `instagramLink`
- `heroImageUrl`
- `status`: `draft`, `published`, `live`, or `ended`
- timestamps

Rules:

- Public URLs use `slug`.
- Admin APIs use event `_id`.
- Live state is controlled by `status`; do not auto-compute it from `date`.
- Events are owned by `ownerId`; admin role can see all events.

### SongRequest

Required/core fields:

- `eventId`
- `song`
- `artist`
- `album`
- `artworkUrl`
- `duration`
- `itunesTrackId`
- `voteCount`
- `status`: `pending`, `approved`, `played`, or `rejected`
- `requestedAt`

Rules:

- Enforce a unique compound index on `(eventId, itunesTrackId)`.
- Duplicate song submissions should return `409 Conflict` with the existing request.
- The client should vote for an existing duplicate instead of creating a second request.

### Vote

Required/core fields:

- `eventId`
- `songRequestId`
- `sessionIdHash`
- `ipHash`
- `createdAt`

Rules:

- Server-side vote deduplication is required.
- Client `localStorage` is only a UX helper.

### Tip

Required/core fields:

- `eventId`
- `amount`
- `currency`
- `stripePaymentIntentId`
- `stripeChargeId`
- `status`: `pending`, `succeeded`, or `failed`
- `stripeFee`
- timestamps

Rules:

- Tips are created through a Stripe PaymentIntent.
- Tip success/failure is finalized by the Stripe webhook.
- Tip totals in admin should update through Socket.IO after webhook confirmation.

## Phase 1 Scope

Phase 1 is the SaaS-ready MVP described in `docs/DJ_GIG_PLATFORM_SPEC.md` and ADR-0001.

In scope:

- Express API with validated environment configuration.
- MongoDB connection and Mongoose models for users, events, requests, votes, and tips.
- Admin login using JWT and bcrypt.
- Bootstrap admin credentials from server environment variables.
- Public event lookup by slug.
- Admin event CRUD and lifecycle controls.
- Cloudinary-only hero image upload with Multer memory storage, 5 MB max, images only. See ADR-0002.
- Public song request queue.
- iTunes browser-side search and request submission.
- Duplicate request handling through a unique `(eventId, itunesTrackId)` index.
- Server-side vote deduplication with vote records.
- Stripe tip intent creation and webhook reconciliation.
- Socket.IO updates scoped to the relevant event.
- Public attendee frontend.
- Private admin dashboard.
- Local development scripts for all three packages.
- Build and lint checks for packages that define them.

Out of scope for Phase 1 unless explicitly requested:

- Multi-tenant billing and subscriptions.
- DJ self-signup, password reset, and team invitations.
- Production deployment automation.
- Mobile app builds.
- Advanced analytics dashboards.
- Moderation tooling beyond request status changes.
- Confluence/Jira synchronization unless Atlassian tooling is explicitly available and requested.

## Current Implementation Notes

- The active admin app is `admin/`.
- The previous nested `client/admin/` Vite scaffold has been removed.
- Root `npm run dev` starts all three local processes through `concurrently`.
- Automated test scripts are not currently configured; use build and lint scripts as the verification baseline.
- `docs/` is canonical. Confluence, if used later, is only a publish target.

## Key Design Decisions

| ADR | Decision |
| --- | --- |
| ADR-0001 | Apply SaaS-ready MVP architecture: user-backed auth, event ownership, public slugs, event lifecycle status, vote records, scoped sockets, validated tip flow, and security hardening. |

## Environment Variables

### `server/.env`

Required:

- `NODE_ENV`
- `PORT`
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `MIN_TIP_AMOUNT`
- `MAX_TIP_AMOUNT`
- `TIP_CURRENCY`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLIENT_ORIGIN`
- `ADMIN_ORIGIN`

### `client/.env`

Required:

- `VITE_API_BASE_URL`
- `VITE_SOCKET_URL`
- `VITE_ITUNES_SEARCH_URL`
- `VITE_STRIPE_PUBLISHABLE_KEY`

Optional/fallback:

- `VITE_EVENT_SLUG`
- `VITE_EVENT_ID`

### `admin/.env`

Required:

- `VITE_API_BASE_URL`
- `VITE_SOCKET_URL`

## Local Development

Install dependencies in the root and each active package:

```bash
npm install
cd server && npm install
cd ../client && npm install
cd ../admin && npm install
```

Copy environment files:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
cp admin/.env.example admin/.env
```

Run all local services from the repository root:

```bash
npm run dev
```

Run individual services:

```bash
npm run dev:server
npm run dev:client
npm run dev:admin
```

Clean up stale local dev port listeners after closing the app:

```bash
npm run dev:cleanup:dry
npm run dev:cleanup
```

The cleanup command targets ports `4000`, `5173`, and `5174`.
To clean up an unexpected fallback port, pass it explicitly:

```bash
npm run dev:cleanup -- 5175
```

## Verification

There is no configured `npm test` script at this time.

Current verification commands:

```bash
cd server && npm run build
cd ../client && npm run lint && npm run build
cd ../admin && npm run lint && npm run build
```

When test tooling is added, update this section and the affected package scripts.
