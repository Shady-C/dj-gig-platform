# Changelog

## [Unreleased]

- [ADR-0002] Removed local filesystem hero image storage and made Cloudinary credentials required for uploads in all environments.
- Added a root `npm run dev:cleanup` utility to stop stale local dev port listeners.
- Locked Vite dev servers to strict documented ports so stale listeners fail visibly instead of shifting ports.
- Added `docs/PROJECT_CONTEXT.md` as the phase and scope source of truth.
- [ADR-0001] Applied SaaS-ready MVP architecture from the system design critique.
- Removed leftover nested `client/admin/` Vite scaffold; the active admin app is `admin/`.
