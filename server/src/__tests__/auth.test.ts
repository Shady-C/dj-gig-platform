import supertest from 'supertest';
import { describe, it, expect } from 'vitest';
import { buildApp } from '../app';
import type { Server } from 'socket.io';

const mockIo = { to: () => ({ emit: () => {} }) } as unknown as Server;
const app = buildApp(mockIo);

describe('POST /api/auth/login', () => {
  it('returns 400 when body is empty', async () => {
    const res = await supertest(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('returns 400 when password is missing', async () => {
    const res = await supertest(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com' });
    expect(res.status).toBe(400);
  });

  it('returns 401 for wrong password', async () => {
    const res = await supertest(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'wrongpassword' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('returns 200 with token for correct admin credentials', async () => {
    const res = await supertest(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'testpassword' });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.length).toBeGreaterThan(0);
  }, 15_000); // bcrypt with 12 rounds can be slow
});
