// Power-up definitions and helpers for the Asteroids game.

// Available power-up types.
export enum POWER_UPS {
  SHIELD = 'shield',
  RAPID_FIRE = 'rapid-fire',
}

export interface PowerUp {
  type: POWER_UPS;
  x: number;
  y: number;
  r: number;
  life: number;
}

// Duration values (in frames) for the various power-ups.
export const SHIELD_DURATION = 600;
export const RAPID_FIRE_DURATION = 600;

/** Spawn a new power-up of random type at the given position. */
export function spawnPowerUp(list: PowerUp[], x: number, y: number): void {
  const type = Math.random() < 0.5 ? POWER_UPS.SHIELD : POWER_UPS.RAPID_FIRE;
  list.push({ type, x, y, r: 12, life: 600 });
}

/** Update existing power-ups, removing any that expire. */
export function updatePowerUps(list: PowerUp[]): void {
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const p = list[i];
    p.life -= 1;
    if (p.life <= 0) list.splice(i, 1);
  }
}

/** Apply the effect of the given power-up to the player's ship. */
export function applyPowerUp(ship: any, type: POWER_UPS): void {
  switch (type) {
    case POWER_UPS.SHIELD:
      ship.shield = SHIELD_DURATION;
      break;
    case POWER_UPS.RAPID_FIRE:
      ship.rapidFire = RAPID_FIRE_DURATION;
      break;
    default:
      break;
  }
}

