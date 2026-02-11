import { GameState, Invader, Shield } from './types';

const INVADER_COLS = 8;

const invaderPoints = (row: number) => {
  if (row <= 0) return 30;
  if (row <= 1) return 20;
  return 10;
};

export const createInvaders = (width: number, level: number): Invader[] => {
  const rows = Math.min(6, 4 + Math.floor((level - 1) / 2));
  const spacingX = 34;
  const spacingY = 26;
  const gridWidth = (INVADER_COLS - 1) * spacingX;
  const startX = (width - gridWidth) / 2;
  const invaders: Invader[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < INVADER_COLS; col += 1) {
      invaders.push({
        id: row * INVADER_COLS + col,
        x: startX + col * spacingX,
        y: 42 + row * spacingY,
        w: 20,
        h: 14,
        row,
        col,
        alive: true,
        points: invaderPoints(row),
      });
    }
  }

  return invaders;
};

export const createShields = (width: number, height: number): Shield[] => {
  const rows = 4;
  const cols = 8;
  const y = height - 96;
  const spread = width / 4;
  return Array.from({ length: 3 }).map((_, index) => ({
    x: spread * (index + 1) - 36,
    y,
    rows,
    cols,
    segmentHp: 2,
    segments: Array.from({ length: rows * cols }, () => 2),
  }));
};

export const createInitialState = (width: number, height: number, highScore = 0): GameState => ({
  width,
  height,
  phase: 'start',
  score: 0,
  highScore,
  lives: 3,
  level: 1,
  timeMs: 0,
  player: {
    x: width / 2 - 14,
    y: height - 36,
    w: 28,
    h: 12,
    speed: 180,
    fireCooldown: 0,
    respawnGraceMs: 0,
  },
  invaders: createInvaders(width, 1),
  invaderDir: 1,
  invaderStepProgressMs: 0,
  invaderMoveMs: 620,
  invaderBullets: [],
  playerBullets: [],
  shields: createShields(width, height),
  ufo: {
    active: false,
    x: -40,
    y: 18,
    w: 28,
    h: 12,
    vx: 60,
    value: 100,
  },
  alienShootCooldownMs: 900,
  gameOverReason: null,
});
