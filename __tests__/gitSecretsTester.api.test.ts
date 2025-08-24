import JSZip from 'jszip';

function mockReqRes(method: string, body: any) {
  const req: any = { method, body };
  const res: any = { statusCode: 200 };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (d: any) => { res.data = d; return res; };
  res.end = () => res;
  return { req, res };
}

describe('git-secrets api', () => {
  test('detects secrets in patch', async () => {
    const patch = 'AKIA1234567890ABCDE1';
    const { req, res } = mockReqRes('POST', { patch });
    const handler = (await import('../pages/api/git-secrets-tester')).default;
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(res.data.results.some((r: any) => r.pattern.includes('AWS'))).toBe(true);
  });

  test('detects secrets in archive', async () => {
    const zip = new JSZip();
    zip.file('test.txt', 'xoxb-1234567890ABCDEF');
    const archive = await zip.generateAsync({ type: 'base64' });
    const { req, res } = mockReqRes('POST', { archive });
    const handler = (await import('../pages/api/git-secrets-tester')).default;
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(res.data.results.some((r: any) => r.pattern.includes('Slack'))).toBe(true);
  });

  test('validates input body', async () => {
    const { req, res } = mockReqRes('POST', {});
    const handler = (await import('../pages/api/git-secrets-tester')).default;
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(400);
  });
});

