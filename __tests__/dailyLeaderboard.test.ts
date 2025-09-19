import {
  getDailySeed,
  recordCompletion,
  getLeaderboard,
  hasCompleted,
} from '@/utils';

describe('daily challenge and leaderboard', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('daily seed identical across devices', () => {
    const seed1 = getDailySeed('hangman', new Date('2024-05-01T00:00:00Z'));
    const seed2 = getDailySeed('hangman', new Date('2024-05-01T23:59:59Z'));
    expect(seed1).toBe(seed2);
  });

  test('records completion and leaderboard', () => {
    recordCompletion(
      'hangman',
      'Alice',
      10,
      new Date('2024-05-01T10:00:00Z'),
    );
    expect(hasCompleted('hangman', new Date('2024-05-01T23:00:00Z'))).toBe(
      true,
    );
    recordCompletion(
      'hangman',
      'Bob',
      20,
      new Date('2024-05-01T12:00:00Z'),
    );
    const board = getLeaderboard('hangman');
    expect(board[0]).toEqual({ name: 'Bob', score: 20 });
    expect(board[1]).toEqual({ name: 'Alice', score: 10 });
    const raw = window.localStorage.getItem('leaderboard:hangman');
    expect(raw && JSON.parse(raw).length).toBe(2);
  });
});
