importScripts('https://cdn.jsdelivr.net/npm/stockfish@16/stockfish.wasm.js');

const engine = Stockfish();

engine.onmessage = function (event) {
  postMessage(event.data || event);
};

self.onmessage = function (e) {
  engine.postMessage(e.data);
};
