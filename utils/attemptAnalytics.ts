import { diffLines, type Change } from 'diff';

export type AttemptStatus =
  | 'blocked'
  | 'detected'
  | 'success'
  | 'deferred';

export interface AttemptRecord {
  id: string;
  target: string;
  protocol: string;
  status: AttemptStatus;
  timestamp: string;
  detection: string;
  sensitivity: 'public' | 'internal' | 'restricted';
  operatorAlias: string;
  durationMs: number;
  notes?: string;
}

export interface AttemptRun {
  runId: string;
  label: string;
  startedAt: string;
  scenario: string;
  baseline?: boolean;
  attempts: AttemptRecord[];
}

export interface FlattenedAttempt extends AttemptRecord {
  runId: string;
  runLabel: string;
  runScenario: string;
  runStartedAt: string;
}

export interface AttemptFilters {
  statuses: AttemptStatus[];
  protocols: string[];
  runIds: string[];
  search: string;
}

export interface AttemptAggregations {
  byTarget: Map<string, number>;
  byProtocol: Map<string, number>;
  byStatus: Map<AttemptStatus, number>;
}

export interface ChartDatum {
  label: string;
  value: number;
}

export interface AttemptRunSummary {
  runId: string;
  label: string;
  scenario: string;
  totals: {
    attempts: number;
    status: Record<string, number>;
    protocol: Record<string, number>;
    target: Record<string, number>;
    successRate: number;
  };
}

export interface AttemptRunDiff {
  baseline: AttemptRunSummary;
  comparison: AttemptRunSummary;
  delta: {
    attempts: number;
    successRate: number;
    status: Record<string, number>;
    protocol: Record<string, number>;
    target: Record<string, number>;
  };
  diff: Change[];
}

export const flattenRuns = (runs: AttemptRun[]): FlattenedAttempt[] =>
  runs.flatMap((run) =>
    run.attempts.map((attempt) => ({
      ...attempt,
      runId: run.runId,
      runLabel: run.label,
      runScenario: run.scenario,
      runStartedAt: run.startedAt,
    })),
  );

const aggregateBy = <T extends string>(items: FlattenedAttempt[], key: (item: FlattenedAttempt) => T) => {
  const output = new Map<T, number>();
  for (const item of items) {
    const label = key(item);
    output.set(label, (output.get(label) ?? 0) + 1);
  }
  return output;
};

export const buildAggregations = (attempts: FlattenedAttempt[]): AttemptAggregations => ({
  byTarget: aggregateBy(attempts, (a) => a.target),
  byProtocol: aggregateBy(attempts, (a) => a.protocol),
  byStatus: aggregateBy(attempts, (a) => a.status),
});

const sortMap = <T extends string>(input: Map<T, number>): ChartDatum[] =>
  Array.from(input.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));

export const buildChartSeries = (aggregations: AttemptAggregations) => ({
  target: sortMap(aggregations.byTarget),
  protocol: sortMap(aggregations.byProtocol),
  status: sortMap(aggregations.byStatus as Map<string, number>),
});

const matchSearch = (attempt: FlattenedAttempt, query: string) => {
  if (!query) return true;
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [
    attempt.target,
    attempt.protocol,
    attempt.status,
    attempt.runLabel,
    attempt.operatorAlias,
    attempt.detection,
  ]
    .filter(Boolean)
    .map((value) => value.toLowerCase())
    .some((value) => value.includes(normalized));
};

export const filterAttempts = (
  attempts: FlattenedAttempt[],
  { statuses, protocols, runIds, search }: AttemptFilters,
): FlattenedAttempt[] =>
  attempts.filter((attempt) => {
    if (statuses.length && !statuses.includes(attempt.status)) {
      return false;
    }
    if (protocols.length && !protocols.includes(attempt.protocol)) {
      return false;
    }
    if (runIds.length && !runIds.includes(attempt.runId)) {
      return false;
    }
    return matchSearch(attempt, search);
  });

const toRecord = (map: Map<string, number>) =>
  Array.from(map.entries()).reduce<Record<string, number>>((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {});

const computeSuccessRate = (summary: AttemptRunSummary['totals']) => {
  const successes = summary.status['success'] ?? 0;
  const total = summary.attempts || 0;
  return total ? (successes / total) * 100 : 0;
};

const buildRunSummary = (run: AttemptRun): AttemptRunSummary => {
  const attempts = flattenRuns([run]);
  const aggregations = buildAggregations(attempts);
  const totals = {
    attempts: attempts.length,
    status: toRecord(aggregations.byStatus as Map<string, number>),
    protocol: toRecord(aggregations.byProtocol as Map<string, number>),
    target: toRecord(aggregations.byTarget as Map<string, number>),
    successRate: 0,
  };
  totals.successRate = computeSuccessRate(totals);
  return {
    runId: run.runId,
    label: run.label,
    scenario: run.scenario,
    totals,
  };
};

const diffRecords = (current: Record<string, number>, previous: Record<string, number>) => {
  const keys = new Set([...Object.keys(current), ...Object.keys(previous)]);
  return Array.from(keys).reduce<Record<string, number>>((acc, key) => {
    acc[key] = (current[key] ?? 0) - (previous[key] ?? 0);
    return acc;
  }, {});
};

const stringifySummary = (summary: AttemptRunSummary) => {
  const { label, totals } = summary;
  const sections = [
    `Run: ${label}`,
    'Status:',
    ...Object.entries(totals.status).map(([key, value]) => `  ${key}: ${value}`),
    'Protocol:',
    ...Object.entries(totals.protocol).map(([key, value]) => `  ${key}: ${value}`),
    'Target:',
    ...Object.entries(totals.target).map(([key, value]) => `  ${key}: ${value}`),
    `Success Rate: ${totals.successRate.toFixed(2)}%`,
  ];
  return sections.join('\n');
};

export const diffAttemptRuns = (
  baseline: AttemptRun,
  comparison: AttemptRun,
): AttemptRunDiff => {
  const baselineSummary = buildRunSummary(baseline);
  const comparisonSummary = buildRunSummary(comparison);
  return {
    baseline: baselineSummary,
    comparison: comparisonSummary,
    delta: {
      attempts: comparisonSummary.totals.attempts - baselineSummary.totals.attempts,
      successRate: comparisonSummary.totals.successRate - baselineSummary.totals.successRate,
      status: diffRecords(comparisonSummary.totals.status, baselineSummary.totals.status),
      protocol: diffRecords(comparisonSummary.totals.protocol, baselineSummary.totals.protocol),
      target: diffRecords(comparisonSummary.totals.target, baselineSummary.totals.target),
    },
    diff: diffLines(stringifySummary(baselineSummary), stringifySummary(comparisonSummary)),
  };
};

export const estimateVirtualizedFrameCost = ({
  viewportHeight,
  itemHeight,
  overscan,
  baseRowCost = 0.85,
}: {
  viewportHeight: number;
  itemHeight: number;
  overscan: number;
  baseRowCost?: number;
}): number => {
  if (itemHeight <= 0) return 0;
  const visibleRows = Math.max(Math.ceil(viewportHeight / itemHeight), 1);
  const totalRows = visibleRows + overscan * 2;
  return totalRows * baseRowCost;
};

export const sanitizeAttemptsForExport = (
  attempts: FlattenedAttempt[],
): Array<Omit<FlattenedAttempt, 'notes'>> =>
  attempts
    .filter((attempt) => attempt.sensitivity !== 'restricted')
    .map(({ notes: _notes, ...rest }) => ({ ...rest }));

export const createFilterOptions = (attempts: FlattenedAttempt[]) => {
  const protocols = new Set<string>();
  const statuses = new Set<AttemptStatus>();
  const runIds = new Set<string>();
  for (const attempt of attempts) {
    protocols.add(attempt.protocol);
    statuses.add(attempt.status);
    runIds.add(attempt.runId);
  }
  return {
    protocols: Array.from(protocols).sort(),
    statuses: Array.from(statuses).sort(),
    runIds: Array.from(runIds),
  };
};

export const ensureValidSelections = (
  active: string[],
  fallback: string[],
): string[] => (active.length ? active : fallback);

