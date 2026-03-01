export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export type Cell = PieceType | null;

export type Board = Cell[][];

export interface Vec2 {
  x: number;
  y: number;
}

export interface ActivePiece {
  type: PieceType;
  rotation: 0 | 1 | 2 | 3;
  x: number;
  y: number;
}

export interface ScoringState {
  score: number;
  lines: number;
  level: number;
  combo: number;
  backToBack: boolean;
}

export interface EngineConfig {
  width: number;
  visibleHeight: number;
  hiddenRows: number;
  nextCount: number;
  lockDelayMs: number;
  lockResetLimit: number;
  softDropFactor: number;
  allowRotate180: boolean;
  ghostPiece: boolean;
  gridlines: boolean;
  sound: boolean;
}

export interface RuntimeState {
  gravityAccumulator: number;
  lockTimerMs: number;
  lockResets: number;
}

export type GameStatus = 'idle' | 'playing' | 'paused' | 'gameover';

export interface GameState {
  board: Board;
  active: ActivePiece | null;
  hold: PieceType | null;
  canHold: boolean;
  queue: PieceType[];
  rngState: number;
  scoring: ScoringState;
  status: GameStatus;
  runtime: RuntimeState;
}

export type EngineActionType =
  | 'start'
  | 'togglePause'
  | 'moveLeft'
  | 'moveRight'
  | 'softDropStart'
  | 'softDropStop'
  | 'rotateCW'
  | 'rotateCCW'
  | 'rotate180'
  | 'hardDrop'
  | 'hold'
  | 'restart';

export interface EngineAction {
  type: EngineActionType;
}
