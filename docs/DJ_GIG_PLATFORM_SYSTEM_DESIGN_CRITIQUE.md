# DJ Gig Platform — System Design Critique & Architecture Improvements

Original spec reviewed from:
[DJ_GIG_PLATFORM_SPEC.md](/Users/shadychris/git/dj-gig-platform/docs/DJ_GIG_PLATFORM_SPEC.md)

---

# 1. High-Level Review

The original specification is a strong MVP implementation spec. It clearly defines:

- Repository structure
- Tech stack
- Models
- Routes
- Real-time architecture
- Stripe integration
- Cloudinary upload flow
- Frontend features
- Build checklist

However, the system is currently optimized for:

> "Build a working demo quickly"

Rather than:

> "Build a scalable product that can evolve into a real SaaS platform"

The goal of these updates is to preserve MVP simplicity while improving:

- Scalability
- Security
- Extensibility
- Multi-event support
- Multi-DJ support
- Abuse prevention
- Product evolution

---

# 2. Core Architectural Problems Identified

## 2.1 Hardcoded Single-DJ Authentication

### Current Design

```env
ADMIN_EMAIL=
ADMIN_PASSWORD=
```

The server validates against environment variables.

### Problems

- Only supports one DJ globally
- Cannot scale into SaaS
- No ownership model
- No per-user event isolation
- No account recovery
- Difficult future migration

### Recommended Fix

Introduce a proper `User` model immediately.

### Updated User Model

```text
User {
  _id
  email
  passwordHash
  displayName
  role: "dj" | "admin"
  createdAt
  updatedAt
}
```

### Benefits

- Multi-DJ support
- Proper ownership
- Easier permissions
- Future subscriptions possible
- Future teams/collaborators possible

## 2.2 Hardcoded Event ID in Frontend ENV

### Current Design

```env
VITE_EVENT_ID=
```

### Problems

- Requires one deployment per event
- Extremely difficult operationally
- Prevents scalable frontend routing
- No sharable permanent URLs

### Recommended Fix

Use public URL slugs.

### Public Route

```text
/gig/:slug
```

### Admin Route

```text
/admin/events/:eventId
```

### Updated Event Model

```text
slug: string
```

### Example

```text
/gig/friday-afrobeats-toronto
```

### Benefits

- One frontend deployment
- SEO-friendly URLs
- Easier sharing
- Real SaaS structure

## 2.3 Weak Vote Protection

### Current Design

Vote deduplication handled only in `localStorage`.

### Problems

- Easy to bypass
- Spam voting possible
- No server-side integrity
- No abuse prevention

### Recommended Fix

Create a dedicated `Vote` model.

### Updated Vote Model

```text
Vote {
  _id
  eventId
  songRequestId
  sessionIdHash
  ipHash
  createdAt
}
```

### Unique Index

```text
{ songRequestId: 1, sessionIdHash: 1 }
```

### Benefits

- Server-enforced vote protection
- Better analytics
- Abuse reduction
- Future moderation possible

## 2.4 Event Lifecycle Too Simple

### Current Design

```text
isLive: boolean
```

### Problems

Events typically move through multiple states. The current design cannot represent:

- Draft
- Published
- Live
- Ended
- Cancelled
- Archived

### Recommended Fix

Replace `isLive` with:

```text
status: "draft" | "published" | "live" | "ended"
```

### Benefits

- Cleaner business logic
- Better event lifecycle management
- Easier frontend rendering
- Easier automation later

## 2.5 Missing Event Time Fields

### Current Design

```text
date
endTime
```

### Problems

- Missing `startTime`
- Missing timezone support
- Ambiguous event timing

### Recommended Fix

Add:

```text
startTime: string
timezone: string
```

### Benefits

- Correct countdowns
- Cross-region support
- Easier future calendar integrations

## 2.6 Socket.IO Security Too Open

### Current Design

```ts
socket.emit("join-event", eventId)
```

### Problems

- No separation between public/admin rooms
- Anyone can potentially subscribe
- Sensitive updates exposed

### Recommended Fix

Separate room types.

### Public Room

```text
public:event:<eventId>
```

### Admin Room

```text
admin:event:<eventId>
```

### Admin Socket Authentication

Admin sockets must provide JWT during connection.

### Benefits

- Better isolation
- Cleaner permissions
- More secure admin events

## 2.7 Stripe Payment Validation Insufficient

### Current Design

Frontend submits amount.

### Problems

- Frontend cannot be trusted
- No server-side validation
- Missing metadata
- Missing idempotency handling

### Recommended Fix

Server validates:

- `MIN_TIP_AMOUNT`
- `MAX_TIP_AMOUNT`
- `currency`

Add PaymentIntent metadata:

```json
{
  "eventId": "<eventId>",
  "source": "dj_tip"
}
```

### Benefits

- Safer payments
- Better reconciliation
- Easier analytics

## 2.8 Tip Model Missing Important Fields

### Current Design

```text
amount
currency
status
```

### Recommended Additions

```text
tipperName?: string
message?: string
stripeChargeId?: string
paymentMethodType?: string
netAmount?: number
stripeFee?: number
```

### Benefits

- Better reporting
- Better accounting
- Better admin analytics

## 2.9 No Abuse Protection

### Missing Protections

- Rate limiting
- Helmet
- Request size limits
- Sanitization
- Upload protection

### Required Middleware

- `helmet`
- `express-rate-limit`
- `mongo-sanitize`
- `hpp`
- `cors`

### Benefits

- Reduced spam
- Reduced abuse
- Safer API

---

# 3. Recommended Updated Data Architecture

## User

```text
User {
  _id
  email
  passwordHash
  displayName
  role
  createdAt
  updatedAt
}
```

## Event

```text
Event {
  _id
  ownerId
  slug
  djName
  eventName
  tagline
  genre
  date
  startTime
  endTime
  timezone
  venue
  address
  coverInfo
  ticketLink
  instagramLink
  heroImageUrl
  status
  createdAt
  updatedAt
}
```

## SongRequest

```text
SongRequest {
  _id
  eventId
  song
  artist
  album
  artworkUrl
  duration
  itunesTrackId
  voteCount
  status
  requestedBySessionId
  requestedAt
}
```

## Vote

```text
Vote {
  _id
  eventId
  songRequestId
  sessionIdHash
  ipHash
  createdAt
}
```

## Tip

```text
Tip {
  _id
  eventId
  amount
  currency
  stripePaymentIntentId
  stripeChargeId
  status
  tipperName
  message
  createdAt
}
```

---

# 4. Recommended Route Structure

## Auth

```text
POST /api/auth/login
GET  /api/auth/me
```

## Events

```text
GET    /api/gigs/:slug
GET    /api/admin/events
POST   /api/admin/events
GET    /api/admin/events/:eventId
PATCH  /api/admin/events/:eventId
PATCH  /api/admin/events/:eventId/status
POST   /api/admin/events/:eventId/hero
```

## Requests

```text
GET    /api/gigs/:slug/requests
POST   /api/gigs/:slug/requests
POST   /api/gigs/:slug/requests/:requestId/vote
PATCH  /api/admin/events/:eventId/requests/:requestId/status
DELETE /api/admin/events/:eventId/requests/:requestId
```

## Tips

```text
POST /api/gigs/:slug/tips/intent
POST /api/stripe/webhook
GET  /api/admin/events/:eventId/tips
GET  /api/admin/events/:eventId/tips/summary
```

---

# 5. Recommended Frontend Routing

## Public

```text
/gig/:slug
```

## Admin

```text
/login
/dashboard
/events
/events/:eventId
```

---

# 6. Recommended MVP Security Stack

Required immediately:

- `helmet`
- `cors` allowlist
- `express-rate-limit`
- `bcrypt`
- JWT auth
- `zod` validation
- `multer` validation
- request body limits
- server-side vote enforcement
- server-side Stripe validation

---

# 7. Recommended MVP Development Phases

## Phase 1 — Core MVP

Build:

- DJ login
- Event creation
- Public event page
- Song requests
- Voting
- Admin queue
- Live status
- Stripe tips
- Hero uploads

## Phase 2 — Productization

Add:

- QR codes
- Event duplication
- Analytics
- CSV exports
- Moderation controls
- Request settings
- Tipper messages

## Phase 3 — SaaS Expansion

Add:

- Subscriptions
- Multiple DJs
- Teams
- Branding
- Custom domains
- Organization accounts

---

# 8. Key System Design Lessons

The original design answered:

> "What should we build?"

The improved design additionally answers:

- What breaks?
- What scales?
- What gets abused?
- What changes later?
- What needs isolation?
- What needs ownership?
- What needs future flexibility?

---

# 9. Core System Design Principles Learned

## Principle 1 — Design Around Business Ownership

Always ask:

> Who owns this data?

Ownership affects:

- Authentication
- Authorization
- Scaling
- Billing
- Permissions

## Principle 2 — URLs Are Part of Architecture

Bad:

```text
Hardcoded ENV IDs
```

Better:

```text
Resource-based URLs
```

## Principle 3 — Never Trust the Client

Frontend validation improves UX. Backend validation protects systems.

Always validate:

- Votes
- Payments
- Uploads
- Permissions
- Status changes

## Principle 4 — Separate Public and Private Systems

Public traffic and admin traffic should never behave identically.

Examples:

- Separate socket rooms
- Separate permissions
- Separate API routes

## Principle 5 — Model Future States Early

Avoid oversimplified booleans like:

```text
isLive: true
```

Instead use lifecycle states:

```text
draft
published
live
ended
```

This prevents future refactors.

---

# 10. Final Conclusion

The original spec is a very good implementation-oriented MVP specification.

The revised architecture improves:

- Scalability
- Maintainability
- Security
- SaaS readiness
- Data integrity
- Abuse prevention
- Multi-event flexibility

Without dramatically increasing MVP complexity.
