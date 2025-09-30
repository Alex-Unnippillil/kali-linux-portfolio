import { bestMove, DEFAULT_WEIGHTS } from '../components/apps/reversiLogic';

const PROGRESS_THROTTLE_MS = 100;

self.onmessage = (e) => {
  const { board, player, depth, weights = DEFAULT_WEIGHTS } = e.data;
  let lastProgress = 0;
  const sendProgress = (payload) => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - lastProgress >= PROGRESS_THROTTLE_MS || payload.completed) {
      lastProgress = now;
      self.postMessage({ type: 'progress', ...payload });
    }
  };
  const move = bestMove(board, player, depth, weights, { onProgress: sendProgress });
  self.postMessage({ type: 'done', move });
};
