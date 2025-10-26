export interface SanitizationWarning {
  id: string;
  indicator: string;
  message: string;
  fixLabel?: string;
  fixValue?: string;
}

export interface SanitizationResult {
  sanitized: string;
  warnings: SanitizationWarning[];
}

const DANGEROUS_PATTERNS: Array<{
  id: string;
  indicator: string;
  pattern: RegExp;
  message: string;
}> = [
  {
    id: 'semicolon',
    indicator: ';',
    pattern: /;/,
    message: 'Semicolons can be used to chain multiple commands.',
  },
  {
    id: 'double-ampersand',
    indicator: '&&',
    pattern: /&&/,
    message: '"&&" will run a follow-up command when the previous command succeeds.',
  },
  {
    id: 'double-pipe',
    indicator: '||',
    pattern: /\|\|/,
    message: '"||" can run an alternate command when the previous command fails.',
  },
  {
    id: 'subshell',
    indicator: '$(...)',
    pattern: /\$\(/,
    message: 'Subshell execution is blocked in the demo environment.',
  },
  {
    id: 'backtick',
    indicator: '`',
    pattern: /`/,
    message: 'Backticks execute subshells in many shells.',
  },
  {
    id: 'redirect',
    indicator: '>',
    pattern: />|</,
    message: 'Redirection operators can alter files outside the sandbox.',
  },
];

const SINGLE_QUOTE = "'";

export function quotePosix(value: string): string {
  if (value === '') {
    return "''";
  }

  return SINGLE_QUOTE + value.replace(/'/g, "'\\''") + SINGLE_QUOTE;
}

export function sanitizeShellInput(value: string): SanitizationResult {
  const normalized = value.replace(/\r?\n/g, ' ').trim();
  const warnings: SanitizationWarning[] = [];
  const alreadyQuoted = /^'(?:[^']|'\\'')*'$/.test(normalized);

  if (!alreadyQuoted) {
    for (const pattern of DANGEROUS_PATTERNS) {
      if (!pattern.pattern.test(normalized)) continue;

      warnings.push({
        id: pattern.id,
        indicator: pattern.indicator,
        message: pattern.message,
        fixLabel: normalized ? 'Wrap in POSIX-safe quotes' : undefined,
        fixValue: normalized ? quotePosix(normalized) : undefined,
      });
    }
  }

  return {
    sanitized: normalized,
    warnings,
  };
}
