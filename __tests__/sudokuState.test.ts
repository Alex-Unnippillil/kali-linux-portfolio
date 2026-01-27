import { createCell } from '../apps/games/sudoku/cell';
import {
  MAX_HISTORY,
  applyHistoryEntry,
  createPuzzleIdentity,
  deserializeBoard,
  formatLocalDate,
  pushHistory,
  serializeBoard,
  type HistoryEntry,
} from '../apps/games/sudoku/state';

describe('sudoku state helpers', () => {
  test('formatLocalDate uses local date parts', () => {
    const date = new Date(2024, 3, 5, 23, 30);
    expect(formatLocalDate(date)).toBe('2024-04-05');
  });

  test('createPuzzleIdentity includes difficulty and local date for daily puzzles', () => {
    const date = new Date(2024, 6, 1, 8, 0);
    const identity = createPuzzleIdentity('daily', 'medium', 123, date);
    expect(identity.id).toBe('daily:2024-07-01:medium');
    expect(identity.seed).toBeGreaterThan(0);
  });

  test('createPuzzleIdentity includes seed and difficulty for random puzzles', () => {
    const identity = createPuzzleIdentity('random', 'hard', 4242, new Date());
    expect(identity.id).toBe('random:4242:hard');
    expect(identity.seed).toBe(4242);
  });

  test('serialize and deserialize board round-trip values and candidates', () => {
    const board = [
      [createCell(1), createCell(0)],
      [createCell(0), createCell(2)],
    ];
    board[0][1].candidates = [3, 4];
    const serialized = serializeBoard(board);
    const restored = deserializeBoard(serialized.values, serialized.candidates);
    expect(restored[0][1].candidates).toEqual([3, 4]);
    expect(restored[1][1].value).toBe(2);
  });

  test('applyHistoryEntry reverts cell changes', () => {
    const board = [[createCell(0)]];
    const before = createCell(0);
    const after = createCell(5);
    const entry = { kind: 'value' as const, r: 0, c: 0, before, after };
    const nextBoard = applyHistoryEntry(board, entry, 'redo');
    expect(nextBoard[0][0].value).toBe(5);
    const reverted = applyHistoryEntry(nextBoard, entry, 'undo');
    expect(reverted[0][0].value).toBe(0);
  });

  test('pushHistory caps history length', () => {
    let history: HistoryEntry[] = [];
    for (let i = 0; i < MAX_HISTORY + 10; i++) {
      history = pushHistory(history, {
        kind: 'value',
        r: 0,
        c: 0,
        before: createCell(0),
        after: createCell(i % 9),
      });
    }
    expect(history).toHaveLength(MAX_HISTORY);
  });
});
