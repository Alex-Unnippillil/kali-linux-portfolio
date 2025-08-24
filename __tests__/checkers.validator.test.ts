import {
  createBoard,
  getPieceMoves,
  getAllMoves,
  applyMove,
  boardToBitboards,
  evaluateBoard,
  bitCount,
  hasMoves,
  createConfig,
  Config,
} from '@apps/checkers/engine';

const config: Config = createConfig('standard');

test('forced jumps are enforced', () => {
  const board = createBoard(config);
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) board[r][c] = null;
    }
  }
  board[5][0] = { color: 'red', king: false };
  board[4][1] = { color: 'black', king: false };
  const moves = getAllMoves(board, 'red', config);
  expect(moves).toEqual([
    { from: [5, 0], to: [3, 2], captured: [4, 1] },
  ]);
});

test('multi-jump availability', () => {
  const board = createBoard(config);
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) board[r][c] = null;
  }
  board[5][0] = { color: 'red', king: false };
  board[4][1] = { color: 'black', king: false };
  board[2][3] = { color: 'black', king: false };
  const first = getPieceMoves(board, 5, 0, config)[0];
  const { board: afterFirst } = applyMove(board, first, config);
  const further = getPieceMoves(afterFirst, first.to[0], first.to[1], config);
  expect(further).toEqual([
    { from: [3, 2], to: [1, 4], captured: [2, 3] },
  ]);
});

test('kinging on last row', () => {
  const board = createBoard(config);
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) board[r][c] = null;
  }
  board[1][2] = { color: 'red', king: false };
  const move = getPieceMoves(board, 1, 2, config)[0];
  const { board: newBoard, king } = applyMove(board, move, config);
  expect(king).toBe(true);
  expect(newBoard[0][1]?.king).toBe(true);
});

test('bitboard conversion matches piece counts', () => {
  const board = createBoard(config);
  const { red, black } = boardToBitboards(board, config);
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
  const { kings } = boardToBitboards(board, config);
  expect(kings).not.toBe(0n);
});

test('evaluateBoard and bitCount', () => {
  const board = createBoard(config);
  expect(evaluateBoard(board, config)).toBe(0);
  board[5][0] = null;
  expect(evaluateBoard(board, config)).toBeLessThan(0);
  expect(bitCount(0n)).toBe(0);
});

test('getPieceMoves handles empty and king pieces', () => {
  const board = createBoard(config);
  expect(getPieceMoves(board, 0, 0, config)).toEqual([]);
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) board[r][c] = null;
  board[3][2] = { color: 'red', king: true };
  const moves = getPieceMoves(board, 3, 2, config);
  expect(moves).toEqual([
    { from: [3, 2], to: [2, 1] },
    { from: [3, 2], to: [2, 3] },
    { from: [3, 2], to: [4, 1] },
    { from: [3, 2], to: [4, 3] },
  ]);
});

test('getAllMoves without captures', () => {
  const board = createBoard(config);
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) board[r][c] = null;
  board[5][0] = { color: 'red', king: false };
  board[0][1] = { color: 'red', king: false }; // piece with no moves
  const moves = getAllMoves(board, 'red', config);
  expect(moves).toEqual([{ from: [5, 0], to: [4, 1] }]);
});

test('applyMove without kinging', () => {
  const board = createBoard(config);
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) board[r][c] = null;
  board[5][0] = { color: 'red', king: false };
  const move = getPieceMoves(board, 5, 0, config)[0];
  const { king } = applyMove(board, move, config);
  expect(king).toBe(false);
});

test('capture blocked when landing square occupied', () => {
  const board = createBoard(config);
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) board[r][c] = null;
  board[5][0] = { color: 'red', king: false };
  board[4][1] = { color: 'black', king: false };
  board[3][2] = { color: 'black', king: false };
  const moves = getPieceMoves(board, 5, 0, config);
  expect(moves).toEqual([]);
});

test('stalemate detection', () => {
  const board = createBoard(config);
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) board[r][c] = null;
  board[0][1] = { color: 'black', king: false };
  board[1][0] = { color: 'red', king: false };
  board[1][2] = { color: 'red', king: false };
  board[2][3] = { color: 'red', king: false };
  expect(hasMoves(board, 'black', config)).toBe(false);
});
