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
  test('retrieves module list', async () => {
    const req: any = { method: 'GET', query: {} };
    const res: Res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const data = res.json.mock.calls[0][0];
    expect(Array.isArray(data.modules)).toBe(true);
    expect(data.modules.length).toBeGreaterThan(0);
  });

  test('executes script template', async () => {
    const req: any = { method: 'POST', body: { script: 'test' } };
    const res: Res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const data = res.json.mock.calls[0][0];
    expect(data.output).toMatch(/Executed script/);
  });
});
