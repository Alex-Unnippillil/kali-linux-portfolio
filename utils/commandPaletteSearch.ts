export type SearchableItem = {
  id: string;
  title: string;
  description?: string;
  keywords?: string[];
};

const normalize = (value: string) => value.toLowerCase();

const tokenize = (query: string) =>
  query
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

const fuzzyScore = (text: string, query: string): number | null => {
  if (!query) return 0;
  const haystack = normalize(text);
  const needle = normalize(query);
  let score = 0;
  let lastIndex = -1;

  for (let i = 0; i < needle.length; i += 1) {
    const char = needle[i];
    const index = haystack.indexOf(char, lastIndex + 1);
    if (index === -1) {
      return null;
    }
    score += index - lastIndex;
    lastIndex = index;
  }

  return score + (haystack.length - needle.length);
};

const BEST_SCORE = Number.NEGATIVE_INFINITY;
const WORST_SCORE = Number.POSITIVE_INFINITY;

const scoreItem = (item: SearchableItem, tokens: string[]): number => {
  if (!tokens.length) return BEST_SCORE;

  const haystacks = [
    item.title,
    item.description ?? '',
    ...(item.keywords ?? []),
  ].map((value) => normalize(value));

  let total = 0;
  for (const token of tokens) {
    let bestForToken = WORST_SCORE;
    for (const text of haystacks) {
      if (!text) continue;
      const score = fuzzyScore(text, token);
      if (score === null) continue;
      if (score < bestForToken) {
        bestForToken = score;
      }
      if (bestForToken === 0) break;
    }
    if (bestForToken === WORST_SCORE) return WORST_SCORE;
    total += bestForToken;
  }

  // Prefer direct substring matches by giving them a small boost.
  if (item.title && tokens.some((token) => normalize(item.title).includes(token))) {
    total -= 5;
  }

  return total;
};

export const rankPaletteItems = <T extends SearchableItem>(
  items: T[],
  query: string,
  limit = 15,
): T[] => {
  const trimmed = query.trim();
  if (!trimmed) {
    return items.slice(0, limit);
  }

  const tokens = tokenize(trimmed);
  if (!tokens.length) {
    return items.slice(0, limit);
  }

  return items
    .map((item, index) => ({
      item,
      score: scoreItem(item, tokens),
      index,
    }))
    .filter(({ score }) => score !== WORST_SCORE)
    .sort((a, b) => {
      if (a.score === b.score) {
        return a.index - b.index;
      }
      return a.score - b.score;
    })
    .slice(0, limit)
    .map(({ item }) => item);
};

export { fuzzyScore };
