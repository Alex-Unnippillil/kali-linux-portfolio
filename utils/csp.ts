let policy: TrustedTypePolicy | null | undefined;

function resolvePolicy(): TrustedTypePolicy | null {
  if (policy !== undefined) {
    return policy ?? null;
  }

  if (typeof window === 'undefined' || typeof window.trustedTypes === 'undefined') {
    policy = null;
    return null;
  }

  const factory = window.trustedTypes;
  const existing = factory.getPolicy?.('app-html');
  if (existing) {
    policy = existing;
    return existing;
  }

  try {
    policy = factory.createPolicy('app-html', {
      createHTML: (value) => value,
    });
  } catch (error) {
    console.warn('Failed to create Trusted Types policy', error);
    policy = null;
  }

  return policy ?? null;
}

export function getCspNonce(): string | undefined {
  if (typeof document !== 'undefined') {
    return document.documentElement.dataset.cspNonce;
  }
  return undefined;
}

export function createTrustedHTML(html: string): string | TrustedHTML {
  const ttPolicy = resolvePolicy();
  if (ttPolicy) {
    return ttPolicy.createHTML(html);
  }

  if (typeof window !== 'undefined' && typeof window.__appCreateTrustedHTML === 'function') {
    return window.__appCreateTrustedHTML(html);
  }

  return html;
}
