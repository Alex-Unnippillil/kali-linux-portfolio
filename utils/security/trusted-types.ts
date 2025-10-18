const POLICY_NAME = 'kali-linux-portfolio#html';

type PolicyFactoryWithGet = TrustedTypePolicyFactory & {
  getPolicy?: (name: string) => TrustedTypePolicy | null;
};

let cachedPolicy: TrustedTypePolicy | null | undefined;

const getGlobalTrustedTypesFactory = (): PolicyFactoryWithGet | null => {
  if (typeof globalThis === 'undefined') {
    return null;
  }

  const maybeFactory = (globalThis as unknown as { trustedTypes?: PolicyFactoryWithGet }).trustedTypes;

  if (!maybeFactory || typeof maybeFactory.createPolicy !== 'function') {
    return null;
  }

  return maybeFactory;
};

const createPolicy = (): TrustedTypePolicy | null => {
  const factory = getGlobalTrustedTypesFactory();

  if (!factory) {
    cachedPolicy = null;
    return null;
  }

  if (cachedPolicy) {
    return cachedPolicy;
  }

  try {
    cachedPolicy = factory.createPolicy(POLICY_NAME, {
      /**
       * We only allow HTML that has already been sanitized by our own utilities
       * (escapeHtml, markdown renderers, etc). This keeps third-party widgets
       * compatible while still opting into Trusted Types wherever they are
       * supported.
       */
      createHTML: (input: string) => input,
    });
  } catch (error) {
    cachedPolicy = factory.getPolicy ? factory.getPolicy(POLICY_NAME) ?? null : null;
  }

  return cachedPolicy ?? null;
};

export const getTrustedTypesPolicy = (): TrustedTypePolicy | null => {
  if (cachedPolicy !== undefined) {
    return cachedPolicy;
  }

  return createPolicy();
};

export const createTrustedHTML = (html: string | TrustedHTML): TrustedHTML | string => {
  if (typeof html !== 'string') {
    return html;
  }

  const policy = getTrustedTypesPolicy();

  return policy ? policy.createHTML(html) : html;
};

export const trustedHtml = (
  html: string | TrustedHTML
): { __html: TrustedHTML | string } => ({
  __html: createTrustedHTML(html),
});

export const __resetTrustedTypesPolicyForTests = () => {
  cachedPolicy = undefined;
};

export { POLICY_NAME };
