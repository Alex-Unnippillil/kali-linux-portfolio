export default class Pipe {
  constructor(x, gap, width, canvasHeight, speed = 2, color = '#228B22') {
    this.width = width;
    this.canvasHeight = canvasHeight;
    this.speed = speed;
    this.baseGap = gap;
    this.color = color;
    this.reset(x);
  }

  reset(x, score = 0) {
    this.x = x;
    const difficulty = Math.min(score * 2, 30);
    const gap =
      Math.max(this.baseGap - difficulty, 50) + Math.random() * 40 - 20;
    const top = Math.random() * (this.canvasHeight - gap - 40) + 20;
    this.top = top;
    this.bottom = top + gap;
    this.passed = false;
  }

  update(dt = 1) {
    this.x -= this.speed * dt;
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
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

  setColor(color) {
    this.color = color;
  }
}
