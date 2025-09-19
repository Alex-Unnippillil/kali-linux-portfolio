import { bestMove, DEFAULT_WEIGHTS } from '@/components/apps/reversiLogic';

self.onmessage = (e) => {
  const { board, player, depth, weights = DEFAULT_WEIGHTS } = e.data;
  const move = bestMove(board, player, depth, weights);
  self.postMessage({ move });
};
