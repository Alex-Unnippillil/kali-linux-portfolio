import { random } from './rng';

export type PowerUpType = 'shield' | 'rapid' | 'life';

export interface PlayerState {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  cooldown: number;
  rapid: number;
  shield: boolean;
  shieldHp: number;
}

export interface InvaderState {
  x: number;
  y: number;
  w: number;
  h: number;
  alive: boolean;
  phase: number;
}

export interface ShieldState {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
}

export interface BulletState {
  x: number;
  y: number;
  dx: number;
  dy: number;
  active: boolean;
  owner: 'player' | 'enemy';
}

export interface PowerUpState {
  x: number;
  y: number;
  type: PowerUpType;
  active: boolean;
}

export interface UFOState {
  active: boolean;
  x: number;
  y: number;
  dir: number;
  w: number;
  h: number;
}

export interface GameState {
  width: number;
  height: number;
  stage: number;
  score: number;
  lives: number;
  highScore: number;
  gameOver: boolean;
  player: PlayerState;
  invaders: InvaderState[];
  shields: ShieldState[];
  bullets: BulletState[];
  powerUps: PowerUpState[];
  ufo: UFOState;
  invaderDir: number;
  invaderStepTimer: number;
  enemyCooldown: number;
  ufoTimer: number;
  waveTime: number;
  extraLifeIndex: number;
}

export interface InputState {
  left: boolean;
  right: boolean;
  fire: boolean;
}

export interface StepOptions {
  paused?: boolean;
  difficulty?: number;
}

export interface StepEvent {
  type:
    | 'score'
    | 'life-lost'
    | 'wave-complete'
    | 'game-over'
    | 'ufo-spawn'
    | 'ufo-destroyed'
    | 'powerup';
  value?: number;
  message?: string;
}

const DEFAULT_WIDTH = 480;
const DEFAULT_HEIGHT = 360;
const INVADER_COLS = 8;
const INVADER_SPACING = 32;
const INVADER_SIZE = { w: 20, h: 14 };
const PLAYER_SIZE = { w: 26, h: 12 };
const PLAYER_SPEED = 160;
const PLAYER_COOLDOWN = 0.45;
const BULLET_SPEED = 240;
const ENEMY_BULLET_SPEED = 200;
const UFO_SPEED = 90;
const EXTRA_LIFE_THRESHOLDS = [1000, 5000, 10000];
export const HIGH_SCORE_KEY = 'si_highscore';

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const createShields = (width: number, height: number): ShieldState[] => {
  const baseY = height - 70;
  const gap = width / 4;
  return [
    { x: gap - 30, y: baseY, w: 50, h: 18, hp: 6 },
    { x: gap * 2 - 25, y: baseY, w: 50, h: 18, hp: 6 },
    { x: gap * 3 - 20, y: baseY, w: 50, h: 18, hp: 6 },
  ];
};

export const createWave = (stage: number, width: number): InvaderState[] => {
  const rows = 4 + (stage - 1);
  const gridWidth = (INVADER_COLS - 1) * INVADER_SPACING;
  const startX = (width - gridWidth) / 2;
  const invaders: InvaderState[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < INVADER_COLS; c += 1) {
      invaders.push({
        x: startX + c * INVADER_SPACING,
        y: 40 + r * INVADER_SPACING,
        w: INVADER_SIZE.w,
        h: INVADER_SIZE.h,
        alive: true,
        phase: random() * Math.PI * 2,
      });
    }
  }
  return invaders;
};

export const createGame = (options?: {
  width?: number;
  height?: number;
  highScore?: number;
}): GameState => {
  const width = options?.width ?? DEFAULT_WIDTH;
  const height = options?.height ?? DEFAULT_HEIGHT;
  const player: PlayerState = {
    x: width / 2 - PLAYER_SIZE.w / 2,
    y: height - 30,
    w: PLAYER_SIZE.w,
    h: PLAYER_SIZE.h,
    speed: PLAYER_SPEED,
    cooldown: 0,
    rapid: 0,
    shield: false,
    shieldHp: 0,
  };
  return {
    width,
    height,
    stage: 1,
    score: 0,
    lives: 3,
    highScore: options?.highScore ?? 0,
    gameOver: false,
    player,
    invaders: createWave(1, width),
    shields: createShields(width, height),
    bullets: [],
    powerUps: [],
    ufo: { active: false, x: 0, y: 18, dir: 1, w: 30, h: 12 },
    invaderDir: 1,
    invaderStepTimer: 0,
    enemyCooldown: 1,
    ufoTimer: 0,
    waveTime: 0,
    extraLifeIndex: 0,
  };
};

export const advanceWave = (state: GameState) => {
  if (state.invaders.every((inv) => !inv.alive)) {
    state.stage += 1;
    state.invaders = createWave(state.stage, state.width);
    state.shields = createShields(state.width, state.height);
    state.ufo.active = false;
    state.invaderDir = 1;
    state.invaderStepTimer = 0;
    state.waveTime = 0;
  }
};

export const spawnUFO = (state: GameState) => {
  state.ufo = { active: true, x: 0, y: 18, dir: 1, w: 30, h: 12 };
};

export const updateHighScore = (score: number, highScore: number) =>
  Math.max(score, highScore);

const spawnBullet = (
  bullets: BulletState[],
  data: Omit<BulletState, 'active'>,
) => {
  const inactive = bullets.find((b) => !b.active);
  if (inactive) {
    Object.assign(inactive, data, { active: true });
    return;
  }
  bullets.push({ ...data, active: true });
};

const handlePowerUp = (state: GameState, type: PowerUpType) => {
  const player = state.player;
  if (type === 'shield') {
    player.shield = true;
    player.shieldHp = 3;
  } else if (type === 'rapid') {
    player.rapid = 4;
  } else if (type === 'life') {
    state.lives += 1;
  }
};

const pickPowerUp = (): PowerUpType => {
  const roll = random();
  if (roll < 0.34) return 'shield';
  if (roll < 0.67) return 'rapid';
  return 'life';
};

const intersects = (
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

export const stepGame = (
  state: GameState,
  input: InputState,
  dt: number,
  options?: StepOptions,
) => {
  const events: StepEvent[] = [];
  if (options?.paused || state.gameOver) {
    return { events };
  }

  const delta = Math.min(dt, 0.05);
  const difficulty = options?.difficulty ?? 1;
  const player = state.player;

  const moveDir = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  player.x = clamp(
    player.x + moveDir * player.speed * delta,
    0,
    state.width - player.w,
  );

  player.cooldown = Math.max(0, player.cooldown - delta);
  if (input.fire && player.cooldown <= 0) {
    spawnBullet(state.bullets, {
      x: player.x + player.w / 2 - 1,
      y: player.y - 4,
      dx: 0,
      dy: -BULLET_SPEED,
      owner: 'player',
    });
    player.cooldown = player.rapid > 0 ? 0.18 : PLAYER_COOLDOWN;
  }
  if (player.rapid > 0) {
    player.rapid = Math.max(0, player.rapid - delta);
  }

  state.bullets.forEach((bullet) => {
    if (!bullet.active) return;
    bullet.x += bullet.dx * delta;
    bullet.y += bullet.dy * delta * (bullet.owner === 'enemy' ? difficulty : 1);
    if (
      bullet.y < -20 ||
      bullet.y > state.height + 20 ||
      bullet.x < -20 ||
      bullet.x > state.width + 20
    ) {
      bullet.active = false;
    }
  });

  const aliveInvaders = state.invaders.filter((inv) => inv.alive);

  state.enemyCooldown -= delta;
  if (state.enemyCooldown <= 0 && aliveInvaders.length) {
    const pick = aliveInvaders[Math.floor(random() * aliveInvaders.length)];
    spawnBullet(state.bullets, {
      x: pick.x + pick.w / 2,
      y: pick.y + pick.h,
      dx: 0,
      dy: ENEMY_BULLET_SPEED,
      owner: 'enemy',
    });
    state.enemyCooldown = Math.max(0.35, 1.1 / (difficulty + state.stage * 0.2));
  }

  state.waveTime += delta;
  const aliveRatio = aliveInvaders.length / (state.invaders.length || 1);
  const interval =
    (0.65 * Math.max(0.2, aliveRatio)) /
    (state.stage * difficulty * (1 + state.waveTime * 0.04));
  state.invaderStepTimer += delta;
  if (state.invaderStepTimer >= interval && aliveInvaders.length) {
    state.invaderStepTimer -= interval;
    let hitEdge = false;
    aliveInvaders.forEach((inv) => {
      inv.x += state.invaderDir * 10;
      if (inv.x < 10 || inv.x + inv.w > state.width - 10) {
        hitEdge = true;
      }
    });
    if (hitEdge) {
      state.invaderDir *= -1;
      aliveInvaders.forEach((inv) => {
        inv.y += 10;
      });
    }
  }

  state.ufoTimer += delta;
  if (!state.ufo.active && state.ufoTimer > 12 && random() < 0.02) {
    spawnUFO(state);
    state.ufoTimer = 0;
    events.push({ type: 'ufo-spawn', message: 'Saucer approaching' });
  }
  if (state.ufo.active) {
    state.ufo.x += state.ufo.dir * UFO_SPEED * delta;
    if (state.ufo.x > state.width || state.ufo.x < -state.ufo.w) {
      state.ufo.active = false;
    }
  }

  state.powerUps.forEach((powerUp) => {
    if (!powerUp.active) return;
    powerUp.y += 40 * delta;
    if (powerUp.y > state.height + 10) powerUp.active = false;
    if (
      intersects(
        powerUp.x - 5,
        powerUp.y - 5,
        10,
        10,
        player.x,
        player.y,
        player.w,
        player.h,
      )
    ) {
      powerUp.active = false;
      handlePowerUp(state, powerUp.type);
      events.push({ type: 'powerup', message: `${powerUp.type} collected` });
    }
  });
  state.powerUps = state.powerUps.filter((powerUp) => powerUp.active);

  state.bullets.forEach((bullet) => {
    if (!bullet.active) return;
    if (bullet.owner === 'player') {
      for (const invader of state.invaders) {
        if (
          invader.alive &&
          intersects(
            bullet.x,
            bullet.y,
            2,
            6,
            invader.x,
            invader.y,
            invader.w,
            invader.h,
          )
        ) {
          invader.alive = false;
          bullet.active = false;
          state.score += 10;
          events.push({ type: 'score', value: 10 });
          if (random() < 0.1) {
            state.powerUps.push({
              x: invader.x + invader.w / 2,
              y: invader.y + invader.h / 2,
              type: pickPowerUp(),
              active: true,
            });
          }
          break;
        }
      }
      if (bullet.active && state.ufo.active) {
        if (
          intersects(
            bullet.x,
            bullet.y,
            2,
            6,
            state.ufo.x,
            state.ufo.y,
            state.ufo.w,
            state.ufo.h,
          )
        ) {
          bullet.active = false;
          state.ufo.active = false;
          state.score += 50;
          events.push({ type: 'ufo-destroyed', value: 50 });
        }
      }
      if (bullet.active) {
        for (const shield of state.shields) {
          if (
            shield.hp > 0 &&
            intersects(
              bullet.x,
              bullet.y,
              2,
              6,
              shield.x,
              shield.y,
              shield.w,
              shield.h,
            )
          ) {
            shield.hp = Math.max(0, shield.hp - 1);
            bullet.active = false;
            break;
          }
        }
      }
    } else if (
      bullet.owner === 'enemy' &&
      intersects(
        bullet.x,
        bullet.y,
        2,
        6,
        player.x,
        player.y,
        player.w,
        player.h,
      )
    ) {
      bullet.active = false;
      if (player.shield && player.shieldHp > 0) {
        player.shieldHp -= 1;
        if (player.shieldHp <= 0) player.shield = false;
      } else {
        state.lives -= 1;
        events.push({ type: 'life-lost' });
        if (state.lives <= 0) {
          state.gameOver = true;
          state.highScore = updateHighScore(state.score, state.highScore);
          events.push({ type: 'game-over' });
        }
      }
    }
  });

  state.shields = state.shields.filter((shield) => shield.hp > 0);

  if (state.invaders.every((inv) => !inv.alive)) {
    state.stage += 1;
    state.invaders = createWave(state.stage, state.width);
    state.shields = createShields(state.width, state.height);
    state.invaderDir = 1;
    state.invaderStepTimer = 0;
    state.waveTime = 0;
    state.ufo.active = false;
    events.push({ type: 'wave-complete' });
  }

  if (
    state.extraLifeIndex < EXTRA_LIFE_THRESHOLDS.length &&
    state.score >= EXTRA_LIFE_THRESHOLDS[state.extraLifeIndex]
  ) {
    state.lives += 1;
    state.extraLifeIndex += 1;
  }

  state.highScore = updateHighScore(state.score, state.highScore);

  return { events };
};
