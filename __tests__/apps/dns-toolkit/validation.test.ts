import { ERROR_MESSAGES, validateDnsQuery } from '../../../apps/dns-toolkit/validation';

describe('DNS Toolkit validation', () => {
  it('normalizes internationalized domains using punycode', () => {
    const result = validateDnsQuery('https://täst.de/path');

    expect(result.error).toBeNull();
    expect(result.hostname).toBe('xn--tst-qla.de');
    expect(result.normalizedValue).toBe('https://xn--tst-qla.de/path');
    expect(result.kind).toBe('url');
  });

  it('rejects unsafe URL schemes for safety', () => {
    const javascriptResult = validateDnsQuery('javascript:alert(1)');
    const fileResult = validateDnsQuery('FILE:///etc/passwd');

    expect(javascriptResult.error).toBe(ERROR_MESSAGES.blockedProtocol);
    expect(fileResult.error).toBe(ERROR_MESSAGES.blockedProtocol);
  });

  it('returns clear error messaging for missing or malformed input', () => {
    const missing = validateDnsQuery('   ');
    const malformed = validateDnsQuery('http://');

    expect(missing.error).toBe(ERROR_MESSAGES.required);
    expect(malformed.error).toBe(ERROR_MESSAGES.invalid);
  });
});
