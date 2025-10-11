import { applyRewriteRules, type RewriteRule } from '../apps/html-rewriter/transformer';

const SAMPLE_HTML = `
  <section>
    <h1>Original Heading</h1>
    <p data-tracking="id-123">
      <a href="https://example.com" target="_blank">Example</a>
    </p>
    <script>alert('boom');</script>
  </section>
`;

describe('HTML Rewriter worker pipeline', () => {
  it('removes scripts and rewrites heading text', () => {
    const rules: RewriteRule[] = [
      { type: 'remove', selector: 'script' },
      { type: 'replaceText', selector: 'h1', value: 'Rewritten Title' },
    ];

    const result = applyRewriteRules(SAMPLE_HTML, rules);

    expect(result.appliedCount).toBe(2);
    expect(result.html).not.toContain('<script>');
    expect(result.html).toContain('Rewritten Title');
    expect(result.messages).toEqual([
      'Removed 1 element matched.',
      'Replaced text on 1 element matched.',
    ]);
  });

  it('updates and removes attributes without mutating other markup', () => {
    const rules: RewriteRule[] = [
      {
        type: 'setAttribute',
        selector: 'a[target="_blank"]',
        attribute: 'rel',
        value: 'noopener noreferrer',
      },
      {
        type: 'removeAttribute',
        selector: '[data-tracking]',
        attribute: 'data-tracking',
      },
    ];

    const result = applyRewriteRules(SAMPLE_HTML, rules);

    expect(result.appliedCount).toBe(2);
    expect(result.html).toContain('rel="noopener noreferrer"');
    expect(result.html).not.toContain('data-tracking');
    expect(result.html).toContain('<h1>Original Heading</h1>');
  });
});
