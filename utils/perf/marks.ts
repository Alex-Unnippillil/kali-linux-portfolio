export type InteractionPriority = 'user-blocking' | 'transition';

export interface InteractionMark {
  id: string;
  label: string;
  priority: InteractionPriority;
  startedAt: number;
}

export interface InteractionRecord extends InteractionMark {
  duration: number;
  detail?: Record<string, unknown>;
}

export interface InteractionSummary {
  recentInteractions: InteractionRecord[];
  lastINP: number | null;
}

let performanceOverride: Performance | null | undefined;

const getPerformance = (): Performance | undefined => {
  if (performanceOverride === null) {
    return undefined;
  }
  if (performanceOverride) {
    return performanceOverride;
  }
  return typeof performance === 'undefined' ? undefined : performance;
};

const hasPerformanceSupport = (): boolean => {
  const perf = getPerformance();
  return !!(
    perf &&
    typeof perf.mark === 'function' &&
    typeof perf.measure === 'function'
  );
};

const MAX_RECENT_INTERACTIONS = 20;
const recentInteractions: InteractionRecord[] = [];
let lastINP: number | null = null;
let markCounter = 0;

export const INTERACTION_BUDGET_MS: Record<InteractionPriority, number> = {
  'user-blocking': 200,
  transition: 500,
};

const warnOverBudget = (
  record: InteractionRecord,
  budget: number | undefined,
): void => {
  if (budget === undefined || typeof console === 'undefined') return;
  if (record.duration <= budget) return;
  const rounded = Math.round(record.duration);
  console.warn(
    `[perf] ${record.priority} interaction "${record.label}" exceeded budget (${rounded}ms > ${budget}ms)`,
  );
};

export const beginInteractionMark = (
  label: string,
  priority: InteractionPriority,
): InteractionMark | null => {
  const perf = getPerformance();
  if (!hasPerformanceSupport() || !perf) return null;

  const id = `${priority}:${label}:${Date.now()}:${markCounter++}`;
  const startMark = `${id}:start`;

  try {
    perf.mark(startMark);
  } catch (error) {
    return null;
  }

  const now = typeof perf.now === 'function' ? perf.now() : Date.now();

  return {
    id,
    label,
    priority,
    startedAt: now,
  };
};

const pushRecentInteraction = (record: InteractionRecord) => {
  recentInteractions.push(record);
  while (recentInteractions.length > MAX_RECENT_INTERACTIONS) {
    recentInteractions.shift();
  }
};

export const endInteractionMark = (
  mark: InteractionMark | null,
  metadata?: { detail?: Record<string, unknown> },
): InteractionRecord | null => {
  const perf = getPerformance();
  if (!hasPerformanceSupport() || !mark || !perf) return null;

  const endMark = `${mark.id}:end`;
  const measureName = `${mark.id}:measure`;
  const startMark = `${mark.id}:start`;

  try {
    perf.mark(endMark);
    perf.measure(measureName, startMark, endMark);
  } catch (error) {
    return null;
  }

  const entries = typeof perf.getEntriesByName === 'function' ? perf.getEntriesByName(measureName) : [];
  const entry = entries.length ? entries[entries.length - 1] : undefined;

  if (typeof perf.clearMarks === 'function') {
    perf.clearMarks(startMark);
    perf.clearMarks(endMark);
  }
  if (typeof perf.clearMeasures === 'function') {
    perf.clearMeasures(measureName);
  }

  if (!entry) return null;

  const record: InteractionRecord = {
    ...mark,
    duration: entry.duration,
    detail: metadata?.detail,
  };

  pushRecentInteraction(record);
  warnOverBudget(record, INTERACTION_BUDGET_MS[record.priority]);

  return record;
};

export const recordINPMetric = (value: number, detail?: string): void => {
  lastINP = value;
  if (typeof console !== 'undefined' && value > INTERACTION_BUDGET_MS['user-blocking']) {
    const rounded = Math.round(value);
    const context = detail ? ` for ${detail}` : '';
    console.warn(`[perf] INP ${rounded}ms exceeded target${context}`);
  }
};

export const getInteractionSummary = (): InteractionSummary => ({
  recentInteractions: [...recentInteractions],
  lastINP,
});

export const resetInteractionHistoryForTests = (): void => {
  recentInteractions.length = 0;
  lastINP = null;
  markCounter = 0;
};

export const setPerformanceImplementation = (impl: Performance | null): void => {
  performanceOverride = impl;
};

