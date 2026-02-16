export type Color = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';

export type CandyKind = 'normal' | 'stripedH' | 'stripedV' | 'wrapped' | 'colorBomb';

export type ObjectiveType = 'score' | 'collectColor' | 'clearJelly' | 'clearIce';

export interface Coord {
  r: number;
  c: number;
}

export interface Candy {
  id: string;
  color: Color | null;
  kind: CandyKind;
}

export interface Cell {
  coord: Coord;
  candy: Candy | null;
  jelly: 0 | 1 | 2;
  ice: 0 | 1 | 2;
  hole?: boolean;
}

export interface Board {
  rows: number;
  cols: number;
  cells: Cell[][];
}

export interface ScoreObjective {
  type: 'score';
  target: number;
  progress: number;
}

export interface CollectObjective {
  type: 'collectColor';
  color: Color;
  target: number;
  progress: number;
}

export interface ClearJellyObjective {
  type: 'clearJelly';
  target: number;
  progress: number;
}

export interface ClearIceObjective {
  type: 'clearIce';
  target: number;
  progress: number;
}

export type Objective =
  | ScoreObjective
  | CollectObjective
  | ClearJellyObjective
  | ClearIceObjective;

export interface LevelDefinition {
  id: number;
  name: string;
  rows: number;
  cols: number;
  moves: number;
  colors: Color[];
  spawnWeights?: Partial<Record<Color, number>>;
  objectives: Objective[];
  blockers?: {
    jelly?: Coord[];
    doubleJelly?: Coord[];
    ice?: Coord[];
    doubleIce?: Coord[];
  };
  mask?: Coord[];
}

export type ResolutionStep =
  | { type: 'swap'; a: Coord; b: Coord }
  | { type: 'combo'; a: Coord; b: Coord; combo: string }
  | { type: 'match'; cells: Coord[] }
  | { type: 'special'; at: Coord; special: CandyKind }
  | { type: 'remove'; cells: Coord[] }
  | { type: 'gravity' }
  | { type: 'refill' }
  | { type: 'stable' };

export interface GameStats {
  matches: number;
  specialsTriggered: number;
  cascades: number;
}

export type GameStatus = 'idle' | 'selected' | 'resolving' | 'win' | 'lose' | 'paused';

export interface PersistedSettings {
  mute: boolean;
  reducedMotion: boolean;
  unlockedLevel: number;
  bestScores: Record<number, number>;
}

export interface GameState {
  levelId: number;
  board: Board;
  movesLeft: number;
  score: number;
  objectives: Objective[];
  status: GameStatus;
  rngSeed: number;
  rngState: number;
  selected?: Coord;
  lastAction?: string;
  stats: GameStats;
  debugQueue: ResolutionStep[];
}

export interface MatchGroup {
  cells: Coord[];
  color: Color;
  rowRun: number;
  colRun: number;
  isLine5: boolean;
  isLine4: boolean;
  isTOrL: boolean;
}
