export const POWER_UPS = {
  SHIELD: 'shield',
  RAPID_FIRE: 'rapid-fire',
  EXTRA_LIFE: 'extra-life',
};

export function wrap(value, max, margin = 0) {
  const range = max + margin * 2;
  let m = (value + margin) % range;
  if (m < 0) m += range;
  return m - margin;
}

export function createBulletPool(size) {
  const pool = Array.from({ length: size }, () => ({
    active: false,
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,
    r: 2,
    life: 0,
  }));
  return pool;
}

export function spawnBullet(pool, x, y, dx, dy, life = 60) {
  for (const b of pool) {
    if (!b.active) {
      b.active = true;
      b.x = x;
      b.y = y;
      b.dx = dx;
      b.dy = dy;
      b.life = life;
      return b;
    }
  }
  return null;
}

export function updateBullets(pool) {
  for (const b of pool) {
    if (!b.active) continue;
    b.x += b.dx;
    b.y += b.dy;
    b.life -= 1;
    if (b.life <= 0) b.active = false;
  }
}

export function splitAsteroidTree(size, min = 20) {
  const node = { size, children: [] };
  if (size > min) {
    const childSize = size / 2;
    node.children.push(splitAsteroidTree(childSize, min));
    node.children.push(splitAsteroidTree(childSize, min));
  }
  return node;
}

export function createGA(handler) {
  const events = [];
  const emit = (type, payload) => {
    events.push({ type, payload });
    if (handler) handler(type, payload);
  };
  return {
    events,
    start: () => emit('start'),
    split: (size) => emit('split', size),
    death: () => emit('death'),
    level_up: () => emit('level_up'),
  };
}

export function spawnPowerUp(list, x, y, rng = Math.random) {
  const types = Object.values(POWER_UPS);
  const type = types[Math.floor(rng() * types.length)];
  list.push({ type, x, y, px: x, py: y, r: 12, life: 600 });
}

export function applyPowerUp(powerUp, ship, lives, shieldDuration = 600, rapidFireDuration = 600) {
  switch (powerUp.type) {
    case POWER_UPS.SHIELD:
      ship.shield = shieldDuration;
      break;
    case POWER_UPS.RAPID_FIRE:
      ship.rapidFire = rapidFireDuration;
      break;
    case POWER_UPS.EXTRA_LIFE:
      lives += 1;
      break;
    default:
      break;
  }
  return lives;
}

// Manage simple inventory of collected power-ups
export function addToInventory(inv, type) {
  inv.push(type);
}

export function useInventory(
  inv,
  index,
  ship,
  lives,
  shieldDuration = 600,
  rapidFireDuration = 600,
) {
  if (index < 0 || index >= inv.length) return lives;
  const type = inv.splice(index, 1)[0];
  return applyPowerUp({ type }, ship, lives, shieldDuration, rapidFireDuration);
}

export function updatePowerUps(list) {
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const p = list[i];
    p.life -= 1;
    if (p.life <= 0) list.splice(i, 1);
  }
}

// Simple seeded RNG using Mulberry32 algorithm
export function createSeededRNG(seed) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Apply basic physics and wrapping for a ship object
export function updateShipPosition(ship, width, height) {
  ship.x = wrap(ship.x + ship.velX, width, ship.r);
  ship.y = wrap(ship.y + ship.velY, height, ship.r);
}

// Handle collision between a single bullet and list of asteroids
export function handleBulletAsteroidCollision(asteroids, bullet) {
  for (let i = asteroids.length - 1; i >= 0; i -= 1) {
    const a = asteroids[i];
    const dist = Math.hypot(a.x - bullet.x, a.y - bullet.y);
    if (dist < a.r + bullet.r) {
      if (a.r > 20) {
        const nr = a.r / 2;
        asteroids.splice(i, 1, {
          x: a.x,
          y: a.y,
          dx: a.dx,
          dy: a.dy,
          r: nr,
        });
        asteroids.push({
          x: a.x,
          y: a.y,
          dx: -a.dx,
          dy: -a.dy,
          r: nr,
        });
      } else {
        asteroids.splice(i, 1);
      }
      bullet.active = false;
      return true;
    }
  }
  return false;
}

export function torusDelta(a, b, size) {
  let delta = (a - b) % size;
  if (delta < -size / 2) delta += size;
  else if (delta >= size / 2) delta -= size;
  return delta;
}

export function unwrapDelta(prev, next, size) {
  let adjusted = next;
  const diff = adjusted - prev;
  if (diff > size / 2) adjusted -= size;
  else if (diff < -size / 2) adjusted += size;
  return adjusted;
}

export function segmentCircleHit(r0, r1, radius) {
  const dx = r1.x - r0.x;
  const dy = r1.y - r0.y;
  const a = dx * dx + dy * dy;
  const b = 2 * (r0.x * dx + r0.y * dy);
  const c = r0.x * r0.x + r0.y * r0.y - radius * radius;
  const disc = b * b - 4 * a * c;
  if (disc < 0 || a === 0) return null;
  const sqrtDisc = Math.sqrt(disc);
  const t1 = (-b - sqrtDisc) / (2 * a);
  const t2 = (-b + sqrtDisc) / (2 * a);
  const hits = [t1, t2].filter((t) => t >= 0 && t <= 1);
  if (!hits.length) return null;
  return Math.min(...hits);
}

export function sweptCircleCircleTorus(a, b, worldW, worldH) {
  const rSum = a.r + b.r;
  const r0 = {
    x: torusDelta(a.px ?? a.x, b.px ?? b.x, worldW),
    y: torusDelta(a.py ?? a.y, b.py ?? b.y, worldH),
  };
  const nextDx = torusDelta(a.x, b.x, worldW);
  const nextDy = torusDelta(a.y, b.y, worldH);
  const r1 = {
    x: unwrapDelta(r0.x, nextDx, worldW),
    y: unwrapDelta(r0.y, nextDy, worldH),
  };
  const t = segmentCircleHit(r0, r1, rSum);
  return t == null ? { hit: false, t: null } : { hit: true, t };
}
