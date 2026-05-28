import { describe, it, expect, vi, afterEach } from 'vitest';
import { errorHandler } from '../middleware/errorHandler';

vi.mock('../utils/logger', () => ({
  logger: { error: vi.fn() },
}));

const mockReq = {} as Parameters<typeof errorHandler>[1];
const mockNext = vi.fn();

function makeRes() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { res: { status, json } as unknown as Parameters<typeof errorHandler>[2], json };
}

afterEach(() => {
  delete process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
});

describe('errorHandler', () => {
  it('hides 5xx error message in production', () => {
    process.env.NODE_ENV = 'production';
    const err = Object.assign(new Error('secret db details'), { status: 500 });
    const { res, json } = makeRes();

    errorHandler(err, mockReq, res, mockNext);

    expect(json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });

  it('exposes 5xx error message in development', () => {
    process.env.NODE_ENV = 'development';
    const err = Object.assign(new Error('useful debug info'), { status: 500 });
    const { res, json } = makeRes();

    errorHandler(err, mockReq, res, mockNext);

    expect(json).toHaveBeenCalledWith({ error: 'useful debug info' });
  });

  it('always exposes 4xx error messages, even in production', () => {
    process.env.NODE_ENV = 'production';
    const err = Object.assign(new Error('Email and password required'), { status: 400 });
    const { res, json } = makeRes();

    errorHandler(err, mockReq, res, mockNext);

    expect(json).toHaveBeenCalledWith({ error: 'Email and password required' });
  });

  it('uses the err.status as the response status code', () => {
    const err = Object.assign(new Error('not found'), { status: 404 });
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const res = { status } as unknown as Parameters<typeof errorHandler>[2];

    errorHandler(err, mockReq, res, mockNext);

    expect(status).toHaveBeenCalledWith(404);
  });

  it('defaults to 500 when err.status is not set', () => {
    const err = new Error('something broke');
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const res = { status } as unknown as Parameters<typeof errorHandler>[2];

    errorHandler(err, mockReq, res, mockNext);

    expect(status).toHaveBeenCalledWith(500);
  });
});
