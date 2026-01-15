/// <reference lib="webworker" />

import {
  GameState,
  createGameState,
  drawGameState,
  handleKey,
  resetGameState,
  resizeGameState,
  setPaused,
  updateGameState,
} from './engine';

interface InitMessage {
  type: 'init';
  canvas: OffscreenCanvas;
  width: number;
  height: number;
  dpr: number;
}

interface ResizeMessage {
  type: 'resize';
  width: number;
  height: number;
  dpr: number;
}

interface KeyMessage {
  type: 'keydown' | 'keyup';
  key: string;
}

interface PauseMessage {
  type: 'setPaused';
  paused: boolean;
}

interface ResetMessage {
  type: 'reset';
}

type WorkerMessage =
  | InitMessage
  | ResizeMessage
  | KeyMessage
  | PauseMessage
  | ResetMessage;

let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;
let dpr = 1;
let state: GameState | null = null;
let last = 0;

const raf = (cb: FrameRequestCallback): number => {
  const rAF = (self as any).requestAnimationFrame;
  if (typeof rAF === 'function') return rAF(cb);
  return (self as any).setTimeout(() => cb(performance.now()), 16);
};

const resizeCanvas = (width: number, height: number, devicePixelRatio: number) => {
  if (!canvas || !ctx) return;
  dpr = devicePixelRatio || 1;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (state) {
    resizeGameState(state, width, height);
  }
};

const postState = () => {
  if (!state) return;
  (self as DedicatedWorkerGlobalScope).postMessage({
    type: 'state',
    score: state.score,
    lives: state.lives,
    paused: state.paused,
  });
};

const loop = (now: number) => {
  if (!ctx || !state) return;
  const dt = (now - last) / 1000;
  last = now;
  updateGameState(state, dt);
  drawGameState(ctx as unknown as CanvasRenderingContext2D, state, dpr);
  postState();
  raf(loop);
};

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const data = event.data;
  switch (data.type) {
    case 'init': {
      canvas = data.canvas;
      ctx = canvas.getContext('2d');
      dpr = data.dpr || 1;
      state = createGameState(data.width, data.height);
      if (ctx) {
        canvas.width = Math.floor(data.width * dpr);
        canvas.height = Math.floor(data.height * dpr);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        drawGameState(ctx as unknown as CanvasRenderingContext2D, state, dpr);
      }
      last = performance.now();
      postState();
      raf(loop);
      break;
    }
    case 'resize': {
      resizeCanvas(data.width, data.height, data.dpr);
      break;
    }
    case 'keydown':
    case 'keyup': {
      if (!state) break;
      handleKey(state, data.key, data.type === 'keydown');
      postState();
      break;
    }
    case 'setPaused': {
      if (!state) break;
      setPaused(state, data.paused);
      postState();
      break;
    }
    case 'reset': {
      if (!state) break;
      resetGameState(state);
      if (canvas && ctx) {
        resizeCanvas(state.width, state.height, dpr);
      }
      postState();
      break;
    }
    default:
      break;
  }
};

export {};
