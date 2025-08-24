import Projectile from './projectile';

export default class Player {
  x: number;
  y: number;
  w: number;
  h: number;
  cooldown: number;
  shield: number;
  rapid: number;
  score: number;
  shots: number;
  hits: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.w = 20;
    this.h = 10;
    this.cooldown = 0;
    this.shield = 0;
    this.rapid = 0;
    this.score = 0;
    this.shots = 0;
    this.hits = 0;
  }

  move(dir: number, dt: number, boundsW: number) {
    this.x += dir * 100 * dt;
    this.x = Math.max(0, Math.min(boundsW - this.w, this.x));
  }

  shoot(projectiles: Projectile[]) {
    if (this.cooldown > 0) return;
    projectiles.push(Projectile.get(this.x + this.w / 2, this.y, -200));
    this.cooldown = this.rapid > 0 ? 0.1 : 0.5;
    this.shots += 1;
  }

  update(dt: number) {
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.rapid > 0) this.rapid -= dt;
  }

  takeHit(): boolean {
    if (this.shield > 0) {
      this.shield -= 1;
      return false;
    }
    return true;
  }

  addScore(points: number) {
    this.score += points;
    this.hits += 1;
  }

  applyPowerUp(type: 'shield' | 'rapid') {
    if (type === 'shield') this.shield += 1;
    else this.rapid = 5;
  }

  accuracy() {
    return this.shots ? this.hits / this.shots : 0;
  }
}
