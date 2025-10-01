import { applyRedactions, getPlaceholder, scanSensitiveMatches } from '../utils/redaction';

describe('redaction utils', () => {
  const sample = 'Contact admin@example.com at 192.168.10.5 or visit internal.example.org.';

  it('identifies sensitive values', () => {
    const matches = scanSensitiveMatches(sample);
    expect(matches.map((match) => ({ category: match.category, value: match.value }))).toEqual([
      { category: 'email', value: 'admin@example.com' },
      { category: 'ip', value: '192.168.10.5' },
      { category: 'domain', value: 'internal.example.org' },
    ]);
  });

  it('redacts configured categories', () => {
    const matches = scanSensitiveMatches(sample);
    const result = applyRedactions(sample, ['email', 'domain', 'ip'], matches);
    expect(result.text).not.toContain('admin@example.com');
    expect(result.text).not.toContain('192.168.10.5');
    expect(result.text).not.toContain('internal.example.org');
    expect(result.text).toContain(getPlaceholder('email'));
    expect(result.text).toContain(getPlaceholder('ip'));
    expect(result.text).toContain(getPlaceholder('domain'));
  });

  it('respects category toggles', () => {
    const matches = scanSensitiveMatches(sample);
    const result = applyRedactions(sample, ['email'], matches);
    expect(result.text).toContain(getPlaceholder('email'));
    expect(result.text).toContain('192.168.10.5');
    expect(result.text).toContain('internal.example.org');
  });
});
