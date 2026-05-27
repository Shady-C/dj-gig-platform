# ADR-0001: Apply SaaS-Ready MVP Architecture

**Date:** 2026-05-26
**Status:** Accepted
**Jira:** N/A

## Context
The system design critique identified several MVP shortcuts that would block product growth: environment-only admin authentication, hardcoded event IDs, client-only vote deduplication, a boolean live flag, open Socket.IO rooms, weak tip validation, and missing abuse-protection middleware.

## Decision
Introduce a `User` model, user-owned events, public event slugs, lifecycle-based event status, server-side `Vote` records, public/admin Socket.IO rooms, server-validated Stripe tip intents, richer tip metadata, and security middleware for headers, rate limiting, request size, query sanitization, and HTTP parameter pollution protection.

## Alternatives Considered
Keeping the original single-DJ design was simpler but would preserve hardcoded event routing and no ownership boundary. Deferring vote and payment hardening to a later phase was also considered, but those areas directly affect abuse prevention and money movement, so they should be enforced immediately.

## Consequences
Public traffic now uses `/api/gigs/:slug` routes and admin traffic uses `/api/admin/events/:eventId` routes. Existing data needs migration or reseeding because events now require `ownerId`, `slug`, `startTime`, `timezone`, and `status`, while song request vote counts move to `voteCount` with separate vote records.
