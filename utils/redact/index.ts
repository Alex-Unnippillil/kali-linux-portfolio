import rules, { RedactionRule, RedactionSeverity } from './rules';

export interface RedactionMatch {
  rule: RedactionRule;
  match: string;
  start: number;
  end: number;
  replacement: string;
}

export interface RedactionResult {
  matches: RedactionMatch[];
  redactedText: string;
}

export interface RedactOptions {
  maskWith?: string;
}

const ensureGlobal = (pattern: RegExp): RegExp => {
  if (pattern.flags.includes('g')) return pattern;
  return new RegExp(pattern.source, pattern.flags + 'g');
};

const defaultReplacement = (rule: RedactionRule) => `«redacted:${rule.id}»`;

const buildMatch = (
  text: string,
  rule: RedactionRule,
  exec: RegExpExecArray,
): RedactionMatch => {
  const match = exec[0];
  const start = exec.index;
  const end = start + match.length;
  const replacement = rule.replacement?.(match) ?? defaultReplacement(rule);
  return { rule, match, start, end, replacement };
};

const dedupeOverlaps = (matches: RedactionMatch[]): RedactionMatch[] => {
  const sorted = [...matches].sort((a, b) => a.start - b.start || b.end - a.end);
  const result: RedactionMatch[] = [];
  let cursor = -1;
  for (const match of sorted) {
    if (match.start >= cursor) {
      result.push(match);
      cursor = match.end;
    }
  }
  return result;
};

export const scanText = (text: string): RedactionMatch[] => {
  if (!text) return [];
  const matches: RedactionMatch[] = [];
  for (const rule of rules) {
    const regex = ensureGlobal(rule.pattern);
    regex.lastIndex = 0;
    let exec: RegExpExecArray | null;
    while ((exec = regex.exec(text)) !== null) {
      const candidate = exec[0];
      if (!candidate) {
        // Avoid zero-length match infinite loops
        regex.lastIndex += 1;
        continue;
      }
      if (rule.validator && !rule.validator(candidate, exec, text)) {
        continue;
      }
      matches.push(buildMatch(text, rule, exec));
    }
  }
  return dedupeOverlaps(matches);
};

export const applyRedactions = (text: string, matches: RedactionMatch[]): string => {
  if (!matches.length) return text;
  const ordered = [...matches].sort((a, b) => a.start - b.start);
  let cursor = 0;
  let result = '';
  for (const match of ordered) {
    result += text.slice(cursor, match.start) + match.replacement;
    cursor = match.end;
  }
  result += text.slice(cursor);
  return result;
};

export const redactText = (text: string, options?: RedactOptions): RedactionResult => {
  const matches = scanText(text);
  if (!matches.length) {
    return { matches, redactedText: text };
  }
  const withMask = options?.maskWith
    ? matches.map((m) => ({ ...m, replacement: options.maskWith!.repeat(Math.max(4, Math.min(12, m.match.length))) }))
    : matches;
  return {
    matches: withMask,
    redactedText: applyRedactions(text, withMask),
  };
};

export interface PreviewOptions {
  contextRadius?: number;
  maxExamples?: number;
}

export const buildPreview = (
  text: string,
  matches: RedactionMatch[],
  options: PreviewOptions = {},
): string => {
  const radius = options.contextRadius ?? 16;
  const limit = options.maxExamples ?? 3;
  const snippets = matches.slice(0, limit).map((match) => {
    const start = Math.max(0, match.start - radius);
    const end = Math.min(text.length, match.end + radius);
    const before = text.slice(start, match.start);
    const after = text.slice(match.end, end);
    return `• ${match.rule.description}: …${before}${match.replacement}${after}…`;
  });
  return snippets.join('\n');
};

export interface GuardDecision {
  content: string;
  matches: RedactionMatch[];
  redacted: boolean;
  aborted: boolean;
  severity?: RedactionSeverity;
}

export interface GuardOptions extends PreviewOptions {
  filename?: string;
  onOverride?: (matches: RedactionMatch[]) => void;
}

const highestSeverity = (matches: RedactionMatch[]): RedactionSeverity => {
  if (!matches.length) return 'low';
  if (matches.some((m) => m.rule.severity === 'high')) return 'high';
  if (matches.some((m) => m.rule.severity === 'medium')) return 'medium';
  return 'low';
};

export const guardTextDownload = (text: string, options: GuardOptions = {}): GuardDecision => {
  const { matches, redactedText } = redactText(text);
  if (matches.length === 0 || typeof window === 'undefined') {
    return {
      content: text,
      matches,
      redacted: false,
      aborted: false,
      severity: highestSeverity(matches),
    };
  }

  const preview = buildPreview(text, matches, options);
  const summary = `${matches.length} potential secret${matches.length === 1 ? '' : 's'} found`;
  const label = options.filename ? ` in ${options.filename}` : '';
  const message = `${summary}${label}.\n\n${preview}\n\nPress OK to download a redacted copy. Cancel to review override options.`;

  const proceed = window.confirm(message);
  if (proceed) {
    return {
      content: redactedText,
      matches,
      redacted: true,
      aborted: false,
      severity: highestSeverity(matches),
    };
  }

  const override = window.confirm(
    'Download original unredacted content? Choosing Cancel keeps the download cancelled.',
  );

  if (!override) {
    return {
      content: text,
      matches,
      redacted: false,
      aborted: true,
      severity: highestSeverity(matches),
    };
  }

  options.onOverride?.(matches);

  return {
    content: text,
    matches,
    redacted: false,
    aborted: false,
    severity: highestSeverity(matches),
  };
};

export type { RedactionRule } from './rules';
