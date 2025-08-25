export function wrap(value, max) {
  const m = value % max;
  return m < 0 ? m + max : m;
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

export const POWER_UPS = {
  SHIELD: 'shield',
  RAPID_FIRE: 'rapid-fire',
};

export function spawnPowerUp(list, x, y) {
  const type = Math.random() < 0.5 ? POWER_UPS.SHIELD : POWER_UPS.RAPID_FIRE;
  list.push({ type, x, y, r: 12, life: 600 });
}

export function updatePowerUps(list) {
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const p = list[i];
    p.life -= 1;
    if (p.life <= 0) list.splice(i, 1);
  }
}
