import Invader from './invader';
import Projectile from './projectile';

export interface GameState {
  rows: Invader[][];
  invaders: Invader[];
  playerBullets: Projectile[];
  dir: number;
  width: number;
  wave: number;
  /**
   * Delay until the formation moves again. This shrinks as
   * invaders are destroyed to speed up the march, mimicking the
   * classic game's increasing difficulty.
   */
  stepDelay: number;
  /** Total number of invaders spawned for this wave */
  totalInvaders: number;
}

export function createGame(width: number, rows = 4, cols = 8): GameState {
  const rowArr: Invader[][] = [];
  for (let r = 0; r < rows; r += 1) {
    const row: Invader[] = [];
    for (let c = 0; c < cols; c += 1) {
      row.push(new Invader(30 + c * 30, 30 + r * 30));
    }
    rowArr.push(row);
  }
  const invs = rowArr.flat();
  return {
    rows: rowArr,
    invaders: invs,
    playerBullets: [],
    dir: 1,
    width,
    wave: 1,
    stepDelay: 0.5,
    totalInvaders: invs.length,
  };
}

export function march(state: GameState) {
  let hitEdge = false;
  state.invaders.forEach((inv) => {
    if (!inv.alive) return;
    inv.x += state.dir * 10;
    if (inv.x < 10 || inv.x + inv.w > state.width - 10) hitEdge = true;
  });
  if (hitEdge) {
    state.dir *= -1;
    const totalRows = state.rows.length;
    const aliveRows = state.rows.filter((row) => row.some((i) => i.alive)).length;
    const drop = 10 + (totalRows - aliveRows) * 5;
    state.invaders.forEach((inv) => {
      if (inv.alive) inv.y += drop;
    });
  }
  // Update the delay for the next march based on remaining invaders.
  const alive = state.invaders.filter((i) => i.alive).length;
  const ratio = alive / state.totalInvaders;
  // As fewer invaders remain, reduce the delay (but keep a sensible minimum)
  state.stepDelay = Math.max(0.05, 0.5 * ratio);
}

export function handleCollisions(bullets: Projectile[], state: GameState) {
  bullets.forEach((b) => {
    if (!b.active) return;
    for (const inv of state.invaders) {
      if (inv.alive && b.collides(inv)) {
        inv.hit();
        b.release();
        break;
      }
    }
  });
}

export function waveCleared(state: GameState) {
  return state.invaders.every((inv) => !inv.alive);
}

export function nextWave(state: GameState) {
  if (!waveCleared(state)) return;
  state.wave += 1;
  const newState = createGame(state.width);
  state.rows = newState.rows;
  state.invaders = newState.invaders;
  state.dir = 1;
}
