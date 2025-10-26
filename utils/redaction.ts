"use client";

export interface SensitivePattern {
  name: string;
  regex: RegExp;
  description: string;
  replacement?: string | ((match: string, ...groups: string[]) => string);
}

const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const ipv4Regex = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?!$)|$)){4}\b/g;

export const sensitivePatterns: SensitivePattern[] = [
  {
    name: 'private-key-block',
    regex: /-----BEGIN [^-]+PRIVATE KEY-----[\s\S]*?-----END [^-]+PRIVATE KEY-----/gi,
    description: 'Detected what looks like a private key block.',
    replacement: '<redacted:private-key>',
  },
  {
    name: 'ssh-inline-secret',
    regex: /(sshpass\s+-p\s+)(["']?)([^"'\s]+)(\2)/gi,
    description: 'Inline sshpass secrets should never be stored.',
    replacement: (_match, prefix: string) => `${prefix}<redacted:sshpass>` ,
  },
  {
    name: 'password-assignment',
    regex: /(password\s*[=:]\s*)(["']?)([^"'\s]+)(\2)/gi,
    description: 'Found a direct password assignment.',
    replacement: (_match, prefix: string) => `${prefix}<redacted:password>`,
  },
  {
    name: 'api-token',
    regex: /(api[_-]?key|token|secret)\s*[=:]\s*(["']?)([^"'\s]+)(\2)/gi,
    description: 'API tokens or secrets should stay out of saved sets.',
    replacement: (_match, prefix: string) => `${prefix}<redacted:token>`,
  },
  {
    name: 'aws-access-key',
    regex: /\bAKIA[0-9A-Z]{16}\b/g,
    description: 'Potential AWS access key detected.',
    replacement: '<redacted:aws-access-key>',
  },
  {
    name: 'aws-secret-key',
    regex: /\b(?:[A-Za-z0-9+\/=]{40})\b/g,
    description: 'Potential AWS secret access key detected.',
    replacement: '<redacted:aws-secret>',
  },
  {
    name: 'email-address',
    regex: emailRegex,
    description: 'Email addresses count as personal data; prefer aliases.',
    replacement: '<redacted:email>',
  },
  {
    name: 'ipv4-address',
    regex: ipv4Regex,
    description: 'Direct IP addresses should be generalized.',
    replacement: '<redacted:ip>',
  },
  {
    name: 'credit-card',
    regex: /\b(?:\d[ -]?){13,19}\b/g,
    description: 'Number sequence resembles payment data and was masked.',
    replacement: '<redacted:number>',
  },
];

export const patternDescriptions: Record<string, string> = sensitivePatterns.reduce(
  (acc, pattern) => {
    acc[pattern.name] = pattern.description;
    return acc;
  },
  {} as Record<string, string>,
);

const applyReplacement = (
  text: string,
  pattern: SensitivePattern,
): string => {
  pattern.regex.lastIndex = 0;
  if (typeof pattern.replacement === 'function') {
    return text.replace(pattern.regex, (...args) => pattern.replacement!(...args));
  }
  const replacement = pattern.replacement ?? '<redacted>';
  return text.replace(pattern.regex, replacement);
};

export const redactText = (input: string): string => {
  if (!input) return '';
  return sensitivePatterns.reduce((text, pattern) => applyReplacement(text, pattern), input);
};

export const detectSensitiveContent = (input: string | null | undefined): string[] => {
  if (!input) return [];
  const matches = new Set<string>();
  for (const pattern of sensitivePatterns) {
    pattern.regex.lastIndex = 0;
    if (pattern.regex.test(input)) {
      matches.add(pattern.name);
    }
  }
  return Array.from(matches);
};

export const redactRecord = <T extends Record<string, unknown>>(record: T, fields: Array<keyof T>): T => {
  const clone = { ...record };
  for (const field of fields) {
    const value = clone[field];
    if (typeof value === 'string') {
      clone[field] = redactText(value) as T[typeof field];
    }
  }
  return clone;
};

export default redactText;
