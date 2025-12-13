import {
  applyMove,
  bestMove,
  computeLegalMoves,
  createBoard,
  evaluateBoard,
  getBookMove,
  getFlipsForMove,
  getTurnResolution,
} from '../components/apps/reversiLogic';

const boardFromAscii = (rows: string[]) =>
  rows.map((row) =>
    row.split('').map((c) => {
      if (c === '.') return null;
      return c as 'B' | 'W';
    }),
  );

describe('Reversi rules', () => {
  test('flip correctness in all directions', () => {
    const cases = [
      {
        name: 'north',
        move: [5, 3],
        expected: [[4, 3]],
        board: boardFromAscii([
          '........',
          '........',
          '........',
          '...B....',
          '...W....',
          '........',
          '........',
          '........',
        ]),
      },
      {
        name: 'south',
        move: [2, 4],
        expected: [[3, 4]],
        board: boardFromAscii([
          '........',
          '........',
          '........',
          '....W...',
          '....B...',
          '........',
          '........',
          '........',
        ]),
      },
      {
        name: 'east',
        move: [4, 2],
        expected: [[4, 3]],
        board: boardFromAscii([
          '........',
          '........',
          '........',
          '........',
          '...WB...',
          '........',
          '........',
          '........',
        ]),
      },
      {
        name: 'west',
        move: [3, 5],
        expected: [[3, 4]],
        board: boardFromAscii([
          '........',
          '........',
          '........',
          '...BW...',
          '........',
          '........',
          '........',
          '........',
        ]),
      },
      {
        name: 'northeast',
        move: [5, 2],
        expected: [[4, 3]],
        board: boardFromAscii([
          '........',
          '........',
          '........',
          '....B...',
          '...W....',
          '........',
          '........',
          '........',
        ]),
      },
      {
        name: 'northwest',
        move: [5, 4],
        expected: [[4, 3]],
        board: boardFromAscii([
          '........',
          '........',
          '........',
          '..B.....',
          '...W....',
          '........',
          '........',
          '........',
        ]),
      },
      {
        name: 'southeast',
        move: [2, 2],
        expected: [[3, 3]],
        board: boardFromAscii([
          '........',
          '........',
          '........',
          '...W....',
          '....B...',
          '........',
          '........',
          '........',
          '........',
        ]),
      },
      {
        name: 'southwest',
        move: [2, 4],
        expected: [[3, 3]],
        board: boardFromAscii([
          '........',
          '........',
          '........',
          '...W....',
          '..B.....',
          '........',
          '........',
          '........',
          '........',
        ]),
      },
    ];

    cases.forEach(({ board, move, expected }) => {
      const flips = getFlipsForMove(board, move[0], move[1], 'B');
      expect(flips).toEqual(expected);
      const moves = computeLegalMoves(board, 'B');
      expect(moves[`${move[0]}-${move[1]}`]).toEqual(expected);
      const next = applyMove(board, move[0], move[1], 'B', flips);
      expected.forEach(([r, c]) => {
        expect(next[r][c]).toBe('B');
      });
    });
  });

  test('multi-direction flips combine', () => {
    const board = boardFromAscii([
      '........',
      '...B....',
      '...W....',
      '....WB..',
      '........',
      '........',
      '........',
      '........',
    ]);
    const flips = getFlipsForMove(board, 3, 3, 'B');
    expect(flips).toEqual([
      [3, 4],
      [2, 3],
    ]);
    const next = applyMove(board, 3, 3, 'B', flips);
    expect(next[2][3]).toBe('B');
    expect(next[3][4]).toBe('B');
  });

  test('unbounded chains are not legal', () => {
    const board = boardFromAscii([
      '........',
      '........',
      '........',
      '.WWWW...',
      '........',
      '........',
      '........',
      '........',
    ]);
    const flips = getFlipsForMove(board, 3, 0, 'B');
    expect(flips).toHaveLength(0);
    const moves = computeLegalMoves(board, 'B');
    expect(moves['3-0']).toBeUndefined();
    expect(() => applyMove(board, 3, 0, 'B')).toThrow();
  });

  test('pass and gameover resolution', () => {
    const board = boardFromAscii([
      'WWWWWWWW',
      'WWWWWWWW',
      'WWWWWWWW',
      'WWWB.WWW',
      'WWWWWWWW',
      'WWWWWWWW',
      'WWWWWWWW',
      'WWWWWWWW',
    ]);
    const passState = getTurnResolution(board, 'B');
    expect(passState.kind).toBe('pass');
    expect(passState.nextPlayer).toBe('W');

    const filled = boardFromAscii(Array(8).fill('BBBBBBBB'));
    const over = getTurnResolution(filled, 'B');
    expect(over.kind).toBe('gameover');
    expect(over.winner).toBe('B');
  });

  test('evaluation prefers corners', () => {
    const board = createBoard();
    board[0][0] = 'B';
    const withCorner = evaluateBoard(board, 'B');
    board[0][0] = 'W';
    const withoutCorner = evaluateBoard(board, 'B');
    expect(withCorner).toBeGreaterThan(withoutCorner);
  });

  test('opening book provides first response', () => {
    const board = createBoard();
    const moves = computeLegalMoves(board, 'B');
    const after = applyMove(board, 2, 3, 'B', moves['2-3']);
    expect(getBookMove(after, 'W')).toEqual([2, 2]);
  });

  test('AI selects legal moves and values corners', () => {
    const board = boardFromAscii([
      '........',
      '........',
      '........',
      '...BW...',
      '...WB...',
      '........',
      '........',
      '........',
    ]);
    const move = bestMove(board, 'B', 2, undefined, { randomizeTop: 0 });
    expect(move).not.toBeNull();
    if (move) {
      const legal = computeLegalMoves(board, 'B');
      expect(legal[`${move[0]}-${move[1]}`]).toBeDefined();
    }

    const cornerBoard = boardFromAscii([
      '.WB.....',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
    ]);
    const cornerMove = bestMove(cornerBoard, 'B', 3, undefined, { randomizeTop: 0 });
    expect(cornerMove).toEqual([0, 0]);
  });
});
