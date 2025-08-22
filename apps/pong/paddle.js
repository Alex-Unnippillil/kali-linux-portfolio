export default class Paddle {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.speed = 300; // px per second
  }

  move(dt, dir) {
    this.y += dir * this.speed * dt;
  }

  clamp(canvasHeight) {
    if (this.y < 0) this.y = 0;
    if (this.y + this.height > canvasHeight) this.y = canvasHeight - this.height;
  }

  draw(ctx) {
    ctx.fillStyle = 'white';
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}
