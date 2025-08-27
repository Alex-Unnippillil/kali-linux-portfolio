import { getDailySeed, recordScore, getLeaderboard } from '../utils/dailyChallenge';

describe('daily challenge and leaderboard', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('daily seed identical across devices', () => {
    const seed1 = getDailySeed('hangman', new Date('2024-05-01T00:00:00Z'));
    const seed2 = getDailySeed('hangman', new Date('2024-05-01T23:59:59Z'));
    expect(seed1).toBe(seed2);
  });

  test('leaderboard stored via localStorage', () => {
    recordScore('hangman', 'Alice', 10);
    recordScore('hangman', 'Bob', 20);
    const board = getLeaderboard('hangman');
    expect(board[0]).toEqual({ name: 'Bob', score: 20 });
    expect(board[1]).toEqual({ name: 'Alice', score: 10 });
    const raw = window.localStorage.getItem('leaderboard:hangman');
    expect(raw && JSON.parse(raw).length).toBe(2);
  });
});
