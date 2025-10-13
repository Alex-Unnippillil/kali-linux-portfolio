export type PowerUpType = 'shield' | 'rapid' | 'life';

export interface PowerUp {
  x: number;
  y: number;
  type: PowerUpType;
  active: boolean;
}

export interface PlayerState {
  x: number;
  y: number;
  w: number;
  h: number;
  shield: boolean;
  shieldHp: number;
  rapid: number;
  lives: number;
}

export interface GameState {
  player: PlayerState;
  powerUps: PowerUp[];
}

export const MAX_SHIELD_HP = 3;

export const spawnPowerUp = (
  powerUps: PowerUp[],
  x: number,
  y: number,
  type?: PowerUpType,
) => {
  const t: PowerUpType =
    type ?? ((r => r < 0.33 ? 'shield' : r < 0.66 ? 'rapid' : 'life')(Math.random()));
  powerUps.push({ x, y, type: t, active: true });
};

export const updatePowerUps = (
  state: GameState,
  dt: number,
  height: number,
) => {
  state.powerUps.forEach((p) => {
    if (!p.active) return;
    p.y += 40 * dt;
    if (p.y > height) p.active = false;
    const pl = state.player;
    if (
      p.x >= pl.x &&
      p.x <= pl.x + pl.w &&
      p.y >= pl.y &&
      p.y <= pl.y + pl.h
    ) {
      p.active = false;
      applyPowerUp(pl, p.type);
    }
  });
  state.powerUps = state.powerUps.filter((p) => p.active);
};

export const applyPowerUp = (player: PlayerState, type: PowerUpType) => {
  if (type === 'shield') {
    player.shield = true;
    player.shieldHp = MAX_SHIELD_HP;
  } else if (type === 'rapid') {
    player.rapid = 5;
  } else if (type === 'life') {
    player.lives += 1;
  }
};

export const drawPowerUps = (ctx: CanvasRenderingContext2D, powerUps: PowerUp[]) => {
  powerUps.forEach((p) => {
    if (!p.active) return;
    ctx.fillStyle = p.type === 'shield' ? 'cyan' : p.type === 'rapid' ? 'orange' : 'pink';
    ctx.fillRect(p.x - 5, p.y - 5, 10, 10);
  });
};
