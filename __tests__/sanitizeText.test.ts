import { sanitizeText, stripDangerousText } from '../utils/sanitizeText';

describe('sanitizeText', () => {
  it('detects confusable characters', () => {
    const spoofed = 'pаypal';
    const result = sanitizeText(spoofed);
    expect(result.hasConfusables).toBe(true);
    expect(result.safe).toBe('paypal');
    expect(result.warnings.some((warning) => warning.includes('visually mimics'))).toBe(true);
  });

  it('removes bidi controls', () => {
    const dangerous = 'alert‮()';
    const result = sanitizeText(dangerous);
    expect(result.hasBidi).toBe(true);
    expect(result.safe).toBe('alert()');
    expect(result.warnings.some((warning) => warning.includes('removed'))).toBe(true);
  });

  it('stripDangerousText provides safe normalization', () => {
    expect(stripDangerousText('he‮llo')).toBe('hello');
  });
});
