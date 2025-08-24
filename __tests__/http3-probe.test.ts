function mockReqRes({ method, query }: { method: string; query: any }) {
  const req: any = { method, query };
  const res: any = { statusCode: 200 };
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.data = data;
    return res;
  };
  res.end = () => res;
  return { req, res };
}

describe('http3 probe api', () => {
  afterEach(() => {
    jest.resetModules();
  });

  test('returns hints and probe result', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      headers: { get: (h: string) => (h.toLowerCase() === 'alt-svc' ? 'h3=":443"' : null) },
    });
    const execFileMock = jest
      .spyOn(require('child_process'), 'execFile')
      .mockImplementation((cmd: any, _args: any, _opts: any, cb: any) => {
        if (cmd === 'openssl') cb(null, { stdout: 'ALPN protocol: h2\n', stderr: '' });
        else cb(null, { stdout: 'HTTP/3 200\n', stderr: '' });
      });

    const { default: handler } = await import('../pages/api/http3-probe');
    const { req, res } = mockReqRes({
      method: 'GET',
      query: { url: 'https://example.com', probe: '1' },
    });
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.data.altSvc).toBe('h3=":443"');
    expect(res.data.alpn).toBe('h2');
    expect(res.data.h3Probe.ok).toBe(true);

    execFileMock.mockRestore();
  });
});
