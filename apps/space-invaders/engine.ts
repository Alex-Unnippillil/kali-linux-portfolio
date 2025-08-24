import Invader from './invader';
import Projectile from './projectile';

export interface GameState {
  rows: Invader[][];
  invaders: Invader[];
  playerBullets: Projectile[];
  dir: number;
  width: number;
  wave: number;
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
  return {
    rows: rowArr,
    invaders: rowArr.flat(),
    playerBullets: [],
    dir: 1,
    width,
    wave: 1,
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
