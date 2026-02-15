import { COLS, ROWS, getMoveForDifficulty } from '../../games/connect-four/solver';

const isToken = (value) => value === 'red' || value === 'yellow';
const isDifficulty = (value) => value === 'easy' || value === 'normal' || value === 'hard';

const isBoard = (board) =>
  Array.isArray(board) &&
  board.length === ROWS &&
  board.every((row) =>
    Array.isArray(row) &&
    row.length === COLS &&
    row.every((cell) => cell === null || cell === 'red' || cell === 'yellow'),
  );

onmessage = (event) => {
  const { taskId, board, player, difficulty, quality } = event.data || {};

  if (typeof taskId !== 'number') return;
  if (!isBoard(board) || !isToken(player) || !isDifficulty(difficulty)) {
    postMessage({ taskId, error: 'invalid-payload' });
    return;
  }

  try {
    const result = getMoveForDifficulty(board, player, difficulty, {
      hardTimeMs: quality > 1 ? 750 : 350,
    });
    postMessage({ taskId, column: result.column, scores: result.scores, depthReached: result.depthReached });
  } catch {
    postMessage({ taskId, error: 'solver-failure' });
  }
};
