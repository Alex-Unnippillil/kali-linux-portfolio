export type Tile = 0 | 1 | 2 | 3;

export interface Point {
  x: number;
  y: number;
}

export type FruitRuleMode = 'time' | 'pellet';

export interface LevelDefinition {
  name?: string;
  maze: Tile[][];
  fruit?: Point;
  fruitTimes?: number[];
  fruitPelletThresholds?: number[];
  fruitRuleMode?: FruitRuleMode;
  pacStart?: Point;
  ghostStart?: Point;
}

export interface LevelData {
  levels: LevelDefinition[];
}

export const isValidTile = (value: unknown): value is Tile =>
  value === 0 || value === 1 || value === 2 || value === 3;

const sanitizeNumberList = (list: unknown): number[] | undefined => {
  if (!Array.isArray(list)) return undefined;
  const normalized = list.filter((entry): entry is number => typeof entry === 'number' && entry >= 0);
  return normalized.length ? normalized : undefined;
};

export const sanitizeLevel = (level: LevelDefinition): LevelDefinition => ({
  name: level.name || 'Untitled',
  maze: level.maze.map((row) => row.map((cell) => cell as Tile)),
  fruit: level.fruit,
  fruitTimes: sanitizeNumberList(level.fruitTimes),
  fruitPelletThresholds: sanitizeNumberList(level.fruitPelletThresholds),
  fruitRuleMode:
    level.fruitRuleMode === 'pellet' || level.fruitRuleMode === 'time'
      ? level.fruitRuleMode
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
    if (typeof typed.fruit.x !== 'number' || typeof typed.fruit.y !== 'number') {
      return false;
    }
  }
  if (
    typed.fruitRuleMode &&
    typed.fruitRuleMode !== 'time' &&
    typed.fruitRuleMode !== 'pellet'
  ) {
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
