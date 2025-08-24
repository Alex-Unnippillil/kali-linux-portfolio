export default class Ball {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  r = 5;
  canvasWidth: number;
  canvasHeight: number;
  maxSpeed = 600;
  stuck = false;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.reset();
  }

  reset() {
    this.x = this.canvasWidth / 2;
    this.y = this.canvasHeight / 2;
    this.vx = 150 * (Math.random() > 0.5 ? 1 : -1);
    this.vy = -150;
    this.stuck = false;
  }

  update(dt: number) {
    if (this.stuck) return;
    let remaining = dt;
    const step = 1 / 60; // base fixed step
    while (remaining > 0) {
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      const maxStep = this.r / Math.max(speed, this.maxSpeed);
      const dtStep = Math.min(step, remaining, maxStep);
      this.x += this.vx * dtStep;
      this.y += this.vy * dtStep;
      if (this.x < this.r) {
        this.x = this.r;
        this.vx *= -1;
      } else if (this.x > this.canvasWidth - this.r) {
        this.x = this.canvasWidth - this.r;
        this.vx *= -1;
      }
      if (this.y < this.r) {
        this.y = this.r;
        this.vy *= -1;
      }
      remaining -= dtStep;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
  }
}
