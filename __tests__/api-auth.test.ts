import { requireApiAuth } from '../lib/api-auth';

describe('requireApiAuth', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.API_AUTH_TOKEN;
    delete process.env.ADMIN_READ_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('accepts bearer token when API_AUTH_TOKEN is configured', () => {
    process.env.API_AUTH_TOKEN = 'secret-token';
    const req = {
      headers: { authorization: 'Bearer secret-token' },
    } as any;
    const json = jest.fn();
    const res = {
      status: jest.fn(() => ({ json })),
    } as any;

    expect(requireApiAuth(req, res)).toBe(true);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects unauthorized requests', () => {
    process.env.API_AUTH_TOKEN = 'secret-token';
    const req = {
      headers: { 'x-api-key': 'wrong' },
    } as any;
    const json = jest.fn();
    const res = {
      status: jest.fn(() => ({ json })),
    } as any;

    expect(requireApiAuth(req, res)).toBe(false);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns service unavailable when auth secret is missing', () => {
    const req = { headers: {} } as any;
    const json = jest.fn();
    const res = {
      status: jest.fn(() => ({ json })),
    } as any;

    expect(requireApiAuth(req, res)).toBe(false);
    expect(res.status).toHaveBeenCalledWith(503);
  });
});
