/// <reference lib="webworker" />
import Stockfish from 'stockfish/src/stockfish-nnue-16.js';

const engine = Stockfish();

self.onmessage = (e: MessageEvent) => {
  engine.postMessage(e.data);
};

(engine as any).onmessage = (e: MessageEvent) => {
  postMessage(e.data);
};

export {};
