import rulesConfig from '../../data/etc/xdg/kali-notify/rules.json';

export type NotificationPriority = 'critical' | 'high' | 'normal' | 'low';

export interface NotificationHints {
  [key: string]: unknown;
}

export interface NotificationRuleMatch {
  appId?: string | string[];
  appIdPrefix?: string[];
  bodyContains?: string[];
  titleContains?: string[];
  keywords?: string[];
  hints?: Record<string, Array<string | number | boolean>>;
}

export interface NotificationRule {
  id: string;
  description?: string;
  priority: NotificationPriority;
  match: NotificationRuleMatch;
}

export interface NotificationRuleSet {
  version: number;
  defaultPriority: NotificationPriority;
  rules: NotificationRule[];
}

export interface ClassificationInput {
  appId: string;
  title: string;
  body?: string;
  priority?: NotificationPriority;
  hints?: NotificationHints;
}

export interface ClassificationResult {
  priority: NotificationPriority;
  matchedRuleId: string | null;
  source: 'explicit' | 'hint' | 'rule' | 'default';
}

export const PRIORITY_ORDER: NotificationPriority[] = ['critical', 'high', 'normal', 'low'];

const defaultRuleSet = rulesConfig as NotificationRuleSet;

const normalizeString = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).toLowerCase();
  }
  if (Array.isArray(value)) {
    return value.map(normalizeString).filter(Boolean).join(' ');
  }
  if (typeof value === 'string') {
    return value.trim().toLowerCase();
  }
  return String(value).toLowerCase();
};

const stringIncludes = (text: string | undefined, searchTerms: string[]): boolean => {
  if (!text) return false;
  const haystack = text.toLowerCase();
  return searchTerms.some(term => haystack.includes(term.toLowerCase()));
};

const matchHints = (
  hints: NotificationHints | undefined,
  expected: Record<string, Array<string | number | boolean>>,
): boolean => {
  if (!hints) return false;
  return Object.entries(expected).every(([key, values]) => {
    if (!(key in hints)) return false;
    const candidate = (hints as Record<string, unknown>)[key];
    const normalizedCandidate = normalizeString(candidate);
    if (normalizedCandidate === null) return false;
    return values
      .map(normalizeString)
      .filter((value): value is string => Boolean(value))
      .some(value => normalizedCandidate.includes(value));
  });
};

const normalizePriority = (value: unknown): NotificationPriority | null => {
  const normalized = normalizeString(value);
  if (!normalized) return null;
  switch (normalized) {
    case 'critical':
    case 'high':
    case 'normal':
    case 'low':
      return normalized;
    case '2':
      return 'critical';
    case '1':
      return 'high';
    case '0':
      return 'low';
    default:
      return null;
  }
};

const priorityFromUrgency = (value: unknown): NotificationPriority | null => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') {
    if (value <= 0) return 'low';
    if (value === 1) return 'high';
    if (value >= 2) return 'critical';
  }
  const normalized = normalizeString(value);
  if (!normalized) return null;
  if (normalized === 'high') return 'high';
  if (normalized === 'critical') return 'critical';
  if (normalized === 'low') return 'low';
  if (normalized === 'normal') return 'normal';
  if (normalized === '2') return 'critical';
  if (normalized === '1') return 'high';
  if (normalized === '0') return 'low';
  return null;
};

export const derivePriorityFromHints = (
  hints?: NotificationHints,
): { priority: NotificationPriority; source: string } | null => {
  if (!hints) return null;

  if ('x-kali-priority' in hints) {
    const fromCustom = normalizePriority((hints as Record<string, unknown>)['x-kali-priority']);
    if (fromCustom) return { priority: fromCustom, source: 'hint:x-kali-priority' };
  }

  if ('urgency' in hints) {
    const urgencyPriority = priorityFromUrgency((hints as Record<string, unknown>).urgency);
    if (urgencyPriority) return { priority: urgencyPriority, source: 'hint:urgency' };
  }

  if ('urgency-level' in hints) {
    const urgencyPriority = priorityFromUrgency((hints as Record<string, unknown>)['urgency-level']);
    if (urgencyPriority) return { priority: urgencyPriority, source: 'hint:urgency-level' };
  }

  if ('priority' in hints) {
    const fromPriority = normalizePriority((hints as Record<string, unknown>).priority);
    if (fromPriority) return { priority: fromPriority, source: 'hint:priority' };
  }

  if ('importance' in hints) {
    const fromImportance = normalizePriority((hints as Record<string, unknown>).importance);
    if (fromImportance) return { priority: fromImportance, source: 'hint:importance' };
  }

  return null;
};

const matchesRule = (input: ClassificationInput, rule: NotificationRule): boolean => {
  const { match } = rule;
  if (!match) return false;
  const { appId, appIdPrefix, bodyContains, keywords, titleContains, hints } = match;

  if (appId) {
    const values = Array.isArray(appId) ? appId : [appId];
    const found = values.some(value => value.toLowerCase() === input.appId.toLowerCase());
    if (!found) return false;
  }

  if (appIdPrefix) {
    const matchesPrefix = appIdPrefix.some(prefix =>
      input.appId.toLowerCase().startsWith(prefix.toLowerCase()),
    );
    if (!matchesPrefix) return false;
  }

  if (bodyContains && !stringIncludes(input.body, bodyContains)) {
    return false;
  }

  if (titleContains && !stringIncludes(input.title, titleContains)) {
    return false;
  }

  if (keywords) {
    const combined = `${input.title} ${input.body ?? ''}`.toLowerCase();
    const hasKeyword = keywords.some(keyword => combined.includes(keyword.toLowerCase()));
    if (!hasKeyword) return false;
  }

  if (hints && !matchHints(input.hints, hints)) {
    return false;
  }

  return true;
};

export const classifyNotification = (
  input: ClassificationInput,
  ruleSet: NotificationRuleSet = defaultRuleSet,
): ClassificationResult => {
  if (input.priority && PRIORITY_ORDER.includes(input.priority)) {
    return { priority: input.priority, matchedRuleId: 'explicit', source: 'explicit' };
  }

  const hintPriority = derivePriorityFromHints(input.hints);
  if (hintPriority) {
    return {
      priority: hintPriority.priority,
      matchedRuleId: hintPriority.source,
      source: 'hint',
    };
  }

  for (const rule of ruleSet.rules) {
    if (matchesRule(input, rule)) {
      return { priority: rule.priority, matchedRuleId: rule.id, source: 'rule' };
    }
  }

  return {
    priority: ruleSet.defaultPriority ?? 'normal',
    matchedRuleId: null,
    source: 'default',
  };
};

export const getDefaultRuleSet = (): NotificationRuleSet => defaultRuleSet;
