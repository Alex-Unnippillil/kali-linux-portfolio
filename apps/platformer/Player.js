export class Player {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
    this.w = 14;
    this.h = 14;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.spawn = { x, y };
    this.powerUps = new Set();
  }

  applyPowerUp(powerUp) {
    if (powerUp && typeof powerUp.apply === 'function') {
      powerUp.apply(this);
      this.powerUps.add(powerUp.type);
    }
  }

  resetToSpawn() {
    this.x = this.spawn.x;
    this.y = this.spawn.y;
    this.vx = 0;
    this.vy = 0;
  }
}
