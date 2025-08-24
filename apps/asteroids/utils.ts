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

// Simple quadtree for broadphase collision detection
export interface QuadItem<T = any> {
  x: number;
  y: number;
  r: number;
  data: T;
}

const MAX_OBJECTS = 4;
const MAX_LEVELS = 5;

export class Quadtree<T = any> {
  private objects: QuadItem<T>[] = [];
  private nodes: Quadtree<T>[] = [];

  constructor(
    private bounds: { x: number; y: number; w: number; h: number },
    private level = 0,
  ) {}

  private split() {
    const { x, y, w, h } = this.bounds;
    const halfW = w / 2;
    const halfH = h / 2;
    const next = this.level + 1;
    this.nodes[0] = new Quadtree({ x: x + halfW, y, w: halfW, h: halfH }, next);
    this.nodes[1] = new Quadtree({ x, y, w: halfW, h: halfH }, next);
    this.nodes[2] = new Quadtree({ x, y: y + halfH, w: halfW, h: halfH }, next);
    this.nodes[3] = new Quadtree({ x: x + halfW, y: y + halfH, w: halfW, h: halfH }, next);
  }

  private getIndex(item: QuadItem): number {
    const verticalMid = this.bounds.x + this.bounds.w / 2;
    const horizontalMid = this.bounds.y + this.bounds.h / 2;
    const top = item.y + item.r < horizontalMid;
    const bottom = item.y - item.r > horizontalMid;
    const left = item.x + item.r < verticalMid;
    const right = item.x - item.r > verticalMid;

    if (left) {
      if (top) return 1;
      if (bottom) return 2;
    } else if (right) {
      if (top) return 0;
      if (bottom) return 3;
    }
    return -1;
  }

  insert(item: QuadItem<T>) {
    if (this.nodes.length) {
      const index = this.getIndex(item);
      if (index !== -1) {
        this.nodes[index].insert(item);
        return;
      }
    }

    this.objects.push(item);

    if (
      this.objects.length > MAX_OBJECTS &&
      this.level < MAX_LEVELS &&
      this.nodes.length === 0
    ) {
      this.split();
      let i = 0;
      while (i < this.objects.length) {
        const index = this.getIndex(this.objects[i]);
        if (index !== -1) {
          this.nodes[index].insert(this.objects.splice(i, 1)[0]);
        } else {
          i++;
        }
      }
    }
  }

  retrieve(range: { x: number; y: number; r: number }, result: QuadItem<T>[] = []): QuadItem<T>[] {
    const index = this.getIndex(range as QuadItem);
    if (index !== -1 && this.nodes.length) {
      this.nodes[index].retrieve(range, result);
    }
    result.push(...this.objects);
    return result;
  }

  clear() {
    this.objects.length = 0;
    for (const node of this.nodes) {
      node.clear();
    }
    this.nodes.length = 0;
  }
}
