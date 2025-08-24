export default class Shield {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;

  constructor(x: number, y: number, w = 30, h = 20, hp = 5) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.hp = hp;
  }

  hit() {
    this.hp -= 1;
  }

  get alive() {
    return this.hp > 0;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.alive) return;
    const intensity = (this.hp / 5) * 255;
    ctx.fillStyle = `rgb(${intensity},${intensity},0)`;
    ctx.fillRect(this.x, this.y, this.w, this.h);
  }
}
