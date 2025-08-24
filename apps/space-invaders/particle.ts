export default class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;

  constructor(x: number, y: number, color = 'white') {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 50;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 1;
    this.color = color;
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
  }

  get alive() {
    return this.life > 0;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.alive) return;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, 2, 2);
  }
}
