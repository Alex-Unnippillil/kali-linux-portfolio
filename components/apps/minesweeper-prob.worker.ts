import { deserialize, computeProbabilities } from '../../apps/minesweeper/engine';

self.onmessage = (e: MessageEvent) => {
  const g = deserialize(e.data.game);
  const probabilities = computeProbabilities(g);
  (self as any).postMessage({ probabilities });
};
