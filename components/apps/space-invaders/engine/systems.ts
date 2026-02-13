import { createInvaders, createShields } from './state';
import { Rng } from './rng';
import { Bullet, EngineEvent, GameState, InputSnapshot, Invader, Shield } from './types';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const intersects = (
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

const activeInvaders = (state: GameState) => state.invaders.filter((invader) => invader.alive);

export const updatePlayer = (
  state: GameState,
  input: InputSnapshot,
  dtMs: number,
  allowMultiShot: boolean,
) => {
  const dt = dtMs / 1000;
  const moveDir = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  state.player.x = clamp(
    state.player.x + moveDir * state.player.speed * dt,
    6,
    state.width - state.player.w - 6,
  );

  state.player.fireCooldown = Math.max(0, state.player.fireCooldown - dtMs);
  const activeShots = state.playerBullets.filter((bullet) => bullet.active).length;
  const shotCap = allowMultiShot ? 3 : 1;

  if (input.fire && state.player.fireCooldown <= 0 && activeShots < shotCap) {
    state.playerBullets.push({
      x: state.player.x + state.player.w / 2 - 1,
      y: state.player.y - 8,
      w: 2,
      h: 7,
      vy: -300,
      owner: 'player',
      active: true,
    });
    state.player.fireCooldown = allowMultiShot ? 180 : 350;
  }
};

export const updateInvaders = (state: GameState, dtMs: number) => {
  const alive = activeInvaders(state);
  if (alive.length === 0) return;

  const aliveRatio = alive.length / state.invaders.length;
  state.invaderMoveMs = Math.max(70, 620 * aliveRatio * (1 - Math.min(0.45, (state.level - 1) * 0.08)));
  state.invaderStepProgressMs += dtMs;

  if (state.invaderStepProgressMs < state.invaderMoveMs) return;
  state.invaderStepProgressMs = 0;

  let hitEdge = false;
  for (const invader of alive) {
    invader.x += state.invaderDir * 10;
    if (invader.x <= 8 || invader.x + invader.w >= state.width - 8) {
      hitEdge = true;
    }
  }

  if (hitEdge) {
    state.invaderDir = state.invaderDir === 1 ? -1 : 1;
    for (const invader of alive) {
      invader.y += 12;
    }
  }
};

const damageShield = (shield: Shield, x: number, y: number) => {
  const segmentWidth = 72 / shield.cols;
  const segmentHeight = 24 / shield.rows;
  const localX = x - shield.x;
  const localY = y - shield.y;
  if (localX < 0 || localY < 0 || localX > 72 || localY > 24) return false;

  const col = clamp(Math.floor(localX / segmentWidth), 0, shield.cols - 1);
  const row = clamp(Math.floor(localY / segmentHeight), 0, shield.rows - 1);
  const index = row * shield.cols + col;
  if (shield.segments[index] <= 0) return false;

  shield.segments[index] = Math.max(0, shield.segments[index] - 1);
  return true;
};

const moveBullet = (bullet: Bullet, dtMs: number) => {
  if (!bullet.active) return;
  bullet.y += bullet.vy * (dtMs / 1000);
};

const getInvaderShooters = (invaders: Invader[]) => {
  const byColumn = new Map<number, Invader>();
  for (const invader of invaders) {
    if (!invader.alive) continue;
    const current = byColumn.get(invader.col);
    if (!current || current.y < invader.y) {
      byColumn.set(invader.col, invader);
    }
  }
  return [...byColumn.values()];
};

export const maybeShoot = (state: GameState, dtMs: number, rng: Rng) => {
  state.alienShootCooldownMs -= dtMs;
  if (state.alienShootCooldownMs > 0) return;

  const alive = activeInvaders(state);
  const currentEnemyShots = state.invaderBullets.filter((b) => b.active).length;
  const maxEnemyShots = Math.min(5, 2 + Math.floor(state.level / 2));
  if (alive.length === 0 || currentEnemyShots >= maxEnemyShots) {
    state.alienShootCooldownMs = 120;
    return;
  }

  const shooters = getInvaderShooters(alive);
  if (shooters.length === 0) return;
  const pick = shooters[Math.floor(rng.next() * shooters.length) % shooters.length];

  state.invaderBullets.push({
    x: pick.x + pick.w / 2,
    y: pick.y + pick.h,
    w: 2,
    h: 7,
    vy: 220 + state.level * 8,
    owner: 'invader',
    active: true,
  });

  const invaderPressure = 1 - alive.length / state.invaders.length;
  state.alienShootCooldownMs = Math.max(140, 900 - invaderPressure * 500 - state.level * 30);
};

export const updateUfo = (state: GameState, dtMs: number, rng: Rng) => {
  if (!state.ufo.active) {
    if (rng.next() < dtMs / 14000) {
      state.ufo.active = true;
      state.ufo.vx = rng.next() > 0.5 ? 80 : -80;
      state.ufo.x = state.ufo.vx > 0 ? -state.ufo.w : state.width + state.ufo.w;
      state.ufo.value = [50, 100, 150, 300][Math.floor(rng.next() * 4)] ?? 100;
    }
    return;
  }

  state.ufo.x += state.ufo.vx * (dtMs / 1000);
  if (state.ufo.x > state.width + 40 || state.ufo.x < -40) {
    state.ufo.active = false;
  }
};

export const resolveCollisions = (state: GameState, dtMs: number, events: EngineEvent[]) => {
  for (const bullet of state.playerBullets) {
    if (!bullet.active) continue;
    moveBullet(bullet, dtMs);

    if (bullet.y < -20) {
      bullet.active = false;
      continue;
    }

    const hitInvader = state.invaders.find(
      (invader) => invader.alive && intersects(bullet, invader),
    );
    if (hitInvader) {
      hitInvader.alive = false;
      bullet.active = false;
      state.score += hitInvader.points;
      events.push({ type: 'invader-hit', points: hitInvader.points });
      continue;
    }

    if (state.ufo.active && intersects(bullet, state.ufo)) {
      bullet.active = false;
      state.ufo.active = false;
      state.score += state.ufo.value;
      events.push({ type: 'ufo-hit', points: state.ufo.value });
      continue;
    }

    for (const shield of state.shields) {
      if (damageShield(shield, bullet.x, bullet.y)) {
        bullet.active = false;
        events.push({ type: 'shield-hit' });
        break;
      }
    }
  }

  for (const bullet of state.invaderBullets) {
    if (!bullet.active) continue;
    moveBullet(bullet, dtMs);

    if (bullet.y > state.height + 20) {
      bullet.active = false;
      continue;
    }

    for (const shield of state.shields) {
      if (damageShield(shield, bullet.x, bullet.y)) {
        bullet.active = false;
        events.push({ type: 'shield-hit' });
        break;
      }
    }

    if (!bullet.active) continue;
    if (state.player.respawnGraceMs <= 0 && intersects(bullet, state.player)) {
      bullet.active = false;
      state.lives -= 1;
      state.player.respawnGraceMs = 1100;
      events.push({ type: 'player-hit' });
      if (state.lives <= 0) {
        state.phase = 'gameover';
        state.gameOverReason = 'No lives remaining';
        events.push({ type: 'game-over' });
      }
    }
  }

  state.playerBullets = state.playerBullets.filter((bullet) => bullet.active);
  state.invaderBullets = state.invaderBullets.filter((bullet) => bullet.active);
};

export const applyProgression = (state: GameState, events: EngineEvent[]) => {
  const alive = activeInvaders(state);
  if (alive.length === 0) {
    state.level += 1;
    state.invaders = createInvaders(state.width, state.level);
    state.shields = createShields(state.width, state.height);
    state.invaderDir = 1;
    state.invaderStepProgressMs = 0;
    state.playerBullets = [];
    state.invaderBullets = [];
    events.push({ type: 'level-clear' });
  }

  for (const invader of activeInvaders(state)) {
    if (invader.y + invader.h >= state.player.y) {
      state.phase = 'gameover';
      state.gameOverReason = 'Invaders breached defense line';
      events.push({ type: 'game-over' });
      break;
    }
  }
};
