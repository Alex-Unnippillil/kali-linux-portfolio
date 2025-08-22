export default class Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  canvasWidth: number;
  canvasHeight: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.r = 5;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.reset();
  }

  reset() {
    this.x = this.canvasWidth / 2;
    this.y = this.canvasHeight / 2;
    this.vx = 150 * (Math.random() > 0.5 ? 1 : -1);
    this.vy = -150;
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x < this.r || this.x > this.canvasWidth - this.r) this.vx *= -1;
    if (this.y < this.r) this.vy *= -1;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
  }
}
