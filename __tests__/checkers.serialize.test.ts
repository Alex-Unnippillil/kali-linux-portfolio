import { Board, parsePosition, serializePosition } from '../components/apps/checkers/engine';

const emptyBoard = (): Board =>
  Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));

describe('checkers position serialization', () => {
  test('round-trips serialized positions with kings and pending captures', () => {
    const board = emptyBoard();
    board[5][0] = { color: 'red', king: false };
    board[3][2] = { color: 'red', king: true };
    board[4][5] = { color: 'black', king: false };
    board[2][7] = { color: 'black', king: true };

    const key = serializePosition(board, 'black', [3, 2], 'relaxed');
    const parsed = parsePosition(key);
    const key2 = serializePosition(parsed.board, parsed.turn, parsed.pendingCaptureFrom, parsed.mode);

    expect(key2).toBe(key);
    expect(parsed.turn).toBe('black');
    expect(parsed.mode).toBe('relaxed');
    expect(parsed.pendingCaptureFrom).toEqual([3, 2]);
  });

  test('throws for invalid format fields', () => {
    expect(() => parsePosition('deadbeef-red-none-forced')).toThrow('Invalid format');
    expect(() => parsePosition('zz-1-1-red-none-forced')).toThrow('Invalid red bitboard');
    expect(() => parsePosition('1-2-0-green-none-forced')).toThrow('Invalid turn');
    expect(() => parsePosition('1-2-0-red-none-hardcore')).toThrow('Invalid mode');
    expect(() => parsePosition('1-2-0-red-9,2-forced')).toThrow('out of range');
  });

  test('throws for invalid overlapping bitboards', () => {
    expect(() => parsePosition('1-1-0-red-none-forced')).toThrow('overlap');
  });

  test('throws when kings exist without pieces', () => {
    expect(() => parsePosition('0-0-1-red-none-forced')).toThrow('empty squares');
  });
});
