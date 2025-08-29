export type CellState = 'ship' | 'hit' | 'miss' | null;

/**
 * Apply multiple shots to the enemy board.
 * Already-fired locations are ignored.
 * Returns the updated board and lists of hit and miss indices.
 */
export function fireShots(board: CellState[], targets: number[]): {
  board: CellState[];
  hits: number[];
  misses: number[];
} {
  const newBoard = board.slice();
  const hits: number[] = [];
  const misses: number[] = [];

  for (const idx of targets) {
    const cell = newBoard[idx];
    if (cell === 'ship') {
      newBoard[idx] = 'hit';
      hits.push(idx);
    } else if (cell == null) {
      newBoard[idx] = 'miss';
      misses.push(idx);
    }
  }

  return { board: newBoard, hits, misses };
}
