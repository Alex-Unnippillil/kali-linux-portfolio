/// <reference lib="webworker" />

import { createState, step, GameState, Point } from "./logic";

interface InitMessage {
  type: "init";
  canvas: OffscreenCanvas;
  width: number;
  height: number;
  dpr: number;
  wrap: boolean;
  gridSize: number;
  speed: number;
}

interface UpdateSettingsMessage {
  type: "updateSettings";
  wrap?: boolean;
  gridSize?: number;
  speed?: number;
  reset?: boolean;
}

interface ResizeMessage {
  type: "resize";
  width: number;
  height: number;
  dpr: number;
}

interface DirectionMessage {
  type: "direction";
  key: string;
}

type WorkerMessage =
  | InitMessage
  | UpdateSettingsMessage
  | ResizeMessage
  | DirectionMessage;

const CELL_SIZE = 16;
const directions: Record<string, Point> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;
let dpr = 1;
let state: GameState | null = null;
let pendingDir: Point = { x: 1, y: 0 };
let running = true;
let speed = 150;
let timer: number | null = null;
let score = 0;
let foodAnim = 1;

const postState = () => {
  (self as DedicatedWorkerGlobalScope).postMessage({
    type: "state",
    score,
    running,
  });
};

const resizeCanvas = (width: number, height: number, ratio: number) => {
  if (!canvas || !ctx) return;
  dpr = ratio || 1;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
};

const draw = () => {
  if (!canvas || !ctx || !state) return;
  const size = state.gridSize * CELL_SIZE;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#111827";
  ctx.fillRect(0, 0, size, size);
  const foodX = state.food.x * CELL_SIZE;
  const foodY = state.food.y * CELL_SIZE;
  const sizePx = CELL_SIZE * foodAnim;
  ctx.fillStyle = "#facc15";
  ctx.fillRect(
    foodX + (CELL_SIZE - sizePx) / 2,
    foodY + (CELL_SIZE - sizePx) / 2,
    sizePx,
    sizePx,
  );
  ctx.fillStyle = "#3b82f6";
  state.snake.forEach((seg) => {
    ctx.fillRect(seg.x * CELL_SIZE, seg.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
  });
};

const stopLoop = () => {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
};

const startLoop = () => {
  stopLoop();
  timer = setInterval(tick, speed) as unknown as number;
};

const resetGame = () => {
  if (!state) return;
  state = createState(state.wrap, state.gridSize);
  pendingDir = state.dir;
  running = true;
  score = 0;
  foodAnim = 1;
  draw();
  postState();
};

const setDirection = (key: string) => {
  if (!state) return;
  const next = directions[key];
  if (!next) return;
  const current = pendingDir;
  if (next.x === -current.x && next.y === -current.y) return;
  pendingDir = next;
};

const tick = () => {
  if (!state || !running) {
    draw();
    postState();
    return;
  }
  state = { ...state, dir: pendingDir };
  const result = step(state);
  state = result.state;
  if (result.gameOver) {
    running = false;
  }
  if (result.ate) {
    score += 1;
    foodAnim = 0;
  }
  foodAnim = Math.min(foodAnim + 0.15, 1);
  draw();
  postState();
};

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const data = event.data;
  switch (data.type) {
    case "init": {
      canvas = data.canvas;
      ctx = canvas.getContext("2d");
      dpr = data.dpr || 1;
      speed = data.speed;
      state = createState(data.wrap, data.gridSize);
      pendingDir = state.dir;
      running = true;
      score = 0;
      foodAnim = 1;
      resizeCanvas(data.width, data.height, dpr);
      draw();
      postState();
      startLoop();
      break;
    }
    case "updateSettings": {
      if (!state) break;
      if (typeof data.wrap === "boolean") {
        state.wrap = data.wrap;
      }
      if (typeof data.gridSize === "number") {
        state.gridSize = data.gridSize;
      }
      if (typeof data.speed === "number") {
        speed = data.speed;
        startLoop();
      }
      if (data.reset) {
        resetGame();
      } else {
        draw();
        postState();
      }
      break;
    }
    case "resize": {
      resizeCanvas(data.width, data.height, data.dpr);
      draw();
      break;
    }
    case "direction": {
      setDirection(data.key);
      break;
    }
    default:
      break;
  }
};

export {};
