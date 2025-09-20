import errorCodeData from '@/data/terminal/error-codes.json';

export interface TerminalErrorCodeDoc {
  label: string;
  path: string;
}

export interface TerminalErrorCodeEntry {
  code: number;
  title: string;
  summary: string;
  tips: string[];
  docs: TerminalErrorCodeDoc[];
  patterns?: string[];
}

export interface ExitCodeMatch {
  code: number;
  entry: TerminalErrorCodeEntry;
  matchedText: string;
  patternType: 'explicit' | 'pattern';
}

const entries = (errorCodeData.codes || []) as TerminalErrorCodeEntry[];
const codeMap = new Map<number, TerminalErrorCodeEntry>();
entries.forEach((entry) => {
  codeMap.set(entry.code, entry);
});

const patternEntries = entries.filter((entry) => entry.patterns && entry.patterns.length > 0);

const EXPLICIT_EXIT_CODE_REGEX = /\bexit(?:\s+(?:status|code))?\s*(?::|=)?\s*(-?\d+)\b/i;
const SHORT_EXIT_REGEX = /\b(?:code|status)\s*(-?\d+)\b/i;

export function getExitCodeInfo(code: number): TerminalErrorCodeEntry | undefined {
  return codeMap.get(code);
}

function locatePatternMatch(line: string, pattern: string): string {
  const lowerPattern = pattern.toLowerCase();
  const lowerLine = line.toLowerCase();
  const index = lowerLine.indexOf(lowerPattern);
  if (index === -1) return pattern;
  return line.slice(index, index + pattern.length);
}

export function findExitCodeMatch(line: string): ExitCodeMatch | null {
  const explicitMatch = line.match(EXPLICIT_EXIT_CODE_REGEX) || line.match(SHORT_EXIT_REGEX);
  if (explicitMatch) {
    const code = Number(explicitMatch[1]);
    const entry = getExitCodeInfo(code);
    if (entry) {
      return {
        code,
        entry,
        matchedText: explicitMatch[0],
        patternType: 'explicit',
      };
    }
  }

  const lowerLine = line.toLowerCase();
  for (const entry of patternEntries) {
    if (!entry.patterns) continue;
    for (const pattern of entry.patterns) {
      if (!pattern) continue;
      if (lowerLine.includes(pattern.toLowerCase())) {
        return {
          code: entry.code,
          entry,
          matchedText: locatePatternMatch(line, pattern),
          patternType: 'pattern',
        };
      }
    }
  }

  return null;
}

export const allErrorCodeEntries = entries;
