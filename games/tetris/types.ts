export type Tetromino = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';
export type Rotation = 0 | 1 | 2 | 3;

export type Mode = 'marathon' | 'sprint';

export interface PieceState {
  type: Tetromino;
  rotation: Rotation;
  x: number;
  y: number;
}

export interface Settings {
  width: number;
  visibleHeight: number;
  totalHeight: number;
  gravityMs: number;
  lockDelayMs: number;
  lockResetLimit: number;
  dasMs: number;
  arrMs: number;
  softDropFactor: number;
  randomMode: 'seven-bag' | 'true-random';
}

export interface StatCounters {
  piecesPlaced: number;
  tetrises: number;
  tspins: number;
  maxB2B: number;
  maxCombo: number;
}

export interface ScoreBreakdown {
  base: number;
  combo: number;
  b2b: number;
  perfectClear: number;
  total: number;
}

export interface ClearInfo {
  id: number;
  lines: number[];
  isTSpin: boolean;
  isTetris: boolean;
  isB2B: boolean;
  combo: number;
  perfectClear: boolean;
  score: ScoreBreakdown;
  boardBefore: Uint8Array;
}

export interface InputState {
  leftHeld: boolean;
  rightHeld: boolean;
  leftHeldMs: number;
  rightHeldMs: number;
  leftArrMs: number;
  rightArrMs: number;
  softDrop: boolean;
}

export interface GameState {
  board: Uint8Array;
  width: number;
  visibleHeight: number;
  totalHeight: number;
  active: PieceState;
  nextQueue: Tetromino[];
  hold: Tetromino | null;
  canHold: boolean;
  score: number;
  level: number;
  lines: number;
  combo: number;
  b2b: number;
  stats: StatCounters;
  mode: Mode;
  paused: boolean;
  settingsOpen: boolean;
  isFocused: boolean;
  gameOver: boolean;
  lockElapsedMs: number;
  lockResetsUsed: number;
  gravityElapsedMs: number;
  input: InputState;
  lastRotation: boolean;
  spawnBlocked: boolean;
  lastClear: ClearInfo | null;
  clearId: number;
  softDropCells: number;
  sprintTimeMs: number;
  sprintComplete: boolean;
  settings: Settings;
  randomState: RandomState;
}

export interface RandomState {
  mode: 'seven-bag' | 'true-random';
  bag: Tetromino[];
  seed: string | null;
  rngState: unknown;
}

export type Action =
  | { type: 'startMove'; dir: -1 | 1 }
  | { type: 'stopMove'; dir: -1 | 1 }
  | { type: 'softDrop'; active: boolean }
  | { type: 'rotate'; dir: 'cw' | 'ccw' | '180' }
  | { type: 'hardDrop' }
  | { type: 'hold' }
  | { type: 'togglePause' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'reset'; mode?: Mode }
  | { type: 'setSettingsOpen'; open: boolean }
  | { type: 'setFocused'; focused: boolean }
  | { type: 'updateSettings'; settings: Partial<Settings> };
