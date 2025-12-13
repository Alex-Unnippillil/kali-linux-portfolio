import { bestMove, DEFAULT_WEIGHTS } from '../components/apps/reversiLogic';

const PROGRESS_THROTTLE_MS = 100;

self.onmessage = (e) => {
  const {
    board,
    player,
    depth,
    weights = DEFAULT_WEIGHTS,
    randomizeTop = 0,
    id,
  } = e.data;
  let lastProgress = 0;
  const sendProgress = (payload) => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - lastProgress >= PROGRESS_THROTTLE_MS || payload.completed) {
      lastProgress = now;
      self.postMessage({ type: 'progress', id, ...payload });
    }
  };
  const move = bestMove(board, player, depth, weights, {
    onProgress: sendProgress,
    randomizeTop,
  });
  self.postMessage({ type: 'done', id, move });
};
