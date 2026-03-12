import Filter from 'bad-words';
import coreQuotes from './database.json';
import techQuotes from '../components/apps/quotes_tech.json';

export interface QuoteSource {
  content?: string;
  quote?: string;
  author?: string;
  tags?: string[];
}

export interface Quote {
  content: string;
  author: string;
  tags: string[];
}

export const SAFE_TAGS = [
  'inspirational',
  'life',
  'love',
  'wisdom',
  'technology',
  'humor',
  'general',
] as const;

const SAFE_TAG_SET = new Set<string>(SAFE_TAGS);

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  inspirational: [
    'inspire',
    'dream',
    'goal',
    'courage',
    'success',
    'motivation',
    'believe',
    'achieve',
  ],
  life: ['life', 'living', 'journey', 'experience'],
  love: ['love', 'heart', 'passion'],
  wisdom: ['wisdom', 'knowledge', 'learn', 'education'],
  technology: ['technology', 'science', 'computer'],
  humor: ['laugh', 'funny', 'humor'],
};

const filter = new Filter();

const PACK_SOURCES: Record<string, QuoteSource[]> = {
  core: coreQuotes as QuoteSource[],
  technology: techQuotes as QuoteSource[],
};

const quoteKey = (quote: Quote) => `${quote.content}\u2014${quote.author}`;

const toSafeTags = (tags: string[]): string[] => {
  const normalized = tags
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
  const unique = Array.from(new Set(normalized));
  const safe = unique.filter((tag) => SAFE_TAG_SET.has(tag));
  return safe.length ? safe : ['general'];
};

const guessTags = (content: string): string[] => {
  const lower = content.toLowerCase();
  return Object.entries(CATEGORY_KEYWORDS)
    .filter(([, keywords]) => keywords.some((keyword) => lower.includes(keyword)))
    .map(([category]) => category);
};

export const normalizeQuotes = (data: QuoteSource[]): Quote[] => {
  const deduped = new Map<string, Quote>();

  data.forEach((entry) => {
    const content = (entry.content ?? entry.quote ?? '').trim();
    if (!content || filter.isProfane(content)) return;

    const author = (entry.author ?? 'Unknown').toString().trim() || 'Unknown';
    const providedTags = Array.isArray(entry.tags) ? entry.tags : [];

    const tags = toSafeTags(
      providedTags.length ? providedTags : guessTags(content),
    );

    const quote: Quote = {
      content,
      author,
      tags,
    };

    deduped.set(quoteKey(quote), quote);
  });

  return Array.from(deduped.values());
};

const PACKS = Object.fromEntries(
  Object.entries(PACK_SOURCES).map(([name, source]) => [
    name,
    normalizeQuotes(source),
  ]),
) as Record<string, Quote[]>;

const ALL_QUOTES = dedupeQuotes(Object.values(PACKS).flat());

export const listQuotePacks = () => Object.keys(PACKS);

export const getPackQuotes = (pack: string) => [...(PACKS[pack] ?? [])];

export const getAllQuotes = () => [...ALL_QUOTES];

export const mergeQuotes = (base: Quote[], additions: Quote[]): Quote[] => {
  const map = new Map<string, Quote>();
  base.forEach((quote) => map.set(quoteKey(quote), quote));
  additions.forEach((quote) => map.set(quoteKey(quote), quote));
  return Array.from(map.values());
};

export const filterByTag = (quotes: Quote[], tag?: string): Quote[] => {
  if (!tag) return [...quotes];
  const normalized = tag.trim().toLowerCase();
  return quotes.filter((quote) => quote.tags.includes(normalized));
};

export const listSafeTags = (quotes: Quote[] = ALL_QUOTES) => {
  const tags = new Set<string>();
  quotes.forEach((quote) => {
    quote.tags.forEach((tag) => {
      if (SAFE_TAG_SET.has(tag)) tags.add(tag);
    });
  });
  return Array.from(tags);
};

export const getQuoteKey = (quote: Quote) => quoteKey(quote);

function dedupeQuotes(quotes: Quote[]): Quote[] {
  const map = new Map<string, Quote>();
  quotes.forEach((quote) => map.set(quoteKey(quote), quote));
  return Array.from(map.values());
}
