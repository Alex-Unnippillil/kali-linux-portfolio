import { getBallSpin } from './physics';

export type Mode = 'cpu' | 'local' | 'online' | 'practice';

export interface PaddleState {
  y: number;
  vy: number;
}

export interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface ScoreState {
  left: number;
  right: number;
}

export interface AiState {
  timeUntilUpdate: number;
  targetY: number | null;
  difficulty: 'easy' | 'normal' | 'hard';
}

export interface PongState {
  paddles: {
    left: PaddleState;
    right: PaddleState;
  };
  ball: BallState;
  score: ScoreState;
  rally: number;
  mode: Mode;
  ai: AiState;
  rngSeed: number;
}

export interface DifficultySettings {
  reactionDelay: number;
  aimError: number;
  maxSpeed: number;
  accel: number;
}

export interface PongConfig {
  WIDTH: number;
  HEIGHT: number;
  PADDLE_WIDTH: number;
  PADDLE_HEIGHT: number;
  BALL_SIZE: number;
  SERVE_SPEED: number;
  MAX_BALL_SPEED: number;
  MAX_BOUNCE_ANGLE_DEG: number;
  TIME_RAMP_RATE: number;
  HIT_BOOST: number;
  PRACTICE_SPEED_MULTIPLIER: number;
  spinMaxAngleDeg?: number;
  aiDifficulty: Record<AiState['difficulty'], DifficultySettings>;
  spinEnabled?: boolean;
}

export type EventType =
  | { type: 'hit'; paddle: 'left' | 'right' }
  | { type: 'score'; side: 'left' | 'right' }
  | { type: 'wall' };

export interface PaddleInput {
  up?: boolean;
  down?: boolean;
  touchY?: number | null;
}

export interface Inputs {
  left: PaddleInput;
  right: PaddleInput;
}

export const DEFAULT_CONFIG: PongConfig = {
  WIDTH: 600,
  HEIGHT: 400,
  PADDLE_WIDTH: 10,
  PADDLE_HEIGHT: 80,
  BALL_SIZE: 8,
  SERVE_SPEED: 240,
  MAX_BALL_SPEED: 600,
  MAX_BOUNCE_ANGLE_DEG: 60,
  TIME_RAMP_RATE: 1.2,
  HIT_BOOST: 30,
  PRACTICE_SPEED_MULTIPLIER: 1,
  spinMaxAngleDeg: 12,
  aiDifficulty: {
    easy: { reactionDelay: 0.25, aimError: 30, maxSpeed: 260, accel: 1800 },
    normal: { reactionDelay: 0.14, aimError: 16, maxSpeed: 320, accel: 2200 },
    hard: { reactionDelay: 0.08, aimError: 6, maxSpeed: 400, accel: 2600 },
  },
  spinEnabled: true,
};

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function lcg(state: PongState) {
  state.rngSeed = (state.rngSeed * 1664525 + 1013904223) % 4294967296;
  return state.rngSeed / 4294967296;
}

function chooseServeAngle(rng: number) {
  const spread = degToRad(30);
  return (rng - 0.5) * spread;
}

export function createInitialState(
  config: PongConfig = DEFAULT_CONFIG,
  seed = 1,
  mode: Mode = 'cpu',
  difficulty: AiState['difficulty'] = 'normal',
): PongState {
  const state: PongState = {
    paddles: {
      left: { y: config.HEIGHT / 2 - config.PADDLE_HEIGHT / 2, vy: 0 },
      right: { y: config.HEIGHT / 2 - config.PADDLE_HEIGHT / 2, vy: 0 },
    },
    ball: {
      x: config.WIDTH / 2,
      y: config.HEIGHT / 2,
      vx: 0,
      vy: 0,
    },
    score: { left: 0, right: 0 },
    rally: 0,
    mode,
    ai: {
      timeUntilUpdate: 0,
      targetY: null,
      difficulty,
    },
    rngSeed: seed,
  };
  resetBall(state, mode === 'cpu' ? 1 : undefined, config);
  return state;
}

export function resetBall(
  state: PongState,
  dir: number = lcg(state) > 0.5 ? 1 : -1,
  config: PongConfig = DEFAULT_CONFIG,
) {
  const practiceMultiplier = state.mode === 'practice' ? config.PRACTICE_SPEED_MULTIPLIER : 1;
  const serveSpeed = config.SERVE_SPEED * practiceMultiplier;
  state.ball.x = config.WIDTH / 2;
  state.ball.y = config.HEIGHT / 2;
  const angle = chooseServeAngle(lcg(state));
  state.ball.vx = Math.cos(angle) * serveSpeed * dir;
  state.ball.vy = Math.sin(angle) * serveSpeed;
  state.rally = 0;
}

function applyInputs(
  paddle: PaddleState,
  input: PaddleInput,
  config: PongConfig,
  dt: number,
) {
  const accel = 2000;
  const maxSpeed = 420;
  const friction = 2000;
  const prevY = paddle.y;

  if (input.touchY !== null && input.touchY !== undefined) {
    paddle.y = input.touchY - config.PADDLE_HEIGHT / 2;
    paddle.vy = (paddle.y - prevY) / dt;
  } else {
    if (input.up) paddle.vy -= accel * dt;
    if (input.down) paddle.vy += accel * dt;

    if (!input.up && !input.down) {
      if (paddle.vy > 0) paddle.vy = Math.max(0, paddle.vy - friction * dt);
      else if (paddle.vy < 0) paddle.vy = Math.min(0, paddle.vy + friction * dt);
    }

    paddle.vy = clamp(paddle.vy, -maxSpeed, maxSpeed);
    paddle.y += paddle.vy * dt;
  }

  if (paddle.y < 0) {
    paddle.y = 0;
    paddle.vy = 0;
  } else if (paddle.y > config.HEIGHT - config.PADDLE_HEIGHT) {
    paddle.y = config.HEIGHT - config.PADDLE_HEIGHT;
    paddle.vy = 0;
  }
}

function applyAi(
  state: PongState,
  config: PongConfig,
  dt: number,
  ballDir: number,
) {
  const aiConfig = config.aiDifficulty[state.ai.difficulty];
  if (!aiConfig) return;

  state.ai.timeUntilUpdate -= dt;
  const movingTowardAi = ballDir > 0 && state.ball.vx > 0;

  if (state.ai.timeUntilUpdate <= 0) {
    state.ai.timeUntilUpdate = aiConfig.reactionDelay;
    if (movingTowardAi) {
      const timeToReach = (config.WIDTH - config.PADDLE_WIDTH * 2 - state.ball.x) / state.ball.vx;
      const predictedY = foldY(
        state.ball.y + state.ball.vy * timeToReach,
        config.BALL_SIZE,
        config.HEIGHT - config.BALL_SIZE,
      );
      const speed = Math.hypot(state.ball.vx, state.ball.vy);
      const speedFactor = clamp(speed / config.MAX_BALL_SPEED, 0, 1);
      const error = (aiConfig.aimError + speedFactor * aiConfig.aimError * 0.5) * (lcg(state) - 0.5) * 2;
      state.ai.targetY = predictedY + error;
    } else {
      state.ai.targetY = config.HEIGHT / 2;
    }
  }

  if (state.ai.targetY === null) return;

  const targetCenter = clamp(
    state.ai.targetY,
    config.BALL_SIZE,
    config.HEIGHT - config.BALL_SIZE,
  );
  const paddleCenter = state.paddles.right.y + config.PADDLE_HEIGHT / 2;
  const delta = targetCenter - paddleCenter;
  const desired = clamp(delta * 6, -aiConfig.maxSpeed, aiConfig.maxSpeed);

  if (desired > state.paddles.right.vy) {
    state.paddles.right.vy = clamp(
      state.paddles.right.vy + aiConfig.accel * dt,
      -aiConfig.maxSpeed,
      desired,
    );
  } else {
    state.paddles.right.vy = clamp(
      state.paddles.right.vy - aiConfig.accel * dt,
      desired,
      aiConfig.maxSpeed,
    );
  }

  state.paddles.right.y += state.paddles.right.vy * dt;
  state.paddles.right.y = clamp(
    state.paddles.right.y,
    0,
    config.HEIGHT - config.PADDLE_HEIGHT,
  );
}

function computeBounceVelocity(
  state: PongState,
  paddle: 'left' | 'right',
  paddleY: number,
  paddleVy: number,
  config: PongConfig,
  practiceMultiplier: number,
) {
  const relative = clamp(
    (state.ball.y - (paddleY + config.PADDLE_HEIGHT / 2)) / (config.PADDLE_HEIGHT / 2),
    -1,
    1,
  );
  const maxAngleRad = degToRad(config.MAX_BOUNCE_ANGLE_DEG);
  let angle = relative * maxAngleRad;
  const dir = paddle === 'left' ? 1 : -1;

  const { spin } = getBallSpin(
    state.ball.y,
    paddleY,
    config.PADDLE_HEIGHT,
    paddleVy,
    !!config.spinEnabled,
  );
  const spinMax = degToRad(config.spinMaxAngleDeg ?? 10);
  const speed = clamp(
    Math.hypot(state.ball.vx, state.ball.vy) + config.HIT_BOOST,
    0,
    config.MAX_BALL_SPEED * practiceMultiplier,
  );

  const spinAngle = clamp(spin / Math.max(speed, 1), -spinMax, spinMax);
  angle = clamp(angle + spinAngle, -maxAngleRad, maxAngleRad);

  const vx = Math.cos(angle) * speed * dir;
  const vy = Math.sin(angle) * speed;
  return { vx, vy, speed };
}

export function foldY(value: number, min: number, max: number) {
  const period = (max - min) * 2;
  let folded = (value - min) % period;
  if (folded < 0) folded += period;
  if (folded > max - min) folded = period - folded;
  return folded + min;
}

export function step(
  state: PongState,
  inputs: Inputs,
  dt: number,
  config: PongConfig = DEFAULT_CONFIG,
): EventType[] {
  const events: EventType[] = [];
  const practiceMultiplier = state.mode === 'practice' ? config.PRACTICE_SPEED_MULTIPLIER : 1;
  const effectiveMax = config.MAX_BALL_SPEED * practiceMultiplier;

  // Paddle movement
  applyInputs(state.paddles.left, inputs.left, config, dt);
  if (state.mode === 'cpu') {
    applyAi(state, config, dt, Math.sign(state.ball.vx));
  } else if (state.mode === 'practice') {
    state.paddles.right.y = 0;
    state.paddles.right.vy = 0;
  } else {
    applyInputs(state.paddles.right, inputs.right, config, dt);
  }

  // Ball speed ramp
  const currentSpeed = Math.hypot(state.ball.vx, state.ball.vy);
  const rampedSpeed = currentSpeed + (effectiveMax - currentSpeed) * config.TIME_RAMP_RATE * dt;
  if (rampedSpeed > 0 && currentSpeed > 0) {
    const ratio = clamp(rampedSpeed / currentSpeed, 0, effectiveMax / currentSpeed);
    state.ball.vx *= ratio;
    state.ball.vy *= ratio;
  }

  // Move ball
  state.ball.x += state.ball.vx * dt;
  state.ball.y += state.ball.vy * dt;

  // Wall collisions
  if (state.ball.y < config.BALL_SIZE) {
    state.ball.y = config.BALL_SIZE;
    state.ball.vy *= -1;
    events.push({ type: 'wall' });
  } else if (state.ball.y > config.HEIGHT - config.BALL_SIZE) {
    state.ball.y = config.HEIGHT - config.BALL_SIZE;
    state.ball.vy *= -1;
    events.push({ type: 'wall' });
  }

  // Scoring (check before paddle collisions to avoid phantom saves)
  if (state.ball.x < -config.BALL_SIZE) {
    state.score.right += 1;
    resetBall(state, 1, config);
    events.push({ type: 'score', side: 'right' });
    return events;
  }
  if (state.ball.x > config.WIDTH + config.BALL_SIZE) {
    state.score.left += 1;
    resetBall(state, -1, config);
    events.push({ type: 'score', side: 'left' });
    return events;
  }

  const checkPaddleHit = (
    paddle: 'left' | 'right',
    paddleX: number,
    paddleY: number,
    paddleVy: number,
  ) => {
    const withinY =
      state.ball.y + config.BALL_SIZE > paddleY &&
      state.ball.y - config.BALL_SIZE < paddleY + config.PADDLE_HEIGHT;
    const hittingLeft = paddle === 'left' && state.ball.vx < 0 && state.ball.x - config.BALL_SIZE < paddleX + config.PADDLE_WIDTH;
    const hittingRight = paddle === 'right' && state.ball.vx > 0 && state.ball.x + config.BALL_SIZE > paddleX;

    if (withinY && (hittingLeft || hittingRight)) {
      state.ball.x =
        paddle === 'left'
          ? paddleX + config.PADDLE_WIDTH + config.BALL_SIZE
          : paddleX - config.BALL_SIZE;
      const bounce = computeBounceVelocity(state, paddle, paddleY, paddleVy, config, practiceMultiplier);
      state.ball.vx = bounce.vx;
      state.ball.vy = bounce.vy;
      state.rally += 1;
      events.push({ type: 'hit', paddle });
    }
  };

  checkPaddleHit('left', config.PADDLE_WIDTH, state.paddles.left.y, state.paddles.left.vy);

  if (state.mode !== 'practice') {
    checkPaddleHit(
      'right',
      config.WIDTH - config.PADDLE_WIDTH * 2,
      state.paddles.right.y,
      state.paddles.right.vy,
    );
  } else if (state.ball.x + config.BALL_SIZE > config.WIDTH - config.PADDLE_WIDTH) {
    state.ball.x = config.WIDTH - config.PADDLE_WIDTH - config.BALL_SIZE;
    state.ball.vx = -Math.abs(state.ball.vx);
    state.rally += 1;
    events.push({ type: 'hit', paddle: 'right' });
  }

  return events;
}
