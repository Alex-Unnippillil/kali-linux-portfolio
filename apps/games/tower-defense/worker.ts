import {
  createTowerDefenseEngine,
  TowerDefenseStatus,
  EngineConfig,
  TowerDefenseEngine,
} from './engine';

const raf = (cb: FrameRequestCallback): number => {
  const rAF = (self as any).requestAnimationFrame;
  if (typeof rAF === 'function') return rAF(cb);
  return (self as any).setTimeout(() => cb(performance.now()), 16);
};

let ctx: OffscreenCanvasRenderingContext2D | null = null;
let canvasWidth = 0;
let canvasHeight = 0;
let dpr = 1;
let engine: TowerDefenseEngine | null = null;
let last = 0;
let frameHandle: number | null = null;

const postStatus = (status: TowerDefenseStatus) => {
  (self as DedicatedWorkerGlobalScope).postMessage({
    type: 'status',
    status,
  });
};

const step = (time: number) => {
  if (!engine || !ctx) {
    frameHandle = raf(step);
    return;
  }
  const dt = (time - last) / 1000;
  last = time;
  engine.step(dt);
  engine.draw(ctx);
  frameHandle = raf(step);
};

const applyResize = () => {
  if (!ctx || !(ctx.canvas instanceof OffscreenCanvas)) return;
  ctx.canvas.width = Math.floor(canvasWidth * dpr);
  ctx.canvas.height = Math.floor(canvasHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
};

self.onmessage = (event: MessageEvent) => {
  const data = event.data as
    | { type: 'init'; canvas: OffscreenCanvas; width: number; height: number; cellSize: number; gridSize: number; dpr: number }
    | { type: 'state'; payload: EngineConfig }
    | { type: 'start' }
    | { type: 'resize'; width: number; height: number; dpr: number };

  if (data.type === 'init') {
    ctx = data.canvas.getContext('2d');
    canvasWidth = data.width;
    canvasHeight = data.height;
    dpr = data.dpr || 1;
    if (!ctx) return;
    engine = createTowerDefenseEngine({
      cellSize: data.cellSize,
      gridSize: data.gridSize,
      onStatusChange: postStatus,
    });
    applyResize();
    postStatus(engine.getStatus());
    last = performance.now();
    if (frameHandle !== null && typeof (self as any).cancelAnimationFrame === 'function') {
      (self as any).cancelAnimationFrame(frameHandle);
    }
    frameHandle = raf(step);
  } else if (data.type === 'state') {
    engine?.setConfig(data.payload);
  } else if (data.type === 'start') {
    engine?.start();
  } else if (data.type === 'resize') {
    canvasWidth = data.width;
    canvasHeight = data.height;
    dpr = data.dpr || 1;
    applyResize();
  }
};

export {};
