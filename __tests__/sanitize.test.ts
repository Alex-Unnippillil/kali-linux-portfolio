import DOMPurify from 'dompurify';
import { escapeHtml, sanitizeHtml } from '../lib/sanitize';

describe('sanitize utilities', () => {
  it('sanitizes markup and enforces safe anchors when DOM is available', () => {
    const html = sanitizeHtml(
      '<a href="https://example.com">go</a><script>alert(1)</script>'
    );
    const container = document.createElement('div');
    container.innerHTML = html;
    const link = container.querySelector('a');

    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toContain('noopener');
    expect(link?.getAttribute('rel')).toContain('noreferrer');
    expect(container.querySelector('script')).toBeNull();
  });

  it('escapes markup when DOMPurify is unavailable', () => {
    const originalSupport = DOMPurify.isSupported;
    // @ts-expect-error allow mutation for test simulation
    DOMPurify.isSupported = false;

    const escaped = sanitizeHtml('<img src=x onerror=alert(1)>');
    expect(escaped).toBe('&lt;img src=x onerror=alert(1)&gt;');

    // restore original state
    // @ts-expect-error allow mutation for test simulation
    DOMPurify.isSupported = originalSupport;
  });

  it('escapes common HTML characters', () => {
    expect(escapeHtml('<div class="x">test & more</div>')).toBe(
      '&lt;div class=&quot;x&quot;&gt;test &amp; more&lt;/div&gt;'
    );
  });
});
