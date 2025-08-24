export default class Bird {
  constructor(x, y, gravity, skin = 'yellow') {
    this.x = x;
    this.y = y;
    // keep sub-pixel position separate from draw position
    this.yPos = y;
    this.vy = 0;
    this.gravity = gravity;
    this.width = 20;
    this.height = 20;
    this.hitboxPadding = 2;
    this.skin = skin;
  }

  flap(force) {
    this.vy = force;
  }

  update(reverse = false) {
    // apply gravity in fixed steps for consistent behaviour
    const g = reverse ? -this.gravity : this.gravity;
    this.vy += g;
    this.yPos += this.vy;
    // sync draw position with sub-pixel value
    this.y = this.yPos;
  }

  get bounds() {
    const pad = this.hitboxPadding;
    return {
      left: this.x - this.width / 2 + pad,
      right: this.x + this.width / 2 - pad,
      top: this.y - this.height / 2 + pad,
      bottom: this.y + this.height / 2 - pad,
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
