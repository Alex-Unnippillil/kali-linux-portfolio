function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export type PowerUpType = 'shield' | 'rapid' | 'life';

export type GameEvent =
  | { type: 'shoot'; who: 'player' | 'enemy' }
  | { type: 'hit'; target: 'invader' | 'bunker' | 'player' | 'ufo' | 'boss' }
  | { type: 'powerup_spawn'; power: PowerUpType }
  | { type: 'powerup_pickup'; power: PowerUpType }
  | { type: 'stage_clear'; stage: number }
  | { type: 'game_over' };

export interface InputState {
  left: boolean;
  right: boolean;
  fire: boolean;
  pausePressed?: boolean;
}

export interface Bullet {
  active: boolean;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  owner: 'player' | 'enemy';
}

export interface Invader {
  alive: boolean;
  col: number;
  row: number;
}

export interface BunkerTile {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
}

export interface Player {
  x: number;
  y: number;
  w: number;
  h: number;
  cooldownMs: number;
  shieldHp: number;
  rapidMs: number;
  lives: number;
}

export interface GameState {
  width: number;
  height: number;
  seed: string;

  stage: number;
  score: number;

  player: Player;
  invaders: Invader[];

  formationX: number;
  formationY: number;
  formationDir: -1 | 1;
  stepTimerMs: number;
  waveTimeMs: number;

  bullets: Bullet[];
  bunkers: BunkerTile[];

  powerUps: { x: number; y: number; type: PowerUpType; active: boolean }[];

  ufo: { active: boolean; x: number; y: number; dir: -1 | 1; timerMs: number };
  boss?: { active: boolean; x: number; y: number; w: number; h: number; hp: number; cooldownMs: number; dir: -1 | 1 };

  enemyShootCooldownMs: number;

  rng: { next: () => number; chance: (p: number) => boolean; randInt: (n: number) => number };
}

const POWERUP_CONFIG = {
  dropChance: 0.1,
  maxOnScreen: 3,
  weights: { shield: 0.45, rapid: 0.45, life: 0.1 } as Record<PowerUpType, number>,
  caps: {
    shieldHp: 3,
    rapidMs: 8000,
    lives: 9,
  },
};

const INVADER_COLS = 8;
const INVADER_ROWS = 5;
const INVADER_SPACING = 30;
const INVADER_WIDTH = 20;
const INVADER_HEIGHT = 16;
const FORMATION_LEFT_PADDING = 40;
const FORMATION_TOP_PADDING = 40;
const FORMATION_STEP_PX = 10;
const FORMATION_STEP_DOWN_PX = 14;
const BASE_INTERVAL_MS = 650;
const MIN_INTERVAL_MS = 90;
const MAX_INTERVAL_MS = 900;

const PLAYER_SPEED = 140;
const PLAYER_COOLDOWN_MS = 400;
const PLAYER_RAPID_COOLDOWN_MS = 150;
const PLAYER_BULLET_SPEED = -260;
const ENEMY_BULLET_SPEED = 180;
const ENEMY_COOLDOWN_BASE = 1200;

const POWERUP_FALL_SPEED = 40;
const UFO_INTERVAL_MS = 15000;

const INVADER_SCORE = 10;
const UFO_SCORE = 50;
const BOSS_SCORE = 200;

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function xmur3inner(): number {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(a: number): () => number {
  return function mulberryInner(): number {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createRng(seed: string) {
  const seedFunc = xmur3(seed);
  const rand = mulberry32(seedFunc());
  return {
    next: rand,
    chance(p: number) {
      return rand() < p;
    },
    randInt(n: number) {
      return Math.floor(rand() * n);
    },
  };
}

function createInvaders(rows: number, cols: number): Invader[] {
  const inv: Invader[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      inv.push({ alive: true, col: c, row: r });
    }
  }
  return inv;
}

function createBunkers(width: number, height: number): BunkerTile[] {
  const positions = [width * 0.2 - 20, width * 0.5 - 20, width * 0.8 - 20];
  const tiles: BunkerTile[] = [];
  const size = 10;
  positions.forEach((baseX) => {
    for (let r = 0; r < 2; r += 1) {
      for (let c = 0; c < 4; c += 1) {
        tiles.push({ x: baseX + c * size, y: height - 60 + r * size, w: size, h: size, hp: 3 });
      }
    }
  });
  return tiles;
}

function createPlayer(width: number, height: number): Player {
  const w = 20;
  const h = 12;
  return {
    x: width / 2 - w / 2,
    y: height - 30,
    w,
    h,
    cooldownMs: 0,
    shieldHp: 0,
    rapidMs: 0,
    lives: 3,
  };
}

function initialFormationX(width: number) {
  const formationWidth = (INVADER_COLS - 1) * INVADER_SPACING + INVADER_WIDTH;
  return width / 2 - formationWidth / 2 - FORMATION_LEFT_PADDING / 2;
}

export function createGame({ width, height, seed = 'space-seed' }: { width: number; height: number; seed?: string }): GameState {
  const rng = createRng(seed);
  return {
    width,
    height,
    seed,
    stage: 1,
    score: 0,
    player: createPlayer(width, height),
    invaders: createInvaders(INVADER_ROWS, INVADER_COLS),
    formationX: initialFormationX(width),
    formationY: FORMATION_TOP_PADDING,
    formationDir: 1,
    stepTimerMs: 0,
    waveTimeMs: 0,
    bullets: [],
    bunkers: createBunkers(width, height),
    powerUps: [],
    ufo: { active: false, x: 0, y: 15, dir: 1, timerMs: UFO_INTERVAL_MS },
    boss: undefined,
    enemyShootCooldownMs: ENEMY_COOLDOWN_BASE,
    rng,
  };
}

export function invaderWorldPosition(state: GameState, invader: Invader) {
  return {
    x: state.formationX + FORMATION_LEFT_PADDING + invader.col * INVADER_SPACING,
    y: state.formationY + FORMATION_TOP_PADDING + invader.row * INVADER_SPACING,
    w: INVADER_WIDTH,
    h: INVADER_HEIGHT,
  };
}

function aliveInvaders(state: GameState) {
  return state.invaders.filter((i) => i.alive);
}

function getFormationBounds(state: GameState) {
  const alive = aliveInvaders(state);
  if (!alive.length) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  alive.forEach((inv) => {
    const pos = invaderWorldPosition(state, inv);
    minX = Math.min(minX, pos.x);
    maxX = Math.max(maxX, pos.x + pos.w);
    minY = Math.min(minY, pos.y);
    maxY = Math.max(maxY, pos.y + pos.h);
  });
  return { minX, maxX, minY, maxY };
}

function weightedPick(rng: { next: () => number }, weights: Record<PowerUpType, number>): PowerUpType {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  const r = rng.next() * total;
  let acc = 0;
  const keys = Object.keys(weights) as PowerUpType[];
  for (const key of keys) {
    acc += weights[key];
    if (r <= acc) return key;
  }
  return keys[keys.length - 1];
}

function spawnPowerUp(state: GameState, x: number, y: number, power?: PowerUpType, events: GameEvent[] = []) {
  if (state.powerUps.filter((p) => p.active).length >= POWERUP_CONFIG.maxOnScreen) return;
  const type = power ?? weightedPick(state.rng, POWERUP_CONFIG.weights);
  state.powerUps.push({ x, y, type, active: true });
  events.push({ type: 'powerup_spawn', power: type });
}

function applyPowerUp(state: GameState, power: PowerUpType, events: GameEvent[]) {
  const player = state.player;
  if (power === 'shield') {
    player.shieldHp = Math.min(player.shieldHp + 1, POWERUP_CONFIG.caps.shieldHp);
  } else if (power === 'rapid') {
    player.rapidMs = Math.min(player.rapidMs + 2000, POWERUP_CONFIG.caps.rapidMs);
  } else if (power === 'life') {
    player.lives = Math.min(player.lives + 1, POWERUP_CONFIG.caps.lives);
  }
  events.push({ type: 'powerup_pickup', power });
}

function deactivateBullet(bullet: Bullet) {
  bullet.active = false;
  bullet.vx = 0;
  bullet.vy = 0;
}

function segmentAabb(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  box: { x: number; y: number; w: number; h: number },
): number | null {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  const axes = [
    { start: x1, dir: dx, min: box.x, max: box.x + box.w },
    { start: y1, dir: dy, min: box.y, max: box.y + box.h },
  ];
  for (const axis of axes) {
    if (Math.abs(axis.dir) < 1e-6) {
      if (axis.start < axis.min || axis.start > axis.max) return null;
      continue;
    }
    const t1 = (axis.min - axis.start) / axis.dir;
    const t2 = (axis.max - axis.start) / axis.dir;
    const tNear = Math.min(t1, t2);
    const tFar = Math.max(t1, t2);
    tmin = Math.max(tmin, tNear);
    tmax = Math.min(tmax, tFar);
    if (tmin > tmax) return null;
  }
  return tmin >= 0 && tmin <= 1 ? tmin : null;
}

function chooseCollision(
  owner: Bullet['owner'],
  collisions: { t: number; type: GameEvent['type'] | 'invader' | 'ufo' | 'boss' | 'player'; data: any }[],
) {
  if (!collisions.length) return null;
  const priority = owner === 'player' ? ['bunker', 'invader', 'ufo', 'boss'] : ['bunker', 'player'];
  collisions.sort((a, b) => {
    if (a.t === b.t) {
      const pa = priority.indexOf(a.type as string);
      const pb = priority.indexOf(b.type as string);
      return pa - pb;
    }
    return a.t - b.t;
  });
  return collisions[0];
}

function handleInvaderDeath(state: GameState, invader: Invader, events: GameEvent[]) {
  invader.alive = false;
  state.score += INVADER_SCORE;
  if (
    state.powerUps.filter((p) => p.active).length < POWERUP_CONFIG.maxOnScreen &&
    state.rng.chance(POWERUP_CONFIG.dropChance)
  ) {
    const pos = invaderWorldPosition(state, invader);
    spawnPowerUp(state, pos.x + INVADER_WIDTH / 2, pos.y, undefined, events);
  }
  events.push({ type: 'hit', target: 'invader' });
}

function resetStage(state: GameState, nextStage: number) {
  state.stage = nextStage;
  state.invaders = createInvaders(INVADER_ROWS, INVADER_COLS);
  state.formationX = initialFormationX(state.width);
  state.formationY = FORMATION_TOP_PADDING;
  state.formationDir = 1;
  state.stepTimerMs = 0;
  state.waveTimeMs = 0;
  state.bullets = [];
  state.powerUps = [];
  state.bunkers = createBunkers(state.width, state.height);
  state.enemyShootCooldownMs = ENEMY_COOLDOWN_BASE;
}

function moveFormation(state: GameState, dtMs: number) {
  const alive = aliveInvaders(state);
  if (!alive.length) return;
  const aliveRatio = alive.length / (INVADER_ROWS * INVADER_COLS);
  const bounds = getFormationBounds(state);
  const descent = bounds.maxY / state.height;
  const timeFactor = 1 + state.waveTimeMs * 0.00005;
  const intervalMs = clamp(
    (BASE_INTERVAL_MS * aliveRatio) / ((state.stage || 1) * (1 + descent) * timeFactor),
    MIN_INTERVAL_MS,
    MAX_INTERVAL_MS,
  );
  state.stepTimerMs += dtMs;
  while (state.stepTimerMs >= intervalMs) {
    state.stepTimerMs -= intervalMs;
    const newX = state.formationX + state.formationDir * FORMATION_STEP_PX;
    const newBounds = {
      minX: bounds.minX + state.formationDir * FORMATION_STEP_PX,
      maxX: bounds.maxX + state.formationDir * FORMATION_STEP_PX,
    };
    if (newBounds.minX < 0 || newBounds.maxX > state.width) {
      state.formationDir *= -1 as -1 | 1;
      state.formationY += FORMATION_STEP_DOWN_PX;
      state.formationX += state.formationDir * FORMATION_STEP_PX;
    } else {
      state.formationX = newX;
    }
  }
}

function spawnPlayerBullet(state: GameState, x: number, y: number, events: GameEvent[]) {
  state.bullets.push({
    active: true,
    x,
    y,
    prevX: x,
    prevY: y,
    vx: 0,
    vy: PLAYER_BULLET_SPEED,
    owner: 'player',
  });
  events.push({ type: 'shoot', who: 'player' });
}

function spawnEnemyBullet(state: GameState, x: number, y: number, events: GameEvent[]) {
  state.bullets.push({
    active: true,
    x,
    y,
    prevX: x,
    prevY: y,
    vx: 0,
    vy: ENEMY_BULLET_SPEED,
    owner: 'enemy',
  });
  events.push({ type: 'shoot', who: 'enemy' });
}

function maybeEnemyShoot(state: GameState, events: GameEvent[], dtMs: number) {
  if (state.boss?.active) return;
  state.enemyShootCooldownMs -= dtMs;
  if (state.enemyShootCooldownMs > 0) return;
  const alive = aliveInvaders(state);
  if (!alive.length) return;
  const inv = alive[state.rng.randInt(alive.length)];
  const pos = invaderWorldPosition(state, inv);
  spawnEnemyBullet(state, pos.x + INVADER_WIDTH / 2, pos.y + INVADER_HEIGHT, events);
  state.enemyShootCooldownMs = ENEMY_COOLDOWN_BASE / Math.max(1, state.stage * 0.5);
}

export function step(state: GameState, input: InputState, dtMs: number): GameEvent[] {
  const events: GameEvent[] = [];
  const dt = dtMs / 1000;
  state.waveTimeMs += dtMs;
  const player = state.player;

  player.cooldownMs = Math.max(0, player.cooldownMs - dtMs);
  if (player.rapidMs > 0) player.rapidMs = Math.max(0, player.rapidMs - dtMs);

  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  player.x += dir * PLAYER_SPEED * dt;
  player.x = clamp(player.x, 0, state.width - player.w);

  if (input.fire && player.cooldownMs === 0) {
    spawnPlayerBullet(state, player.x + player.w / 2, player.y, events);
    player.cooldownMs = player.rapidMs > 0 ? PLAYER_RAPID_COOLDOWN_MS : PLAYER_COOLDOWN_MS;
  }

  moveFormation(state, dtMs);
  maybeEnemyShoot(state, events, dtMs);

  state.ufo.timerMs -= dtMs;
  if (state.ufo.timerMs <= 0 && !state.ufo.active) {
    state.ufo.active = true;
    state.ufo.x = state.width;
    state.ufo.dir = -1;
    state.ufo.timerMs = UFO_INTERVAL_MS;
  }
  if (state.ufo.active) {
    state.ufo.x += state.ufo.dir * 60 * dt;
    if (state.ufo.x < -30 || state.ufo.x > state.width + 30) {
      state.ufo.active = false;
    }
  }

  state.powerUps.forEach((p) => {
    if (!p.active) return;
    p.y += POWERUP_FALL_SPEED * dt;
    if (p.y > state.height) p.active = false;
    if (
      p.active &&
      p.x >= player.x &&
      p.x <= player.x + player.w &&
      p.y >= player.y &&
      p.y <= player.y + player.h
    ) {
      p.active = false;
      applyPowerUp(state, p.type, events);
    }
  });
  state.powerUps = state.powerUps.filter((p) => p.active);

  state.bullets.forEach((b) => {
    b.prevX = b.x;
    b.prevY = b.y;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  });

  state.bullets.forEach((b) => {
    if (!b.active) return;
    if (b.x < -10 || b.x > state.width + 10 || b.y < -20 || b.y > state.height + 20) {
      deactivateBullet(b);
      return;
    }
    const collisions: { t: number; type: any; data: any }[] = [];
    state.bunkers.forEach((tile) => {
      const t = segmentAabb(b.prevX, b.prevY, b.x, b.y, tile);
      if (t !== null) collisions.push({ t, type: 'bunker', data: tile });
    });

    if (b.owner === 'player') {
      state.invaders.forEach((inv) => {
        if (!inv.alive) return;
        const pos = invaderWorldPosition(state, inv);
        const t = segmentAabb(b.prevX, b.prevY, b.x, b.y, pos);
        if (t !== null) collisions.push({ t, type: 'invader', data: inv });
      });
      if (state.ufo.active) {
        const box = { x: state.ufo.x, y: state.ufo.y, w: 30, h: 15 };
        const t = segmentAabb(b.prevX, b.prevY, b.x, b.y, box);
        if (t !== null) collisions.push({ t, type: 'ufo', data: null });
      }
      if (state.boss?.active) {
        const box = { x: state.boss.x, y: state.boss.y, w: state.boss.w, h: state.boss.h };
        const t = segmentAabb(b.prevX, b.prevY, b.x, b.y, box);
        if (t !== null) collisions.push({ t, type: 'boss', data: state.boss });
      }
    } else {
      const box = { x: player.x, y: player.y, w: player.w, h: player.h };
      const t = segmentAabb(b.prevX, b.prevY, b.x, b.y, box);
      if (t !== null) collisions.push({ t, type: 'player', data: player });
    }

    const chosen = chooseCollision(b.owner, collisions);
    if (!chosen) return;
    if (chosen.type === 'bunker') {
      const tile = chosen.data as BunkerTile;
      tile.hp -= 1;
      if (tile.hp <= 0) {
        state.bunkers = state.bunkers.filter((t) => t !== tile);
      }
      deactivateBullet(b);
      events.push({ type: 'hit', target: 'bunker' });
      return;
    }
    if (b.owner === 'player' && chosen.type === 'invader') {
      handleInvaderDeath(state, chosen.data as Invader, events);
      deactivateBullet(b);
      return;
    }
    if (b.owner === 'player' && chosen.type === 'ufo') {
      state.score += UFO_SCORE;
      state.ufo.active = false;
      events.push({ type: 'hit', target: 'ufo' });
      deactivateBullet(b);
      return;
    }
    if (b.owner === 'player' && chosen.type === 'boss' && state.boss) {
      state.boss.hp -= 1;
      events.push({ type: 'hit', target: 'boss' });
      if (state.boss.hp <= 0) {
        state.score += BOSS_SCORE;
        state.boss.active = false;
      }
      deactivateBullet(b);
      return;
    }
    if (b.owner === 'enemy' && chosen.type === 'player') {
      if (player.shieldHp > 0) {
        player.shieldHp -= 1;
      } else {
        player.lives -= 1;
        events.push({ type: 'hit', target: 'player' });
        if (player.lives <= 0) events.push({ type: 'game_over' });
      }
      deactivateBullet(b);
    }
  });

  const invAlive = aliveInvaders(state);
  if (!invAlive.length && !state.boss?.active) {
    events.push({ type: 'stage_clear', stage: state.stage });
    resetStage(state, state.stage + 1);
  }

  return events;
}

