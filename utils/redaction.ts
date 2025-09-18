const SECRET_RULES = [
  {
    label: 'private key',
    pattern: /-----BEGIN [^-]+ PRIVATE KEY-----[\s\S]*?-----END [^-]+ PRIVATE KEY-----/gi,
    replacement: '[REDACTED PRIVATE KEY]',
  },
  {
    label: 'AWS access key',
    pattern: /\bAKIA[0-9A-Z]{16}\b/g,
    replacement: 'AKIA****************',
  },
  {
    label: 'AWS secret key',
    pattern: /aws_secret_access_key\s*[:=]\s*["']?[A-Za-z0-9\/+=]{40}["']?/gi,
    replacement: 'aws_secret_access_key=[REDACTED]',
  },
  {
    label: 'JWT token',
    pattern: /\beyJ[0-9A-Za-z_-]+\.[0-9A-Za-z_-]+\.[0-9A-Za-z_-]+\b/g,
    replacement: '[REDACTED JWT]',
  },
  {
    label: 'generic secret',
    pattern:
      /\b((?:api(?:_?key)?|token|secret|password|passphrase|auth))\b\s*[:=]\s*["']?[A-Za-z0-9\-_.]{16,}["']?/gi,
    replacement: '$1=[REDACTED]',
  },
];

export interface RedactionResult {
  hasMatch: boolean;
  matches: string[];
  redacted: string;
}

function clonePattern(pattern: RegExp) {
  return new RegExp(pattern.source, pattern.flags);
}

export function detectSensitiveContent(text: string): RedactionResult {
  const matches: string[] = [];
  let redacted = text;

  for (const rule of SECRET_RULES) {
    const testPattern = clonePattern(rule.pattern);
    if (!testPattern.test(redacted)) {
      continue;
    }

    matches.push(rule.label);
    const replacePattern = clonePattern(rule.pattern);
    redacted = redacted.replace(replacePattern, rule.replacement);
  }

  return {
    hasMatch: matches.length > 0,
    matches,
    redacted,
  };
}

export function redactSensitiveContent(text: string): string {
  return detectSensitiveContent(text).redacted;
}
