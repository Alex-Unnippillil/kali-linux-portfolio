export default class Pipe {
  constructor(x, gap, width, canvasHeight, speed = 2) {
    this.width = width;
    this.canvasHeight = canvasHeight;
    this.speed = speed;
    this.baseGap = gap;
    this.reset(x);
  }

  reset(x) {
    this.x = x;
    const gap = this.baseGap + Math.random() * 40 - 20;
    const top = Math.random() * (this.canvasHeight - gap - 40) + 20;
    this.top = top;
    this.bottom = top + gap;
    this.passed = false;
  }

  update(dt = 1) {
    this.x -= this.speed * dt;
  }

  draw(ctx) {
    ctx.fillStyle = '#228B22';
    ctx.fillRect(this.x, 0, this.width, this.top);
    ctx.fillRect(
      this.x,
      this.bottom,
      this.width,
      this.canvasHeight - this.bottom
    );
  }

  isOffscreen() {
    return this.x + this.width < 0;
  }

  collides(bird) {
    const b = bird.bounds;
    if (b.right < this.x || b.left > this.x + this.width) return false;
    return b.top < this.top || b.bottom > this.bottom;
  }
}
