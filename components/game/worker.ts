/// <reference lib="webworker" />
import { Engine } from 'matter-js';

// Simple physics step loop inside worker
const engine = Engine.create();

self.onmessage = (e: MessageEvent) => {
  const { canvas } = e.data as { canvas?: OffscreenCanvas };
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const step = 1000 / 60;
    const loop = () => {
      Engine.update(engine, step);
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      // Placeholder render
      ctx?.fillRect(10, 10, 10, 10);
      setTimeout(loop, step);
    };
    loop();
  }
};
