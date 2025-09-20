import { Direction, evaluateBoard, findBestMove } from '../../../apps/2048/hint';

const slideRow = (row: number[]) => {
  const filtered = row.filter((value) => value !== 0);
  for (let i = 0; i < filtered.length - 1; i += 1) {
    if (filtered[i] === filtered[i + 1]) {
      filtered[i] *= 2;
      filtered[i + 1] = 0;
    }
  }
  const result = filtered.filter((value) => value !== 0);
  while (result.length < row.length) {
    result.push(0);
  }
  return result;
};

const transpose = (board: number[][]) => board[0].map((_, column) => board.map((row) => row[column]));

const moveLeft = (board: number[][]) => board.map((row) => slideRow(row));
const moveRight = (board: number[][]) => moveLeft(board.map((row) => [...row].reverse())).map((row) => row.reverse());
const moveUp = (board: number[][]) => transpose(moveLeft(transpose(board)));
const moveDown = (board: number[][]) => transpose(moveRight(transpose(board)));

const simulateMove = (board: number[][], direction: Direction) => {
  switch (direction) {
    case 'ArrowLeft':
      return moveLeft(board);
    case 'ArrowRight':
      return moveRight(board);
    case 'ArrowUp':
      return moveUp(board);
    case 'ArrowDown':
      return moveDown(board);
    default:
      return board.map((row) => [...row]);
  }
};

describe('2048 heuristic hint', () => {
  it('rewards boards with more empty tiles', () => {
    const crowded = [
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [8, 4, 8, 4],
      [16, 8, 16, 8],
    ];
    const spacious = [
      [2, 4, 0, 0],
      [4, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    expect(evaluateBoard(spacious)).toBeGreaterThan(evaluateBoard(crowded));
  });

  it('prefers smoother boards when monotonicity is similar', () => {
    const jagged = [
      [2, 64, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const smooth = [
      [2, 4, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    expect(evaluateBoard(smooth)).toBeGreaterThan(evaluateBoard(jagged));
  });

  it('suggests merging downward when it increases space and keeps monotonicity', () => {
    const board = [
      [2, 4, 8, 16],
      [2, 4, 8, 16],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    expect(findBestMove(board)).toBe('ArrowDown');
  });

  it('suggests keeping the highest tiles anchored to the left edge', () => {
    const board = [
      [128, 64, 32, 16],
      [8, 4, 2, 0],
      [4, 2, 0, 0],
      [2, 0, 0, 0],
    ];
    const move = findBestMove(board);
    expect(move).toBeTruthy();
    if (!move) return;
    expect(['ArrowLeft', 'ArrowRight']).toContain(move);
    const next = simulateMove(board, move);
    const highest = next.reduce((max, row) => Math.max(max, ...row), 0);
    const highestAnchored = next.some((row) => row[0] === highest);
    expect(highestAnchored).toBe(true);
  });

  it('returns null when no moves are possible', () => {
    const board = [
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ];
    expect(findBestMove(board)).toBeNull();
  });
});
