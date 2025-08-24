export default class Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number;

  constructor(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.vy = 0;
  }

  move(dt: number, dir: number) {
    const speed = 300;
    this.vy = dir * speed;
    this.y += this.vy * dt;
  }

  clamp(h: number) {
    if (this.y < 0) this.y = 0;
    if (this.y + this.height > h) this.y = h - this.height;
  }
}
