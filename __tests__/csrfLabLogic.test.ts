import {
  TRUSTED_ORIGIN,
  defaultRequest,
  defaultRules,
  evaluateCsrfRequest,
} from '../apps/http/csrfLabLogic';

describe('CSRF lab header validation', () => {
  it('allows cross-site origins when checks are disabled', () => {
    const result = evaluateCsrfRequest(
      { ...defaultRequest },
      { ...defaultRules, checkOrigin: false, checkReferer: false },
    );
    expect(result.ok).toBe(true);
  });

  it('rejects mismatched Origin when validation is enabled', () => {
    const result = evaluateCsrfRequest(
      { ...defaultRequest, origin: 'https://attacker.example' },
      { ...defaultRules, checkOrigin: true },
    );
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Origin header');
    expect(result.message).toContain(TRUSTED_ORIGIN);
  });

  it('rejects missing Origin header when validation is enabled', () => {
    const result = evaluateCsrfRequest(
      { ...defaultRequest, origin: '' },
      { ...defaultRules, checkOrigin: true },
    );
    expect(result.ok).toBe(false);
    expect(result.message.toLowerCase()).toContain('omitted the origin header');
  });

  it('rejects mismatched Referer when validation is enabled', () => {
    const result = evaluateCsrfRequest(
      { ...defaultRequest, referer: 'https://attacker.example/exploit' },
      { ...defaultRules, checkReferer: true },
    );
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Referer header');
    expect(result.message).toContain(TRUSTED_ORIGIN);
  });

  it('accepts matching Origin and Referer when both checks are enabled', () => {
    const result = evaluateCsrfRequest(
      {
        ...defaultRequest,
        origin: TRUSTED_ORIGIN,
        referer: `${TRUSTED_ORIGIN}/transfer`,
      },
      { ...defaultRules, checkOrigin: true, checkReferer: true },
    );
    expect(result.ok).toBe(true);
  });
});
