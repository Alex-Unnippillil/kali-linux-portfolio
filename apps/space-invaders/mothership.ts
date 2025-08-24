export default class Mothership {
  x: number;
  y: number;
  w: number;
  h: number;
  dir: number;
  speed: number;
  active: boolean;

  constructor(boundsW: number, dir: number) {
    this.w = 40;
    this.h = 20;
    this.y = 20;
    this.dir = dir;
    this.speed = 60;
    this.x = dir === 1 ? -this.w : boundsW;
    this.active = true;
  }

  update(dt: number, boundsW: number) {
    this.x += this.speed * this.dir * dt;
    if ((this.dir === 1 && this.x > boundsW) || (this.dir === -1 && this.x + this.w < 0)) this.active = false;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.active) return;
    ctx.fillStyle = 'red';
    ctx.fillRect(this.x, this.y, this.w, this.h);
  }
}
