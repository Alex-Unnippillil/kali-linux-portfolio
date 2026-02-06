export type RedactionSeverity = 'low' | 'medium' | 'high';

export interface RedactionRule {
  /**
   * Unique identifier for the rule. Use kebab-case so the id can double
   * as a placeholder label inside redacted content.
   */
  id: string;
  /**
   * Short human readable description used inside logs and previews.
   */
  description: string;
  /**
   * Regular expression that surfaces candidate strings to validate.
   *
   * The scanner will always execute this regex with the global flag so
   * callers do not need to worry about stateful `lastIndex` behaviour.
   */
  pattern: RegExp;
  /**
   * Optional validator used to refine matches surfaced by the regex.
   * Validators are useful for checksum validation or entropy checks and
   * return true when the match should be considered sensitive.
   */
  validator?: (match: string, exec: RegExpExecArray, source: string) => boolean;
  /**
   * Optional helper to format replacement text. Defaults to a
   * `«redacted:<id>»` placeholder when omitted.
   */
  replacement?: (match: string) => string;
  /**
   * Severity guides the user messaging when multiple matches are found.
   */
  severity: RedactionSeverity;
  /**
   * Optional hint surfaced alongside previews.
   */
  hint?: string;
}

const awsAccessKeyPrefixes = ['AKIA', 'ASIA', 'AGPA', 'AIDA', 'ANPA', 'AROA'];

const isLikelyAwsAccessKey = (candidate: string): boolean =>
  awsAccessKeyPrefixes.some((prefix) => candidate.startsWith(prefix));

const luhnCheck = (candidate: string): boolean => {
  let sum = 0;
  let shouldDouble = false;
  for (let i = candidate.length - 1; i >= 0; i -= 1) {
    const digit = parseInt(candidate[i]!, 10);
    if (Number.isNaN(digit)) return false;
    let value = digit;
    if (shouldDouble) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
};

const decodeBase64 = (value: string): string | null => {
  const globalAny = globalThis as {
    atob?: (data: string) => string;
    Buffer?: { from(data: string, encoding: string): { toString(encoding: string): string } };
  };

  if (typeof globalAny.atob === 'function') {
    try {
      return globalAny.atob(value);
    } catch {
      // ignore failures and fall back to Buffer branch
    }
  }

  if (globalAny.Buffer) {
    try {
      return globalAny.Buffer.from(value, 'base64').toString('utf8');
    } catch {
      // ignore decode errors
    }
  }

  return null;
};

const isBase64 = (value: string): boolean => {
  if (value.length % 4 !== 0) return false;
  return /^[A-Za-z0-9+/=]+$/.test(value);
};

const decodeBase64Url = (value: string): string | null => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const paddingNeeded = (4 - (normalized.length % 4 || 4)) % 4;
  const padded = normalized.padEnd(normalized.length + paddingNeeded, '=');
  return decodeBase64(padded);
};

const isJwt = (token: string): boolean => {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [header, payload] = parts;
  if (!/^[A-Za-z0-9_-]+$/.test(header) || !/^[A-Za-z0-9_-]+$/.test(payload)) return false;
  const decodedHeader = decodeBase64Url(header);
  if (!decodedHeader) return false;
  try {
    const json = JSON.parse(decodedHeader);
    return typeof json === 'object' && json !== null;
  } catch {
    return false;
  }
};

const rules: RedactionRule[] = [
  {
    id: 'aws-access-key-id',
    description: 'AWS access key id',
    pattern: /\b[A-Z0-9]{20}\b/g,
    validator: (match) => match.length === 20 && isLikelyAwsAccessKey(match),
    replacement: () => '«redacted:aws-access-key-id»',
    severity: 'high',
    hint: 'Matches 20 character AWS style credential prefixes.',
  },
  {
    id: 'aws-secret-access-key',
    description: 'AWS secret access key',
    pattern: /(?<=aws[_-]secret[_-]access[_-]key\s*[:=]\s*)[A-Za-z0-9\/+=]{40}/gi,
    validator: (match) => match.length === 40,
    replacement: () => '«redacted:aws-secret-access-key»',
    severity: 'high',
    hint: 'Triggered when inline configuration exposes long AWS secrets.',
  },
  {
    id: 'github-token',
    description: 'GitHub personal access token',
    pattern: /\bgh[pousr]_[A-Za-z0-9]{36}\b/g,
    severity: 'high',
    replacement: () => '«redacted:github-token»',
    hint: 'GitHub tokens start with ghp_, gho_, ghs_, ghu_, or ghr_.',
  },
  {
    id: 'google-api-key',
    description: 'Google API key',
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g,
    severity: 'high',
    replacement: () => '«redacted:google-api-key»',
  },
  {
    id: 'slack-token',
    description: 'Slack bot or user token',
    pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,48}\b/g,
    severity: 'high',
    replacement: () => '«redacted:slack-token»',
  },
  {
    id: 'stripe-secret-key',
    description: 'Stripe secret key',
    pattern: /\bsk_live_[0-9a-zA-Z]{24}\b/g,
    severity: 'high',
    replacement: () => '«redacted:stripe-secret-key»',
  },
  {
    id: 'private-key-block',
    description: 'Embedded private key block',
    pattern:
      /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
    severity: 'high',
    replacement: () => '«redacted:private-key»',
    hint: 'Looks for PEM encoded private key material.',
  },
  {
    id: 'json-web-token',
    description: 'JSON Web Token',
    pattern: /\b[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
    validator: (match) => match.length > 40 && isJwt(match),
    replacement: () => '«redacted:jwt»',
    severity: 'medium',
    hint: 'JWTs are redacted because they often embed bearer credentials.',
  },
  {
    id: 'card-number',
    description: 'Payment card number',
    pattern: /\b(?:\d[ -]*?){13,19}\b/g,
    validator: (match) => {
      const digits = match.replace(/\D/g, '');
      if (digits.length < 13 || digits.length > 19) return false;
      return luhnCheck(digits);
    },
    replacement: () => '«redacted:card-number»',
    severity: 'high',
    hint: 'Uses a Luhn checksum to avoid false positives on random numbers.',
  },
  {
    id: 'basic-auth-header',
    description: 'Authorization header with Basic credentials',
    pattern: /Authorization:\s*Basic\s+([A-Za-z0-9+/=]{8,})/gi,
    validator: (match, exec) => {
      const raw = exec[1];
      if (!raw || raw.length < 8) return false;
      if (!isBase64(raw)) return false;
      const decoded = decodeBase64(raw);
      if (!decoded) return false;
      return decoded.includes(':');
    },
    replacement: () => 'Authorization: Basic «redacted:credentials»',
    severity: 'medium',
  },
];

export default rules;
