import {
  BOARD_SIZE,
  createEmptyBoard,
  checkWinner,
  isBoardFull,
  chooseAiMove,
  createDefaultStats,
  applyResultToStats,
} from '../apps/games/gomoku/logic';

describe('gomoku win detection', () => {
  it('detects horizontal wins', () => {
    const board = createEmptyBoard();
    const row = 7;
    for (let col = 3; col < 8; col += 1) {
      board[row][col] = 'black';
    }
    const result = checkWinner(board, row, 5, 'black');
    expect(result).not.toBeNull();
    expect(result?.winner).toBe('black');
    expect(result?.line).toHaveLength(5);
  });

  it('detects vertical wins', () => {
    const board = createEmptyBoard();
    const col = 4;
    for (let row = 2; row < 7; row += 1) {
      board[row][col] = 'white';
    }
    const result = checkWinner(board, 4, col, 'white');
    expect(result).not.toBeNull();
    expect(result?.winner).toBe('white');
  });

  it('detects diagonal wins', () => {
    const board = createEmptyBoard();
    for (let i = 0; i < 5; i += 1) {
      board[5 + i][5 + i] = 'black';
    }
    const result = checkWinner(board, 8, 8, 'black');
    expect(result).not.toBeNull();
    expect(result?.line?.[0]).toEqual({ row: 5, col: 5 });
  });

  it('identifies full board draws', () => {
    const board = createEmptyBoard(5);
    let toggle = true;
    for (let r = 0; r < 5; r += 1) {
      for (let c = 0; c < 5; c += 1) {
        board[r][c] = toggle ? 'black' : 'white';
        toggle = !toggle;
      }
    }
    expect(isBoardFull(board)).toBe(true);
  });
});

describe('gomoku AI heuristics', () => {
  it('blocks immediate opponent wins', () => {
    const board = createEmptyBoard();
    const row = Math.floor(BOARD_SIZE / 2);
    board[row][4] = 'white';
    board[row][5] = 'white';
    board[row][6] = 'white';
    board[row][7] = 'white';
    const move = chooseAiMove(board, 'black', 'white', 'balanced');
    expect(move).not.toBeNull();
    expect([
      { row, col: 3 },
      { row, col: 8 },
    ]).toContainEqual(move);
  });
});

describe('gomoku stats persistence', () => {
  it('tracks streaks and best streak for AI games', () => {
    const stats = createDefaultStats();
    const afterWin = applyResultToStats(stats, 'ai', 'black', 'black');
    expect(afterWin.ai.playerWins).toBe(1);
    expect(afterWin.ai.streak).toBe(1);
    const afterSecondWin = applyResultToStats(afterWin, 'ai', 'black', 'black');
    expect(afterSecondWin.ai.playerWins).toBe(2);
    expect(afterSecondWin.ai.streak).toBe(2);
    expect(afterSecondWin.ai.bestStreak).toBe(2);
    const afterLoss = applyResultToStats(afterSecondWin, 'ai', 'white', 'black');
    expect(afterLoss.ai.aiWins).toBe(1);
    expect(afterLoss.ai.streak).toBe(0);
    expect(afterLoss.ai.bestStreak).toBe(2);
  });

  it('tracks local mode wins separately', () => {
    const stats = createDefaultStats();
    const afterLocal = applyResultToStats(stats, 'local', 'white', 'black');
    expect(afterLocal.local.whiteWins).toBe(1);
    expect(afterLocal.ai.playerWins).toBe(0);
  });
});
