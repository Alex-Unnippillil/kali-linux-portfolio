export function wrap(value: number, max: number): number {
  const m = value % max;
  return m < 0 ? m + max : m;
}

export interface Bullet {
  active: boolean;
  x: number;
  y: number;
  dx: number;
  dy: number;
  life: number;
  r: number;
}

export function createBulletPool(size: number): Bullet[] {
  return Array.from({ length: size }, () => ({
    active: false,
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,
    life: 0,
    r: 2,
  }));
}

export function spawnBullet(pool: Bullet[], x: number, y: number, dx: number, dy: number, life = 60): Bullet | null {
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

export function updateBullets(pool: Bullet[]): void {
  for (const b of pool) {
    if (!b.active) continue;
    b.x += b.dx;
    b.y += b.dy;
    b.life -= 1;
    if (b.life <= 0) b.active = false;
  }
}

export function splitAsteroidTree(size: number, min = 20) {
  const node: { size: number; children: any[] } = { size, children: [] };
  if (size > min) {
    const child = size / 2;
    node.children.push(splitAsteroidTree(child, min));
    node.children.push(splitAsteroidTree(child, min));
  }
  return node;
}
