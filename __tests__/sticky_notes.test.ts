import { sanitize } from '../apps/sticky_notes/main';

describe('Sticky Notes sanitize', () => {
  it('strips event handlers', () => {
    const input = '<img src=x onerror=alert(1)>';
    const cleaned = sanitize(input);
    expect(cleaned).not.toContain('onerror');
  });
});
