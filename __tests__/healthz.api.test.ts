import { execSync } from 'child_process';
import pkg from '../package.json';

function mockReqRes({ method }: { method: string }) {
  const req: any = { method };
  const res: any = { statusCode: 200 };
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.data = data;
    return res;
  };
  return { req, res };
}

describe('healthz api', () => {
  test('returns build info and git sha without sensitive data', async () => {
    const { default: handler } = await import('../pages/api/healthz');
    const { req, res } = mockReqRes({ method: 'GET' });
    await handler(req, res);

    const expectedSha = execSync('git rev-parse HEAD').toString().trim();

    expect(res.statusCode).toBe(200);
    expect(res.data.name).toBe(pkg.name);
    expect(res.data.version).toBe(pkg.version);
    expect(res.data.gitSha).toBe(expectedSha);
    expect(typeof res.data.buildTime).toBe('string');
    expect(Object.keys(res.data).sort()).toEqual([
      'buildTime',
      'gitSha',
      'name',
      'version',
    ]);
  });
});
