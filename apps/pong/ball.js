export default class Ball {
  constructor(x, y, radius) {
    this.startX = x;
    this.startY = y;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.speed = 200;
    this.vx = this.speed;
    this.vy = this.speed;
  }

  reset(direction = 1) {
    this.x = this.startX;
    this.y = this.startY;
    this.vx = this.speed * direction;
    this.vy = (Math.random() * 2 - 1) * this.speed;
  }

  update(dt, paddles, canvasWidth, canvasHeight) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.y - this.radius < 0 || this.y + this.radius > canvasHeight) {
      this.vy *= -1;
    }

    paddles.forEach((p) => {
      if (
        this.x - this.radius < p.x + p.width &&
        this.x + this.radius > p.x &&
        this.y - this.radius < p.y + p.height &&
        this.y + this.radius > p.y
      ) {
        this.vx *= -1;
        const diff = this.y - (p.y + p.height / 2);
        this.vy = diff * 5; // spin
      }
    });
  }

  draw(ctx) {
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
