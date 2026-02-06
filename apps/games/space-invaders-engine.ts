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
  row: number;
  column: number;
  points: number;
}

export interface ShieldState {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  rows: number;
  cols: number;
  segments: number[];
  segmentHp: number;
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
  invaderFrame: 0 | 1;
  enemyCooldown: number;
  ufoTimer: number;
  waveTime: number;
  extraLifeIndex: number;
  frontLine: number[];
}

export interface InputState {
  left: boolean;
  right: boolean;
  fire: boolean;
}

export interface StepOptions {
  paused?: boolean;
  difficulty?: number;
  allowPowerUps?: boolean;
}

export interface StepEvent {
  type:
    | 'score'
    | 'life-lost'
    | 'wave-complete'
    | 'game-over'
    | 'ufo-spawn'
    | 'ufo-destroyed'
    | 'powerup'
    | 'invader-destroyed'
    | 'shield-hit'
    | 'extra-life';
  value?: number;
  message?: string;
  x?: number;
  y?: number;
  row?: number;
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
const SHIELD_SEG_ROWS = 2;
const SHIELD_SEG_COLS = 3;
const SHIELD_SEG_HP = 2;
const EXTRA_LIFE_THRESHOLDS = [1500];
const MAX_ENEMY_BULLETS = 3;
export const HIGH_SCORE_KEY = 'si_highscore';

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const createShields = (width: number, height: number): ShieldState[] => {
  const baseY = height - 70;
  const gap = width / 4;
  const segmentHp = SHIELD_SEG_HP;
  const segments = SHIELD_SEG_ROWS * SHIELD_SEG_COLS;
  const totalHp = segments * segmentHp;
  return [
    {
      x: gap - 30,
      y: baseY,
      w: 50,
      h: 18,
      hp: totalHp,
      rows: SHIELD_SEG_ROWS,
      cols: SHIELD_SEG_COLS,
      segments: Array.from({ length: segments }, () => segmentHp),
      segmentHp,
    },
    {
      x: gap * 2 - 25,
      y: baseY,
      w: 50,
      h: 18,
      hp: totalHp,
      rows: SHIELD_SEG_ROWS,
      cols: SHIELD_SEG_COLS,
      segments: Array.from({ length: segments }, () => segmentHp),
      segmentHp,
    },
    {
      x: gap * 3 - 20,
      y: baseY,
      w: 50,
      h: 18,
      hp: totalHp,
      rows: SHIELD_SEG_ROWS,
      cols: SHIELD_SEG_COLS,
      segments: Array.from({ length: segments }, () => segmentHp),
      segmentHp,
    },
  ];
};

const getInvaderPoints = (row: number) => {
  if (row === 0) return 30;
  if (row === 1) return 20;
  return 10;
};

export const createWave = (stage: number, width: number): InvaderState[] => {
  const rows = 4 + (stage - 1);
  const gridWidth = (INVADER_COLS - 1) * INVADER_SPACING;
  const startX = (width - gridWidth) / 2;
  const invaders: InvaderState[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < INVADER_COLS; c += 1) {
      const points = getInvaderPoints(r);
      invaders.push({
        x: startX + c * INVADER_SPACING,
        y: 40 + r * INVADER_SPACING,
        w: INVADER_SIZE.w,
        h: INVADER_SIZE.h,
        alive: true,
        phase: random() * Math.PI * 2,
        row: r,
        column: c,
        points,
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
    invaderFrame: 0,
    enemyCooldown: 1,
    ufoTimer: 0,
    waveTime: 0,
    extraLifeIndex: 0,
    frontLine: Array.from({ length: INVADER_COLS }, () => -1),
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
    state.invaderFrame = 0;
    state.waveTime = 0;
    state.frontLine.fill(-1);
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

const applyShieldHit = (
  shield: ShieldState,
  bullet: BulletState,
  events: StepEvent[],
) => {
  if (
    shield.hp <= 0 ||
    !intersects(
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
    return false;
  }
  const relX = bullet.x - shield.x;
  const relY = bullet.y - shield.y;
  const col = clamp(
    Math.floor((relX / shield.w) * shield.cols),
    0,
    shield.cols - 1,
  );
  const row = clamp(
    Math.floor((relY / shield.h) * shield.rows),
    0,
    shield.rows - 1,
  );
  const index = row * shield.cols + col;
  if (shield.segments[index] > 0) {
    shield.segments[index] = Math.max(0, shield.segments[index] - 1);
    shield.hp = Math.max(0, shield.hp - 1);
    bullet.active = false;
    events.push({
      type: 'shield-hit',
      x: bullet.x,
      y: bullet.y,
    });
    return true;
  }
  return false;
};

const getEnemyCooldown = (
  aliveRatio: number,
  difficulty: number,
  stage: number,
) => {
  const base = 1.15;
  const stageFactor = 1 + stage * 0.18;
  const difficultyFactor = 1 + difficulty * 0.35;
  const scaled = (base * Math.max(0.25, aliveRatio)) / (stageFactor * difficultyFactor);
  return clamp(scaled, 0.35, 1.2);
};

const getUfoScore = () => {
  const roll = random();
  if (roll < 0.25) return 50;
  if (roll < 0.5) return 100;
  if (roll < 0.75) return 150;
  return 300;
};

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
    const bulletCap = player.rapid > 0 ? 2 : 1;
    let activePlayerBullets = 0;
    for (const bullet of state.bullets) {
      if (bullet.active && bullet.owner === 'player') {
        activePlayerBullets += 1;
      }
    }
    if (activePlayerBullets < bulletCap) {
      spawnBullet(state.bullets, {
        x: player.x + player.w / 2 - 1,
        y: player.y - 4,
        dx: 0,
        dy: -BULLET_SPEED,
        owner: 'player',
      });
      player.cooldown = player.rapid > 0 ? 0.18 : PLAYER_COOLDOWN;
    }
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

  let aliveInvaders = 0;
  for (const invader of state.invaders) {
    if (!invader.alive) continue;
    aliveInvaders += 1;
    invader.phase += delta * 2;
  }

  state.enemyCooldown -= delta;
  if (state.enemyCooldown <= 0 && aliveInvaders > 0) {
    let activeEnemyBullets = 0;
    for (const bullet of state.bullets) {
      if (bullet.active && bullet.owner === 'enemy') activeEnemyBullets += 1;
    }
    if (activeEnemyBullets >= MAX_ENEMY_BULLETS) {
      state.enemyCooldown = Math.min(state.enemyCooldown, 0.2);
    } else {
      state.frontLine.fill(-1);
      for (let i = 0; i < state.invaders.length; i += 1) {
        const invader = state.invaders[i];
        if (!invader.alive) continue;
        const current = state.frontLine[invader.column];
        if (current === -1 || invader.y > state.invaders[current].y) {
          state.frontLine[invader.column] = i;
        }
      }
      let pickIndex = -1;
      let seen = 0;
      for (const index of state.frontLine) {
        if (index < 0) continue;
        seen += 1;
        if (random() < 1 / seen) pickIndex = index;
      }
      if (pickIndex >= 0) {
        const pick = state.invaders[pickIndex];
        spawnBullet(state.bullets, {
          x: pick.x + pick.w / 2,
          y: pick.y + pick.h,
          dx: 0,
          dy: ENEMY_BULLET_SPEED,
          owner: 'enemy',
        });
      }
      const aliveRatio = aliveInvaders / (state.invaders.length || 1);
      state.enemyCooldown = getEnemyCooldown(aliveRatio, difficulty, state.stage);
    }
  }

  state.waveTime += delta;
  const aliveRatio = aliveInvaders / (state.invaders.length || 1);
  const interval =
    (0.65 * Math.max(0.2, aliveRatio)) /
    (state.stage * difficulty * (1 + state.waveTime * 0.04));
  state.invaderStepTimer += delta;
  if (state.invaderStepTimer >= interval && aliveInvaders > 0) {
    state.invaderStepTimer -= interval;
    state.invaderFrame = state.invaderFrame === 0 ? 1 : 0;
    let hitEdge = false;
    for (const invader of state.invaders) {
      if (!invader.alive) continue;
      invader.x += state.invaderDir * 10;
      if (invader.x < 10 || invader.x + invader.w > state.width - 10) {
        hitEdge = true;
      }
    }
    if (hitEdge) {
      state.invaderDir *= -1;
      for (const invader of state.invaders) {
        if (!invader.alive) continue;
        invader.y += 10;
      }
    }
  }

  for (const invader of state.invaders) {
    if (!invader.alive) continue;
    if (invader.y + invader.h >= player.y) {
      state.gameOver = true;
      state.lives = 0;
      state.highScore = updateHighScore(state.score, state.highScore);
      events.push({ type: 'game-over' });
      return { events };
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

  if (options?.allowPowerUps) {
    let powerUpWrite = 0;
    for (let i = 0; i < state.powerUps.length; i += 1) {
      const powerUp = state.powerUps[i];
      if (!powerUp.active) continue;
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
        if (powerUp.type === 'life') {
          events.push({ type: 'extra-life', message: 'Extra life!' });
        }
        events.push({ type: 'powerup', message: `${powerUp.type} collected` });
      }
      if (powerUp.active) {
        state.powerUps[powerUpWrite] = powerUp;
        powerUpWrite += 1;
      }
    }
    state.powerUps.length = powerUpWrite;
  } else {
    state.powerUps.length = 0;
  }

  for (const bullet of state.bullets) {
    if (!bullet.active) continue;
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
          state.score += invader.points;
          events.push({
            type: 'invader-destroyed',
            value: invader.points,
            x: invader.x + invader.w / 2,
            y: invader.y + invader.h / 2,
            row: invader.row,
          });
          if (options?.allowPowerUps && random() < 0.1) {
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
          const ufoScore = getUfoScore();
          state.score += ufoScore;
          events.push({
            type: 'ufo-destroyed',
            value: ufoScore,
            x: state.ufo.x + state.ufo.w / 2,
            y: state.ufo.y + state.ufo.h / 2,
          });
        }
      }
      if (bullet.active) {
        for (const shield of state.shields) {
          if (applyShieldHit(shield, bullet, events)) break;
        }
      }
      if (bullet.active) {
        for (const other of state.bullets) {
          if (!other.active || other.owner === 'player') continue;
          if (
            intersects(
              bullet.x,
              bullet.y,
              2,
              6,
              other.x,
              other.y,
              2,
              6,
            )
          ) {
            bullet.active = false;
            other.active = false;
            break;
          }
        }
      }
    } else if (bullet.owner === 'enemy') {
      if (bullet.active) {
        for (const shield of state.shields) {
          if (applyShieldHit(shield, bullet, events)) break;
        }
      }
      if (
        bullet.active &&
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
    }
  }

  if (state.invaders.every((inv) => !inv.alive)) {
    state.stage += 1;
    state.invaders = createWave(state.stage, state.width);
    state.shields = createShields(state.width, state.height);
    state.invaderDir = 1;
    state.invaderStepTimer = 0;
    state.waveTime = 0;
    state.invaderFrame = 0;
    state.ufo.active = false;
    state.frontLine.fill(-1);
    events.push({ type: 'wave-complete' });
  }

  if (
    state.extraLifeIndex < EXTRA_LIFE_THRESHOLDS.length &&
    state.score >= EXTRA_LIFE_THRESHOLDS[state.extraLifeIndex]
  ) {
    state.lives += 1;
    state.extraLifeIndex += 1;
    events.push({ type: 'extra-life', message: 'Extra life!' });
  }

  state.highScore = updateHighScore(state.score, state.highScore);

  return { events };
};
