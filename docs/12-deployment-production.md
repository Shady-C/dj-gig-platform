# Production Deployment

This deployment path targets a single-instance MVP:

- API, Stripe webhook, and Socket.IO server on Railway.
- Public attendee app on Vercel.
- Admin app on Vercel as a separate project.
- MongoDB on MongoDB Atlas.
- Hero image storage on Cloudinary.

## 1. API on Railway

1. Create a Railway project from this Git repository.
2. Set the Railway service root directory to `server/`.
3. Let Railway build from `server/Dockerfile`.
4. Set the Railway config file path to `/server/railway.json`.
5. Configure the health check path as `/health`; `server/railway.json` also records this expected path.
6. Set these Railway environment variables:

```env
NODE_ENV=production
PORT=4000
TRUST_PROXY_HOPS=1
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
JWT_EXPIRES_IN=7d
ADMIN_EMAIL=...
ADMIN_PASSWORD=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
MIN_TIP_AMOUNT=50
MAX_TIP_AMOUNT=50000
TIP_CURRENCY=cad
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLIENT_ORIGIN=https://your-client.vercel.app
ADMIN_ORIGIN=https://your-admin.vercel.app
```

Use `server/.env.production.example` as the full reference.

## 2. MongoDB Atlas

1. Create an Atlas cluster.
2. Create a database user for the API.
3. Allow Railway outbound access. For a small MVP, Atlas network access may start broad and then be tightened once the Railway networking model is finalized.
4. Put the Atlas connection string in Railway as `MONGODB_URI`.

## 3. Client on Vercel

1. Create a Vercel project for `client/`.
2. Use `client` as the project root.
3. Set production env vars from `client/.env.production.example`.
4. Confirm `VITE_API_BASE_URL` ends with `/api`.
5. Confirm `VITE_SOCKET_URL` is the Railway API origin without `/api`.

## 4. Admin on Vercel

1. Create a second Vercel project for `admin/`.
2. Use `admin` as the project root.
3. Set production env vars from `admin/.env.production.example`.
4. Add the admin Vercel URL to Railway as `ADMIN_ORIGIN`.

## 5. Stripe

1. Start with Stripe test keys for smoke testing.
2. Create a webhook endpoint pointing to:

```text
https://your-api.up.railway.app/api/stripe/webhook
```

3. Subscribe to `payment_intent.succeeded` and `payment_intent.payment_failed`.
4. Store the webhook signing secret in Railway as `STRIPE_WEBHOOK_SECRET`.
5. Switch to live keys before public launch.

## 6. Cloudinary

1. Create or choose a Cloudinary product environment.
2. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in Railway.
3. Hero uploads are stored in `dj-gig-platform/heroes`.

## 7. Smoke Test

Run this after every production deploy:

1. Open `https://your-api.up.railway.app/health` and confirm `status: "ok"`.
2. Log in to the admin app with the bootstrap admin credentials.
3. Create or update an event.
4. Open the public `/gig/:slug` URL.
5. Submit a song request and vote once.
6. Confirm the admin queue updates in real time.
7. Create a Stripe test tip and confirm the webhook changes the tip status to `succeeded`.

## Scaling Note

Phase 1 runs one API instance. Do not increase Railway replicas until Socket.IO is updated with sticky sessions or a Redis adapter.
