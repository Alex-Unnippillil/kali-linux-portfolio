"use client";

export const BREAKOUT_ROWS = 5;
export const BREAKOUT_COLS = 10;
export const BREAKOUT_STORAGE_PREFIX = 'breakout-level:';

// Cell types:
// 0 = empty
// 1 = normal brick
// 2 = multi-ball brick
// 3 = magnet brick

export const DEFAULT_LAYOUT = Array.from({ length: BREAKOUT_ROWS }, (_, r) =>
  Array.from({ length: BREAKOUT_COLS }, () => (r < 3 ? 1 : 0)),
);

export function normalizeLayout(
  layout,
  rows = BREAKOUT_ROWS,
  cols = BREAKOUT_COLS,
) {
  const grid = Array.from({ length: rows }, () => Array(cols).fill(0));
  if (!Array.isArray(layout)) return grid;
  for (let r = 0; r < rows; r += 1) {
    const srcRow = Array.isArray(layout[r]) ? layout[r] : [];
    for (let c = 0; c < cols; c += 1) {
      const v = Number(srcRow[c] ?? 0);
      grid[r][c] = v === 1 || v === 2 || v === 3 ? v : 0;
    }
  }
  return grid;
}

// Small built-in set so Breakout works even with no saved levels.
export const BREAKOUT_PRESETS = [
  { id: 'classic', name: 'Classic Wall', layout: DEFAULT_LAYOUT },
  {
    id: 'powerups',
    name: 'Power Ups',
    layout: normalizeLayout([
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 2, 0, 1, 1, 0, 3, 0, 1],
      [1, 1, 1, 1, 0, 0, 1, 1, 1, 1],
      [0, 3, 0, 1, 2, 2, 1, 0, 3, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ]),
  },
  {
    id: 'zigzag',
    name: 'Zigzag',
    layout: normalizeLayout([
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      [0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
      [1, 0, 2, 0, 1, 0, 3, 0, 1, 0],
      [0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ]),
  },
  {
    id: 'hollow',
    name: 'Hollow Box',
    layout: normalizeLayout([
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 2, 0, 3, 3, 0, 2, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ]),
  },
  {
    id: 'targets',
    name: 'Targets',
    layout: normalizeLayout([
      [0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
      [0, 1, 0, 1, 0, 0, 1, 0, 1, 0],
      [1, 0, 2, 0, 1, 1, 0, 3, 0, 1],
      [0, 1, 0, 1, 0, 0, 1, 0, 1, 0],
      [0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
    ]),
  },
  {
    id: 'bridge',
    name: 'Bridge',
    layout: normalizeLayout([
      [1, 1, 1, 0, 0, 0, 1, 1, 1, 1],
      [1, 0, 0, 0, 2, 2, 0, 0, 0, 1],
      [1, 0, 3, 0, 1, 1, 0, 3, 0, 1],
      [1, 0, 0, 0, 2, 2, 0, 0, 0, 1],
      [1, 1, 1, 0, 0, 0, 1, 1, 1, 1],
    ]),
  },
  {
    id: 'diamond',
    name: 'Diamond',
    layout: normalizeLayout([
      [0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
      [0, 0, 1, 2, 1, 1, 3, 0, 0, 0],
      [0, 1, 1, 1, 0, 1, 1, 1, 0, 0],
      [0, 0, 1, 3, 1, 1, 2, 0, 0, 0],
      [0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
    ]),
  },
  {
    id: 'split',
    name: 'Split Lanes',
    layout: normalizeLayout([
      [1, 1, 1, 0, 0, 0, 1, 1, 1, 1],
      [1, 2, 1, 0, 0, 0, 1, 3, 1, 1],
      [1, 1, 1, 0, 0, 0, 1, 1, 1, 1],
      [0, 0, 0, 0, 2, 2, 0, 0, 0, 0],
      [0, 0, 0, 0, 3, 3, 0, 0, 0, 0],
    ]),
  },
  {
    id: 'checker',
    name: 'Checkerboard',
    layout: normalizeLayout([
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      [0, 2, 0, 2, 0, 2, 0, 3, 0, 3],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      [0, 3, 0, 2, 0, 3, 0, 2, 0, 3],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    ]),
  },
];
