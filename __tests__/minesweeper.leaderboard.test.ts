import {
  LEADERBOARD_LIMIT,
  clearLeaderboard,
  loadLeaderboards,
  recordTime,
  shouldRecordTime,
} from '../games/minesweeper/leaderboard';

describe('minesweeper leaderboard storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('records times in ascending order with enforced limit', () => {
    recordTime('beginner', 'Alice', 12.5);
    recordTime('beginner', 'Bob', 8.2);
    recordTime('beginner', 'Carol', 15.1);

    const board = loadLeaderboards().beginner;
    expect(board).toHaveLength(3);
    expect(board.map((entry) => entry.name)).toEqual(['Bob', 'Alice', 'Carol']);
    expect(board[0].time).toBeCloseTo(8.2);
  });

  test('applies leaderboard size limit', () => {
    for (let i = 0; i < LEADERBOARD_LIMIT + 2; i += 1) {
      recordTime('intermediate', `Player${i}`, 10 + i);
    }

    const board = loadLeaderboards().intermediate;
    expect(board).toHaveLength(LEADERBOARD_LIMIT);
    expect(board[board.length - 1].time).toBeCloseTo(10 + LEADERBOARD_LIMIT - 1);
  });

  test('shouldRecordTime validates qualification rules', () => {
    expect(shouldRecordTime([], 25)).toBe(true);

    const filled = Array.from({ length: LEADERBOARD_LIMIT }, (_, i) => ({
      name: `P${i}`,
      time: 10 + i,
      createdAt: i,
    }));

    expect(shouldRecordTime(filled, 9)).toBe(true);
    expect(shouldRecordTime(filled, 10 + LEADERBOARD_LIMIT - 1)).toBe(false);
    expect(shouldRecordTime(filled, Infinity)).toBe(false);
  });

  test('clearLeaderboard removes entries for the requested difficulty', () => {
    recordTime('expert', 'A', 20);
    expect(loadLeaderboards().expert).toHaveLength(1);
    clearLeaderboard('expert');
    expect(loadLeaderboards().expert).toHaveLength(0);
  });

  test('loadLeaderboards sanitizes invalid stored data', () => {
    window.localStorage.setItem(
      'minesweeper:leaderboards',
      JSON.stringify({
        beginner: [
          { name: 'Bad', time: -5, createdAt: 'nope' },
          { name: 'Good', time: 9, createdAt: 0 },
        ],
      }),
    );

    const board = loadLeaderboards().beginner;
    expect(board).toHaveLength(1);
    expect(board[0].name).toBe('Good');
    expect(board[0].time).toBe(9);
  });
});

