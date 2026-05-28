import supertest from 'supertest';
import { describe, it, expect } from 'vitest';
import { buildApp } from '../app';
import type { Server } from 'socket.io';

const mockIo = { to: () => ({ emit: () => {} }) } as unknown as Server;
const app = buildApp(mockIo);

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await supertest(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptime).toBe('number');
    expect(typeof res.body.timestamp).toBe('string');
  });
});
