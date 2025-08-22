export default class Invader {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  alive: boolean;

  constructor(x: number, y: number, w = 20, h = 15, hp = 1) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.hp = hp;
    this.alive = true;
  }

  hit() {
    this.hp -= 1;
    if (this.hp <= 0) this.alive = false;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.alive) ctx.fillRect(this.x, this.y, this.w, this.h);
  }
}
