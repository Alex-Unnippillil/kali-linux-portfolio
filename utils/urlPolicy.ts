const SAFE_BASE_URL = 'https://portfolio.local';

export const ALLOWED_PROTOCOLS = Object.freeze([
  'http:',
  'https:',
  'mailto:',
  'tel:',
]);

const EXTERNAL_PROTOCOLS = new Set(['http:', 'https:']);
const ALLOWED_PROTOCOLS_SET = new Set(ALLOWED_PROTOCOLS);
const SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
const CONTROL_CHARS_PATTERN = /[\u0000-\u001F\u007F]/;

export interface SanitizedUrl {
  href: string;
  isExternal: boolean;
}

export const LINK_UNAVAILABLE_COPY = 'Link unavailable';

export function isProtocolAllowed(rawUrl: string): boolean {
  const protocol = extractProtocol(rawUrl);
  if (!protocol) return true;
  return ALLOWED_PROTOCOLS_SET.has(protocol);
}

export function sanitizeUrl(rawUrl: string | null | undefined): SanitizedUrl | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed || CONTROL_CHARS_PATTERN.test(trimmed)) {
    return null;
  }

  if (!isProtocolAllowed(trimmed)) {
    return null;
  }

  if (trimmed.startsWith('//')) {
    return null;
  }

  if (trimmed.startsWith('#')) {
    return { href: trimmed, isExternal: false };
  }

  const hasScheme = SCHEME_PATTERN.test(trimmed);

  try {
    if (hasScheme) {
      const parsed = new URL(trimmed);
      const { protocol } = parsed;
      if (!ALLOWED_PROTOCOLS_SET.has(protocol)) {
        return null;
      }
      return {
        href: parsed.toString(),
        isExternal: EXTERNAL_PROTOCOLS.has(protocol),
      };
    }

    const parsed = new URL(trimmed, SAFE_BASE_URL);
    return {
      href: parsed.pathname + parsed.search + parsed.hash,
      isExternal: false,
    };
  } catch (error) {
    return null;
  }
}

export function computeRelAttribute(isExternal: boolean, existingRel?: string | null) {
  const tokens = new Set<string>();
  if (existingRel) {
    existingRel
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean)
      .forEach((token) => tokens.add(token));
  }

  if (isExternal) {
    tokens.add('noopener');
    tokens.add('noreferrer');
  }

  return tokens.size > 0 ? Array.from(tokens).join(' ') : undefined;
}

function extractProtocol(rawUrl: string | null | undefined) {
  if (!rawUrl) return null;
  const match = rawUrl.trim().match(SCHEME_PATTERN);
  return match ? match[0].toLowerCase() : null;
}

