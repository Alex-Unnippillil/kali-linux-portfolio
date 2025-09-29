import { HostReport, Finding, Severity, SeverityTimelineEntry } from './types';

export const severityLevels: Severity[] = ['Low', 'Medium', 'High', 'Critical'];

export const severityFromCvss = (cvss: number): Severity => {
  if (cvss >= 9) return 'Critical';
  if (cvss >= 7) return 'High';
  if (cvss >= 4) return 'Medium';
  return 'Low';
};

export const flattenFindings = (data: HostReport[]): Finding[] =>
  data.flatMap((host) =>
    host.vulns.map((vuln) => ({
      ...vuln,
      host: host.host,
      severity: severityFromCvss(vuln.cvss),
    }))
  );

const emptyCounts = (): Record<Severity, number> => ({
  Low: 0,
  Medium: 0,
  High: 0,
  Critical: 0,
});

export const computeSeverityTimeline = (
  data: HostReport[],
): SeverityTimelineEntry[] => {
  const timeline: Record<string, Record<Severity, number>> = {};

  data.forEach((host) => {
    host.vulns.forEach((vuln) => {
      const date = vuln.detectedAt;
      if (!timeline[date]) {
        timeline[date] = emptyCounts();
      }
      const severity = severityFromCvss(vuln.cvss);
      timeline[date][severity] += 1;
    });
  });

  return Object.keys(timeline)
    .sort()
    .map((date) => {
      const counts = { ...emptyCounts(), ...timeline[date] };
      const total = severityLevels.reduce(
        (acc, severity) => acc + counts[severity],
        0,
      );
      return {
        date,
        counts,
        total,
      };
    });
};

export const computeSeverityTotals = (
  timeline: SeverityTimelineEntry[],
): Record<Severity, number> =>
  timeline.reduce((acc, entry) => {
    severityLevels.forEach((severity) => {
      acc[severity] += entry.counts[severity];
    });
    return acc;
  }, emptyCounts());

export const computeAggregatedTotal = (timeline: SeverityTimelineEntry[]): number =>
  timeline.reduce((sum, entry) => sum + entry.total, 0);
