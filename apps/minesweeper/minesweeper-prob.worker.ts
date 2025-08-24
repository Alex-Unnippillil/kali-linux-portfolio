import { deserialize, computeProbabilities } from './engine';

self.onmessage = (e: MessageEvent) => {
  const g = deserialize(e.data.game);
  const probabilities = computeProbabilities(g);
  (self as any).postMessage({ probabilities });
};
