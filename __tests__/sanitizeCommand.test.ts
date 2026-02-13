import { quotePosix, sanitizeShellInput } from '../utils/sanitizeCommand';

describe('quotePosix', () => {
  it('wraps input in single quotes', () => {
    expect(quotePosix('example')).toBe("'example'");
  });

  it('escapes existing single quotes', () => {
    expect(quotePosix("O'Reilly")).toBe("'O'\\''Reilly'");
  });

  it('returns empty quotes for empty string', () => {
    expect(quotePosix('')).toBe("''");
  });
});

describe('sanitizeShellInput', () => {
  it('trims whitespace and normalizes newlines', () => {
    expect(sanitizeShellInput('  hello\nworld  ').sanitized).toBe('hello world');
  });

  it('detects semicolons and provides a fix', () => {
    const result = sanitizeShellInput('ls; rm -rf /');

    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatchObject({
      id: 'semicolon',
      indicator: ';',
      fixLabel: 'Wrap in POSIX-safe quotes',
      fixValue: "'ls; rm -rf /'",
    });
  });

  it('detects double ampersands', () => {
    const result = sanitizeShellInput('echo ok && reboot');

    expect(result.warnings[0].id).toBe('double-ampersand');
  });

  it('suppresses warnings once the value is safely quoted', () => {
    expect(sanitizeShellInput("'ls; rm -rf /'").warnings).toHaveLength(0);
  });

  it('returns no warnings for safe input', () => {
    expect(sanitizeShellInput('curl https://example.com').warnings).toHaveLength(0);
  });
});
