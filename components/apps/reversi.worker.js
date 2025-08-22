import { bestMove } from './reversiLogic';

onmessage = (e) => {
  const { board, player, depth } = e.data;
  const move = bestMove(board, player, depth);
  postMessage({ move });
};
