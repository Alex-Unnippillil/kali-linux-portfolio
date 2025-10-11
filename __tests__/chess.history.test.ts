import {
  recordMatch,
  loadHistory,
  clearHistory,
  loadBestElo,
  MAX_HISTORY,
} from '../apps/chess/history';

beforeEach(() => {
  window.localStorage.clear();
});

describe('chess history persistence', () => {
  it('stores match entries and updates best Elo', () => {
    const first = recordMatch({
      result: 'win',
      finalElo: 1250,
      moves: 42,
      pgn: '1.e4',
      timestamp: 1,
    });
    expect(first.history[0]).toMatchObject({ result: 'win', finalElo: 1250 });
    expect(first.bestElo).toBe(1250);

    const second = recordMatch({
      result: 'loss',
      finalElo: 1180,
      moves: 30,
      pgn: '1.d4',
      timestamp: 2,
    });
    expect(second.history).toHaveLength(2);
    expect(loadBestElo()).toBe(1250);

    const boardRaw = window.localStorage.getItem('leaderboard:chess');
    expect(boardRaw).toBeTruthy();
  });

  it('caps history length', () => {
    for (let i = 0; i < MAX_HISTORY + 5; i += 1) {
      recordMatch({
        result: 'draw',
        finalElo: 1200 + i,
        moves: 10,
        pgn: '1.e4 e5',
        timestamp: i,
      });
    }
    const history = loadHistory();
    expect(history).toHaveLength(MAX_HISTORY);
    expect(history[0].timestamp).toBe(MAX_HISTORY + 4);
    expect(history[MAX_HISTORY - 1].timestamp).toBeGreaterThanOrEqual(0);
  });

  it('clears persisted state', () => {
    recordMatch({ result: 'win', finalElo: 1300, moves: 20, pgn: '1.c4', timestamp: 99 });
    clearHistory();
    expect(loadHistory()).toEqual([]);
    expect(loadBestElo()).toBe(0);
  });
});
