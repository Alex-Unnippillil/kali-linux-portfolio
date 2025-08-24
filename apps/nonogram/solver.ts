import type { NonogramPuzzle } from './parser';

export type Cell = -1 | 0 | 1; // -1 marked, 0 empty, 1 filled

interface SolveResult {
  line: Cell[];
  changed: boolean;
}

function generate(line: Cell[], clues: number[], idx: number, pos: number, current: Cell[], out: Cell[][]) {
  const length = line.length;
  if (idx === clues.length) {
    for (let i = pos; i < length; i += 1) {
      if (line[i] === 1) return; // can't mark filled as empty
      current[i] = -1;
    }
    out.push(current.slice());
    return;
  }
  const n = clues[idx];
  for (let start = pos; start <= length - n; start += 1) {
    if (start > pos) {
      if (line[start - 1] === 1) continue;
      current[start - 1] = -1;
    }
    let ok = true;
    for (let i = 0; i < n; i += 1) {
      const cell = line[start + i];
      if (cell === -1) {
        ok = false;
        break;
      }
      current[start + i] = 1;
    }
    if (!ok) continue;
    if (start + n < length) {
      if (line[start + n] === 1) {
        for (let i = 0; i < n; i += 1) current[start + i] = line[start + i];
        continue;
      }
      current[start + n] = -1;
    }
    generate(line, clues, idx + 1, start + n + 1, current, out);
    for (let i = 0; i < n; i += 1) current[start + i] = line[start + i];
    if (start + n < length) current[start + n] = line[start + n];
  }
}

export function solveLine(line: Cell[], clues: number[]): SolveResult {
  const possibilities: Cell[][] = [];
  generate(line, clues, 0, 0, line.slice(), possibilities);
  if (possibilities.length === 0) return { line, changed: false };
  const result = line.slice();
  for (let i = 0; i < line.length; i += 1) {
    const vals = possibilities.map((p) => p[i]);
    if (vals.every((v) => v === 1)) result[i] = 1;
    else if (vals.every((v) => v === -1)) result[i] = -1;
  }
  const changed = result.some((v, i) => v !== line[i]);
  return { line: result, changed };
}

export function propagate(grid: Cell[][], puzzle: NonogramPuzzle): Cell[][] {
  let changed = true;
  let ng = grid.map((row) => row.slice());
  while (changed) {
    changed = false;
    for (let r = 0; r < puzzle.height; r += 1) {
      const { line, changed: ch } = solveLine(ng[r], puzzle.rows[r]);
      if (ch) {
        ng[r] = line;
        changed = true;
      }
    }
    for (let c = 0; c < puzzle.width; c += 1) {
      const col = ng.map((row) => row[c]);
      const { line, changed: ch } = solveLine(col, puzzle.cols[c]);
      if (ch) {
        for (let r = 0; r < puzzle.height; r += 1) ng[r][c] = line[r];
        changed = true;
      }
    }
  }
  return ng;
}

