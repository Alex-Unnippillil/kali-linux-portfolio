export type CellState = 'ship' | 'hit' | 'miss' | null;

/**
 * Apply multiple shots to the enemy board.
 * Already-fired locations are ignored.
 * Returns the updated board and lists of hit and miss indices.
 */
export function fireShots(
  board: CellState[],
  targets: number[],
  shipCells?: Set<number>,
): {
  board: CellState[];
  hits: number[];
  misses: number[];
} {
  const newBoard = board.slice();
  const hits: number[] = [];
  const misses: number[] = [];

  for (const idx of targets) {
    if (idx < 0 || idx >= newBoard.length) continue;
    const cell = newBoard[idx];
    if (cell === 'hit' || cell === 'miss') continue;
    const isHit = shipCells ? shipCells.has(idx) : cell === 'ship';
    if (isHit) {
      newBoard[idx] = 'hit';
      hits.push(idx);
    } else if (cell == null) {
      newBoard[idx] = 'miss';
      misses.push(idx);
    }
  }

  return { board: newBoard, hits, misses };
}
