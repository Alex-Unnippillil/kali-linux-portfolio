import data from '../../public/demo-data/nikto/report.json';

export type NiktoSeverity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';

export interface NiktoFinding {
  path: string;
  finding: string;
  references: string[];
  severity: string;
  details: string;
}

export interface NiktoFilters {
  severity?: string;
  pathPrefix?: string;
}

export interface NiktoReportPayload {
  findings: NiktoFinding[];
  summaryCounts: Record<string, number>;
  filters: { severity: string; path: string };
  matchCount: number;
}

const SEVERITY_ORDER: NiktoSeverity[] = ['Critical', 'High', 'Medium', 'Low', 'Info'];

const findingsData: NiktoFinding[] = (data as NiktoFinding[]).map((item) => ({
  ...item,
  severity: item.severity || 'Info',
  references: Array.isArray(item.references) ? item.references : [],
}));

const summaryCounts = countBySeverity(findingsData);

function countBySeverity(list: NiktoFinding[]): Record<string, number> {
  return list.reduce<Record<string, number>>((acc, finding) => {
    const key = finding.severity || 'Info';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function normalizeSeverity(value?: string): string {
  if (!value) return '';
  return value.trim().toLowerCase();
}

function matchesSeverity(finding: NiktoFinding, severity: string): boolean {
  if (!severity || severity === 'all') return true;
  return finding.severity.toLowerCase() === severity;
}

function matchesPathPrefix(finding: NiktoFinding, prefix: string): boolean {
  if (!prefix) return true;
  return finding.path.toLowerCase().startsWith(prefix);
}

export function getNiktoSeverities(): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const level of SEVERITY_ORDER) {
    if (findingsData.some((item) => item.severity === level)) {
      seen.add(level);
      ordered.push(level);
    }
  }
  for (const finding of findingsData) {
    if (!seen.has(finding.severity)) {
      seen.add(finding.severity);
      ordered.push(finding.severity);
    }
  }
  return ordered;
}

export function getNiktoReport(filters: NiktoFilters = {}): NiktoReportPayload {
  const severity = normalizeSeverity(filters.severity) || 'all';
  const pathPrefix = (filters.pathPrefix || '').trim().toLowerCase();

  const filtered = findingsData.filter(
    (finding) =>
      matchesSeverity(finding, severity) && matchesPathPrefix(finding, pathPrefix),
  );

  return {
    findings: filtered,
    summaryCounts,
    filters: {
      severity: filters.severity ?? 'All',
      path: filters.pathPrefix ?? '',
    },
    matchCount: filtered.length,
  };
}

export function getNiktoDataset() {
  return findingsData;
}
