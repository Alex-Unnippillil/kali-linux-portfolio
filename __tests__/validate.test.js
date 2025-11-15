const { validateServerEnv } = require('../lib/validate.js');

describe('validateServerEnv', () => {
  const baseEnv = {
    RECAPTCHA_SECRET: 'test-secret',
  };

  it('throws a descriptive error when required env vars are missing', () => {
    expect(() => validateServerEnv({})).toThrowError(
      /Missing required environment variables:[\s\S]*RECAPTCHA_SECRET/
    );
  });

  it('returns the validated env when all required values are present', () => {
    expect(validateServerEnv(baseEnv)).toEqual(baseEnv);
  });

  it('fails when the secret is present but empty', () => {
    expect(() => validateServerEnv({ RECAPTCHA_SECRET: '   ' })).toThrowError(
      /RECAPTCHA_SECRET cannot be empty/
    );
  });
});
