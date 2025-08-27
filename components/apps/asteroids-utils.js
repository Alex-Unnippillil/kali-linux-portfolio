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

export function updateBullets(pool, dt = 1) {
  for (const b of pool) {
    if (!b.active) continue;
    b.x += b.dx * dt;
    b.y += b.dy * dt;
    b.life -= dt;
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

export const POWER_UPS = {
  SHIELD: 'shield',
  RAPID_FIRE: 'rapid-fire',
};

export function spawnPowerUp(list, x, y) {
  const type = Math.random() < 0.5 ? POWER_UPS.SHIELD : POWER_UPS.RAPID_FIRE;
  list.push({ type, x, y, r: 12, life: 600 });
}

export function updatePowerUps(list, dt = 1) {
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const p = list[i];
    p.life -= dt;
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
