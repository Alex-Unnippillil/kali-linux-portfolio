export default class Paddle {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.maxSpeed = 300; // px per second
    this.accel = 1200; // acceleration for responsive control
    this.vy = 0; // current velocity
  }

  move(dt, dir) {
    if (dir !== 0) {
      this.vy += dir * this.accel * dt;
      if (this.vy > this.maxSpeed) this.vy = this.maxSpeed;
      if (this.vy < -this.maxSpeed) this.vy = -this.maxSpeed;
    } else {
      // apply friction when no input for smoother stop
      this.vy *= 0.9;
      if (Math.abs(this.vy) < 1) this.vy = 0;
    }
    this.y += this.vy * dt;
  }

  clamp(canvasHeight) {
    if (this.y < 0) this.y = 0;
    if (this.y + this.height > canvasHeight)
      this.y = canvasHeight - this.height;
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = 'white';
    ctx.shadowColor = 'white';
    ctx.shadowBlur = 8; // subtle bloom
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.restore();
  }
}
