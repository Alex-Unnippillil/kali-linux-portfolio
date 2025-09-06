// @jest-environment node

describe('Hydra API mock', () => {
  beforeEach(() => {
    process.env.FEATURE_TOOL_APIS = 'enabled';
    process.env.FEATURE_HYDRA = 'enabled';
  });

  afterEach(() => {
    delete process.env.FEATURE_TOOL_APIS;
    delete process.env.FEATURE_HYDRA;
    jest.resetModules();
  });

  it('returns mock output', async () => {
    const handler = (await import('../pages/api/hydra')).default;
    const req: any = {
      method: 'POST',
      body: { target: 'host', service: 'ssh', userList: 'u', passList: 'p' },
    };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ output: 'hydra mock' });
  });

  it('returns mock output for resume', async () => {
    const handler = (await import('../pages/api/hydra')).default;
    const req: any = { method: 'POST', body: { action: 'resume' } };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ output: 'hydra resume mock' });
  });
});
