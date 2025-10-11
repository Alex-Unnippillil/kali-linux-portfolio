export type BrickType = 0 | 1 | 2 | 3;
export type LevelGrid = BrickType[][];

export interface LevelDefinition {
  id: string;
  name: string;
  layout: LevelGrid;
  description?: string;
}

export const GRID_ROWS = 5;
export const GRID_COLS = 10;
export const STORAGE_PREFIX = 'breakout-level:';

export const DEFAULT_LAYOUT: LevelGrid = Array.from({ length: GRID_ROWS }, () =>
  Array(GRID_COLS).fill(1) as BrickType[],
);

const clampBrickType = (value: number): BrickType => {
  if (value <= 0) return 0;
  if (value === 1) return 1;
  if (value === 2) return 2;
  if (value >= 3) return 3;
  return 0;
};

export const BUILT_IN_LEVELS: LevelDefinition[] = [
  {
    id: 'classic-wall',
    name: 'Classic Wall',
    description: 'Simple wall of bricks for warming up.',
    layout: DEFAULT_LAYOUT,
  },
  {
    id: 'corridor',
    name: 'Corridor',
    description: 'A narrow channel that rewards precision.',
    layout: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 2, 1, 2, 1, 2, 1, 2, 1, 1],
      [1, 0, 0, 3, 0, 0, 3, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
  },
  {
    id: 'power-grid',
    name: 'Power Grid',
    description: 'Alternating power-up bricks keep the ball lively.',
    layout: [
      [2, 0, 2, 0, 2, 0, 2, 0, 2, 0],
      [0, 3, 0, 3, 0, 3, 0, 3, 0, 3],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [0, 3, 0, 3, 0, 3, 0, 3, 0, 3],
      [2, 0, 2, 0, 2, 0, 2, 0, 2, 0],
    ],
  },
];

export const getBuiltInLevelForStage = (stage: number): LevelDefinition => {
  const index = stage > 0 ? (stage - 1) % BUILT_IN_LEVELS.length : 0;
  return BUILT_IN_LEVELS[index];
};

export const isLevelGrid = (value: unknown): value is LevelGrid => {
  if (!Array.isArray(value)) return false;
  if (value.length === 0) return false;
  return value.every(
    (row) =>
      Array.isArray(row) &&
      row.length > 0 &&
      row.every((cell) => typeof cell === 'number' && Number.isFinite(cell)),
  );
};

export const normalizeLayout = (layout: LevelGrid): LevelGrid => {
  const rows: LevelGrid = [];
  for (let r = 0; r < GRID_ROWS; r += 1) {
    const sourceRow = layout[r] ?? [];
    const row: BrickType[] = [];
    for (let c = 0; c < GRID_COLS; c += 1) {
      const raw = sourceRow[c] ?? 0;
      row.push(clampBrickType(raw));
    }
    rows.push(row);
  }
  return rows;
};

export const parseStoredLayout = (value: unknown): LevelGrid | null => {
  if (!isLevelGrid(value)) return null;
  return normalizeLayout(value as LevelGrid);
};

export const serializeLayout = (layout: LevelGrid): number[][] =>
  layout.map((row) => row.map((cell) => clampBrickType(cell)));
