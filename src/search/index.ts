export type SearchResultType = 'app' | 'history' | 'suggestion';

export interface AppRecord {
  id?: string;
  name: string;
  url?: string;
  description?: string;
  icon?: string;
  keywords?: string[];
}

export interface HistoryRecord {
  url: string;
  title?: string;
  lastVisitedAt?: number;
  visitCount?: number;
}

export type SuggestionRecord =
  | string
  | {
      value: string;
      label?: string;
      icon?: string;
      keywords?: string[];
      metadata?: Record<string, unknown>;
    };

export interface SearchResult {
  id: string;
  type: SearchResultType;
  value: string;
  label: string;
  secondaryLabel?: string;
  icon?: string;
  keywords?: string[];
  metadata?: Record<string, unknown>;
}

export interface AggregateParams {
  apps?: AppRecord[];
  history?: HistoryRecord[];
  suggestions?: SuggestionRecord[];
  limit?: number;
}

export interface SearchIndex {
  apps: SearchResult[];
  history: SearchResult[];
  suggestions: SearchResult[];
  all: SearchResult[];
}

export interface MatchOptions {
  limit?: number;
  includeTypes?: SearchResultType[];
}

const normalizeKeywords = (
  ...tokens: Array<string | undefined | string[]>
): string[] => {
  const keywords = new Set<string>();

  const add = (value: string) => {
    const normalized = value.trim().toLowerCase();
    if (normalized) keywords.add(normalized);
  };

  tokens.forEach((token) => {
    if (!token) return;
    if (Array.isArray(token)) {
      token.forEach((entry) => {
        if (typeof entry === 'string') {
          entry
            .split(/[\s,]+/)
            .map((piece) => piece.trim())
            .filter(Boolean)
            .forEach(add);
        }
      });
      return;
    }

    token
      .split(/[\s,]+/)
      .map((piece) => piece.trim())
      .filter(Boolean)
      .forEach(add);
  });

  return Array.from(keywords);
};

const mapApps = (apps: AppRecord[] = []): SearchResult[] =>
  apps
    .map((app, index) => {
      const label = app.name?.trim();
      const value = app.url?.trim() || app.id?.trim() || label;

      if (!label || !value) {
        return null;
      }

      const secondaryLabel = app.url && app.url !== label ? app.url : undefined;
      const keywords = normalizeKeywords(app.name, app.description, app.keywords);

      return {
        id: app.id?.trim() || `app-${index}`,
        type: 'app' as const,
        value,
        label,
        secondaryLabel,
        icon: app.icon,
        keywords,
        metadata: { ...app },
      };
    })
    .filter((entry): entry is SearchResult => Boolean(entry));

const mapHistory = (history: HistoryRecord[] = []): SearchResult[] =>
  history
    .map((entry, index) => {
      const value = entry.url?.trim();
      if (!value) return null;

      const label = entry.title?.trim() || value;
      const secondaryLabel = entry.title ? value : undefined;
      const keywords = normalizeKeywords(entry.title, entry.url);

      return {
        id: value || `history-${index}`,
        type: 'history' as const,
        value,
        label,
        secondaryLabel,
        keywords,
        metadata: {
          lastVisitedAt: entry.lastVisitedAt,
          visitCount: entry.visitCount,
        },
      };
    })
    .filter((entry): entry is SearchResult => Boolean(entry));

const mapSuggestions = (suggestions: SuggestionRecord[] = []): SearchResult[] =>
  suggestions
    .map((suggestion, index) => {
      if (typeof suggestion === 'string') {
        const value = suggestion.trim();
        if (!value) return null;
        return {
          id: `suggestion-${index}`,
          type: 'suggestion' as const,
          value,
          label: value,
          keywords: normalizeKeywords(value),
        };
      }

      const value = suggestion.value?.trim();
      if (!value) return null;

      const label = suggestion.label?.trim() || value;
      const keywords = normalizeKeywords(label, value, suggestion.keywords);

      return {
        id: `suggestion-${index}`,
        type: 'suggestion' as const,
        value,
        label,
        icon: suggestion.icon,
        keywords,
        metadata: suggestion.metadata,
      };
    })
    .filter((entry): entry is SearchResult => Boolean(entry));

const dedupe = (sections: SearchResult[][]): SearchResult[] => {
  const seen = new Set<string>();
  const ordered: SearchResult[] = [];

  sections.forEach((section) => {
    section.forEach((item) => {
      const key = item.value.trim().toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      ordered.push(item);
    });
  });

  return ordered;
};

export const aggregateSearchIndex = ({
  apps,
  history,
  suggestions,
  limit,
}: AggregateParams = {}): SearchIndex => {
  const appResults = mapApps(apps);
  const historyResults = mapHistory(history);
  const suggestionResults = mapSuggestions(suggestions);

  const all = dedupe([appResults, historyResults, suggestionResults]);
  const limitedAll =
    typeof limit === 'number' && limit >= 0 ? all.slice(0, limit) : all;

  return {
    apps: appResults,
    history: historyResults,
    suggestions: suggestionResults,
    all: limitedAll,
  };
};

interface ScoreWeights {
  exact: number;
  startsWith: number;
  contains: number;
}

const evaluate = (
  text: string | undefined,
  query: string,
  weights: ScoreWeights,
): number => {
  if (!text) return 0;
  const normalized = text.trim().toLowerCase();
  if (!normalized) return 0;
  if (normalized === query) return weights.exact;
  if (normalized.startsWith(query)) return weights.startsWith;
  if (normalized.includes(query)) return weights.contains;
  return 0;
};

const scoreResult = (item: SearchResult, query: string): number => {
  const scores = [
    evaluate(item.label, query, { exact: 10, startsWith: 7, contains: 3 }),
    evaluate(item.value, query, { exact: 9, startsWith: 6, contains: 2 }),
  ];

  if (item.secondaryLabel) {
    scores.push(
      evaluate(item.secondaryLabel, query, {
        exact: 8,
        startsWith: 5,
        contains: 2,
      }),
    );
  }

  if (item.keywords) {
    item.keywords.forEach((keyword) => {
      scores.push(
        evaluate(keyword, query, {
          exact: 7,
          startsWith: 5,
          contains: 1,
        }),
      );
    });
  }

  return Math.max(0, ...scores);
};

export const matchSearchResults = (
  query: string,
  index: SearchIndex,
  options: MatchOptions = {},
): SearchResult[] => {
  const { limit, includeTypes } = options;
  const normalizedQuery = query.trim().toLowerCase();

  const dataset = includeTypes
    ? index.all.filter((item) => includeTypes.includes(item.type))
    : index.all;

  if (!normalizedQuery) {
    const results = [...dataset];
    return typeof limit === 'number' && limit >= 0
      ? results.slice(0, limit)
      : results;
  }

  const matches = dataset
    .map((item, position) => ({
      item,
      position,
      score: scoreResult(item, normalizedQuery),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => {
      if (b.score === a.score) return a.position - b.position;
      return b.score - a.score;
    })
    .map(({ item }) => item);

  if (typeof limit === 'number' && limit >= 0) {
    return matches.slice(0, limit);
  }

  return matches;
};
