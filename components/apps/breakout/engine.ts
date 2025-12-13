import { random as defaultRandom, reset as resetRng } from '../../../apps/games/rng';

export type Cell = 0 | 1 | 2 | 3;
export type Grid = Cell[][];

export type PowerUpType = 'multi-ball' | 'magnet' | 'big-paddle' | 'laser';

export interface PowerUpDrop {
  id: string;
  type: PowerUpType;
  x: number;
  y: number;
  vy: number;
}

export interface ActivePowerUp {
  type: PowerUpType;
  expiresAtMs: number;
}

export interface Paddle {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Ball {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  stuck: boolean;
  stuckOffsetX: number;
  lastHitPos: number;
  trail: { x: number; y: number }[];
}

export interface Brick {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: Cell;
  alive: boolean;
}

export interface StepInput {
  targetX?: number;
  moveLeft?: boolean;
  moveRight?: boolean;
  release?: boolean;
}

export interface StepResult {
  levelCleared: boolean;
  lifeLost: boolean;
}

export interface BreakoutState {
  width: number;
  height: number;
  hudHeight: number;
  paddle: Paddle;
  paddleBaseWidth: number;
  bricks: Brick[];
  balls: Ball[];
  powerupsFalling: PowerUpDrop[];
  activePowerups: Partial<Record<PowerUpType, ActivePowerUp>>;
  lives: number;
  levelIndex: number;
  score: number;
  nowMs: number;
  rng: () => number;
  grid: Grid;
  laserEnabled: boolean;
}

export const DEFAULT_WIDTH = 400;
export const DEFAULT_HEIGHT = 300;
export const HUD_HEIGHT = 20;
const PADDLE_HEIGHT = DEFAULT_HEIGHT * 0.033;
const BASE_PADDLE_WIDTH = DEFAULT_WIDTH * 0.15;
export const BALL_RADIUS = 5;
const BALL_SPEED = 220;
const PADDLE_SPEED = 340;
const BRICK_VERTICAL_SPACING = 2;
const BRICK_HEIGHT = DEFAULT_HEIGHT * 0.05;
const TRAIL_LENGTH = 10;
const EPS = 0.001;
const MAX_BOUNCES_PER_STEP = 8;
const MAX_DT = 1 / 30;
const DROP_SPEED = 120;
const POWERUP_DURATION_MS: Record<Exclude<PowerUpType, 'multi-ball'>, number> = {
  magnet: 8000,
  'big-paddle': 8000,
  laser: 8000,
};

const BRICK_POWERUPS: Partial<Record<Cell, PowerUpType>> = {
  2: 'multi-ball',
  3: 'magnet',
};

let nextId = 1;
const uid = () => `${(nextId += 1)}`;

export const defaultGrid = (): Grid =>
  Array.from({ length: 5 }, () => Array(10).fill(1) as Cell[]);

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const makeBricks = (grid: Grid, width: number, hudHeight: number): Brick[] => {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const brickWidth = cols > 0 ? width / cols : 0;
  const bricks: Brick[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const type = grid[r][c];
      if (type > 0) {
        bricks.push({
          id: uid(),
          x: c * brickWidth,
          y: hudHeight + r * (BRICK_HEIGHT + BRICK_VERTICAL_SPACING),
          w: brickWidth - BRICK_VERTICAL_SPACING,
          h: BRICK_HEIGHT,
          type,
          alive: true,
        });
      }
    }
  }
  return bricks;
};

const reflect = (vx: number, vy: number, nx: number, ny: number) => {
  const dot = vx * nx + vy * ny;
  if (dot >= 0) return { vx, vy };
  const rx = vx - 2 * dot * nx;
  const ry = vy - 2 * dot * ny;
  return { vx: rx, vy: ry };
};

export const reflectVector = reflect;

const computePaddleY = (height: number) => height - PADDLE_HEIGHT * 2;

export const createState = (opts?: {
  grid?: Grid;
  width?: number;
  height?: number;
  nowMs?: number;
  rngSeed?: string;
}): BreakoutState => {
  const width = opts?.width ?? DEFAULT_WIDTH;
  const height = opts?.height ?? DEFAULT_HEIGHT;
  const grid = opts?.grid ?? defaultGrid();
  if (opts?.rngSeed !== undefined) {
    resetRng(opts.rngSeed);
  }
  const rng = defaultRandom;
  const paddleBaseWidth = BASE_PADDLE_WIDTH;
  const paddle: Paddle = {
    x: width / 2 - paddleBaseWidth / 2,
    y: computePaddleY(height),
    w: paddleBaseWidth,
    h: PADDLE_HEIGHT,
  };
  const ball: Ball = {
    id: uid(),
    x: paddle.x + paddle.w / 2,
    y: paddle.y - BALL_RADIUS,
    vx: 0,
    vy: -BALL_SPEED,
    radius: BALL_RADIUS,
    stuck: true,
    stuckOffsetX: paddle.w / 2,
    lastHitPos: 0,
    trail: [],
  };
  return {
    width,
    height,
    hudHeight: HUD_HEIGHT,
    paddle,
    paddleBaseWidth,
    bricks: makeBricks(grid, width, HUD_HEIGHT),
    balls: [ball],
    powerupsFalling: [],
    activePowerups: {},
    lives: 3,
    levelIndex: 1,
    score: 0,
    nowMs: opts?.nowMs ?? 0,
    rng,
    grid,
    laserEnabled: false,
  };
};

const expandedRect = (b: { x: number; y: number; w: number; h: number }, r: number) => ({
  minX: b.x - r,
  maxX: b.x + b.w + r,
  minY: b.y - r,
  maxY: b.y + b.h + r,
});

export const sweepAabb = (
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  rect: { minX: number; maxX: number; minY: number; maxY: number },
): { t: number; normal: { x: number; y: number } } | null => {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;

  const invDx = dx !== 0 ? 1 / dx : Infinity;
  const invDy = dy !== 0 ? 1 / dy : Infinity;

  const tx1 = (rect.minX - p0.x) * invDx;
  const tx2 = (rect.maxX - p0.x) * invDx;
  const ty1 = (rect.minY - p0.y) * invDy;
  const ty2 = (rect.maxY - p0.y) * invDy;

  const tMinX = Math.min(tx1, tx2);
  const tMaxX = Math.max(tx1, tx2);
  const tMinY = Math.min(ty1, ty2);
  const tMaxY = Math.max(ty1, ty2);

  const tEnter = Math.max(tMinX, tMinY);
  const tExit = Math.min(tMaxX, tMaxY);

  if (Number.isNaN(tEnter) || tEnter > tExit || tExit < 0 || tEnter > 1) {
    return null;
  }

  if (tMinX > tMinY) {
    return { t: tEnter, normal: { x: dx > 0 ? -1 : 1, y: 0 } };
  }
  return { t: tEnter, normal: { x: 0, y: dy > 0 ? -1 : 1 } };
};

const paddleBounce = (ball: Ball, paddle: Paddle) => {
  const hitPos = clamp((ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2), -1, 1);
  const speed = Math.hypot(ball.vx, ball.vy) || BALL_SPEED;
  const maxAngle = (60 * Math.PI) / 180;
  ball.vx = speed * Math.sin(maxAngle * hitPos);
  ball.vy = -speed * Math.cos(maxAngle * hitPos);
  ball.lastHitPos = hitPos;
};

const applyPowerUp = (state: BreakoutState, type: PowerUpType) => {
  if (type === 'multi-ball') {
    const template = state.balls[0];
    if (!template) return;
    const speed = Math.hypot(template.vx, template.vy) || BALL_SPEED;
    const newBall: Ball = {
      ...template,
      id: uid(),
      vx: -template.vx || speed,
      vy: template.vy,
      trail: [],
    };
    state.balls.push(newBall);
    return;
  }

  const duration = POWERUP_DURATION_MS[type];
  const expiresAtMs = state.nowMs + duration;
  const existing = state.activePowerups[type];
  state.activePowerups[type] = {
    type,
    expiresAtMs: existing ? Math.max(existing.expiresAtMs, expiresAtMs) : expiresAtMs,
  };

  if (type === 'big-paddle') {
    state.paddle.w = state.paddleBaseWidth * 1.5;
    state.paddle.x = clamp(state.paddle.x, 0, state.width - state.paddle.w);
  }

  if (type === 'laser') {
    state.laserEnabled = true;
  }
};

const removePowerUpEffects = (state: BreakoutState, type: PowerUpType) => {
  if (type === 'big-paddle') {
    state.paddle.w = state.paddleBaseWidth;
    state.paddle.x = clamp(state.paddle.x, 0, state.width - state.paddle.w);
  }
  if (type === 'laser') {
    state.laserEnabled = false;
  }
};

const cleanExpiredPowerups = (state: BreakoutState) => {
  Object.entries(state.activePowerups).forEach(([key, power]) => {
    if (power && power.expiresAtMs <= state.nowMs) {
      removePowerUpEffects(state, power.type);
      delete state.activePowerups[key as PowerUpType];
    }
  });
};

const hasMagnet = (state: BreakoutState) => Boolean(state.activePowerups.magnet);

const spawnDrop = (state: BreakoutState, brick: Brick) => {
  const type = BRICK_POWERUPS[brick.type];
  if (!type) return;
  state.powerupsFalling.push({
    id: uid(),
    type,
    x: brick.x + brick.w / 2,
    y: brick.y + brick.h / 2,
    vy: DROP_SPEED,
  });
};

const handleDropCollection = (state: BreakoutState, dt: number) => {
  const paddleBottom = state.paddle.y + state.paddle.h;
  state.powerupsFalling = state.powerupsFalling.filter((drop) => {
    drop.y += drop.vy * dt;
    const withinX = drop.x >= state.paddle.x && drop.x <= state.paddle.x + state.paddle.w;
    const withinY = drop.y >= state.paddle.y && drop.y <= paddleBottom;
    if (withinX && withinY) {
      applyPowerUp(state, drop.type);
      return false;
    }
    return drop.y <= state.height;
  });
};

const resetBalls = (state: BreakoutState) => {
  state.balls = [
    {
      id: uid(),
      x: state.paddle.x + state.paddle.w / 2,
      y: state.paddle.y - BALL_RADIUS,
      vx: 0,
      vy: -BALL_SPEED,
      radius: BALL_RADIUS,
      stuck: true,
      stuckOffsetX: state.paddle.w / 2,
      lastHitPos: 0,
      trail: [],
    },
  ];
};

export const resetLevel = (state: BreakoutState, grid?: Grid) => {
  if (grid) {
    state.grid = grid;
  }
  state.bricks = makeBricks(state.grid, state.width, state.hudHeight);
  state.powerupsFalling = [];
  state.activePowerups = {};
  state.laserEnabled = false;
  state.paddle.w = state.paddleBaseWidth;
  state.paddle.x = state.width / 2 - state.paddle.w / 2;
  resetBalls(state);
};

const releaseBalls = (state: BreakoutState) => {
  state.balls.forEach((ball) => {
    if (ball.stuck) {
      const speed = BALL_SPEED;
      const maxAngle = (60 * Math.PI) / 180;
      const angle = maxAngle * clamp(ball.lastHitPos, -1, 1);
      ball.vx = speed * Math.sin(angle);
      ball.vy = -speed * Math.cos(angle);
      ball.stuck = false;
    }
  });
};

export const stepBreakout = (
  state: BreakoutState,
  dtInput: number,
  input: StepInput = {},
): StepResult => {
  const dt = Math.min(Math.max(dtInput, 0), MAX_DT);
  state.nowMs += dt * 1000;
  cleanExpiredPowerups(state);

  if (input.targetX !== undefined) {
    state.paddle.x = clamp(input.targetX - state.paddle.w / 2, 0, state.width - state.paddle.w);
  }
  if (input.moveLeft) {
    state.paddle.x = clamp(state.paddle.x - PADDLE_SPEED * dt, 0, state.width - state.paddle.w);
  }
  if (input.moveRight) {
    state.paddle.x = clamp(state.paddle.x + PADDLE_SPEED * dt, 0, state.width - state.paddle.w);
  }

  if (input.release) {
    releaseBalls(state);
  }

  handleDropCollection(state, dt);

  let levelCleared = false;
  let lifeLost = false;

  state.balls.forEach((ball) => {
    if (ball.stuck) {
      ball.x = clamp(state.paddle.x + ball.stuckOffsetX, ball.radius, state.width - ball.radius);
      ball.y = state.paddle.y - BALL_RADIUS;
      ball.trail = [];
      return;
    }

    let remaining = dt;
    let loops = 0;
    while (remaining > 0 && loops < MAX_BOUNCES_PER_STEP) {
      loops += 1;
      const start = { x: ball.x, y: ball.y };
      const target = { x: ball.x + ball.vx * remaining, y: ball.y + ball.vy * remaining };

      let hitT = 1;
      let hitNormal: { x: number; y: number } | null = null;
      let hitBrick: Brick | null = null;
      let hitPaddle = false;

      if (ball.vx < 0 && target.x <= ball.radius) {
        const t = (ball.radius - start.x) / (target.x - start.x);
        if (t >= 0 && t < hitT) {
          hitT = t;
          hitNormal = { x: 1, y: 0 };
        }
      }
      if (ball.vx > 0 && target.x >= state.width - ball.radius) {
        const t = (state.width - ball.radius - start.x) / (target.x - start.x);
        if (t >= 0 && t < hitT) {
          hitT = t;
          hitNormal = { x: -1, y: 0 };
        }
      }
      if (ball.vy < 0 && target.y <= ball.radius) {
        const t = (ball.radius - start.y) / (target.y - start.y);
        if (t >= 0 && t < hitT) {
          hitT = t;
          hitNormal = { x: 0, y: 1 };
        }
      }

      const paddleRect = expandedRect(state.paddle, ball.radius);
      const paddleHit = sweepAabb(start, target, paddleRect);
      if (paddleHit && paddleHit.t < hitT) {
        hitT = paddleHit.t;
        hitNormal = paddleHit.normal;
        hitPaddle = true;
      }

      state.bricks.forEach((brick) => {
        if (!brick.alive) return;
        const rect = expandedRect(brick, ball.radius);
        const collision = sweepAabb(start, target, rect);
        if (collision && collision.t < hitT) {
          hitT = collision.t;
          hitNormal = collision.normal;
          hitBrick = brick;
          hitPaddle = false;
        }
      });

      if (!hitNormal) {
        ball.trail.push({ x: ball.x, y: ball.y });
        if (ball.trail.length > TRAIL_LENGTH) ball.trail.shift();
        ball.x = target.x;
        ball.y = target.y;
        break;
      }

      ball.x = start.x + (target.x - start.x) * hitT;
      ball.y = start.y + (target.y - start.y) * hitT;

      if (hitBrick) {
        hitBrick.alive = false;
        state.score += 100;
        spawnDrop(state, hitBrick);
      }

      if (hitPaddle && hitNormal.y === -1 && hasMagnet(state)) {
        ball.stuck = true;
        ball.stuckOffsetX = clamp(ball.x - state.paddle.x, 0, state.paddle.w);
        ball.lastHitPos = clamp((ball.x - (state.paddle.x + state.paddle.w / 2)) / (state.paddle.w / 2), -1, 1);
        ball.vx = 0;
        ball.vy = 0;
        break;
      }

      if (hitPaddle && hitNormal.y === -1) {
        paddleBounce(ball, state.paddle);
      } else {
        const reflected = reflect(ball.vx, ball.vy, hitNormal.x, hitNormal.y);
        ball.vx = reflected.vx;
        ball.vy = reflected.vy;
      }

      ball.x += hitNormal.x * EPS;
      ball.y += hitNormal.y * EPS;
      remaining *= 1 - hitT;
    }
  });

  state.balls = state.balls.filter((b) => b.y <= state.height + b.radius * 2);
  if (state.balls.length === 0) {
    state.lives -= 1;
    lifeLost = true;
    if (state.lives > 0) {
      state.activePowerups = {};
      state.powerupsFalling = [];
      state.laserEnabled = false;
      state.paddle.w = state.paddleBaseWidth;
      resetBalls(state);
    } else {
      state.lives = 3;
      state.levelIndex = 1;
      resetLevel(state);
      state.score = 0;
    }
  }

  if (state.bricks.every((b) => !b.alive)) {
    levelCleared = true;
  }

  return { levelCleared, lifeLost };
};

export const cloneState = (state: BreakoutState): BreakoutState => ({
  ...state,
  paddle: { ...state.paddle },
  bricks: state.bricks.map((b) => ({ ...b })),
  balls: state.balls.map((b) => ({ ...b, trail: [...b.trail] })),
  powerupsFalling: state.powerupsFalling.map((p) => ({ ...p })),
  activePowerups: { ...state.activePowerups },
});
