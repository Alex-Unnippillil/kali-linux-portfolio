export interface Cell {
  mine: boolean;
  adjacent: number;
}

/**
 * Calculate the 3BV (Bechtel's Board Benchmark Value) for a Minesweeper board.
 * 3BV represents the minimum number of clicks required to solve the board,
 * assuming perfect play with no guessing. Zero areas count as a single click,
 * and remaining numbered cells each add one.
 */
export function calculate3BV(board: Cell[][]): number {
  const rows = board.length;
  const cols = rows > 0 ? board[0].length : 0;
  const visited: boolean[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(false)
  );

  const inBounds = (x: number, y: number) =>
    x >= 0 && x < rows && y >= 0 && y < cols;
  const dirs = [-1, 0, 1];
  let bv = 0;

  // Count zero-value regions (each region counts as 1)
  for (let x = 0; x < rows; x++) {
    for (let y = 0; y < cols; y++) {
      if (
        board[x][y].mine ||
        visited[x][y] ||
        board[x][y].adjacent !== 0
      )
        continue;
      bv++;
      const queue: [number, number][] = [[x, y]];
      visited[x][y] = true;
      while (queue.length) {
        const [cx, cy] = queue.shift()!;
        for (const dx of dirs) {
          for (const dy of dirs) {
            if (dx === 0 && dy === 0) continue;
            const nx = cx + dx;
            const ny = cy + dy;
            if (
              inBounds(nx, ny) &&
              !visited[nx][ny] &&
              !board[nx][ny].mine
            ) {
              visited[nx][ny] = true;
              if (board[nx][ny].adjacent === 0) {
                queue.push([nx, ny]);
              }
            }
          }
        }
      }
    }
  }

  // Count remaining unrevealed non-mine cells
  for (let x = 0; x < rows; x++) {
    for (let y = 0; y < cols; y++) {
      if (!board[x][y].mine && !visited[x][y]) bv++;
    }
  }

  return bv;
}

export default calculate3BV;
