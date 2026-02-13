import { detectPasteFormat, normalizeLineEndings, sanitizeHtml } from '../components/common/PasteHelper';

describe('sanitizeHtml', () => {
  it('removes dangerous tags and attributes', () => {
    const malicious = '<img src="x" onerror="alert(1)"><script>alert(1)</script><div>safe</div>';
    const sanitized = sanitizeHtml(malicious);

    expect(sanitized).toContain('<img');
    expect(sanitized).toContain('<div>safe</div>');
    expect(sanitized).not.toMatch(/onerror/);
    expect(sanitized).not.toMatch(/<script>/);
  });
});

describe('normalizeLineEndings', () => {
  it('normalizes carriage returns to newlines', () => {
    const mixed = 'line1\r\nline2\rline3\nline4';
    expect(normalizeLineEndings(mixed)).toBe('line1\nline2\nline3\nline4');
  });
});

describe('detectPasteFormat', () => {
  it('detects JSON content', () => {
    const payload = '{"foo": [1,2,3]}';
    const result = detectPasteFormat(payload);
    expect(result.format).toBe('json');
    expect(result.parsedJson).toEqual({ foo: [1, 2, 3] });
  });

  it('detects CSV content', () => {
    const payload = 'name,age\nAda,37\nLinus,45';
    const result = detectPasteFormat(payload);
    expect(result.format).toBe('csv');
  });

  it('falls back to plain text when format is unknown', () => {
    const payload = 'Hello clipboard!';
    const result = detectPasteFormat(payload);
    expect(result.format).toBe('plain');
  });
});
