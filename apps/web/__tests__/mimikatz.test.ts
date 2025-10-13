import handler from '../pages/api/mimikatz';

type Res = ReturnType<typeof mockRes>;

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn();
  res.end = jest.fn();
  return res;
}

describe('mimikatz api', () => {
  beforeAll(() => {
    process.env.FEATURE_TOOL_APIS = 'enabled';
  });
  test('retrieves module list', async () => {
    const req: any = { method: 'GET', query: {} };
    const res: Res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const data = res.json.mock.calls[0][0];
    expect(Array.isArray(data.modules)).toBe(true);
    expect(data.modules.length).toBeGreaterThan(0);
    expect(data.modules.every((module: any) => typeof module.name === 'string')).toBe(true);
  });

  test('executes script template', async () => {
    const req: any = { method: 'POST', body: { script: 'test' } };
    const res: Res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const data = res.json.mock.calls[0][0];
    expect(data.output).toBe('Executed script: test');
  });

  test('executes ad-hoc command via query parameter', async () => {
    const req: any = { method: 'GET', query: { command: 'token::elevate' } };
    const res: Res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const data = res.json.mock.calls[0][0];
    expect(data.output).toBe('Executed token::elevate');
  });
});
