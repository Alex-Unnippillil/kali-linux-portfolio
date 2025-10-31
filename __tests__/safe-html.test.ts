import { safeHTML } from '@/utils/safe-html';

describe('safeHTML', () => {
  it('strips script tags from input', () => {
    const payload = '<div>hello<script>alert("pwnd")</script></div>';
    const sanitized = safeHTML(payload);
    expect(sanitized).toContain('<div>hello</div>');
    expect(sanitized).not.toContain('<script>');
  });

  it('removes dangerous attributes from markup', () => {
    const payload = '<img src="x" onerror="alert(1)"><span onclick="steal()">go</span>';
    const sanitized = safeHTML(payload);
    expect(sanitized).toMatch(/<img[^>]*src="x"/);
    expect(sanitized).toContain('<span>go</span>');
    expect(sanitized).not.toMatch(/onerror|onclick/);
  });

  it('returns an empty string for nullish values', () => {
    expect(safeHTML(null)).toBe('');
    expect(safeHTML(undefined)).toBe('');
  });
});
