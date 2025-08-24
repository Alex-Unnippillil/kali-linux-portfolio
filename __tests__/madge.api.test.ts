import fs from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../pages/api/madge';

function createRes() {
  return {
    statusCode: 0,
    data: null as any,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(d: any) {
      this.data = d;
      return this;
    },
  } as unknown as NextApiResponse;
}

describe('madge api', () => {
  const dir = path.join(process.cwd(), 'lib', 'madge-test');
  beforeAll(() => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'a.js'), "import './b.js'");
    fs.writeFileSync(path.join(dir, 'b.js'), '');
    fs.writeFileSync(path.join(dir, 'unused.js'), '');
  });
  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('returns graph and orphans', async () => {
    const req = {} as NextApiRequest;
    const res: any = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.data.graph['lib/madge-test/a.js']).toContain('lib/madge-test/b.js');
    expect(res.data.orphans).toContain('lib/madge-test/unused.js');
  });
});
