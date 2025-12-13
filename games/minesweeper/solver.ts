import type { Cell } from './save';
import type { Coord } from './logic';
import { getNeighbors } from './logic';

export interface SolverResult {
  risk: number[][];
  forcedSafe: Set<string>;
  forcedMines: Set<string>;
}

const coordKey = (x: number, y: number) => `${x},${y}`;

export function analyze(board: Cell[][] | null): SolverResult {
  if (!board) {
    return { risk: [], forcedSafe: new Set(), forcedMines: new Set() };
  }
  const size = board.length;
  const risk = Array.from({ length: size }, () => Array(size).fill(0));
  const forcedSafe = new Set<string>();
  const forcedMines = new Set<string>();

  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      const cell = board[x][y];
      if (!cell.revealed || cell.mine || cell.adjacent === 0) continue;
      const neighbors = getNeighbors(size, x, y);
      let flagged = 0;
      const hidden: Coord[] = [];
      neighbors.forEach(([nx, ny]) => {
        const neighbor = board[nx][ny];
        if (neighbor.flagged) {
          flagged++;
        } else if (!neighbor.revealed) {
          hidden.push([nx, ny]);
        }
      });
      if (!hidden.length) continue;
      const remaining = Math.max(0, cell.adjacent - flagged);
      if (remaining === 0) {
        hidden.forEach(([hx, hy]) => forcedSafe.add(coordKey(hx, hy)));
      } else if (remaining === hidden.length) {
        hidden.forEach(([hx, hy]) => forcedMines.add(coordKey(hx, hy)));
      }
      const prob = Math.min(1, remaining / hidden.length);
      hidden.forEach(([hx, hy]) => {
        risk[hx][hy] = Math.max(risk[hx][hy], prob);
      });
    }
  }

  return { risk, forcedSafe, forcedMines };
}

export default analyze;
