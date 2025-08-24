import { redactSecret, defaultPatterns } from '../components/apps/git-secrets-tester';

describe('GitSecretsTester utilities', () => {
  test('redactSecret masks middle characters', () => {
    expect(redactSecret('abcdef')).toBe('ab***ef');
    expect(redactSecret('abc')).toBe('***');
  });

  test('defaultPatterns include AWS access key regex', () => {
    expect(defaultPatterns.some((p) => p.regex.includes('AKIA'))).toBe(true);
  });
});

