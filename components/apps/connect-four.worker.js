import { getBestMove } from '../../games/connect-four/solver';

onmessage = (event) => {
  const { taskId, board, depth, player } = event.data || {};
  if (!board || typeof depth !== 'number' || !player) return;
  const { column, scores } = getBestMove(board, depth, player);
  postMessage({ taskId, column, scores });
};
