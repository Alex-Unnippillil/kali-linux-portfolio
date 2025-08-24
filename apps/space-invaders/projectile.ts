export default class Projectile {
  x: number;
  y: number;
  prevY: number;
  dy: number;
  active: boolean;

  // pool of inactive projectiles for reuse
  private static pool: Projectile[] = [];

  constructor(x: number, y: number, dy: number) {
    this.x = x;
    this.y = y;
    this.prevY = y;
    this.dy = dy;
    this.active = true;
  }

  static get(x: number, y: number, dy: number) {
    const p = this.pool.pop() || new Projectile(x, y, dy);
    p.x = x;
    p.y = y;
    p.prevY = y;
    p.dy = dy;
    p.active = true;
    return p;
  }

  release() {
    this.active = false;
    Projectile.pool.push(this);
  }

  update(dt: number, boundsH: number) {
    this.prevY = this.y;
    this.y += this.dy * dt;
    const minY = Math.min(this.prevY, this.y);
    const maxY = Math.max(this.prevY, this.y);
    if (minY < 0 || maxY > boundsH) this.release();
  }

  draw(ctx: CanvasRenderingContext2D, color: string) {
    if (!this.active) return;
    ctx.fillStyle = color;
    ctx.fillRect(this.x - 1, this.y - 4, 2, 4);
  }

  collides(rect: { x: number; y: number; w: number; h: number }) {
    if (!this.active) return false;
    if (this.x < rect.x || this.x > rect.x + rect.w) return false;
    const minY = Math.min(this.prevY, this.y);
    const maxY = Math.max(this.prevY, this.y);
    return maxY >= rect.y && minY <= rect.y + rect.h;
  }
}
