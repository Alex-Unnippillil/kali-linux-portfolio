import type { SeverityTimelineEntry } from '../types';

export const severityTimelineFixture: SeverityTimelineEntry[] = [
  {
    date: '2024-04-01',
    counts: { Low: 0, Medium: 0, High: 1, Critical: 1 },
    total: 2,
  },
  {
    date: '2024-04-02',
    counts: { Low: 1, Medium: 1, High: 0, Critical: 0 },
    total: 2,
  },
  {
    date: '2024-04-03',
    counts: { Low: 0, Medium: 1, High: 0, Critical: 1 },
    total: 2,
  },
  {
    date: '2024-04-04',
    counts: { Low: 1, Medium: 0, High: 1, Critical: 0 },
    total: 2,
  },
  {
    date: '2024-04-05',
    counts: { Low: 0, Medium: 1, High: 1, Critical: 0 },
    total: 2,
  },
  {
    date: '2024-04-06',
    counts: { Low: 0, Medium: 0, High: 0, Critical: 1 },
    total: 1,
  },
];
