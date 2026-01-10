import {
  createEmptyBoard,
  findWinningCells,
  ROWS,
} from '../games/connect-four/solver';
import {
  DEFAULT_STATS,
  STATS_STORAGE_KEY,
  loadStats,
  recordOutcome,
  saveStats,
} from '../games/connect-four/stats';

describe('connect-four solver', () => {
  it('detects horizontal wins', () => {
    const board = createEmptyBoard();
    board[ROWS - 1][0] = 'yellow';
    board[ROWS - 1][1] = 'yellow';
    board[ROWS - 1][2] = 'yellow';
    board[ROWS - 1][3] = 'yellow';
    expect(findWinningCells(board, 'yellow')).toEqual([
      { row: ROWS - 1, col: 0 },
      { row: ROWS - 1, col: 1 },
      { row: ROWS - 1, col: 2 },
      { row: ROWS - 1, col: 3 },
    ]);
  });

  it('detects diagonal wins', () => {
    const board = createEmptyBoard();
    board[ROWS - 1][0] = 'red';
    board[ROWS - 2][1] = 'red';
    board[ROWS - 3][2] = 'red';
    board[ROWS - 4][3] = 'red';
    expect(findWinningCells(board, 'red')).toEqual([
      { row: ROWS - 4, col: 3 },
      { row: ROWS - 3, col: 2 },
      { row: ROWS - 2, col: 1 },
      { row: ROWS - 1, col: 0 },
    ]);
  });
});

describe('connect-four stats persistence', () => {
  const createMockStorage = (initial: Record<string, string> = {}) => {
    const store = { ...initial };
    return {
      getItem: jest.fn((key: string) => (key in store ? store[key] : null)),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
      }),
      store,
    };
  };

  it('loads stored statistics when available', () => {
    const storage = createMockStorage({
      [STATS_STORAGE_KEY]: JSON.stringify({
        playerWins: 5,
        cpuWins: 2,
        draws: 1,
      }),
    });
    expect(loadStats(storage)).toEqual({
      playerWins: 5,
      cpuWins: 2,
      draws: 1,
    });
  });

  it('records outcomes and persists results', () => {
    const storage = createMockStorage();
    const afterPlayerWin = recordOutcome(DEFAULT_STATS, 'player');
    expect(afterPlayerWin).toEqual({
      playerWins: 1,
      cpuWins: 0,
      draws: 0,
    });
    saveStats(afterPlayerWin, storage);
    expect(storage.setItem).toHaveBeenCalledWith(
      STATS_STORAGE_KEY,
      JSON.stringify(afterPlayerWin),
    );
  });
});
