import { structuredPatch } from 'diff';

export type HunkLineType = 'context' | 'add' | 'remove';

export interface HunkLine {
  type: HunkLineType;
  content: string;
  oldNumber?: number;
  newNumber?: number;
}

export interface DiffHunk {
  id: string;
  index: number;
  header: string;
  lines: HunkLine[];
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
}

export type HunkSelection = 'base' | 'incoming';

const safeStructuredPatch = (base: string, incoming: string) =>
  structuredPatch('base', 'incoming', base, incoming);

export const computeDiffHunks = (
  base: string,
  incoming: string,
): DiffHunk[] => {
  const patch = safeStructuredPatch(base, incoming);
  if (!patch.hunks?.length) return [];

  return patch.hunks.map((hunk, index) => {
    let oldLine = hunk.oldStart;
    let newLine = hunk.newStart;

    const lines: HunkLine[] = [];
    for (const raw of hunk.lines) {
      if (!raw) continue;
      const marker = raw[0];
      const text = raw.slice(1);
      if (marker === ' ') {
        lines.push({
          type: 'context',
          content: text,
          oldNumber: oldLine,
          newNumber: newLine,
        });
        oldLine += 1;
        newLine += 1;
      } else if (marker === '+') {
        lines.push({
          type: 'add',
          content: text,
          newNumber: newLine,
        });
        newLine += 1;
      } else if (marker === '-') {
        lines.push({
          type: 'remove',
          content: text,
          oldNumber: oldLine,
        });
        oldLine += 1;
      }
    }

    return {
      id: `hunk-${index}`,
      index,
      header: hunk.content,
      lines,
      oldStart: hunk.oldStart,
      oldLines: hunk.oldLines,
      newStart: hunk.newStart,
      newLines: hunk.newLines,
    };
  });
};

const splitLines = (value: string): string[] => value.split('\n');

const collectIncomingLines = (lines: HunkLine[]): string[] => {
  const result: string[] = [];
  for (const line of lines) {
    if (line.type === 'context' || line.type === 'add') {
      result.push(line.content);
    }
  }
  return result;
};

export const mergeDiffHunks = (
  base: string,
  incoming: string,
  hunks: DiffHunk[],
  selection: Record<string, HunkSelection>,
): string => {
  if (!hunks.length) return incoming;

  const baseLines = splitLines(base);
  const result: string[] = [];
  let baseIndex = 0;

  const appendBaseUntil = (targetIndex: number) => {
    while (baseIndex < targetIndex && baseIndex < baseLines.length) {
      result.push(baseLines[baseIndex]);
      baseIndex += 1;
    }
  };

  for (const hunk of hunks) {
    const startIndex = Math.max(0, hunk.oldStart - 1);
    appendBaseUntil(startIndex);

    const choice: HunkSelection = selection[hunk.id] ?? 'incoming';

    if (choice === 'base') {
      const limit = hunk.oldLines ?? 0;
      for (let count = 0; count < limit && baseIndex < baseLines.length; count += 1) {
        result.push(baseLines[baseIndex]);
        baseIndex += 1;
      }
    } else {
      baseIndex += hunk.oldLines ?? 0;
      const additions = collectIncomingLines(hunk.lines);
      result.push(...additions);
    }
  }

  appendBaseUntil(baseLines.length);

  return result.join('\n');
};

export interface MergeSummary {
  totalHunks: number;
  baseSelections: number;
  incomingSelections: number;
}

export const summarizeSelections = (
  hunks: DiffHunk[],
  selection: Record<string, HunkSelection>,
): MergeSummary => {
  let baseSelections = 0;
  let incomingSelections = 0;
  for (const hunk of hunks) {
    if ((selection[hunk.id] ?? 'incoming') === 'base') baseSelections += 1;
    else incomingSelections += 1;
  }
  return {
    totalHunks: hunks.length,
    baseSelections,
    incomingSelections,
  };
};

