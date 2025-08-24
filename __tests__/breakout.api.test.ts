import fs from 'fs';
import path from 'path';
import handler from '../pages/api/breakout/levels';
import type { NextApiRequest, NextApiResponse } from 'next';

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

describe('breakout levels api', () => {
  const dir = path.join(process.cwd(), 'apps', 'breakout', 'levels');
  beforeEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('saves and retrieves levels', () => {
    const level = [[1]];
    const reqPost = { method: 'POST', body: level } as unknown as NextApiRequest;
    const resPost: any = createRes();
    handler(reqPost, resPost);
    expect(resPost.statusCode).toBe(200);

    const reqGet = { method: 'GET' } as unknown as NextApiRequest;
    const resGet: any = createRes();
    handler(reqGet, resGet);
    expect(resGet.statusCode).toBe(200);
    expect(Array.isArray(resGet.data)).toBe(true);
    expect(resGet.data.some((l: any) => JSON.stringify(l) === JSON.stringify(level))).toBe(true);
  });

  test('rejects invalid level data', () => {
    const req = { method: 'POST', body: 'bad' } as unknown as NextApiRequest;
    const res: any = createRes();
    handler(req, res);
    expect(res.statusCode).toBe(400);
  });
});
