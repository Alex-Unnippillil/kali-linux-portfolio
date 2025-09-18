import { generateBoard } from '../../../games/minesweeper/generator';
import type { Cell } from '../../../games/minesweeper/save';

type Board = Cell[][];

const collectZeroRegion = (board: Board, startX: number, startY: number) => {
  const visited = new Set<string>();
  const queue: Array<[number, number]> = [[startX, startY]];
  while (queue.length) {
    const [x, y] = queue.shift()!;
    if (x < 0 || x >= board.length || y < 0 || y >= board[x].length) continue;
    const key = `${x},${y}`;
    if (visited.has(key)) continue;
    const cell = board[x][y];
    visited.add(key);
    if (cell.adjacent !== 0) continue;
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        if (dx === 0 && dy === 0) continue;
        queue.push([x + dx, y + dy]);
      }
    }
  }
  return visited;
};

describe('Minesweeper safe first click', () => {
  const seeds = [12345, 67890, 987654321];
  const positions: Array<[number, number]> = [
    [0, 0],
    [0, 7],
    [7, 0],
    [7, 7],
    [3, 3],
    [4, 2],
  ];

  test.each(seeds.flatMap((seed) => positions.map(([x, y]) => [seed, x, y])))
    ('seed %d safe region at (%d,%d)', (seed, x, y) => {
      const board = generateBoard(seed as number, {
        startX: x as number,
        startY: y as number,
      });
      const cell = board[x as number][y as number];
      expect(cell.mine).toBe(false);
      expect(cell.adjacent).toBe(0);

      for (let dx = -1; dx <= 1; dx += 1) {
        for (let dy = -1; dy <= 1; dy += 1) {
          const nx = (x as number) + dx;
          const ny = (y as number) + dy;
          if (nx < 0 || nx >= board.length || ny < 0 || ny >= board.length) continue;
          expect(board[nx][ny].mine).toBe(false);
          expect(board[nx][ny].adjacent).toBe(0);
        }
      }

      const revealed = collectZeroRegion(board, x as number, y as number);
      expect(revealed.size).toBeGreaterThan(1);
    });
});
