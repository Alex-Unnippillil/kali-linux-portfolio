export type GamePhase = 'start' | 'playing' | 'paused' | 'gameover';

export interface Vec2 {
  x: number;
  y: number;
}

export interface InputSnapshot {
  left: boolean;
  right: boolean;
  fire: boolean;
}

export interface Player {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  fireCooldown: number;
  respawnGraceMs: number;
}

export interface Invader {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  row: number;
  col: number;
  alive: boolean;
  points: number;
}

export interface Bullet {
  x: number;
  y: number;
  w: number;
  h: number;
  vy: number;
  owner: 'player' | 'invader';
  active: boolean;
}

export interface Shield {
  x: number;
  y: number;
  cols: number;
  rows: number;
  segmentHp: number;
  segments: number[];
}

export interface Ufo {
  active: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  value: number;
}

export interface GameState {
  width: number;
  height: number;
  phase: GamePhase;
  score: number;
  highScore: number;
  lives: number;
  level: number;
  timeMs: number;
  player: Player;
  invaders: Invader[];
  invaderDir: 1 | -1;
  invaderStepProgressMs: number;
  invaderMoveMs: number;
  invaderBullets: Bullet[];
  playerBullets: Bullet[];
  shields: Shield[];
  ufo: Ufo;
  alienShootCooldownMs: number;
  gameOverReason: string | null;
}

export interface EngineConfig {
  width: number;
  height: number;
  seed?: number;
  allowMultiShot?: boolean;
  soundEnabled?: boolean;
  reducedMotion?: boolean;
  testMode?: boolean;
}

export interface EngineEvent {
  type:
    | 'invader-hit'
    | 'player-hit'
    | 'shield-hit'
    | 'ufo-hit'
    | 'level-clear'
    | 'game-over';
  points?: number;
}

export interface EngineStepResult {
  events: EngineEvent[];
}
