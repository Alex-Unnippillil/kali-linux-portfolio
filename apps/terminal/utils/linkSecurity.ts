import { normalizePath } from '../../../utils/settings/terminalLinks';

export type TerminalLinkKind = 'shell' | 'file' | 'url' | 'unknown';

export interface TerminalLinkClassification {
  kind: TerminalLinkKind;
  requiresPrompt: boolean;
  normalizedPath?: string;
  protocol?: string;
}

export interface TerminalLinkMatch {
  text: string;
  startIndex: number;
  endIndex: number;
  classification: TerminalLinkClassification;
}

const SHELL_PROTOCOLS = new Set(['ssh', 'sftp', 'scp', 'telnet', 'ftp']);

const URI_REGEX = /\b[a-z][a-z0-9+.-]*:\/\/[^\s<'"\)\]]+/gi;
const UNIX_PATH_REGEX = /(?:^|[\s([\{\u201c"'])(~\/[^\s"'<>]+|\.{1,2}\/[^\s"'<>]+|\/[^\s"'<>]+)/g;
const WINDOWS_PATH_REGEX = /(?:^|[\s([\{\u201c"'])([a-zA-Z]:\\[^\s"'<>]+)/g;
const UNC_PATH_REGEX = /\\\\[^\\\s]+(?:\\[^\s"'<>]+)+/g;

const LEADING_TRIM = /^['"\u201c\u201d]+/;
const TRAILING_TRIM = /['"\u201c\u201d.,;:)\]\}]+$/;

const WINDOWS_DRIVE_PATTERN = /^[a-zA-Z]:[\\/]/;
const WINDOWS_UNC_PATTERN = /^\\\\/;

const classifyScheme = (value: string): TerminalLinkClassification => {
  const schemeMatch = /^([a-z][a-z0-9+.-]*):/i.exec(value);
  if (!schemeMatch) {
    return { kind: 'unknown', requiresPrompt: false };
  }
  const protocol = schemeMatch[1].toLowerCase();
  if (protocol === 'file') {
    const normalizedPath = normalizePath(value);
    return { kind: 'file', normalizedPath, requiresPrompt: true, protocol };
  }
  if (SHELL_PROTOCOLS.has(protocol)) {
    return { kind: 'shell', requiresPrompt: true, protocol };
  }
  return { kind: 'url', requiresPrompt: false, protocol };
};

const looksLikeLocalPath = (value: string): boolean => {
  if (/^(?:~\/|\.\.?\/|\/)/.test(value)) return true;
  if (WINDOWS_DRIVE_PATTERN.test(value)) return true;
  if (WINDOWS_UNC_PATTERN.test(value)) return true;
  return false;
};

export const classifyTerminalLink = (raw: string): TerminalLinkClassification => {
  const value = raw.trim();
  if (!value) return { kind: 'unknown', requiresPrompt: false };
  if (looksLikeLocalPath(value)) {
    const normalizedPath = normalizePath(value);
    return { kind: 'file', normalizedPath, requiresPrompt: true };
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    return classifyScheme(value);
  }
  return { kind: 'unknown', requiresPrompt: false };
};

const trimBoundaries = (input: string): { text: string; lead: number } => {
  let start = 0;
  let end = input.length;
  while (start < end && LEADING_TRIM.test(input[start])) start += 1;
  while (end > start && TRAILING_TRIM.test(input[end - 1])) end -= 1;
  const text = input.slice(start, end);
  return { text, lead: start };
};

const makeMatch = (
  source: string,
  index: number,
  classification: TerminalLinkClassification,
): TerminalLinkMatch | null => {
  const { text, lead } = trimBoundaries(source);
  if (!text) return null;
  const startIndex = index + lead;
  const endIndex = startIndex + text.length;
  return { text, startIndex, endIndex, classification };
};

export const findSuspiciousLinks = (line: string): TerminalLinkMatch[] => {
  const matches: TerminalLinkMatch[] = [];
  const seen = new Set<string>();

  const addMatch = (candidate: TerminalLinkMatch | null) => {
    if (!candidate) return;
    const key = `${candidate.startIndex}:${candidate.text}`;
    if (seen.has(key)) return;
    seen.add(key);
    matches.push(candidate);
  };

  if (!line) return matches;

  let uriMatch: RegExpExecArray | null;
  while ((uriMatch = URI_REGEX.exec(line))) {
    const raw = uriMatch[0];
    const classification = classifyTerminalLink(raw);
    if (!classification.requiresPrompt) continue;
    addMatch(makeMatch(raw, uriMatch.index, classification));
  }
  URI_REGEX.lastIndex = 0;

  let unixMatch: RegExpExecArray | null;
  while ((unixMatch = UNIX_PATH_REGEX.exec(line))) {
    const raw = unixMatch[1];
    if (!raw) continue;
    const classification = classifyTerminalLink(raw);
    if (!classification.requiresPrompt) continue;
    const preceding = unixMatch[0];
    const offset = unixMatch.index + preceding.indexOf(raw);
    addMatch(makeMatch(raw, offset, classification));
  }
  UNIX_PATH_REGEX.lastIndex = 0;

  let winMatch: RegExpExecArray | null;
  while ((winMatch = WINDOWS_PATH_REGEX.exec(line))) {
    const raw = winMatch[1];
    if (!raw) continue;
    const classification = classifyTerminalLink(raw);
    if (!classification.requiresPrompt) continue;
    const preceding = winMatch[0];
    const offset = winMatch.index + preceding.indexOf(raw);
    addMatch(makeMatch(raw, offset, classification));
  }
  WINDOWS_PATH_REGEX.lastIndex = 0;

  let uncMatch: RegExpExecArray | null;
  while ((uncMatch = UNC_PATH_REGEX.exec(line))) {
    const raw = uncMatch[0];
    if (!raw) continue;
    const start = uncMatch.index;
    if (start > 0) {
      const before = line[start - 1];
      if (before && !/[\s([\{\u201c"']/.test(before)) {
        continue;
      }
    }
    const classification = classifyTerminalLink(raw);
    if (!classification.requiresPrompt) continue;
    addMatch(makeMatch(raw, start, classification));
  }
  UNC_PATH_REGEX.lastIndex = 0;

  return matches;
};
