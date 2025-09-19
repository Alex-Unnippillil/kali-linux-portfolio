const LIGATURE_REPLACEMENTS: Record<string, string> = {
  'æ': 'ae',
  'Æ': 'ae',
  'œ': 'oe',
  'Œ': 'oe',
  'ß': 'ss',
  'ø': 'o',
  'Ø': 'o'
};

const TOKEN_MATCH_THRESHOLD = 0.45;

const stripLigatures = (value: string): string => {
  return value.replace(/[æÆœŒßøØ]/g, char => LIGATURE_REPLACEMENTS[char] || char);
};

export const normalizeForSearch = (value: string): string => {
  if (!value) return '';

  const withBasicAscii = stripLigatures(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');

  return withBasicAscii
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
};

export const levenshteinDistance = (a: string, b: string): number => {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) {
    matrix[i][0] = i;
  }

  for (let j = 0; j < cols; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
};

const computeTokenScore = (token: string, normalizedTarget: string, targetTokens: string[]): number => {
  let bestScore = 0;

  const substringIndex = normalizedTarget.indexOf(token);
  if (substringIndex !== -1) {
    const coverage = token.length / normalizedTarget.length;
    const positionBoost = 1 - substringIndex / normalizedTarget.length;
    bestScore = Math.max(bestScore, 0.6 + coverage * 0.5 + positionBoost * 0.4);
  }

  for (const candidate of targetTokens) {
    if (!candidate) continue;

    if (candidate === token) {
      bestScore = Math.max(bestScore, 1.2);
      continue;
    }

    if (candidate.startsWith(token)) {
      bestScore = Math.max(bestScore, 0.9);
    } else if (candidate.includes(token)) {
      bestScore = Math.max(bestScore, 0.7);
    }

    const distance = levenshteinDistance(token, candidate);
    const maxLen = Math.max(token.length, candidate.length);
    if (maxLen > 0) {
      const similarity = 1 - distance / maxLen;
      if (similarity > bestScore) {
        bestScore = similarity;
      }
    }
  }

  return bestScore;
};

export const computeSearchScoreNormalized = (normalizedQuery: string, normalizedTarget: string): number => {
  if (!normalizedQuery) return 0;
  if (!normalizedTarget) return 0;

  if (normalizedQuery === normalizedTarget) {
    return 3;
  }

  const queryTokens = normalizedQuery.split(' ').filter(Boolean);
  if (queryTokens.length === 0) {
    return 0;
  }

  const targetTokens = normalizedTarget.split(' ').filter(Boolean);
  let totalScore = 0;
  let matchedTokens = 0;

  for (const token of queryTokens) {
    const tokenScore = computeTokenScore(token, normalizedTarget, targetTokens);
    if (tokenScore > TOKEN_MATCH_THRESHOLD) {
      totalScore += tokenScore;
      matchedTokens += 1;
    }
  }

  if (matchedTokens === 0) {
    const distance = levenshteinDistance(normalizedQuery, normalizedTarget);
    const maxLen = Math.max(normalizedQuery.length, normalizedTarget.length);
    if (maxLen === 0) return 0;
    const similarity = 1 - distance / maxLen;
    return similarity > 0.5 ? similarity : 0;
  }

  const coverage = matchedTokens / queryTokens.length;
  const averageScore = totalScore / queryTokens.length;
  const distance = levenshteinDistance(normalizedQuery, normalizedTarget);
  const maxLen = Math.max(normalizedQuery.length, normalizedTarget.length);
  const overallSimilarity = maxLen === 0 ? 0 : 1 - distance / maxLen;

  const combinedScore = averageScore + coverage + overallSimilarity * 0.2;

  return combinedScore > 0 ? combinedScore : 0;
};

export const computeSearchScore = (query: string, target: string): number => {
  return computeSearchScoreNormalized(normalizeForSearch(query), normalizeForSearch(target));
};
