import { TRUSTED_TYPES_POLICY_NAME } from '../utils/trustedTypes';

describe('trustedTypes utilities', () => {
  const POLICY_SYMBOL = Symbol.for('kali-linux-portfolio.trustedTypesPolicy');

  afterEach(() => {
    delete (globalThis as any).trustedTypes;
    delete (globalThis as any)[POLICY_SYMBOL];
    jest.resetModules();
  });

  it('returns raw HTML when Trusted Types are unavailable', async () => {
    jest.resetModules();
    const { createTrustedHTML } = await import('../utils/trustedTypes');
    const html = '<p>demo</p>';
    expect(createTrustedHTML(html)).toBe(html);
  });

  it('creates and reuses the shared policy when available', async () => {
    const createHTML = jest.fn((input: string) => ({
      toString: () => input,
    }));
    const policy = { createHTML } as TrustedTypePolicy;
    (globalThis as any).trustedTypes = {
      createPolicy: jest.fn(() => policy),
    };

    jest.resetModules();
    const { createTrustedHTML, ensureTrustedTypesPolicy } = await import(
      '../utils/trustedTypes'
    );
    const result = createTrustedHTML('<span>safe</span>');
    expect(createHTML).toHaveBeenCalledWith('<span>safe</span>');
    expect(result).toBe(createHTML.mock.results[0].value);
    expect(ensureTrustedTypesPolicy()).toBe(policy);

    const createPolicy = (globalThis as any).trustedTypes.createPolicy as jest.Mock;
    expect(createPolicy).toHaveBeenCalledWith(TRUSTED_TYPES_POLICY_NAME, {
      createHTML: expect.any(Function),
    });
  });
});
