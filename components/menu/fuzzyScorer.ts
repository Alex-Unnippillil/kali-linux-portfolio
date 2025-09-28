export type SearchableApp = {
  id: string;
  title: string;
  favourite?: boolean;
};

export type ScoreContext = {
  recentIds?: readonly string[];
  favoriteIds?: readonly string[];
};

type InternalScoreContext = {
  recentSet?: Set<string>;
  favoriteSet?: Set<string>;
};

const RECENT_BOOST = 18;
const FAVORITE_BOOST = 12;

const toInternalContext = (context: ScoreContext): InternalScoreContext => {
  const internal: InternalScoreContext = {};
  if (context.recentIds && context.recentIds.length > 0) {
    internal.recentSet = new Set(context.recentIds);
  }
  if (context.favoriteIds && context.favoriteIds.length > 0) {
    internal.favoriteSet = new Set(context.favoriteIds);
  }
  return internal;
};

const subsequenceScore = (query: string, value: string): number => {
  if (!query || !value) {
    return 0;
  }
  const normalizedValue = value.toLowerCase();
  let score = 0;
  let lastIndex = -1;
  let runLength = 0;

  for (const char of query) {
    const matchIndex = normalizedValue.indexOf(char, lastIndex + 1);
    if (matchIndex === -1) {
      return 0;
    }

    // Base match weight.
    score += 8;

    const distance = matchIndex - lastIndex;
    if (distance === 1) {
      runLength += 1;
      score += 6 * runLength;
    } else {
      runLength = 0;
      score += Math.max(0, 4 - distance);
    }

    if (matchIndex === 0) {
      score += 4;
    } else {
      score += Math.max(0, 4 - matchIndex);
    }

    lastIndex = matchIndex;
  }

  const coverage = query.length / Math.max(normalizedValue.length, query.length);
  score += coverage * 10;

  return score;
};

const computeBaseScore = (query: string, app: SearchableApp): number => {
  const normalizedQuery = query.toLowerCase();
  const titleScore = subsequenceScore(normalizedQuery, app.title);
  const idScore = subsequenceScore(normalizedQuery, app.id);
  return Math.max(titleScore, idScore);
};

const applyBoosts = (score: number, app: SearchableApp, context: InternalScoreContext): number => {
  let boosted = score;
  if (context.recentSet?.has(app.id)) {
    boosted += RECENT_BOOST;
  }
  if (context.favoriteSet?.has(app.id) || app.favourite) {
    boosted += FAVORITE_BOOST;
  }
  return boosted;
};

const computeScoreWithContext = (
  query: string,
  app: SearchableApp,
  context: InternalScoreContext,
): number => {
  const baseScore = computeBaseScore(query, app);
  if (baseScore === 0) {
    return 0;
  }
  return applyBoosts(baseScore, app, context);
};

export const scoreAppMatch = (
  query: string,
  app: SearchableApp,
  context: ScoreContext = {},
): number => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return 0;
  }
  return computeScoreWithContext(normalizedQuery, app, toInternalContext(context));
};

export const rankApps = <T extends SearchableApp>(
  apps: readonly T[],
  query: string,
  context: ScoreContext = {},
): T[] => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [...apps];
  }
  const internal = toInternalContext(context);
  return apps
    .map(app => ({
      app,
      score: computeScoreWithContext(normalizedQuery, app, internal),
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.app);
};

export const __testing = {
  subsequenceScore,
  computeBaseScore,
  applyBoosts,
  toInternalContext,
};
