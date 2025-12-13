import {
  applyMove,
  chooseAiMove,
  createEmptyBoard,
  getResultAfterMove,
  getWinLineFromLastMove,
  isBoardFull,
} from '../games/connect-four/solver';

describe('connect four solver', () => {
  const playMoves = (sequence: Array<{ col: number; player: 'red' | 'yellow' }>) => {
    let board = createEmptyBoard();
    let last = null as { row: number; col: number; player: 'red' | 'yellow' } | null;
    for (const move of sequence) {
      const applied = applyMove(board, move.col, move.player);
      if (!applied) throw new Error('Invalid test move');
      board = applied.board;
      last = { row: applied.row, col: move.col, player: move.player };
    }
    return { board, last };
  };

  test('detects horizontal win from last move', () => {
    const { board, last } = playMoves([
      { col: 0, player: 'red' },
      { col: 1, player: 'red' },
      { col: 2, player: 'red' },
      { col: 3, player: 'red' },
    ]);
    expect(last).not.toBeNull();
    const win = getWinLineFromLastMove(board, last!.row, last!.col, last!.player);
    expect(win).not.toBeNull();
  });

  test('detects vertical win from last move', () => {
    const { board, last } = playMoves([
      { col: 0, player: 'yellow' },
      { col: 0, player: 'yellow' },
      { col: 0, player: 'yellow' },
      { col: 0, player: 'yellow' },
    ]);
    const win = getWinLineFromLastMove(board, last!.row, last!.col, last!.player);
    expect(win).not.toBeNull();
  });

  test('detects diagonal down-right win from last move', () => {
    const { board, last } = playMoves([
      { col: 0, player: 'red' },
      { col: 1, player: 'yellow' },
      { col: 1, player: 'red' },
      { col: 2, player: 'yellow' },
      { col: 2, player: 'yellow' },
      { col: 2, player: 'red' },
      { col: 3, player: 'yellow' },
      { col: 3, player: 'yellow' },
      { col: 3, player: 'yellow' },
      { col: 3, player: 'red' },
    ]);
    const win = getWinLineFromLastMove(board, last!.row, last!.col, last!.player);
    expect(win).not.toBeNull();
  });

  test('detects diagonal down-left win from last move', () => {
    const { board, last } = playMoves([
      { col: 3, player: 'yellow' },
      { col: 2, player: 'red' },
      { col: 2, player: 'yellow' },
      { col: 1, player: 'red' },
      { col: 1, player: 'red' },
      { col: 1, player: 'yellow' },
      { col: 0, player: 'red' },
      { col: 0, player: 'red' },
      { col: 0, player: 'red' },
      { col: 0, player: 'yellow' },
    ]);
    const win = getWinLineFromLastMove(board, last!.row, last!.col, last!.player);
    expect(win).not.toBeNull();
  });

  test('detects draw on full board without winner', () => {
    const pattern = [
      'YYRYYRY',
      'RRRYRRR',
      'YRRYRRR',
      'RYYRYYY',
      'RRYYYRR',
      'RRYRYYR',
    ];
    const board = pattern.map((row) =>
      row.split('').map((ch) => {
        if (ch === 'Y') return 'yellow';
        if (ch === 'R') return 'red';
        return null;
      }),
    );
    expect(isBoardFull(board)).toBe(true);
    const lastRow = board.length - 1;
    const lastCol = board[0].length - 1;
    const lastPlayer = board[lastRow][lastCol] as 'red' | 'yellow';
    const result = getResultAfterMove(board, { row: lastRow, col: lastCol, player: lastPlayer });
    expect(result.status).toBe('draw');
  });

  test('ai does not select full column', () => {
    let board = createEmptyBoard();
    const fillColumn = 3;
    for (let i = 0; i < 6; i += 1) {
      const move = applyMove(board, fillColumn, 'yellow');
      if (!move) break;
      board = move.board;
    }
    const move = chooseAiMove(board, 'red', 'hard');
    expect(move.column).not.toBe(fillColumn);
  });
});
