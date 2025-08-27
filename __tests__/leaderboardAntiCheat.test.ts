import { recordScore, getLeaderboard } from '../components/apps/Games/common/leaderboard';

describe('per-game leaderboard with anti-cheat', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('records valid scores in order', () => {
    recordScore('pong', 'Alice', 100);
    recordScore('pong', 'Bob', 200);
    const board = getLeaderboard('pong');
    expect(board[0]).toEqual({ name: 'Bob', score: 200 });
    expect(board[1]).toEqual({ name: 'Alice', score: 100 });
  });

  test('rejects invalid or suspicious scores', () => {
    recordScore('pong', 'Cheater1', 1e12);
    recordScore('pong', 'Cheater2', -5);
    recordScore('pong', 'Cheater3', Infinity);
    recordScore('pong', 'Legit', 50);
    const board = getLeaderboard('pong');
    expect(board).toHaveLength(1);
    expect(board[0]).toEqual({ name: 'Legit', score: 50 });
  });
});

