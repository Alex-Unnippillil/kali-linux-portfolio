/**
 * @jest-environment node
 */

import { createMocks } from 'node-mocks-http';

describe('admin messages api', () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = 'http://localhost';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc';
  });

  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.ADMIN_READ_KEY;
  });

  it('logs unauthorized access', async () => {
    process.env.ADMIN_READ_KEY = 'secret';
    const { req, res } = createMocks({ method: 'GET', headers: {} });
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const { default: handler } = await import('../pages/api/admin/messages');
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(401);
    expect(spy).toHaveBeenCalled();
    const log = JSON.parse(spy.mock.calls[0][0]);
    expect(log.message).toMatch(/unauthorized/);
    spy.mockRestore();
  });
});
