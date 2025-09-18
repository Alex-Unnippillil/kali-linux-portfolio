import { toASCII } from 'punycode/';

export type DnsInputKind = 'domain' | 'url';

export interface ValidationResult {
  normalizedValue: string;
  hostname: string;
  error: string | null;
  kind: DnsInputKind;
}

export const ERROR_MESSAGES = {
  required: 'Enter a domain or URL to look up.',
  blockedProtocol: 'File and JavaScript URLs are not supported in this simulator.',
  invalid: 'Enter a valid domain or URL.',
} as const;

const BLOCKED_PROTOCOLS = new Set(['javascript:', 'file:']);
const SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

const emptyResult = (error: string): ValidationResult => ({
  normalizedValue: '',
  hostname: '',
  error,
  kind: 'domain',
});

const normalizeHost = (hostname: string): string => {
  const ascii = toASCII(hostname);
  if (!ascii) {
    throw new Error('Invalid hostname');
  }
  return ascii;
};

const rebuildUrl = (url: URL, asciiHost: string): string => {
  const portSegment = url.port ? `:${url.port}` : '';
  return `${url.protocol}//${asciiHost}${portSegment}${url.pathname}${url.search}${url.hash}`;
};

const includesBlockedScheme = (value: string): boolean => {
  const lowered = value.toLowerCase();
  for (const protocol of BLOCKED_PROTOCOLS) {
    if (lowered.startsWith(protocol)) {
      return true;
    }
  }
  return false;
};

export const validateDnsQuery = (rawInput: string): ValidationResult => {
  const trimmed = rawInput.trim();

  if (!trimmed) {
    return emptyResult(ERROR_MESSAGES.required);
  }

  if (includesBlockedScheme(trimmed)) {
    return emptyResult(ERROR_MESSAGES.blockedProtocol);
  }

  if (SCHEME_PATTERN.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (BLOCKED_PROTOCOLS.has(parsed.protocol.toLowerCase())) {
        return emptyResult(ERROR_MESSAGES.blockedProtocol);
      }
      const asciiHost = normalizeHost(parsed.hostname);
      return {
        normalizedValue: rebuildUrl(parsed, asciiHost),
        hostname: asciiHost,
        error: null,
        kind: 'url',
      };
    } catch (error) {
      return emptyResult(ERROR_MESSAGES.invalid);
    }
  }

  try {
    const parsed = new URL(`http://${trimmed}`);
    const asciiHost = normalizeHost(parsed.hostname);

    if (parsed.pathname && parsed.pathname !== '/') {
      return emptyResult(ERROR_MESSAGES.invalid);
    }

    if (parsed.search || parsed.hash) {
      return emptyResult(ERROR_MESSAGES.invalid);
    }

    const portSegment = parsed.port ? `:${parsed.port}` : '';

    return {
      normalizedValue: `${asciiHost}${portSegment}`,
      hostname: asciiHost,
      error: null,
      kind: 'domain',
    };
  } catch (error) {
    // Fall through to final validation attempt.
  }

  try {
    const asciiHost = normalizeHost(trimmed);
    return {
      normalizedValue: asciiHost,
      hostname: asciiHost,
      error: null,
      kind: 'domain',
    };
  } catch (error) {
    return emptyResult(ERROR_MESSAGES.invalid);
  }
};
