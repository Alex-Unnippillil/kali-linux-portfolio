// Worker-based Nonogram solver using constraint propagation and backtracking.
// This replicates the logic from `solver.ts` but runs in a Web Worker so heavy
// computations (e.g. hint generation or full solves) do not block the UI
// thread. The worker receives the current grid and puzzle definition and
// returns either a solved grid or signals a contradiction.

import type { NonogramPuzzle } from './parser';

// -1 marked, 0 empty, 1 filled, 2 pencil note
export type Cell = -1 | 0 | 1 | 2;

interface SolveResult {
  line: Cell[];
  changed: boolean;
  contradiction: boolean;
}

// Generate all possible line configurations that satisfy the clues given the
// current line state.
function generate(
  line: Cell[],
  clues: number[],
  idx: number,
  pos: number,
  current: Cell[],
  out: Cell[][]
) {
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

// Solve a single row/column by intersecting all valid possibilities.
function solveLine(line: Cell[], clues: number[]): SolveResult {
  const base = line.map((v) => (v === 2 ? 0 : v));
  const possibilities: Cell[][] = [];
  generate(base, clues, 0, 0, base.slice(), possibilities);
  if (possibilities.length === 0)
    return { line, changed: false, contradiction: true };
  const result = line.slice();
  for (let i = 0; i < line.length; i += 1) {
    const vals = possibilities.map((p) => p[i]);
    if (vals.every((v) => v === 1)) result[i] = 1;
    else if (vals.every((v) => v === -1)) result[i] = -1;
  }
  const changed = result.some((v, i) => v !== line[i]);
  return { line: result, changed, contradiction: false };
}

// Repeatedly propagate constraints across all rows and columns until a fixed
// point is reached or a contradiction is found.
function propagate(
  grid: Cell[][],
  puzzle: NonogramPuzzle
): { grid: Cell[][]; contradiction: boolean } {
  let changed = true;
  let contradiction = false;
  let ng = grid.map((row) => row.slice());
  while (changed && !contradiction) {
    changed = false;
    for (let r = 0; r < puzzle.height; r += 1) {
      const { line, changed: ch, contradiction: con } = solveLine(
        ng[r],
        puzzle.rows[r]
      );
      if (con) {
        contradiction = true;
        break;
      }
      if (ch) {
        ng[r] = line;
        changed = true;
      }
    }
    if (contradiction) break;
    for (let c = 0; c < puzzle.width; c += 1) {
      const col = ng.map((row) => row[c]);
      const { line, changed: ch, contradiction: con } = solveLine(
        col,
        puzzle.cols[c]
      );
      if (con) {
        contradiction = true;
        break;
      }
      if (ch) {
        for (let r = 0; r < puzzle.height; r += 1) ng[r][c] = line[r];
        changed = true;
      }
    }
  }
  return { grid: ng, contradiction };
}

// Backtracking search using propagation to prune the tree.
function backtrack(
  grid: Cell[][],
  puzzle: NonogramPuzzle
): Cell[][] | null {
  for (let r = 0; r < puzzle.height; r += 1) {
    for (let c = 0; c < puzzle.width; c += 1) {
      if (grid[r][c] === 0) {
        for (const val of [1, -1] as Cell[]) {
          const g = grid.map((row) => row.slice() as Cell[]);
          g[r][c] = val;
          const { grid: pg, contradiction } = propagate(g, puzzle);
          if (!contradiction) {
            const solved = backtrack(pg, puzzle);
            if (solved) return solved;
          }
        }
        return null;
      }
    }
  }
  return grid;
}

// Entry point: propagate first then use backtracking if necessary.
function solve(
  grid: Cell[][],
  puzzle: NonogramPuzzle
): { grid: Cell[][]; contradiction: boolean } {
  const { grid: pg, contradiction } = propagate(grid, puzzle);
  if (contradiction) return { grid: pg, contradiction: true };
  const normalized = pg.map((row) => row.map((v) => (v === 2 ? 0 : v)) as Cell[]);
  const result = backtrack(normalized, puzzle);
  if (!result) return { grid: pg, contradiction: true };
  return { grid: result, contradiction: false };
}

self.onmessage = (e: MessageEvent) => {
  const { grid, puzzle } = e.data as { grid: Cell[][]; puzzle: NonogramPuzzle };
  const result = solve(grid, puzzle);
  (self as any).postMessage(result);
};
