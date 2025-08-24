export default class Ball {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;

  constructor(x: number, y: number, radius: number) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.vx = 200;
    this.vy = 120;
  }

  reset(direction = 1) {
    this.x = 0;
    this.y = 0;
    this.vx = 200 * direction;
    this.vy = 120;
  }

  update(dt: number, paddles: Paddle[], width: number, height: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.y < this.radius && this.vy < 0) {
      this.y = this.radius;
      this.vy = -this.vy;
    }
    if (this.y > height - this.radius && this.vy > 0) {
      this.y = height - this.radius;
      this.vy = -this.vy;
    }

    for (const p of paddles) {
      if (
        this.x + this.radius > p.x &&
        this.x - this.radius < p.x + p.width &&
        this.y + this.radius > p.y &&
        this.y - this.radius < p.y + p.height
      ) {
        const nx = this.x < width / 2 ? 1 : -1;
        const ny = (this.y - (p.y + p.height / 2)) / (p.height / 2);
        const mag = Math.hypot(nx, ny) || 1;
        const ux = nx / mag;
        const uy = ny / mag;
        const dot = this.vx * ux + this.vy * uy;
        this.vx = this.vx - 2 * dot * ux;
        this.vy = this.vy - 2 * dot * uy + p.vy * 0.2;
        const speed = Math.hypot(this.vx, this.vy);
        const angle = Math.atan2(this.vy, this.vx);
        const newSpeed = Math.min(speed * 1.05, 800);
        this.vx = Math.cos(angle) * newSpeed;
        this.vy = Math.sin(angle) * newSpeed;
        if (this.vx > 0) {
          this.x = p.x + p.width + this.radius;
        } else {
          this.x = p.x - this.radius;
        }
      }
    }
  }
}

interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number;
}
