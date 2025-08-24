export default class Bird {
  constructor(x, y, gravity, skin = 'yellow') {
    this.x = x;
    this.y = y;
    this.vy = 0;
    this.gravity = gravity;
    this.width = 20;
    this.height = 20;
    this.skin = skin;
  }

  flap(force) {
    this.vy = force;
  }

  update(reverse = false, dt = 1) {
    const g = reverse ? -this.gravity : this.gravity;
    this.vy += g * dt;
    this.y += this.vy * dt;
  }

  get bounds() {
    return {
      left: this.x - this.width / 2,
      right: this.x + this.width / 2,
      top: this.y - this.height / 2,
      bottom: this.y + this.height / 2,
    };
  }

  setSkin(color) {
    this.skin = color;
  }

  draw(ctx) {
    ctx.fillStyle = this.skin;
    ctx.fillRect(
      this.x - this.width / 2,
      this.y - this.height / 2,
      this.width,
      this.height
    );
  }
}
