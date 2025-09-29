export type SimpleRuleToken =
  | { type: 'noop' }
  | { type: 'capitalize' }
  | { type: 'uppercase' }
  | { type: 'lowercase' }
  | { type: 'duplicate' }
  | { type: 'reverse' }
  | { type: 'append'; values: string[] }
  | { type: 'prepend'; values: string[] };

export interface RuleSimulationInput {
  baseWords: string[];
  rules: string[];
}

export interface RuleBreakdownEntry {
  rule: string;
  candidates: number;
}

export interface RuleSimulationResult {
  totalCandidates: number;
  ruleBreakdown: RuleBreakdownEntry[];
}

const RANGE_EXPRESSIONS: Record<string, string[]> = {
  '?d': Array.from({ length: 10 }, (_, i) => String(i)),
  '?l': Array.from({ length: 26 }, (_, i) => String.fromCharCode(97 + i)),
  '?u': Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)),
};

const toUniqueList = (input: string[]): string[] => Array.from(new Set(input.filter(Boolean)));

const expandCharacterSet = (set: string): string[] => {
  const values: string[] = [];
  for (let i = 0; i < set.length; i += 1) {
    const char = set[i];
    const next = set[i + 1];
    const nextNext = set[i + 2];
    if (next === '-' && nextNext) {
      const start = char.charCodeAt(0);
      const end = nextNext.charCodeAt(0);
      const step = start <= end ? 1 : -1;
      for (let code = start; step > 0 ? code <= end : code >= end; code += step) {
        values.push(String.fromCharCode(code));
      }
      i += 2;
    } else {
      values.push(char);
    }
  }
  return toUniqueList(values);
};

export const parseRule = (input: string): SimpleRuleToken[] => {
  const trimmed = input.trim();
  if (!trimmed || trimmed.startsWith('#')) return [];

  const tokens: SimpleRuleToken[] = [];
  for (let i = 0; i < trimmed.length; i += 1) {
    const char = trimmed[i];
    if (char === '\\') {
      i += 1; // skip escaped character
      continue;
    }
    if (char === ':') {
      tokens.push({ type: 'noop' });
    } else if (char === 'c') {
      tokens.push({ type: 'capitalize' });
    } else if (char === 'u') {
      tokens.push({ type: 'uppercase' });
    } else if (char === 'l') {
      tokens.push({ type: 'lowercase' });
    } else if (char === 'd') {
      tokens.push({ type: 'duplicate' });
    } else if (char === 'r') {
      tokens.push({ type: 'reverse' });
    } else if (char === '^' || char === '$') {
      const next = trimmed[i + 1];
      if (next === '[') {
        const endIdx = trimmed.indexOf(']', i + 2);
        if (endIdx !== -1) {
          const set = trimmed.slice(i + 2, endIdx);
          const values = expandCharacterSet(set);
          tokens.push({ type: char === '^' ? 'prepend' : 'append', values });
          i = endIdx;
          continue;
        }
      }
      if (next) {
        tokens.push({ type: char === '^' ? 'prepend' : 'append', values: [next] });
        i += 1;
      }
    } else if (char === '[') {
      const endIdx = trimmed.indexOf(']', i + 1);
      if (endIdx !== -1) {
        const set = trimmed.slice(i + 1, endIdx);
        const values = expandCharacterSet(set);
        tokens.push({ type: 'append', values });
        i = endIdx;
      }
    } else {
      const ahead = trimmed.slice(i, i + 2);
      if (RANGE_EXPRESSIONS[ahead]) {
        tokens.push({ type: 'append', values: RANGE_EXPRESSIONS[ahead] });
        i += 1;
      }
    }
  }
  return tokens;
};

const computeMultiplierForToken = (token: SimpleRuleToken): number => {
  if (token.type === 'append' || token.type === 'prepend') {
    return token.values.length || 1;
  }
  return 1;
};

export const estimateRuleCandidates = (
  baseWords: string[],
  ruleTokens: SimpleRuleToken[]
): number => {
  if (baseWords.length === 0 || ruleTokens.length === 0) {
    return 0;
  }
  const multiplier = ruleTokens.reduce(
    (acc, token) => acc * computeMultiplierForToken(token),
    1
  );
  return baseWords.length * multiplier;
};

export const estimateRuleSet = ({
  baseWords,
  rules,
}: RuleSimulationInput): RuleSimulationResult => {
  const sanitizedBase = toUniqueList(
    baseWords.map((word) => word.trim()).filter((word) => word.length > 0)
  );
  const sanitizedRules = rules
    .map((rule) => rule.trim())
    .filter((rule) => rule.length > 0 && !rule.startsWith('#'));

  const breakdown: RuleBreakdownEntry[] = [];
  let totalCandidates = 0;

  sanitizedRules.forEach((rule) => {
    const tokens = parseRule(rule);
    if (tokens.length === 0) return;
    const count = estimateRuleCandidates(sanitizedBase, tokens);
    breakdown.push({ rule, candidates: count });
    totalCandidates += count;
  });

  return { totalCandidates, ruleBreakdown: breakdown };
};

export interface SimulationProgress {
  completed: number;
  total: number;
  totalCandidates: number;
}

export interface SimulationOptions {
  chunkSize?: number;
  progress?: (progress: SimulationProgress) => void;
}

export const simulateRuleSetAsync = (
  input: RuleSimulationInput,
  options: SimulationOptions = {}
): Promise<RuleSimulationResult> => {
  const { chunkSize = 20, progress } = options;
  const { baseWords, rules } = input;
  const sanitizedBase = toUniqueList(
    baseWords.map((word) => word.trim()).filter((word) => word.length > 0)
  );
  const sanitizedRules = rules
    .map((rule) => rule.trim())
    .filter((rule) => rule.length > 0 && !rule.startsWith('#'));

  return new Promise<RuleSimulationResult>((resolve) => {
    if (sanitizedBase.length === 0 || sanitizedRules.length === 0) {
      resolve({ totalCandidates: 0, ruleBreakdown: [] });
      return;
    }

    const breakdown: RuleBreakdownEntry[] = [];
    let totalCandidates = 0;
    let index = 0;

    const processChunk = () => {
      const end = Math.min(index + Math.max(1, chunkSize), sanitizedRules.length);
      for (; index < end; index += 1) {
        const rule = sanitizedRules[index];
        const tokens = parseRule(rule);
        if (tokens.length === 0) continue;
        const candidates = estimateRuleCandidates(sanitizedBase, tokens);
        totalCandidates += candidates;
        breakdown.push({ rule, candidates });
      }
      progress?.({
        completed: index,
        total: sanitizedRules.length,
        totalCandidates,
      });
      if (index < sanitizedRules.length) {
        setTimeout(processChunk, 0);
      } else {
        resolve({ totalCandidates, ruleBreakdown: breakdown });
      }
    };

    processChunk();
  });
};

