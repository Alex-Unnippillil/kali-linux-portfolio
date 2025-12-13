import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  PieceGenerator,
  attemptRotation,
  clearLines,
  collides,
  createEmptyBoard,
  detectTSpin,
  getCells,
  lockPiece,
} from '../games/tetris/logic';

describe('tetris logic', () => {
  test('kick left avoids blocker', () => {
    const board = createEmptyBoard();
    board[2][5] = 'J';
    const piece = { type: 'T' as const, rotation: 0 as const, x: 4, y: 0 };
    const { piece: rotated, success, kickIndex } = attemptRotation(board, piece, 1);
    expect(success).toBe(true);
    expect(rotated.rotation).toBe(1);
    expect(rotated.x).toBe(3);
    expect(rotated.y).toBe(0);
    expect(kickIndex).toBe(1);
  });

  test('floor kick succeeds', () => {
    const board = createEmptyBoard();
    const piece = { type: 'T' as const, rotation: 0 as const, x: 4, y: 18 };
    const { piece: rotated, success } = attemptRotation(board, piece, 1);
    expect(success).toBe(true);
    expect(rotated.rotation).toBe(1);
    expect(rotated.y).toBe(16);
  });

  test('line clear compacts rows', () => {
    const board = createEmptyBoard();
    board[BOARD_HEIGHT - 1] = Array(BOARD_WIDTH).fill('I');
    board[BOARD_HEIGHT - 1][BOARD_WIDTH - 1] = 0;
    const piece = { type: 'I' as const, rotation: 0 as const, x: 6, y: BOARD_HEIGHT - 2 };
    const { board: locked } = lockPiece(board, piece);
    const { board: compacted, cleared } = clearLines(locked);
    expect(cleared).toEqual([BOARD_HEIGHT - 1]);
    expect(compacted[BOARD_HEIGHT - 1].every((c) => c === 0)).toBe(true);
  });

  test('seven bag determinism', () => {
    const seed = 1234;
    const generatorA = new PieceGenerator('seven-bag', seed);
    const picksA = Array.from({ length: 7 }, () => generatorA.next());
    expect(new Set(picksA).size).toBe(7);

    const generatorB = new PieceGenerator('seven-bag', seed);
    const picksB = Array.from({ length: 7 }, () => generatorB.next());
    expect(picksB).toEqual(picksA);
  });

  test('basic T-spin detection', () => {
    const board = createEmptyBoard();
    const piece = { type: 'T' as const, rotation: 0 as const, x: 4, y: 0 };
    const size = 3;
    const corners: Array<[number, number]> = [
      [piece.x, piece.y],
      [piece.x + size - 1, piece.y],
      [piece.x, piece.y + size - 1],
      [piece.x + size - 1, piece.y + size - 1],
    ];
    corners.slice(0, 3).forEach(([x, y]) => {
      const ny = Math.max(y, 0);
      const nx = Math.min(Math.max(x, 0), BOARD_WIDTH - 1);
      board[ny][nx] = 'I';
    });
    const result = detectTSpin(board, piece, 'rotate');
    expect(result).toBe(true);
  });

  test('collision allows negative spawn', () => {
    const board = createEmptyBoard();
    const piece = { type: 'I' as const, rotation: 0 as const, x: 3, y: -2 };
    expect(collides(board, piece, piece.x, piece.y)).toBe(false);
    const { board: locked, gameOver } = lockPiece(board, piece);
    expect(gameOver).toBe(true);
    expect(locked[0].some(Boolean)).toBe(false);
  });

  test('getCells returns SRS layout', () => {
    const cells = getCells('O', 0 as const);
    expect(cells).toContainEqual([1, 1]);
    expect(cells).toContainEqual([2, 1]);
    expect(cells).toContainEqual([1, 2]);
    expect(cells).toContainEqual([2, 2]);
  });
});
