export default class Projectile {
  x: number;
  y: number;
  dy: number;
  active: boolean;

  constructor(x: number, y: number, dy: number) {
    this.x = x;
    this.y = y;
    this.dy = dy;
    this.active = true;
  }

  update(dt: number, boundsH: number) {
    this.y += this.dy * dt;
    if (this.y < 0 || this.y > boundsH) this.active = false;
  }

  draw(ctx: CanvasRenderingContext2D, color: string) {
    if (!this.active) return;
    ctx.fillStyle = color;
    ctx.fillRect(this.x - 1, this.y - 4, 2, 4);
  }

  collides(rect: { x: number; y: number; w: number; h: number }) {
    return (
      this.active &&
      this.x >= rect.x &&
      this.x <= rect.x + rect.w &&
      this.y >= rect.y &&
      this.y <= rect.y + rect.h
    );
  }
}
