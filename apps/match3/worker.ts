import { resolveBoard, rngFactory } from './index';

self.onmessage = (e: MessageEvent) => {
  const { board, seed, maxChain } = e.data as {
    board: any;
    seed: number;
    maxChain: number;
  };
  const rand = rngFactory(seed);
  const result = resolveBoard(board, rand, maxChain);
  // @ts-ignore
  self.postMessage(result);
};
