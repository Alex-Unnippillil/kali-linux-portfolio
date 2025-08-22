export class Enemy {
  constructor(x = 0, y = 0, patrolDistance = 0) {
    this.x = x;
    this.y = y;
    this.w = 14;
    this.h = 14;
    this.vx = 50;
    this.vy = 0;
    this.patrolDistance = patrolDistance;
    this.originX = x;
  }

  update(dt) {
    this.x += this.vx * dt;
    if (Math.abs(this.x - this.originX) > this.patrolDistance) {
      this.vx *= -1;
    }
  }
}
