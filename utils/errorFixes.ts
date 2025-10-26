import { ERROR_FIXES, ERROR_FIX_CODES, ErrorFixEntry } from '@/data/error-fixes';

export interface ResolvedErrorFix extends ErrorFixEntry {
  code: string;
}

const normalizeCode = (code: string) => code.trim().toUpperCase();

export const resolveErrorFixes = (codes: string[]): ResolvedErrorFix[] => {
  const seen = new Set<string>();
  const results: ResolvedErrorFix[] = [];

  codes.forEach((raw) => {
    const code = normalizeCode(raw);
    if (!seen.has(code) && code in ERROR_FIXES) {
      seen.add(code);
      results.push({ code, ...ERROR_FIXES[code] });
    }
  });

  return results;
};

export const detectErrorCodes = (text: string): string[] => {
  if (!text) return [];
  const upper = text.toUpperCase();
  return ERROR_FIX_CODES.filter((code) => upper.includes(code));
};

export const getAllErrorFixes = (): ResolvedErrorFix[] =>
  ERROR_FIX_CODES.map((code) => ({ code, ...ERROR_FIXES[code] }));
