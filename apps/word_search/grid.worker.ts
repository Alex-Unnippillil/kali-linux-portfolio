import { generateGrid } from './generator';
import type { GenerateResult } from './generator';

self.onmessage = (e: MessageEvent) => {
  const { words, size, seed } = e.data as {
    words: string[];
    size: number;
    seed: string;
  };
  const result: GenerateResult = generateGrid(words, size, seed);
  // eslint-disable-next-line no-restricted-globals
  (self as any).postMessage(result);
};

export {};
