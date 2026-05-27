# DJ Gig Platform — Claude Code Build Spec

> Full-stack MERN application. Two React frontends (client landing page + admin dashboard) backed by a shared Express/MongoDB API. Real-time updates via Socket.IO. Read this entire file before writing a single line of code.

---

## 1. Project Overview

A per-gig web platform for DJs. For each event, the DJ generates a public-facing landing page and a private admin dashboard. Attendees can view event details, request songs (searching via iTunes API), vote on requests, and tip the DJ when the event is live. The DJ manages everything from the admin side in real time.

---

## 2. Repository Structure

```
dj-gig-platform/
├── server/                        # Express + MongoDB API
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.ts              # Mongoose connection
│   │   │   └── env.ts             # Validated env vars (using zod)
│   │   ├── models/
│   │   │   ├── Event.ts
│   │   │   ├── SongRequest.ts
│   │   │   └── Tip.ts
│   │   ├── routes/
│   │   │   ├── events.ts          # CRUD for events
│   │   │   ├── requests.ts        # Song request queue
│   │   │   └── tips.ts            # Tip recording
│   │   ├── middleware/
│   │   │   ├── auth.ts            # Admin JWT guard
│   │   │   └── errorHandler.ts
│   │   ├── socket/
│   │   │   └── handlers.ts        # Socket.IO event handlers
│   │   └── index.ts               # App entry point
│   ├── .env                       # See Section 5
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── client/                        # Public-facing gig landing page
│   ├── src/
│   │   ├── api/
│   │   │   └── index.ts           # Axios instance + all API calls
│   │   ├── components/
│   │   │   ├── CountdownTimer.tsx
│   │   │   ├── EventDetails.tsx
│   │   │   ├── HeroSection.tsx
│   │   │   ├── MusicSearchPanel.tsx
│   │   │   ├── SongRequestCard.tsx
│   │   │   ├── SongRequestQueue.tsx
│   │   │   └── TipModal.tsx
│   │   ├── hooks/
│   │   │   ├── useEvent.ts        # Fetch + socket-sync event data
│   │   │   ├── useRequests.ts     # Fetch + socket-sync queue
│   │   │   └── useSocket.ts       # Socket.IO client setup
│   │   ├── pages/
│   │   │   └── GigPage.tsx        # Main page, composes all components
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── vite-env.d.ts
│   ├── .env
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
│
├── admin/                         # Private DJ admin dashboard
│   ├── src/
│   │   ├── api/
│   │   │   └── index.ts           # Axios instance (with auth header) + all API calls
│   │   ├── components/
│   │   │   ├── EventEditor.tsx
│   │   │   ├── QueueItem.tsx
│   │   │   ├── StatCard.tsx
│   │   │   └── TipRow.tsx
│   │   ├── hooks/
│   │   │   ├── useAdminEvent.ts
│   │   │   ├── useAdminQueue.ts
│   │   │   ├── useAdminTips.ts
│   │   │   └── useSocket.ts
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   └── DashboardPage.tsx  # Tabs: Queue / Tips / Stats / Event
│   │   ├── store/
│   │   │   └── authStore.ts       # Zustand store for JWT token
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── vite-env.d.ts
│   ├── .env
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
│
└── README.md
```

---

## 3. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Runtime | Node.js 20+ | |
| Language | TypeScript (strict) | All three packages |
| Server framework | Express 5 | |
| Database | MongoDB via Mongoose 8 | |
| Real-time | Socket.IO 4 | Server + both clients |
| Auth | JWT (jsonwebtoken) + bcrypt | User-backed DJ/admin accounts |
| Client framework | React 18 + Vite | Both frontends |
| HTTP client | Axios | Both frontends |
| State | Zustand | Admin auth store; local state elsewhere |
| Styling | Inline styles (match existing designs) | No CSS framework |
| Fonts | Bebas Neue + DM Sans via Google Fonts | |
| Payment | Stripe.js + Stripe Node SDK | Tip flow |
| Music search | iTunes Search API | Free, no key required |
| File upload | Multer + Cloudinary | Hero image uploads |
| Validation | Zod | Server-side env + request bodies |
| Linting | ESLint + Prettier | |

---

## 4. MongoDB Data Models

### 4.1 Event

```typescript
// server/src/models/Event.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent extends Document {
  djName: string;
  ownerId: mongoose.Types.ObjectId;
  slug: string;
  eventName: string;
  tagline: string;
  date: Date;
  startTime: string;
  endTime: string;           // e.g. "3:00 AM"
  timezone: string;
  venue: string;
  address: string;
  coverInfo: string;         // e.g. "19+ | Smart Casual | $15 at door"
  ticketLink: string;
  instagramLink: string;
  heroImageUrl: string;      // Cloudinary URL
  status: 'draft' | 'published' | 'live' | 'ended';
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>({
  djName:        { type: String, required: true },
  eventName:     { type: String, required: true },
  tagline:       { type: String, default: '' },
  date:          { type: Date,   required: true },
  endTime:       { type: String, required: true },
  venue:         { type: String, required: true },
  address:       { type: String, default: '' },
  coverInfo:     { type: String, default: '' },
  ticketLink:    { type: String, default: '' },
  instagramLink: { type: String, default: '' },
  heroImageUrl:  { type: String, default: '' },
  status:        { type: String, enum: ['draft','published','live','ended'], default: 'draft' },
}, { timestamps: true });

export default mongoose.model<IEvent>('Event', EventSchema);
```

### 4.2 SongRequest

```typescript
// server/src/models/SongRequest.ts
import mongoose, { Schema, Document } from 'mongoose';

export type RequestStatus = 'pending' | 'approved' | 'played' | 'rejected';

export interface ISongRequest extends Document {
  eventId: mongoose.Types.ObjectId;
  song: string;
  artist: string;
  album: string;
  artworkUrl: string;
  duration: string;          // formatted "3:24"
  itunesTrackId: number;     // from iTunes API
  voteCount: number;
  status: RequestStatus;
  requestedAt: Date;
}

const SongRequestSchema = new Schema<ISongRequest>({
  eventId:        { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  song:           { type: String, required: true },
  artist:         { type: String, required: true },
  album:          { type: String, default: '' },
  artworkUrl:     { type: String, default: '' },
  duration:       { type: String, default: '' },
  itunesTrackId:  { type: Number, required: true },
  voteCount:      { type: Number, default: 1 },
  status:         { type: String, enum: ['pending','approved','played','rejected'], default: 'pending' },
  requestedAt:    { type: Date, default: Date.now },
});

// Prevent duplicate track requests per event
SongRequestSchema.index({ eventId: 1, itunesTrackId: 1 }, { unique: true });

export default mongoose.model<ISongRequest>('SongRequest', SongRequestSchema);
```

### 4.3 Vote

Votes are enforced server-side with a stable browser session ID sent as `x-session-id`. The server stores only hashes.

```typescript
Vote {
  eventId
  songRequestId
  sessionIdHash
  ipHash
  createdAt
}
```

### 4.3 Tip

```typescript
// server/src/models/Tip.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ITip extends Document {
  eventId: mongoose.Types.ObjectId;
  amount: number;                 // in cents
  currency: string;               // 'cad'
  stripePaymentIntentId: string;
  status: 'pending' | 'succeeded' | 'failed';
  createdAt: Date;
}

const TipSchema = new Schema<ITip>({
  eventId:               { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  amount:                { type: Number, required: true },
  currency:              { type: String, default: 'cad' },
  stripePaymentIntentId: { type: String, required: true, unique: true },
  status:                { type: String, enum: ['pending','succeeded','failed'], default: 'pending' },
}, { timestamps: true });

export default mongoose.model<ITip>('Tip', TipSchema);
```

---

## 5. Environment Variables

### 5.1 Server — `server/.env`

```env
# ── App ──────────────────────────────────────────
NODE_ENV=development
PORT=4000

# ── MongoDB ───────────────────────────────────────
MONGODB_URI=mongodb://localhost:27017/dj-gig-platform
# Production: MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/dj-gig-platform

# ── Auth ──────────────────────────────────────────
JWT_SECRET=REPLACE_WITH_LONG_RANDOM_SECRET_MIN_32_CHARS
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_EXPIRES_IN=7d

# Bootstrap admin credentials. Server creates/uses this User on first login.
ADMIN_EMAIL=dj@example.com
ADMIN_PASSWORD=REPLACE_WITH_SECURE_PASSWORD

# ── Stripe ────────────────────────────────────────
STRIPE_SECRET_KEY=sk_test_REPLACE_WITH_YOUR_STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_REPLACE_WITH_YOUR_WEBHOOK_SECRET
MIN_TIP_AMOUNT=50
MAX_TIP_AMOUNT=50000
TIP_CURRENCY=cad
# Get from: https://dashboard.stripe.com/test/apikeys
# Webhook: https://dashboard.stripe.com/test/webhooks

# ── Cloudinary ────────────────────────────────────
CLOUDINARY_CLOUD_NAME=REPLACE_WITH_YOUR_CLOUD_NAME
CLOUDINARY_API_KEY=REPLACE_WITH_YOUR_API_KEY
CLOUDINARY_API_SECRET=REPLACE_WITH_YOUR_API_SECRET
# Get from: https://console.cloudinary.com/

# ── CORS ──────────────────────────────────────────
CLIENT_ORIGIN=http://localhost:5173
ADMIN_ORIGIN=http://localhost:5174
```

### 5.2 Client — `client/.env`

```env
# Base URL of the Express server
VITE_API_BASE_URL=http://localhost:4000/api

# Socket.IO server URL
VITE_SOCKET_URL=http://localhost:4000

# iTunes Search API (no key needed — direct browser call)
VITE_ITUNES_SEARCH_URL=https://itunes.apple.com/search

# Stripe publishable key (for Stripe.js on tip flow)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_REPLACE_WITH_YOUR_STRIPE_PUBLISHABLE_KEY

# Optional fallback slug when not serving /gig/:slug
VITE_EVENT_SLUG=friday-afrobeats-toronto
```

### 5.3 Admin — `admin/.env`

```env
# Base URL of the Express server
VITE_API_BASE_URL=http://localhost:4000/api

# Socket.IO server URL
VITE_SOCKET_URL=http://localhost:4000

# The event ID this admin instance manages
VITE_EVENT_ID=REPLACE_WITH_MONGODB_EVENT_ID
```

---

## 6. Server API Routes

All routes prefixed `/api`. Auth-guarded routes require `Authorization: Bearer <jwt>` header.

### 6.1 Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | — | DJ logs in; returns JWT |
| GET | `/api/auth/me` | ✅ Admin | Returns current user profile |

**POST /api/auth/login body:**
```json
{ "email": "dj@example.com", "password": "..." }
```

**Response:**
```json
{ "token": "eyJ..." }
```

### 6.2 Events

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/gigs/:slug` | — | Get public event data by slug |
| GET | `/api/admin/events` | ✅ Admin | List owned/admin-visible events |
| POST | `/api/admin/events` | ✅ Admin | Create a new event |
| GET | `/api/admin/events/:eventId` | ✅ Admin | Get event by ID |
| PATCH | `/api/admin/events/:eventId` | ✅ Admin | Update event fields |
| PATCH | `/api/admin/events/:eventId/status` | ✅ Admin | Set lifecycle status |
| POST | `/api/admin/events/:eventId/hero` | ✅ Admin | Upload hero image (multipart) → Cloudinary |

### 6.3 Song Requests

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/gigs/:slug/requests` | — | Get all requests sorted by vote count desc |
| POST | `/api/gigs/:slug/requests` | — | Submit a new song request; requires `x-session-id` |
| POST | `/api/gigs/:slug/requests/:requestId/vote` | — | Adds one server-enforced session vote |
| PATCH | `/api/admin/events/:eventId/requests/:requestId/status` | ✅ Admin | Update status (approved/played/rejected) |
| PATCH | `/api/admin/events/:eventId/requests/bulk-status` | ✅ Admin | Bulk status update |
| DELETE | `/api/admin/events/:eventId/requests/:requestId` | ✅ Admin | Hard delete a request |

**POST request body (new song request):**
```json
{
  "song": "Unavailable",
  "artist": "Davido ft. Musa Keys",
  "album": "Timeless",
  "artworkUrl": "https://is1-ssl.mzstatic.com/...",
  "duration": "3:14",
  "itunesTrackId": 123456789
}
```

**PATCH bulk-status body:**
```json
{ "status": "approved", "filter": "pending" }
```

### 6.4 Tips

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/gigs/:slug/tips/intent` | — | Create validated Stripe PaymentIntent; returns `clientSecret` |
| POST | `/api/stripe/webhook` | — | Stripe webhook — marks tip succeeded/failed |
| GET | `/api/admin/events/:eventId/tips` | ✅ Admin | List all tips for event |
| GET | `/api/admin/events/:eventId/tips/summary` | ✅ Admin | Total amount, count, average |

**POST /tip/intent body:**
```json
{ "amount": 2000 }
```
*(amount in cents — $20.00)*

---

## 7. Socket.IO Events

The server emits real-time updates to scoped public/admin event rooms (`public:event:<eventId>` and `admin:event:<eventId>`).

### 7.1 Client joins room on connect:
```typescript
socket.emit('join-public-event', eventId);
socket.emit('join-admin-event', eventId); // JWT required in socket auth
```

### 7.2 Server → Client emissions

| Event | Payload | Trigger |
|-------|---------|---------|
| `event:updated` | `Partial<IEvent>` | Admin updates any event field |
| `event:status-changed` | `{ status: EventStatus }` | Admin changes event lifecycle |
| `request:new` | `ISongRequest` | New song request submitted |
| `request:voted` | `{ _id: string, voteCount: number }` | Vote count updated |
| `request:status-changed` | `{ _id: string, status: RequestStatus }` | Admin changes status |
| `tip:received` | `{ amount: number, currency: string }` | Stripe webhook confirms payment |

### 7.3 Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join-public-event` | `eventId: string` | Join the public room for this event |
| `join-admin-event` | `eventId: string` | Join the admin room for this event; socket auth token required |

---

## 8. Client Frontend — Feature Spec

Route: `/gig/:slug` (single deployment; optional `VITE_EVENT_SLUG` fallback)

### 8.1 HeroSection
- Full-width image from `event.heroImageUrl`
- CSS filters: `brightness(0.45) contrast(1.1) saturate(0.7)`
- Gradient overlay fading to background at bottom
- **LIVE NOW** badge (pulsing red dot) — shown when `event.status === "live"`
- Share button (top-right) — copies current URL to clipboard, shows ✓ on success
- Event name (`Bebas Neue`), tagline, DJ name overlaid at bottom

### 8.2 CountdownTimer
- Real-time countdown (D / H / M / S) to `event.date`
- When `event.status === "live"`: replace with "🔥 THE NIGHT IS NOW 🔥"
- Updates every second via `setInterval`

### 8.3 EventDetails
- Date (formatted: "Saturday, June 20, 2026")
- Time range (`startTime` — `endTime`)
- Venue + address
- Cover / age / dress code
- All pulled from API; updates in real time via `event:updated` socket

### 8.4 Action Buttons
- **Get Tickets** — primary CTA, links to `event.ticketLink`, opens in new tab
- **Instagram** — icon button, links to `event.instagramLink`, opens in new tab

### 8.5 MusicSearchPanel
- Debounced input (420ms) hits iTunes Search API directly from the browser:
  `GET https://itunes.apple.com/search?term=<query>&media=music&entity=song&limit=8`
- Display results: artwork (100x100), song name, artist, album, duration
- Tap artwork → play 30s preview (`track.previewUrl`) via `new Audio()`
- **+ Request** button:
  - `POST /api/gigs/:slug/requests` with track data and `x-session-id`
  - On success: button becomes `✓ Added`, song appears in queue
  - If `itunesTrackId` already in queue: button becomes `▲ Vote` and increments existing entry

### 8.6 SongRequestQueue
- Fetched from `GET /api/gigs/:slug/requests` on mount
- Updates in real time via `request:new`, `request:voted`, `request:status-changed` sockets
- Sorted by `voteCount` descending
- Each card shows: rank, artwork, song name, artist, album, duration
- **Vote button** — `POST /api/gigs/:slug/requests/:requestId/vote`
  - One vote per session enforced by server-side `Vote` records
  - Shows current vote count; highlights orange when voted

### 8.7 Tip the DJ (Floating Button + Modal)
- Floating pill button — fixed bottom-right
- When `event.status !== "live"`: muted, disabled, shows "Tipping opens at showtime"
- When `event.status === "live"`: glows orange, opens tip modal
- **TipModal**:
  - Amount selector: $5, $10, $20, $50
  - On confirm: `POST /api/gigs/:slug/tips/intent` → get Stripe `clientSecret`
  - Use Stripe.js `stripe.confirmCardPayment(clientSecret, { payment_method: ... })`
  - On success: show "🔥 You're a legend!" confirmation
  - *(Stripe Elements card input for card details)*

---

## 9. Admin Frontend — Feature Spec

Route: `/` (protected; redirects to `/login` if no token in Zustand store)

### 9.1 LoginPage
- Email + password form
- `POST /api/auth/login` → store JWT in Zustand + `localStorage`
- Redirect to dashboard on success

### 9.2 Dashboard Header
- Event name + DJ name
- **GO LIVE / LIVE toggle button**:
  - `PATCH /api/admin/events/:eventId/status` → `{ status: 'live' }`
  - Emits `event:status-changed` via socket to all connected clients
  - Shows pulsing red dot when live

### 9.3 Tab: Queue
- Filter pills: All / Pending / Approved / Played / Rejected (with counts)
- Sorted by `voteCount` descending within each filter
- Each `QueueItem` shows:
  - Vote count, artwork emoji fallback, song, artist, duration, status badge
  - **Action buttons**:
    - ✓ Approve → `PATCH .../status` `{ status: 'approved' }`
    - ♫ Mark Played → `PATCH .../status` `{ status: 'played' }`
    - ✕ Reject → `PATCH .../status` `{ status: 'rejected' }`
- **Bulk actions** (shown when pending > 0):
  - "Approve All Pending" → `PATCH .../bulk-status` `{ status: 'approved', filter: 'pending' }`
  - "Reject All Pending" → `PATCH .../bulk-status` `{ status: 'rejected', filter: 'pending' }`
- All changes emit `request:status-changed` socket event

### 9.4 Tab: Tips
- Stat cards: Total collected, Avg tip, Transaction count
- Full tip history list: amount, timestamp
- Updates in real time via `tip:received` socket

### 9.5 Tab: Stats
- Stat cards: Total requests, Played count, Total tips, Avg tip
- Top 3 most-voted songs
- Stacked progress bar: approved / played / pending / rejected breakdown

### 9.6 Tab: Event Editor
- Hero image preview (live as URL changes)
- Editable fields: Event Name, DJ Name, Genre/Vibe, Date, Start Time, End Time, Venue, Address, Cover Info, Ticket Link, Instagram Link
- Hero Image: file upload via `<input type="file">` → `POST /api/admin/events/:eventId/hero` (multipart) → Cloudinary URL saved to event
- Save button: `PATCH /api/admin/events/:eventId`
- Emits `event:updated` socket to update all connected client pages in real time
- Success toast on save

---

## 10. Authentication Flow

```
Admin logs in
  → POST /api/auth/login { email, password }
  → Server verifies bcrypt hash on User record
  → Bootstrap admin User is created from ADMIN_EMAIL / ADMIN_PASSWORD on first login
  → Returns signed JWT (payload: { sub, email, role })
  → Admin stores token in Zustand + localStorage
  → All subsequent admin API calls include Authorization: Bearer <token>
  → Auth middleware validates JWT on every protected route
```

Admin access is user-backed. Events are owned by `ownerId`; admin role can see all events.

---

## 11. Stripe Tip Flow

```
1. Client selects tip amount ($5, $10, $20, $50)
2. Client POSTs to /api/gigs/:slug/tips/intent { amount: <cents>, idempotencyKey }
3. Server validates min/max/currency and creates Stripe PaymentIntent with metadata
4. Server saves Tip doc with status: 'pending'
5. Server returns { clientSecret }
6. Client uses Stripe.js to collect card details + confirm payment
7. Stripe calls POST /api/stripe/webhook on payment completion
8. Webhook handler:
   - Verifies signature with STRIPE_WEBHOOK_SECRET
   - On payment_intent.succeeded → update Tip status to 'succeeded'
   - Emit tip:received socket event to admin room
9. Client shows success confirmation
```

---

## 12. Cloudinary Hero Image Upload Flow

```
1. Admin selects image file in Event Editor
2. Frontend POSTs multipart form to POST /api/admin/events/:eventId/hero
3. Multer middleware processes the file (memory storage, 5MB limit, images only)
4. Server uploads buffer to Cloudinary (folder: 'dj-gig-platform/heroes')
5. Cloudinary returns secure_url
6. Server updates Event.heroImageUrl in MongoDB
7. Server emits event:updated { heroImageUrl } socket event
8. All connected clients update hero image in real time
```

---

## 13. Build & Dev Scripts

### Root `package.json` (optional monorepo convenience scripts):
```json
{
  "scripts": {
    "dev:server": "cd server && npm run dev",
    "dev:client": "cd client && npm run dev",
    "dev:admin": "cd admin && npm run dev -- --port 5174",
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\" \"npm run dev:admin\""
  }
}
```

### Server scripts:
```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

### Client + Admin scripts:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

---

## 14. Key Implementation Notes for Claude Code

1. **TypeScript strict mode** — `"strict": true` in all `tsconfig.json` files. No `any` types.

2. **Environment validation** — Use `zod` in `server/src/config/env.ts` to validate all env vars at startup. Throw and exit if any required var is missing.

3. **Socket rooms** — Public listeners join `public:event:<eventId>` and admin listeners join `admin:event:<eventId>` with socket JWT auth. Never broadcast globally.

4. **Vote deduplication** — The server enforces one vote per browser session with `Vote` records keyed by `songRequestId + sessionIdHash`. Client `localStorage` is UX only.

5. **iTunes API call location** — The iTunes search happens directly from the **browser** (client frontend), not through the server. The server only stores the resulting track metadata when a request is submitted.

6. **Duplicate request handling** — The `SongRequest` model has a unique compound index on `(eventId, itunesTrackId)`. If a client tries to request an already-requested song, the server should respond with `409 Conflict` and the existing request document. The client should then call the vote endpoint instead.

7. **Event lifecycle** — `event.status` is set manually by admin. Do NOT auto-compute live state from the date — the DJ controls when the event starts.

8. **CORS** — Configure Express CORS to allow `CLIENT_ORIGIN` and `ADMIN_ORIGIN` from env. Socket.IO cors must match.

9. **Error handling** — All async route handlers must use try/catch or an async wrapper. The `errorHandler` middleware catches everything and returns `{ error: message }` JSON.

10. **Stripe webhook raw body** — The Stripe webhook endpoint must receive the raw request body (not JSON-parsed). Configure Express to use `express.raw({ type: 'application/json' })` for that route only, before `express.json()` applies globally.

11. **Admin port** — Run the admin Vite dev server on port `5174` to avoid conflict with the client on `5173`.

12. **Hero image** — Validate file type (images only) and size (max 5MB) in the Multer middleware before hitting Cloudinary.

13. **Existing UI designs** — The JSX component structure and all inline styles are already designed and finalised. Replicate them exactly when implementing `client/src/` and `admin/src/`. Do not redesign; only wire up real data and socket connections.

---

## 15. Deployment Notes (for later)

- **Server**: Railway, Render, or Fly.io — set all env vars in platform dashboard
- **Client**: Vercel — set `VITE_*` vars; public event URLs use `/gig/:slug`
- **Admin**: Vercel (separate project) — same env setup
- **MongoDB**: MongoDB Atlas free tier to start
- **Cloudinary**: Free tier covers ~25GB storage
- **Stripe**: Switch `sk_test_*` → `sk_live_*` and `pk_test_*` → `pk_live_*` before going live
- Socket.IO in production requires sticky sessions if load-balanced (use Redis adapter)

---

## 16. Getting Started Checklist

- [ ] `mkdir dj-gig-platform && cd dj-gig-platform`
- [ ] Scaffold `server/` with `npm init -y`, install deps, configure `tsconfig.json`
- [ ] Scaffold `client/` with `npm create vite@latest client -- --template react-ts`
- [ ] Scaffold `admin/` with `npm create vite@latest admin -- --template react-ts`
- [ ] Copy `.env.example` → `.env` in all three packages and fill in placeholders
- [ ] Start with `server/src/index.ts` → connect MongoDB → define routes → add Socket.IO
- [ ] Build models (Event, SongRequest, Tip)
- [ ] Implement all routes (auth, events, requests, tips, webhook)
- [ ] Wire client frontend: `useEvent` + `useRequests` hooks → replace mock data with real API calls
- [ ] Wire admin frontend: same pattern with auth header on all calls
- [ ] Connect Socket.IO on both frontends using `useSocket` hook
- [ ] Test tip flow end-to-end with Stripe test cards
- [ ] Test hero upload with a real image file
