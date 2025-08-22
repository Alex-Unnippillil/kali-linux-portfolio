export default class Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  canvasWidth: number;
  lasers: { x: number; y: number }[] = [];
  laserActive = false;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.width = 80;
    this.height = 10;
    this.x = canvasWidth / 2 - this.width / 2;
    this.y = canvasHeight - this.height * 2;
    this.speed = 300;
    this.canvasWidth = canvasWidth;
  }

  move(dir: number, dt: number) {
    this.x += dir * this.speed * dt;
    if (this.x < 0) this.x = 0;
    if (this.x + this.width > this.canvasWidth) this.x = this.canvasWidth - this.width;
  }

  shoot() {
    if (!this.laserActive) return;
    this.lasers.push({ x: this.x + this.width / 2, y: this.y });
  }

  updateLasers(dt: number) {
    this.lasers = this.lasers
      .map((l) => ({ ...l, y: l.y - 400 * dt }))
      .filter((l) => l.y > 0);
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'white';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.fillStyle = 'red';
    this.lasers.forEach((l) => {
      ctx.fillRect(l.x - 1, l.y - 10, 2, 10);
    });
  }
}
