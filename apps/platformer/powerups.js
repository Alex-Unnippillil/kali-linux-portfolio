export class PowerUp {
  constructor(type, applyFn) {
    this.type = type;
    this.apply = applyFn || (() => {});
  }
}

export function collectPowerUp(player, powerUp) {
  if (powerUp) {
    player.applyPowerUp(powerUp);
    return true;
  }
  return false;
}
