import { BOARD_SIZE } from './ai';

// Determine if a ship can be placed at given coordinates without overlaps.
export function canPlaceShip(ships, x, y, dir, len, ignoreId) {
  const cells = [];
  for (let k = 0; k < len; k++) {
    const cx = x + (dir === 0 ? k : 0);
    const cy = y + (dir === 1 ? k : 0);
    if (cx < 0 || cy < 0 || cx >= BOARD_SIZE || cy >= BOARD_SIZE) return null;
    const idx = cy * BOARD_SIZE + cx;
    for (const s of ships) {
      if (ignoreId != null && s.id === ignoreId) continue;
      if (s.cells && s.cells.includes(idx)) return null;
    }
    cells.push(idx);
  }
  return cells;
}

// Check if all ships on a board have been sunk.
export function isGameOver(board) {
  return !board.includes('ship');
}

