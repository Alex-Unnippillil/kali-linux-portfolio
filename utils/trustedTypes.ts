const POLICY_NAME = 'kali-portfolio#html';
const POLICY_SYMBOL = Symbol.for('kali-linux-portfolio.trustedTypesPolicy');

type GlobalWithPolicy = typeof globalThis & {
  [POLICY_SYMBOL]?: TrustedTypePolicy | null;
};

function getGlobal(): GlobalWithPolicy {
  return globalThis as GlobalWithPolicy;
}

function createPolicy(): TrustedTypePolicy | null {
  const globalScope = getGlobal();
  if (typeof globalScope.trustedTypes === 'undefined') {
    globalScope[POLICY_SYMBOL] = null;
    return null;
  }

  if (globalScope[POLICY_SYMBOL]) {
    return globalScope[POLICY_SYMBOL] ?? null;
  }

  try {
    const policy = globalScope.trustedTypes.createPolicy(POLICY_NAME, {
      createHTML: (input) => input,
    });
    globalScope[POLICY_SYMBOL] = policy;
    return policy;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Trusted Types policy registration failed', error);
    }
    globalScope[POLICY_SYMBOL] = null;
    return null;
  }
}

export function ensureTrustedTypesPolicy(): TrustedTypePolicy | null {
  const globalScope = getGlobal();
  if (typeof globalScope[POLICY_SYMBOL] !== 'undefined') {
    return globalScope[POLICY_SYMBOL];
  }
  return createPolicy();
}

export function createTrustedHTML(html: string | TrustedHTML): string | TrustedHTML {
  if (typeof html !== 'string') {
    return html;
  }
  const policy = ensureTrustedTypesPolicy();
  return policy ? policy.createHTML(html) : html;
}

export function attachTrustedTypesViolationLogger(): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const policy = ensureTrustedTypesPolicy();

  if (process.env.NODE_ENV !== 'production') {
    if (policy) {
      console.info(`Trusted Types policy "${POLICY_NAME}" active`);
    } else {
      console.info('Trusted Types unsupported; falling back to string HTML rendering');
    }

    const handler = (event: SecurityPolicyViolationEvent) => {
      if (event.violatedDirective?.includes('trusted-types')) {
        console.error('Trusted Types violation detected', {
          blockedURI: event.blockedURI,
          effectiveDirective: event.effectiveDirective,
          originalPolicy: event.originalPolicy,
        });
      }
    };

    document.addEventListener('securitypolicyviolation', handler);
    return () => document.removeEventListener('securitypolicyviolation', handler);
  }

  return () => {};
}

export { POLICY_NAME as TRUSTED_TYPES_POLICY_NAME };
