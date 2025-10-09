import type { AppEntry, AppMetadata } from './appRegistry';
import { buildAppMetadata } from './appRegistry';

type Candidate = {
  value: string;
  weight: number;
};

const TOKEN_SPLIT = /[\s/_-]+/;

const normalize = (value: string): string => value.trim().toLowerCase();

const tokenize = (value: string): string[] =>
  normalize(value)
    .split(TOKEN_SPLIT)
    .map((token) => token.trim())
    .filter(Boolean);

const levenshteinDistance = (a: string, b: string): number => {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const previous: number[] = new Array(b.length + 1);
  const current: number[] = new Array(b.length + 1);

  for (let j = 0; j <= b.length; j += 1) {
    previous[j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    const aChar = a.charCodeAt(i - 1);

    for (let j = 1; j <= b.length; j += 1) {
      const cost = aChar === b.charCodeAt(j - 1) ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      );
    }

    for (let j = 0; j <= b.length; j += 1) {
      previous[j] = current[j];
    }
  }

  return previous[b.length];
};

const scoreCandidate = (query: string, candidate: Candidate): number => {
  if (!query || !candidate.value) return 0;
  const normalizedCandidate = candidate.value;

  if (normalizedCandidate === query) {
    return Math.round(130 * candidate.weight);
  }

  const index = normalizedCandidate.indexOf(query);
  if (index !== -1) {
    const prefixBoost = index === 0 ? 20 : 0;
    const lengthPenalty = Math.max(
      0,
      normalizedCandidate.length - query.length,
    );
    const base = 100 - index * 5 - lengthPenalty;
    return Math.round((Math.max(base, 50) + prefixBoost) * candidate.weight);
  }

  const distance = levenshteinDistance(query, normalizedCandidate);
  const maxLen = Math.max(query.length, normalizedCandidate.length);
  if (maxLen === 0) {
    return 0;
  }

  const similarity = 1 - distance / maxLen;
  if (similarity <= 0.5) {
    return 0;
  }

  const fuzzyScore = Math.round(similarity * 75);
  return Math.round(fuzzyScore * candidate.weight);
};

const buildCandidates = (app: AppEntry, metadata: AppMetadata): Candidate[] => {
  const candidates: Candidate[] = [];
  const addCandidate = (value: string, weight: number) => {
    const normalizedValue = normalize(value);
    if (normalizedValue) {
      candidates.push({ value: normalizedValue, weight });
    }
  };

  addCandidate(app.title, 1.3);
  tokenize(app.title).forEach((token) => addCandidate(token, 1.1));

  metadata.keywords.forEach((keyword) => {
    addCandidate(keyword, 1.2);
    tokenize(keyword).forEach((token) => addCandidate(token, 1));
  });

  return candidates;
};

export const computeRelevanceScore = (
  query: string,
  app: AppEntry,
  metadata: AppMetadata,
): number => {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) {
    return 0;
  }

  const candidates = buildCandidates(app, metadata);
  if (candidates.length === 0) {
    return 0;
  }

  const queryTokens = tokenize(normalizedQuery);

  const tokenScores = queryTokens.map((token) => {
    let tokenBest = 0;
    candidates.forEach((candidate) => {
      tokenBest = Math.max(tokenBest, scoreCandidate(token, candidate));
    });
    return tokenBest;
  });

  let aggregate = tokenScores.reduce((sum, value) => sum + value, 0);

  const fullQueryBest = candidates.reduce((best, candidate) => {
    const score = scoreCandidate(normalizedQuery, candidate);
    return score > best ? score : best;
  }, 0);

  aggregate = Math.max(aggregate, fullQueryBest);

  return aggregate;
};

type MetadataMap = Partial<Record<string, AppMetadata>>;

export const filterAndRankApps = (
  apps: AppEntry[],
  metadataMap: MetadataMap,
  query: string,
): AppEntry[] => {
  const activeApps = apps.filter((app) => !app.disabled);
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return activeApps;
  }

  return activeApps
    .map((app) => {
      const meta = metadataMap[app.id] ?? buildAppMetadata(app);
      return {
        app,
        score: computeRelevanceScore(normalizedQuery, app, meta),
      };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.app.title.localeCompare(b.app.title);
    })
    .map(({ app }) => app);
};

export type { AppEntry as SearchableApp };
