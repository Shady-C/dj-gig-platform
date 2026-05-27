# ADR-0002: Use Cloudinary for All Hero Image Uploads

**Date:** 2026-05-27
**Status:** Accepted
**Jira:** N/A

## Context

The original specification allowed hero uploads to use `server/uploads/heroes` in local development and Cloudinary in production. The implementation now streams uploaded image buffers directly to Cloudinary, and the server no longer mounts or serves `/uploads`.

## Decision

Use Cloudinary as the only storage backend for hero image uploads in every environment. Keep Multer memory storage for multipart parsing, validation, and size limits, then upload the buffer to the `dj-gig-platform/heroes` Cloudinary folder.

## Alternatives Considered

- Keep local filesystem uploads in development and Cloudinary in production.
- Add a configurable storage adapter with local and Cloudinary backends.

## Consequences

Local development needs valid Cloudinary credentials to test hero uploads. The code path is simpler and matches production behavior, and the repository no longer needs a local upload directory or static `/uploads` serving.
