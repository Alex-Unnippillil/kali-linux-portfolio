import handler from '../pages/api/yara-scan';

const rule = `rule T {
  strings:
    $a = "MALWARE"
  condition:
    $a
}`;

test('api route scans samples', async () => {
  const req: any = { method: 'POST', body: { input: 'MALWARE', rules: { 'test.yar': rule } } };
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const res: any = { status };
  await handler(req, res);
  expect(status).toHaveBeenCalledWith(200);
  const body = json.mock.calls[0][0];
  expect(body.matches.length).toBe(1);
});

test('rejects invalid payload', async () => {
  const req: any = { method: 'POST', body: { input: 123 } };
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const res: any = { status };
  await handler(req, res);
  expect(status).toHaveBeenCalledWith(400);
});
