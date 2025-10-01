// @jest-environment node
const { validateServerEnv } = require('../lib/validate');

describe('validateServerEnv', () => {
  it('does not throw when environment variables are absent', () => {
    expect(() => validateServerEnv({})).not.toThrow();
  });
});
