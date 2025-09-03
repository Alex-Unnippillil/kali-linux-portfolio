import { buildAnalogyPrompt } from '../utils/agentPrompts';

describe('buildAnalogyPrompt', () => {
  test('returns original text when simple is false', () => {
    const text = 'Use this lab to explore static security data.';
    expect(buildAnalogyPrompt(text, false)).toBe(text);
  });

  test('produces novice-friendly analogy when simple is true', () => {
    const text = 'Use this lab to explore static security data.';
    const analogy = buildAnalogyPrompt(text, true);
    expect(analogy).not.toContain('security');
    expect(analogy).not.toContain('data');
    expect(analogy).toMatch(/sandbox/i);
  });
});
