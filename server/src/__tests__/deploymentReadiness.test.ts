import jwt from 'jsonwebtoken';
import supertest from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { env } from '../config/env';
import type { Server } from 'socket.io';

const mockIo = { to: () => ({ emit: () => {} }) } as unknown as Server;
const app = buildApp(mockIo);

function adminToken() {
  return jwt.sign(
    { sub: '507f1f77bcf86cd799439011', email: 'admin@test.com', role: 'admin' },
    env.JWT_SECRET
  );
}

describe('deployment readiness hardening', () => {
  it('keeps health checks unauthenticated', async () => {
    const res = await supertest(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('configures Express trust proxy from validated env', () => {
    expect(app.get('trust proxy')).toBe(env.TRUST_PROXY_HOPS);
  });

  it('rejects invalid auth payloads with 400', async () => {
    const res = await supertest(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid request body');
  });

  it('rejects invalid event payloads before database writes', async () => {
    const res = await supertest(app)
      .post('/api/admin/events')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ eventName: '', djName: 'DJ', date: '2026-06-01' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid request body');
  });

  it('rejects malformed admin ObjectIds with 400', async () => {
    const res = await supertest(app)
      .get('/api/admin/events/not-an-object-id')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid request parameters');
  });

  it('rejects invalid event status values before database lookups', async () => {
    const res = await supertest(app)
      .patch('/api/admin/events/507f1f77bcf86cd799439011/status')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ status: 'cancelled' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid request body');
  });

  it('rejects invalid song request payloads before database lookups', async () => {
    const res = await supertest(app)
      .post('/api/gigs/friday-night/requests')
      .set('x-session-id', 'session-1')
      .send({ song: '', artist: 'Artist', itunesTrackId: '123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid request body');
  });

  it('rejects invalid request status values before database lookups', async () => {
    const res = await supertest(app)
      .patch('/api/admin/events/507f1f77bcf86cd799439011/requests/507f1f77bcf86cd799439012/status')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ status: 'archived' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid request body');
  });

  it('rejects invalid tip amounts before Stripe calls', async () => {
    const res = await supertest(app)
      .post('/api/gigs/friday-night/tips/intent')
      .set('x-session-id', 'session-1')
      .send({ amount: 1, currency: 'cad' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid request body');
  });

  it('rejects invalid tip currency before Stripe calls', async () => {
    const res = await supertest(app)
      .post('/api/gigs/friday-night/tips/intent')
      .set('x-session-id', 'session-1')
      .send({ amount: 500, currency: 'usd' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('currency must be cad');
  });
});
