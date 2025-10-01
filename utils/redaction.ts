export type RedactionCategory = 'ip' | 'email' | 'domain';

export interface RedactionMatch {
  start: number;
  end: number;
  value: string;
  category: RedactionCategory;
}

interface RedactionRule {
  category: RedactionCategory;
  pattern: RegExp;
}

export interface RedactedResult {
  text: string;
  matches: RedactionMatch[];
}

export interface CategoryDefinition {
  id: RedactionCategory;
  label: string;
  placeholder: string;
  description: string;
}

export const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    id: 'ip',
    label: 'IP Addresses',
    placeholder: '⟦REDACTED:IP⟧',
    description: 'Masks IPv4 and IPv6 addresses in exported content.',
  },
  {
    id: 'email',
    label: 'Email Addresses',
    placeholder: '⟦REDACTED:EMAIL⟧',
    description: 'Masks email addresses in exported content.',
  },
  {
    id: 'domain',
    label: 'Domains',
    placeholder: '⟦REDACTED:DOMAIN⟧',
    description: 'Masks fully qualified domain names in exported content.',
  },
];

const placeholderMap = CATEGORY_DEFINITIONS.reduce<Record<RedactionCategory, string>>(
  (acc, def) => ({ ...acc, [def.id]: def.placeholder }),
  { ip: '⟦REDACTED:IP⟧', email: '⟦REDACTED:EMAIL⟧', domain: '⟦REDACTED:DOMAIN⟧' }
);

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const getPlaceholder = (category: RedactionCategory): string => placeholderMap[category];

const ipv4Segment = '(?:25[0-5]|2[0-4]\\d|1?\\d{1,2})';
const ipv4Pattern = new RegExp(`\\b(?:${ipv4Segment}\\.){3}${ipv4Segment}\\b`, 'g');
// IPv6 pattern covers full and shorthand notations (simplified for mock data)
const ipv6Pattern = /\b(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}\b/gi;
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,63}\b/gi;
const domainPattern = /\b(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,63}\b/gi;

const RULES: RedactionRule[] = [
  { category: 'email', pattern: emailPattern },
  { category: 'ip', pattern: ipv4Pattern },
  { category: 'ip', pattern: ipv6Pattern },
  { category: 'domain', pattern: domainPattern },
];

const overlaps = (a: { start: number; end: number }, b: { start: number; end: number }) =>
  a.start < b.end && b.start < a.end;

export const scanSensitiveMatches = (text: string): RedactionMatch[] => {
  const matches: RedactionMatch[] = [];
  const occupied: Array<{ start: number; end: number }> = [];

  RULES.forEach(({ category, pattern }) => {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text))) {
      const value = match[0];
      const start = match.index ?? 0;
      const end = start + value.length;
      if (occupied.some((range) => overlaps(range, { start, end }))) continue;
      matches.push({ category, start, end, value });
      occupied.push({ start, end });
    }
  });

  matches.sort((a, b) => a.start - b.start);
  return matches;
};

export const applyRedactions = (
  text: string,
  categories: RedactionCategory[],
  cachedMatches?: RedactionMatch[],
): RedactedResult => {
  const matches = cachedMatches ?? scanSensitiveMatches(text);
  const targets = matches.filter((match) => categories.includes(match.category));
  if (targets.length === 0) return { text, matches };

  let output = text;
  [...targets]
    .sort((a, b) => b.start - a.start)
    .forEach((match) => {
      const placeholder = getPlaceholder(match.category);
      output = `${output.slice(0, match.start)}${placeholder}${output.slice(match.end)}`;
    });

  return { text: output, matches };
};

export const buildPlaceholderRegex = (categories: RedactionCategory[]): RegExp => {
  const tokens = categories.map((category) => escapeRegex(getPlaceholder(category)));
  if (tokens.length === 0) return /$^/;
  return new RegExp(`(${tokens.join('|')})`, 'g');
};

export const getCategoryDefinition = (category: RedactionCategory): CategoryDefinition =>
  CATEGORY_DEFINITIONS.find((def) => def.id === category) ?? CATEGORY_DEFINITIONS[0];
