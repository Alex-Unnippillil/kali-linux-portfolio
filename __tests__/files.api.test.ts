import handler from '../pages/api/files';

type Req = {
  method: string;
  query: { [key: string]: any };
};

function createRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn((data) => {
    res.body = data;
    return res;
  });
  res.end = jest.fn();
  return res;
}

async function call(req: Req) {
  const res = createRes();
  await handler(req as any, res as any);
  return res;
}

describe('files api', () => {
  it('lists root directory', async () => {
    const res = await call({ method: 'GET', query: {} });
    expect(res.body.items).toBeTruthy();
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('prevents path traversal', async () => {
    const res = await call({ method: 'GET', query: { path: '../../' } });
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns file content', async () => {
    const res = await call({ method: 'GET', query: { path: 'README.md' } });
    expect(res.body.content).toContain('Kali Linux Portfolio');
  });
});
