import { diffLines, type Change } from 'diff';

export type DiffSegmentType = 'added' | 'removed' | 'unchanged';

export interface DiffSegment extends Change {
  type: DiffSegmentType;
}

export interface DiffSummary {
  added: number;
  removed: number;
  unchanged: number;
}

export function createLineDiff(base: string, target: string): DiffSegment[] {
  const parts = diffLines(base ?? '', target ?? '');
  return parts.map((part) => ({
    ...part,
    type: part.added ? 'added' : part.removed ? 'removed' : 'unchanged',
  }));
}

export function summarizeDiff(segments: DiffSegment[]): DiffSummary {
  return segments.reduce(
    (acc, segment) => {
      acc[segment.type] += 1;
      return acc;
    },
    { added: 0, removed: 0, unchanged: 0 } as DiffSummary,
  );
}
