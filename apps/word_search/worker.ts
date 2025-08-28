import { generateGrid } from './generator';
import type { WordPlacement } from './types';

interface Message {
  words: string[];
  size: number;
  seed: string;
}

self.onmessage = (e: MessageEvent<Message>) => {
  const { words, size, seed } = e.data;
  const result = generateGrid(words, size, seed);
  (self as any).postMessage(result);
};
