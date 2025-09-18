import { mockNiktoResolver, validateNiktoTarget } from '../../../components/apps/nikto/validation';

describe('nikto target validation', () => {
  it('accepts http and https targets and normalizes the hostname', async () => {
    const result = await validateNiktoTarget('https://Example.com', {
      resolver: mockNiktoResolver,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.normalized.hostname).toBe('example.com');
      expect(result.normalized.protocol).toBe('https:');
      expect(result.normalized.href).toBe('https://example.com');
      expect(result.normalized.address).toBe('203.0.113.10');
    }
  });

  it('rejects file URIs explicitly', async () => {
    const result = await validateNiktoTarget('file:///etc/passwd');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('File');
    }
  });

  it('rejects targets with unsupported schemes', async () => {
    const result = await validateNiktoTarget('ftp://example.com');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/only/i);
      expect(result.error).toMatch(/http/i);
    }
  });

  it('validates explicit ports are within the TCP range', async () => {
    const result = await validateNiktoTarget('example.com', { port: '70000' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Port');
    }
  });

  it('propagates DNS resolution failures', async () => {
    const failingResolver = jest.fn(async () => {
      throw new Error('ENOTFOUND');
    });

    const result = await validateNiktoTarget('unknown.invalid', { resolver: failingResolver });

    expect(failingResolver).toHaveBeenCalledWith('unknown.invalid');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/resolve/i);
    }
  });

  it('rejects whitespace in targets', async () => {
    const result = await validateNiktoTarget('example .com');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('spaces');
    }
  });

  it('parses ports from URLs when none are provided explicitly', async () => {
    const result = await validateNiktoTarget('http://demo.test:8080', {
      resolver: mockNiktoResolver,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.normalized.port).toBe(8080);
    }
  });
});
