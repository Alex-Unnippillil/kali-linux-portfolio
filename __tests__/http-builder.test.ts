import { buildCurlCommand, buildRawRequest } from '../apps/http/utils';

describe('HTTP builder exports', () => {
  test('builds curl command with method, url, and headers', () => {
    const command = buildCurlCommand({
      method: 'POST',
      url: 'https://example.com/login',
      headers: [
        { key: 'Content-Type', value: 'application/json' },
        { key: ' X-Custom ', value: '  token  ' },
        { key: '', value: 'ignored' },
      ],
      body: '',
    });

    expect(command).toContain("-X 'POST'");
    expect(command).toContain("--url 'https://example.com/login'");
    expect(command).toContain("-H 'Content-Type: application/json'");
    expect(command).toContain("-H 'X-Custom: token'");
    expect(command).not.toContain('ignored');
  });

  test('serializes JSON bodies with --data-raw', () => {
    const jsonBody = '{\n  "name": "demo"\n}';
    const command = buildCurlCommand({
      method: 'PUT',
      url: 'https://api.example.com/profile',
      headers: [{ key: 'Content-Type', value: 'application/json' }],
      body: jsonBody,
    });

    expect(command).toContain("--data-raw '{\n  \"name\": \"demo\"\n}'");
  });

  test('uses --data-binary for binary payloads and escapes them safely', () => {
    const binaryBody = '\u0000\u0001Hi\u001f';
    const command = buildCurlCommand({
      method: 'POST',
      url: 'https://example.com/upload',
      headers: [{ key: 'Content-Type', value: 'application/octet-stream' }],
      body: binaryBody,
    });

    expect(command).toContain("--data-binary $'\\x00\\x01Hi\\x1f'");
    expect(command).not.toContain('--data-raw');
  });
});

describe('Raw request preview', () => {
  test('derives path and adds host header when available', () => {
    const raw = buildRawRequest({
      method: 'GET',
      url: 'https://security.local:8443/path?q=1',
      headers: [{ key: 'Accept', value: 'application/json' }],
      body: '',
    });

    expect(raw).toContain('GET /path?q=1 HTTP/1.1');
    expect(raw).toContain('Host: security.local:8443');
    expect(raw).toContain('Accept: application/json');
  });

  test('respects custom host header and preserves body', () => {
    const raw = buildRawRequest({
      method: 'PATCH',
      url: 'https://example.com/resources',
      headers: [
        { key: 'Host', value: 'api.example.net' },
        { key: 'Content-Type', value: 'application/json' },
      ],
      body: '{"patched":true}\u0000',
    });

    const lines = raw.split('\n');
    expect(lines[0]).toBe('PATCH /resources HTTP/1.1');
    expect(lines[1]).toBe('Host: api.example.net');
    expect(lines[2]).toBe('Content-Type: application/json');
    expect(raw.endsWith('{"patched":true}\u0000')).toBe(true);
  });
});
