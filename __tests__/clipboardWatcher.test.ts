import { evaluateClipboardText } from '../modules/system/clipboardWatcher';

describe('evaluateClipboardText', () => {
  it('flags AWS access keys', () => {
    const matches = evaluateClipboardText('AKIA1234567890ABCDEF');
    expect(matches.some((m) => m.pattern === 'aws-access-key')).toBe(true);
  });

  it('detects private key markers', () => {
    const text = '-----BEGIN PRIVATE KEY-----\nabc';
    const matches = evaluateClipboardText(text);
    expect(matches.some((m) => m.pattern === 'private-key')).toBe(true);
  });

  it('identifies high-entropy base64 strings', () => {
    const secret = 'A'.repeat(20) + 'b'.repeat(20);
    const matches = evaluateClipboardText(secret);
    expect(matches.some((m) => m.pattern === 'base64-entropy')).toBe(true);
  });

  it('ignores regular clipboard text', () => {
    expect(evaluateClipboardText('just a memo about lunch')).toHaveLength(0);
  });
});
