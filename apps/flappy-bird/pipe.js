export default class Pipe {
  constructor(x, gap, width, canvasHeight, speed = 2) {
    this.x = x;
    this.gap = gap;
    this.width = width;
    this.canvasHeight = canvasHeight;
    this.speed = speed;
    const top = Math.random() * (canvasHeight - gap - 40) + 20;
    this.top = top;
    this.bottom = top + gap;
  }

  update() {
    this.x -= this.speed;
  }

  draw(ctx) {
    ctx.fillStyle = '#228B22';
    ctx.fillRect(this.x, 0, this.width, this.top);
    ctx.fillRect(this.x, this.bottom, this.width, this.canvasHeight - this.bottom);
  }

  isOffscreen() {
    return this.x + this.width < 0;
  }

  collides(bird) {
    if (this.x > bird.x + bird.radius || this.x + this.width < bird.x - bird.radius) {
      return false;
    }
    return bird.y - bird.radius < this.top || bird.y + bird.radius > this.bottom;
  }
}
