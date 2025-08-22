export default class Bird {
  constructor(x, y, gravity, skin = 'yellow') {
    this.x = x;
    this.y = y;
    this.vy = 0;
    this.gravity = gravity;
    this.radius = 10;
    this.skin = skin;
  }

  flap(force) {
    this.vy = force;
  }

  update(reverse = false) {
    const g = reverse ? -this.gravity : this.gravity;
    this.vy += g;
    this.y += this.vy;
  }

  setSkin(color) {
    this.skin = color;
  }

  draw(ctx) {
    ctx.fillStyle = this.skin;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
