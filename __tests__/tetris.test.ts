import { createBoard, merge, clearLines, checkTSpin, attemptHold } from '../utils/tetris';

test('line clear removes rows', () => {
  const board = createBoard();
  board[19] = Array(10).fill(1);
  const { board: cleared, lines } = clearLines(board);
  expect(lines).toBe(1);
  expect(cleared[19].every((c: any) => c === 0)).toBe(true);
});

test('T-spin recognized', () => {
  let board = createBoard();
  const shape = [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ];
  const pos = { x: 4, y: 10 };
  board = merge(board, shape, pos.x, pos.y, 'T');
  board[10][4] = 1;
  board[10][6] = 1;
  board[12][4] = 1;
  expect(checkTSpin(board, { type: 'T' }, pos, true)).toBe(true);
});

test('hold swaps once per piece', () => {
  const pieceA = { type: 'I' };
  const pieceB = { type: 'J' };
  let state = attemptHold(pieceA, null, pieceB, true);
  expect(state.hold.type).toBe('I');
  expect(state.piece.type).toBe('J');
  expect(state.canHold).toBe(false);
  const again = attemptHold(state.piece, state.hold, state.next, state.canHold);
  expect(again.piece.type).toBe(state.piece.type);
  expect(again.hold.type).toBe(state.hold.type);
  expect(again.canHold).toBe(false);
});
