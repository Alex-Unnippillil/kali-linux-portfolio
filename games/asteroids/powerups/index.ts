export const POWER_UPS = {
  SHIELD: 'shield',
  RAPID_FIRE: 'rapid-fire',
  EXTRA_LIFE: 'extra-life',
} as const;

export type PowerUpType = (typeof POWER_UPS)[keyof typeof POWER_UPS];

export interface PowerUp {
  type: PowerUpType;
  x: number;
  y: number;
  r: number;
  life: number;
}
