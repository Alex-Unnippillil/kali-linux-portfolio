export default class Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  destroyed = false;
  powerUp: 'multiball' | 'laser' | null;

  constructor(x: number, y: number, w: number, h: number, powerUp: 'multiball' | 'laser' | null = null) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.powerUp = powerUp;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.destroyed) return;
    ctx.fillStyle = this.powerUp ? 'gold' : 'blue';
    ctx.fillRect(this.x, this.y, this.w, this.h);
  }
}
