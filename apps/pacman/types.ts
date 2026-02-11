export type Tile = 0 | 1 | 2 | 3 | 4;

export interface Point {
  x: number;
  y: number;
}

export interface LevelDefinition {
  name?: string;
  maze: Tile[][];
  fruit?: Point;
  fruitTimes?: number[];
  pacStart?: Point;
  ghostStart?: Point;
}

export interface LevelData {
  levels: LevelDefinition[];
}

export const isValidTile = (value: unknown): value is Tile =>
  value === 0 || value === 1 || value === 2 || value === 3 || value === 4;

export const sanitizeLevel = (level: LevelDefinition): LevelDefinition => ({
  name: level.name || 'Untitled',
  maze: level.maze.map((row) => row.map((cell) => cell as Tile)),
  fruit: level.fruit,
  fruitTimes: Array.isArray(level.fruitTimes)
    ? level.fruitTimes.filter((t) => typeof t === 'number' && t >= 0)
    : undefined,
  pacStart: level.pacStart,
  ghostStart: level.ghostStart,
});

export const validateLevel = (level: unknown): level is LevelDefinition => {
  if (!level || typeof level !== 'object') return false;
  const typed = level as LevelDefinition;
  if (!Array.isArray(typed.maze) || typed.maze.length === 0) return false;
  const width = typed.maze[0]?.length ?? 0;
  if (width === 0) return false;
  for (const row of typed.maze) {
    if (!Array.isArray(row) || row.length !== width) return false;
    for (const cell of row) {
      if (!isValidTile(cell)) return false;
    }
  }
  if (typed.fruit) {
    if (
      typeof typed.fruit.x !== 'number' ||
      typeof typed.fruit.y !== 'number'
    )
      return false;
  }
  return true;
};

export const validateLevelsPayload = (payload: unknown): payload is LevelData => {
  if (!payload || typeof payload !== 'object') return false;
  const data = payload as LevelData;
  if (!Array.isArray(data.levels)) return false;
  return data.levels.every((lvl) => validateLevel(lvl));
};
