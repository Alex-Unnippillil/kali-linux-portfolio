import type { DiagnosticsBundle } from '../types/feedback';

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const TOKEN_PATTERN = /(bearer\s+|api[_-]?key\s*=|token\s*=|secret\s*=)([A-Z0-9._-]+)/gi;
const LONG_HEX_PATTERN = /\b(?:0x)?[A-F0-9]{16,}\b/gi;
const AWS_KEY_PATTERN = /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g;

const REPLACEMENTS: Array<[RegExp, string | ((substring: string, ...groups: string[]) => string)]> = [
  [EMAIL_PATTERN, '[redacted-email]'],
  [
    TOKEN_PATTERN,
    (_match, prefix) => `${prefix.trimEnd()} [redacted-token]`,
  ],
  [LONG_HEX_PATTERN, '[redacted-sequence]'],
  [AWS_KEY_PATTERN, '[redacted-key]'],
];

export const redactText = (value: string): string => {
  return REPLACEMENTS.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement as any), value);
};

export const redactValue = <T>(value: T): T => {
  if (typeof value === 'string') {
    return redactText(value) as unknown as T;
  }

  if (value instanceof Date) {
    return redactText(value.toISOString()) as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map(item => redactValue(item)) as unknown as T;
  }

  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
      result[key] = redactValue(entry);
    });
    return result as T;
  }

  return value;
};

export const redactDiagnostics = (bundle: DiagnosticsBundle): DiagnosticsBundle => {
  const sanitizedVitals = redactValue(bundle.vitals);
  return {
    ...bundle,
    stateHash: redactText(bundle.stateHash),
    vitals: sanitizedVitals,
  };
};

export default redactValue;
