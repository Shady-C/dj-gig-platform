# ADR-0003: Deploy API on Railway as a Single Instance

**Date:** 2026-05-28
**Status:** Accepted
**Jira:** N/A

## Context

Phase 1 originally excluded production deployment automation. The project now needs a deployment-ready path for the Express API, Stripe webhook, and Socket.IO server while keeping the public and admin frontends as Vercel static apps.

## Decision

Deploy the API from the `server/` monorepo root on Railway using the existing Dockerfile. Configure Railway health checks against `/health`, run one API instance for the MVP, and keep MongoDB external through MongoDB Atlas. Keep the client and admin as separate Vercel deployments pointed at the Railway API URL.

## Alternatives Considered

- Deploy the API on Render or Fly.io.
- Use Vercel serverless functions for the API.
- Add Redis and the Socket.IO adapter immediately for multi-instance scaling.

## Consequences

The server now needs proxy-aware IP handling through `TRUST_PROXY_HOPS`. Single-instance Socket.IO avoids Redis for Phase 1, but horizontal scaling requires sticky sessions or a Redis adapter later. Production setup is documented in `docs/12-deployment-production.md`.
