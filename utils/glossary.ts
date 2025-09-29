export interface GlossaryEntry {
  id: string;
  term: string;
  definition: string;
  link: string;
  aliases?: string[];
  tags?: string[];
}

const normalize = (value: string) => value.toLowerCase();

const tokenize = (value: string) =>
  normalize(value)
    .split(/\s+/)
    .filter(Boolean);

const entryTokens = (entry: GlossaryEntry) => {
  const text = [
    entry.term,
    entry.definition,
    ...(entry.aliases ?? []),
    ...(entry.tags ?? []),
    entry.id,
  ]
    .map(normalize)
    .join(' ');

  return tokenize(text);
};

export const filterGlossaryEntries = (
  entries: GlossaryEntry[],
  query: string,
): GlossaryEntry[] => {
  const trimmed = query.trim();
  if (!trimmed) {
    return entries;
  }

  const needles = tokenize(trimmed);

  return entries.filter((entry) => {
    const haystack = entryTokens(entry);
    return needles.every((needle) => haystack.some((token) => token.includes(needle)));
  });
};

export const createGlossaryLookup = (
  entries: GlossaryEntry[],
): Record<string, GlossaryEntry> => {
  const lookup: Record<string, GlossaryEntry> = {};

  entries.forEach((entry) => {
    lookup[normalize(entry.id)] = entry;
    entry.aliases?.forEach((alias) => {
      lookup[normalize(alias)] = entry;
    });
  });

  return lookup;
};
