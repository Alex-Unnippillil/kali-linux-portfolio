export default class Ball {
  constructor(x, y, radius) {
    this.startX = x;
    this.startY = y;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.baseSpeed = 200;
    this.speed = this.baseSpeed;
    this.vx = this.speed;
    this.vy = this.speed;
  }

  reset(direction = 1) {
    this.x = this.startX;
    this.y = this.startY;
    this.speed = this.baseSpeed;
    this.vx = this.speed * direction;
    this.vy = (Math.random() * 2 - 1) * this.speed;
  }

  update(dt, paddles, canvasWidth, canvasHeight) {
    const steps = Math.ceil(
      ((Math.abs(this.vx) + Math.abs(this.vy)) * dt) / this.radius
    );
    const subDt = dt / steps;

    for (let i = 0; i < steps; i++) {
      this.x += this.vx * subDt;
      this.y += this.vy * subDt;

      if (this.y - this.radius < 0) {
        this.y = this.radius;
        this.vy *= -1;
      } else if (this.y + this.radius > canvasHeight) {
        this.y = canvasHeight - this.radius;
        this.vy *= -1;
      }

      paddles.forEach((p) => {
        if (
          this.x - this.radius < p.x + p.width &&
          this.x + this.radius > p.x &&
          this.y - this.radius < p.y + p.height &&
          this.y + this.radius > p.y
        ) {
          const relative = (this.y - (p.y + p.height / 2)) / (p.height / 2);
          const angle = relative * (Math.PI / 3);
          const dir = this.vx < 0 ? 1 : -1;
          this.speed *= 1.05;
          const newSpeed = this.speed;
          this.vx = dir * newSpeed * Math.cos(angle);
          // Add paddle velocity influence for richer collision response
          this.vy = newSpeed * Math.sin(angle) + p.vy * 0.5;
          this.x = p.x + (dir === 1 ? p.width + this.radius : -this.radius);
        }
      });
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = 'white';
    ctx.shadowColor = 'white';
    ctx.shadowBlur = 10; // subtle bloom
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
