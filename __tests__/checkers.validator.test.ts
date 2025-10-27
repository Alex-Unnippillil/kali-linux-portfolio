import {
  createBoard,
  getPieceMoves,
  getAllMoves,
  applyMove,
  boardToBitboards,
  evaluateBoard,
  bitCount,
  hasMoves,
  isDraw,
} from '../components/apps/checkers/engine';

test('forced jumps are enforced', () => {
  const board = createBoard();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) board[r][c] = null;
    }
  }
  board[5][0] = { color: 'red', king: false };
  board[4][1] = { color: 'black', king: false };
  const moves = getAllMoves(board, 'red');
  expect(moves).toEqual([
    {
      from: [5, 0],
      to: [3, 2],
      path: [
        [5, 0],
        [3, 2],
      ],
      captures: [[4, 1]],
    },
  ]);
});

test('multi-jump availability', () => {
  const board = createBoard();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) board[r][c] = null;
  }
  board[5][0] = { color: 'red', king: false };
  board[4][1] = { color: 'black', king: false };
  board[2][3] = { color: 'black', king: false };
  const [jump] = getPieceMoves(board, 5, 0);
  expect(jump).toMatchObject({
    from: [5, 0],
    to: [1, 4],
    captures: [
      [4, 1],
      [2, 3],
    ],
    path: [
      [5, 0],
      [3, 2],
      [1, 4],
    ],
  });
  const { board: afterJump } = applyMove(board, jump);
  const postMoves = getPieceMoves(afterJump, 1, 4);
  expect(postMoves.every((m) => m.captures.length === 0)).toBe(true);
});

test('kinging on last row', () => {
  const board = createBoard();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) board[r][c] = null;
  }
  board[1][2] = { color: 'red', king: false };
  const move = getPieceMoves(board, 1, 2)[0];
  const { board: newBoard, king } = applyMove(board, move);
  expect(king).toBe(true);
  expect(newBoard[0][1]?.king).toBe(true);
});

test('bitboard conversion matches piece counts', () => {
  const board = createBoard();
  const { red, black } = boardToBitboards(board);
  const countBits = (n: bigint) => {
    let c = 0n;
    let x = n;
    while (x) {
      x &= x - 1n;
      c++;
    }
    return Number(c);
  };
  expect(countBits(red)).toBe(12);
  expect(countBits(black)).toBe(12);
  board[5][0]!.king = true;
  const { kings } = boardToBitboards(board);
  expect(kings).not.toBe(0n);
});

test('evaluateBoard and bitCount', () => {
  const board = createBoard();
  expect(evaluateBoard(board)).toBe(0);
  board[5][0] = null;
  expect(evaluateBoard(board)).toBeLessThan(0);
  expect(bitCount(0n)).toBe(0);
});

test('getPieceMoves handles empty and king pieces', () => {
  const board = createBoard();
  expect(getPieceMoves(board, 0, 0)).toEqual([]);
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) board[r][c] = null;
  board[3][2] = { color: 'red', king: true };
  const moves = getPieceMoves(board, 3, 2);
  expect(moves).toEqual([
    {
      from: [3, 2],
      to: [2, 1],
      path: [
        [3, 2],
        [2, 1],
      ],
      captures: [],
    },
    {
      from: [3, 2],
      to: [2, 3],
      path: [
        [3, 2],
        [2, 3],
      ],
      captures: [],
    },
    {
      from: [3, 2],
      to: [4, 1],
      path: [
        [3, 2],
        [4, 1],
      ],
      captures: [],
    },
    {
      from: [3, 2],
      to: [4, 3],
      path: [
        [3, 2],
        [4, 3],
      ],
      captures: [],
    },
  ]);
});

test('getAllMoves without captures', () => {
  const board = createBoard();
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) board[r][c] = null;
  board[5][0] = { color: 'red', king: false };
  board[0][1] = { color: 'red', king: false }; // piece with no moves
  const moves = getAllMoves(board, 'red');
  expect(moves).toEqual([
    {
      from: [5, 0],
      to: [4, 1],
      path: [
        [5, 0],
        [4, 1],
      ],
      captures: [],
    },
  ]);
});

test('applyMove without kinging', () => {
  const board = createBoard();
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) board[r][c] = null;
  board[5][0] = { color: 'red', king: false };
  const move = getPieceMoves(board, 5, 0)[0];
  const { king } = applyMove(board, move);
  expect(king).toBe(false);
});

test('capture blocked when landing square occupied', () => {
  const board = createBoard();
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) board[r][c] = null;
  board[5][0] = { color: 'red', king: false };
  board[4][1] = { color: 'black', king: false };
  board[3][2] = { color: 'black', king: false };
  const moves = getPieceMoves(board, 5, 0);
  expect(moves).toEqual([]);
});

test('stalemate detection', () => {
  const board = createBoard();
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) board[r][c] = null;
  board[0][1] = { color: 'black', king: false };
  board[1][0] = { color: 'red', king: false };
  board[1][2] = { color: 'red', king: false };
  board[2][3] = { color: 'red', king: false };
  expect(hasMoves(board, 'black')).toBe(false);
});

test('detect draw by repeated positions', () => {
  const board = createBoard();
  const map = new Map<string, number>();
  map.set(JSON.stringify(board), 3);
  expect(isDraw(0, map)).toBe(true);
});
