import type { CommandPaletteItem, CommandPaletteItemType } from './types';

export type CommandPaletteSectionType = CommandPaletteItemType;

export type SearchableSourceItem = CommandPaletteItem & {
  url?: string;
  score?: number;
};

export type SearchSection = {
  type: CommandPaletteSectionType;
  label: string;
  items: CommandPaletteItem[];
};

export const SECTION_METADATA: Record<CommandPaletteSectionType, { label: string }> = {
  ['window']: { label: 'Recent Windows' },
  ['app']: { label: 'Applications' },
  ['action']: { label: 'Settings & Actions' },
  ['doc']: { label: 'Documentation' },
  ['route']: { label: 'Pages' },
};

const SECTION_ORDER: Record<CommandPaletteSectionType, number> = {
  ['window']: 0,
  ['app']: 1,
  ['doc']: 2,
  ['route']: 3,
  ['action']: 4,
};

const createLookupKey = (item: Pick<CommandPaletteItem, 'type' | 'id'>): string => `${item.type}:${item.id}`;

const tokenize = (value: string): string[] => value.trim().toLowerCase().split(/\s+/).filter(Boolean);

const buildSearchFields = (item: SearchableSourceItem): string[] => {
  const fields = [item.title, item.subtitle, ...(item.keywords || [])];
  const url = 'url' in item && item.url ? item.url : item.href;
  if (url) {
    fields.push(url);
  }
  return fields
    .filter((entry): entry is string => Boolean(entry))
    .map((entry) => entry.toString().toLowerCase());
};

type RecencyMap = Map<string, number>;

const createRecencyMap = (recentSelections: SearchableSourceItem[] | undefined): RecencyMap => {
  if (!recentSelections || !recentSelections.length) {
    return new Map();
  }
  const sorted = [...recentSelections].sort((a, b) => {
    const aTime = (a.data?.lastUsed as number | undefined) ?? (a as { lastUsed?: number }).lastUsed ?? 0;
    const bTime = (b.data?.lastUsed as number | undefined) ?? (b as { lastUsed?: number }).lastUsed ?? 0;
    return bTime - aTime;
  });
  return sorted.reduce<RecencyMap>((acc, item, index) => {
    acc.set(createLookupKey(item), sorted.length - index);
    return acc;
  }, new Map());
};

const scoreMatch = (item: SearchableSourceItem, tokens: string[], recency: RecencyMap): number => {
  if (!tokens.length) {
    const recentBoost = recency.get(createLookupKey(item));
    return recentBoost ? recentBoost * 5 : 0;
  }

  const haystack = buildSearchFields(item);
  let total = 0;
  tokens.forEach((token) => {
    haystack.forEach((field, fieldIndex) => {
      if (!field.includes(token)) return;
      let score = 5;
      if (field.startsWith(token)) score += 15;
      if (field === token) score += 30;
      if (fieldIndex === 0) score += 20;
      total += score;
    });
  });

  const recentBoost = recency.get(createLookupKey(item));
  if (recentBoost) {
    total += recentBoost * 5;
  }

  return total;
};

export type SectionSource = {
  type: CommandPaletteSectionType;
  items: SearchableSourceItem[];
};

export const filterAndRankSections = (
  sources: SectionSource[],
  query: string,
  recentSelections?: SearchableSourceItem[],
): SearchSection[] => {
  const tokens = tokenize(query);
  const recency = createRecencyMap(recentSelections);
  return sources
    .map(({ type, items }) => {
      const ranked = items
        .map((item) => ({ ...item, score: scoreMatch(item, tokens, recency) }))
        .filter((item) => tokens.length === 0 || item.score! > 0)
        .sort((a, b) => {
          const scoreDiff = (b.score ?? 0) - (a.score ?? 0);
          if (scoreDiff !== 0) return scoreDiff;
          return a.title.localeCompare(b.title);
        });
      return {
        type,
        label: SECTION_METADATA[type].label,
        items: ranked.map(({ score: _score, ...rest }) => rest),
      } satisfies SearchSection;
    })
    .filter((section) => section.items.length > 0)
    .sort((a, b) => SECTION_ORDER[a.type] - SECTION_ORDER[b.type]);
};

export const normalizeIconPath = (icon?: string): string | undefined => {
  if (!icon || typeof icon !== 'string') return undefined;
  if (/^(https?:|data:)/i.test(icon)) return icon;
  const sanitized = icon.replace(/^\.\//, '').replace(/^\/+/, '');
  return sanitized ? (sanitized.startsWith('/') ? sanitized : `/${sanitized}`) : undefined;
};

export const normalizeItems = (
  items: Array<Omit<SearchableSourceItem, 'icon'> & { icon?: string }>,
  type: CommandPaletteSectionType,
): SearchableSourceItem[] =>
  items.map((item) => ({
    ...item,
    type,
    icon: normalizeIconPath(item.icon),
  }));

export const mergeSections = (sections: SearchSection[]): SearchSection[] =>
  sections
    .reduce<SearchSection[]>((acc, section) => {
      const existing = acc.find((entry) => entry.type === section.type);
      if (existing) {
        existing.items = [...existing.items, ...section.items];
        return acc;
      }
      return [...acc, { ...section }];
    }, [])
    .map((section) => ({
      ...section,
      items: section.items,
    }))
    .sort((a, b) => SECTION_ORDER[a.type] - SECTION_ORDER[b.type]);
