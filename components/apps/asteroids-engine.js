import rngApi from '../../apps/games/rng';
import {
  POWER_UPS,
  applyPowerUp,
  createBulletPool,
  spawnBullet,
  spawnPowerUp,
  sweptCircleCircleTorus,
  wrap,
} from './asteroids-utils';

const THRUST = 0.1;
const INERTIA = 0.99;
const COLLISION_COOLDOWN = 60;
const MULTIPLIER_TIMEOUT = 180;
const MAX_MULTIPLIER = 5;
const SHIELD_DURATION = 600;
export const SAFE_SPAWN_RADIUS = 120;
const MAX_UFO_BULLETS = 6;
const ASTEROID_VERTS = 9;
const ASTEROID_JITTER = 0.35;

const makeRng = (seed) => {
  rngApi.reset(seed);
  return { random: rngApi.random, reset: (s) => rngApi.reset(s ?? seed) };
};

const defaultRunSeed = (level, userSeed = 'asteroids') => `asteroids:${level}:${userSeed}`;

const createAsteroidShape = (radius, rng) => {
  const points = [];
  for (let i = 0; i < ASTEROID_VERTS; i += 1) {
    const theta = (i / ASTEROID_VERTS) * Math.PI * 2;
    const offset = (rng.random() * 2 - 1) * ASTEROID_JITTER;
    const r = radius * (1 + offset);
    points.push({ x: Math.cos(theta) * r, y: Math.sin(theta) * r });
  }
  return points;
};

export const createGame = ({ worldW, worldH, seed = 'asteroids', startLevel = 1, saveData }) => {
  const rng = makeRng(defaultRunSeed(startLevel, seed));
  const ship = {
    x: worldW / 2,
    y: worldH / 2,
    px: worldW / 2,
    py: worldH / 2,
    angle: 0,
    velX: 0,
    velY: 0,
    r: 10,
    cooldown: 0,
    shield: 0,
    rapidFire: 0,
    hitCooldown: 0,
  };

  const state = {
    rng,
    worldW,
    worldH,
    ship,
    lives: 3,
    score: 0,
    level: startLevel,
    extraLifeScore: 10000,
    bullets: createBulletPool(40).map((b) => ({ ...b, px: 0, py: 0 })),
    asteroids: [],
    ufo: { active: false, x: 0, y: 0, px: 0, py: 0, dx: 0, dy: 0, r: 15, cooldown: 0 },
    ufoBullets: [],
    powerUps: [],
    inventory: [],
    ufoTimer: 600,
    multiplier: 1,
    multiplierTimer: 0,
    waveBannerText: '',
    waveBannerTimer: 0,
    ghostData: saveData?.ghost || [],
    ghostIndex: 0,
    ghostShip: null,
    currentRun: [],
    upgrades: [...(saveData?.upgrades || [])],
    events: [],
    runSeed: seed,
  };

  state.ghostShip = state.ghostData.length
    ? { ...state.ghostData[0], px: state.ghostData[0].x, py: state.ghostData[0].y }
    : null;

  const startLevelFn = () => {
    rng.reset(defaultRunSeed(state.level, state.runSeed));
    state.asteroids.length = 0;
    spawnAsteroids(state, 3 + state.level * 2, 1 + state.level * 0.3);
    state.ufoTimer = Math.max(300, 900 - state.level * 60);
    state.waveBannerText = `Wave ${state.level}`;
    state.waveBannerTimer = 120;
    state.events.push({ type: 'banner', text: state.waveBannerText });
    applyUpgrades(state);
  };

  const applyUpgrades = () => {
    state.upgrades.forEach((u) => {
      if (u === POWER_UPS.SHIELD) state.ship.shield = SHIELD_DURATION;
      if (u === POWER_UPS.RAPID_FIRE) state.ship.rapidFire = 600;
    });
  };

  const spawnAsteroids = (gameState, count, speed) => {
    const { ship } = gameState;
    for (let i = 0; i < count; i += 1) {
      const angle = gameState.rng.random() * Math.PI * 2;
      const r = 15 + gameState.rng.random() * 25;
      let x = gameState.rng.random() * gameState.worldW;
      let y = gameState.rng.random() * gameState.worldH;
      let attempts = 0;
      while (
        attempts < 25 &&
        Math.hypot(x - ship.x, y - ship.y) < SAFE_SPAWN_RADIUS + r
      ) {
        x = gameState.rng.random() * gameState.worldW;
        y = gameState.rng.random() * gameState.worldH;
        attempts += 1;
      }
      gameState.asteroids.push({
        x,
        y,
        px: x,
        py: y,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        r,
        angle: gameState.rng.random() * Math.PI * 2,
        spin: (gameState.rng.random() * 2 - 1) * 0.02,
        shape: createAsteroidShape(r, gameState.rng),
      });
    }
  };

  state.startLevel = startLevelFn;
  startLevelFn();
  return state;
};

const storePrevious = (obj) => {
  obj.px = obj.x;
  obj.py = obj.y;
};

const wrapObject = (obj, w, h) => {
  obj.x = wrap(obj.x, w, obj.r);
  obj.y = wrap(obj.y, h, obj.r);
};

const applyShipInput = (ship, input, dtScale) => {
  ship.angle += input.turn * 0.05 * dtScale;
  if (input.thrust > 0) {
    ship.velX += Math.cos(ship.angle) * THRUST * input.thrust * dtScale;
    ship.velY += Math.sin(ship.angle) * THRUST * input.thrust * dtScale;
  }
  ship.velX *= INERTIA;
  ship.velY *= INERTIA;
};

const fireBullet = (state) => {
  const { ship } = state;
  if (ship.cooldown > 0) return null;
  const bullet = spawnBullet(
    state.bullets,
    ship.x + Math.cos(ship.angle) * 12,
    ship.y + Math.sin(ship.angle) * 12,
    Math.cos(ship.angle) * 6 + ship.velX,
    Math.sin(ship.angle) * 6 + ship.velY,
    60,
  );
  if (bullet) {
    bullet.px = bullet.x;
    bullet.py = bullet.y;
    ship.cooldown = ship.rapidFire > 0 ? 5 : 15;
  }
  return bullet;
};

const destroyAsteroid = (state, index) => {
  const a = state.asteroids[index];
  state.score += 100 * state.multiplier;
  state.multiplier = Math.min(state.multiplier + 1, MAX_MULTIPLIER);
  state.multiplierTimer = MULTIPLIER_TIMEOUT;
  if (a.r > 20) {
    for (let i = 0; i < 2; i += 1) {
      const angle = state.rng.random() * Math.PI * 2;
      const r = a.r / 2;
      state.asteroids.push({
        x: a.x,
        y: a.y,
        px: a.x,
        py: a.y,
        dx: Math.cos(angle) * 2,
        dy: Math.sin(angle) * 2,
        r,
        angle: state.rng.random() * Math.PI * 2,
        spin: (state.rng.random() * 2 - 1) * 0.03,
        shape: createAsteroidShape(r, state.rng),
      });
    }
  }
  state.asteroids.splice(index, 1);
  state.events.push({ type: 'asteroidDestroyed', x: a.x, y: a.y, r: a.r });
  if (state.rng.random() < 0.1) spawnPowerUp(state.powerUps, a.x, a.y, state.rng.random);
};

const destroyShip = (state) => {
  const { ship } = state;
  if (ship.hitCooldown > 0) return;
  if (ship.shield > 0) ship.shield = 0;
  else {
    state.lives -= 1;
    state.multiplier = 1;
    ship.x = state.worldW / 2;
    ship.y = state.worldH / 2;
    ship.velX = 0;
    ship.velY = 0;
    ship.angle = 0;
  }
  ship.hitCooldown = COLLISION_COOLDOWN;
  state.events.push({ type: 'shipHit', x: ship.x, y: ship.y });
  if (state.lives <= 0) {
    state.events.push({
      type: 'gameOver',
      score: state.score,
      ghostData: state.currentRun.slice(),
    });
  }
};

const destroyUfo = (state) => {
  state.ufo.active = false;
  state.score += 500 * state.multiplier;
  state.multiplier = Math.min(state.multiplier + 1, MAX_MULTIPLIER);
  state.multiplierTimer = MULTIPLIER_TIMEOUT;
  state.events.push({ type: 'ufoDestroyed', x: state.ufo.x, y: state.ufo.y });
};

const updateBulletsWithHistory = (state, dtScale) => {
  state.bullets.forEach((b) => {
    if (!b.active) return;
    storePrevious(b);
    b.x = wrap(b.x + b.dx * dtScale, state.worldW, b.r);
    b.y = wrap(b.y + b.dy * dtScale, state.worldH, b.r);
    b.life -= 1 * dtScale;
    if (b.life <= 0) b.active = false;
  });
};

const updateAsteroids = (state, dtScale) => {
  state.asteroids.forEach((a) => {
    storePrevious(a);
    a.x = wrap(a.x + a.dx * dtScale, state.worldW, a.r);
    a.y = wrap(a.y + a.dy * dtScale, state.worldH, a.r);
    a.angle += a.spin * dtScale;
  });
};

const updateUfoBullets = (state, dtScale) => {
  for (let i = state.ufoBullets.length - 1; i >= 0; i -= 1) {
    const b = state.ufoBullets[i];
    storePrevious(b);
    b.x += b.dx * dtScale;
    b.y += b.dy * dtScale;
    b.life -= 1 * dtScale;
    if (b.life <= 0) state.ufoBullets.splice(i, 1);
  }
};

const handleGhostPlayback = (state) => {
  if (state.ghostShip && state.ghostIndex < state.ghostData.length) {
    const g = state.ghostData[state.ghostIndex];
    state.ghostShip.px = state.ghostShip.x;
    state.ghostShip.py = state.ghostShip.y;
    state.ghostShip.x = g.x;
    state.ghostShip.y = g.y;
    state.ghostShip.angle = g.angle;
    state.ghostIndex += 1;
  }
};

const handleShipCollisions = (state) => {
  const { ship } = state;
  state.asteroids.forEach((a) => {
    const { hit } = sweptCircleCircleTorus(ship, a, state.worldW, state.worldH);
    if (hit) destroyShip(state);
  });

  if (state.ufo.active) {
    const { hit } = sweptCircleCircleTorus(ship, state.ufo, state.worldW, state.worldH);
    if (hit) destroyShip(state);
  }

  state.ufoBullets.forEach((b) => {
    const { hit } = sweptCircleCircleTorus(ship, b, state.worldW, state.worldH);
    if (hit) destroyShip(state);
  });
};

const handleBulletCollisions = (state) => {
  state.bullets.forEach((b) => {
    if (!b.active) return;
    let bestHit = null;
    let asteroidIndex = -1;
    state.asteroids.forEach((a, i) => {
      const result = sweptCircleCircleTorus(b, a, state.worldW, state.worldH);
      if (result.hit) {
        if (bestHit == null || result.t < bestHit) {
          bestHit = result.t;
          asteroidIndex = i;
        }
      }
    });
    if (state.ufo.active) {
      const result = sweptCircleCircleTorus(b, state.ufo, state.worldW, state.worldH);
      if (result.hit && (bestHit == null || result.t < bestHit)) {
        destroyUfo(state);
        b.active = false;
        return;
      }
    }
    if (asteroidIndex >= 0) {
      destroyAsteroid(state, asteroidIndex);
      b.active = false;
    }
  });
};

const handlePowerUps = (state) => {
  for (let i = state.powerUps.length - 1; i >= 0; i -= 1) {
    const p = state.powerUps[i];
    p.life -= 1;
    const { hit } = sweptCircleCircleTorus(state.ship, p, state.worldW, state.worldH);
    if (hit) {
      state.inventory.push(p.type);
      state.events.push({ type: 'inventory', inventory: [...state.inventory] });
      state.powerUps.splice(i, 1);
    } else if (p.life <= 0) {
      state.powerUps.splice(i, 1);
    }
  }
};

const handleUfoLogic = (state, dtScale) => {
  const { ufo, rng, ship } = state;
  if (ufo.active) {
    storePrevious(ufo);
    ufo.x += ufo.dx * dtScale;
    ufo.y += ufo.dy * dtScale;
    ufo.cooldown -= 1 * dtScale;
    if (ufo.cooldown <= 0) {
      const angle = Math.atan2(ship.y - ufo.y, ship.x - ufo.x);
      if (state.ufoBullets.length < MAX_UFO_BULLETS) {
        state.ufoBullets.push({
          x: ufo.x,
          y: ufo.y,
          px: ufo.x,
          py: ufo.y,
          dx: Math.cos(angle) * 3,
          dy: Math.sin(angle) * 3,
          r: 2,
          life: 120,
        });
      }
      ufo.cooldown = 90;
    }
    if (ufo.x < -50 || ufo.x > state.worldW + 50) ufo.active = false;
  } else if ((state.ufoTimer -= 1 * dtScale) <= 0) {
    ufo.active = true;
    ufo.y = rng.random() * state.worldH;
    ufo.x = rng.random() < 0.5 ? -20 : state.worldW + 20;
    ufo.dx = ufo.x < 0 ? 1.5 : -1.5;
    ufo.dy = 0;
    ufo.cooldown = 90;
    state.ufoTimer = Math.max(300, 900 - state.level * 60);
  }
};

export const tick = (state, input, dt = 16) => {
  if (!state || state.events.find((e) => e.type === 'gameOver')) return state;
  const dtScale = dt / 16;
  state.events.length = 0;
  const { ship } = state;
  storePrevious(ship);
  applyShipInput(ship, input, dtScale);
  ship.x += ship.velX * dtScale;
  ship.y += ship.velY * dtScale;
  wrapObject(ship, state.worldW, state.worldH);
  ship.thrusting = input.thrust > 0;
  state.currentRun.push({ x: ship.x, y: ship.y, angle: ship.angle });
  ship.cooldown = Math.max(0, ship.cooldown - 1 * dtScale);
  ship.rapidFire = Math.max(0, ship.rapidFire - 1 * dtScale);
  ship.shield = Math.max(0, ship.shield - 1 * dtScale);
  ship.hitCooldown = Math.max(0, ship.hitCooldown - 1 * dtScale);

  if (input.fire) fireBullet(state);
  if (input.hyperspace) {
    ship.x = state.rng.random() * state.worldW;
    ship.y = state.rng.random() * state.worldH;
    if (state.rng.random() < 0.1) destroyShip(state);
    wrapObject(ship, state.worldW, state.worldH);
  }

  if (state.multiplierTimer > 0) state.multiplierTimer -= 1 * dtScale;
  else state.multiplier = 1;
  if (state.waveBannerTimer > 0) state.waveBannerTimer -= 1 * dtScale;

  updateBulletsWithHistory(state, dtScale);
  updateAsteroids(state, dtScale);
  handleUfoLogic(state, dtScale);
  updateUfoBullets(state, dtScale);
  handleGhostPlayback(state);

  handleBulletCollisions(state);
  handleShipCollisions(state);
  handlePowerUps(state);

  state.powerUps.forEach((p) => {
    storePrevious(p);
  });

  if (state.score >= state.extraLifeScore) {
    state.lives += 1;
    state.extraLifeScore += 10000;
    state.events.push({ type: 'lives', lives: state.lives });
  }

  if (!state.asteroids.length) {
    state.level += 1;
    state.events.push({ type: 'level', level: state.level });
    state.startLevel();
  }

  if (input.useInventory != null) {
    const idx = input.useInventory;
    if (state.inventory[idx]) {
      state.lives = applyPowerUp({ type: state.inventory[idx] }, state.ship, state.lives, SHIELD_DURATION, 600);
      state.inventory.splice(idx, 1);
      state.events.push({ type: 'inventory', inventory: [...state.inventory] });
    }
  }

  state.events.push({
    type: 'hud',
    score: state.score,
    multiplier: state.multiplier,
    lives: state.lives,
  });

  return state;
};

export const resize = (state, worldW, worldH) => {
  state.worldW = worldW;
  state.worldH = worldH;
};
