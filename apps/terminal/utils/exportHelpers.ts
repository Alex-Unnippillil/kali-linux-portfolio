const ANSI_ESCAPE_REGEX = /\u001b\[[0-9;]*m/g;

const normalizeNewlines = (value: string): string =>
  value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

export const stripAnsiCodes = (value: string): string =>
  (value ?? '').replace(ANSI_ESCAPE_REGEX, '');

export const buildPlainTextExport = (content: string): string =>
  normalizeNewlines(stripAnsiCodes(content ?? ''));

export const buildMarkdownExport = (
  content: string,
  language = 'bash',
): string => {
  const sanitized = buildPlainTextExport(content);
  const trimmed = sanitized.trimEnd();
  return `\u0060\u0060\u0060${language}\n${trimmed}\n\u0060\u0060\u0060`;
};

export default buildPlainTextExport;
