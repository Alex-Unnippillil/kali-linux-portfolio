import { buildPreview, guardTextDownload, redactText, scanText } from '../../utils/redact';
import rules from '../../utils/redact/rules';

const harmlessCorpus = [
  'The quick brown fox jumps over the lazy dog.',
  'Version 1.2.3 release notes.',
  'Contact us at example@example.com for assistance.',
  'SHA256: deadbeefcafebabe but trimmed.',
  'Latitude 47.6062, Longitude -122.3321.',
  'Invoice total: 1234.56 USD.',
  'Usernames: alice, bob, carol.',
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  'Phone number: (206) 555-0100.',
  'Random words: nebula, synthesis, cascade.',
  'Meeting scheduled for 2024-03-01 at 10:00.',
  'UUID example: 123e4567-e89b-12d3-a456-426614174000.',
  'Discuss OIDC scopes and OAuth flows (no secrets here).',
  'Base64 sample: ZmFrZXNhbXBsZQ== (safe).',
  'Configuration uses placeholders like ${TOKEN} and ${SECRET}.',
  'Paths: /usr/local/bin, C:\\Program Files\\App.',
  'Database DSN: postgres://user@localhost:5432/dbname.',
  'Public SSH key header: ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQD only stub.',
  'An empty string should be ignored.',
  'Numbers 1111-2222-3333-444 without proper checksum should not match.',
];

describe('redaction rules', () => {
  it('detects known credentials and redacts them', () => {
    const sample = `AWS key AKIAIOSFODNN7EXAMPLE with aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`;
    const { matches, redactedText } = redactText(sample);
    const matchIds = matches.map((m) => m.rule.id);
    expect(matchIds).toContain('aws-access-key-id');
    expect(matchIds).toContain('aws-secret-access-key');
    expect(redactedText).not.toContain('AKIAIOSFODNN7EXAMPLE');
    expect(redactedText).toContain('«redacted:aws-secret-access-key»');
  });

  it('builds previews with contextual snippets', () => {
    const sample = 'Token ghp_abcd1234abcd1234abcd1234abcd1234abcd leaks in logs.';
    const matches = scanText(sample);
    const preview = buildPreview(sample, matches, { contextRadius: 8 });
    expect(preview).toMatch(/GitHub personal access token/);
    expect(preview).toMatch(/«redacted:github-token»/);
  });

  it('checksums potential card numbers to avoid false positives', () => {
    const maybeCard = 'Card 4242 4242 4242 4242 is a Stripe test number';
    const matches = scanText(maybeCard);
    expect(matches.some((m) => m.rule.id === 'card-number')).toBe(true);

    const fake = 'Digits 1234 5678 9012 3456 should fail the Luhn check.';
    const fakeMatches = scanText(fake);
    expect(fakeMatches.some((m) => m.rule.id === 'card-number')).toBe(false);
  });

  it('limits false positives on benign corpus', () => {
    const flagged = harmlessCorpus.filter((entry) => scanText(entry).length > 0);
    const rate = flagged.length / harmlessCorpus.length;
    expect(rate).toBeLessThan(0.05);
  });
});

describe('guardTextDownload', () => {
  const originalConfirm = window.confirm;

  afterEach(() => {
    window.confirm = originalConfirm;
    jest.restoreAllMocks();
  });

  it('returns redacted content when user accepts redaction', () => {
    const confirmMock = jest.spyOn(window, 'confirm');
    confirmMock.mockImplementationOnce(() => true);

    const githubToken = 'ghp_' + 'a'.repeat(36);
    const decision = guardTextDownload(`Token ${githubToken}`, {
      filename: 'report.txt',
    });

    expect(decision.redacted).toBe(true);
    expect(decision.aborted).toBe(false);
    expect(decision.content).not.toContain(githubToken);
    expect(confirmMock).toHaveBeenCalled();
  });

  it('allows override when user declines redaction but accepts override', () => {
    const confirmMock = jest.spyOn(window, 'confirm');
    confirmMock.mockImplementationOnce(() => false);
    confirmMock.mockImplementationOnce(() => true);

    const decision = guardTextDownload('Authorization: Basic QWxhZGRpbjpPcGVuU2VzYW1l', {
      filename: 'headers.txt',
    });

    expect(decision.redacted).toBe(false);
    expect(decision.aborted).toBe(false);
    expect(decision.content).toContain('QWxhZGRpbjpPcGVuU2VzYW1l');
    expect(confirmMock).toHaveBeenCalledTimes(2);
  });

  it('aborts when user cancels both prompts', () => {
    const confirmMock = jest.spyOn(window, 'confirm').mockImplementation(() => false);
    const decision = guardTextDownload('AKIAIOSFODNN7EXAMPLE', { filename: 'keys.txt' });
    expect(decision.aborted).toBe(true);
    expect(decision.redacted).toBe(false);
    expect(confirmMock).toHaveBeenCalledTimes(2);
  });
});

describe('rule catalogue', () => {
  it('exposes a stable set of rules', () => {
    expect(Array.isArray(rules)).toBe(true);
    expect(rules.length).toBeGreaterThanOrEqual(5);
  });
});
