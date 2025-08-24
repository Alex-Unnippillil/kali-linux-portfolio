import { CELL_SIZE, COLS, ROWS, GameState, cloneState, move } from './engine';

const COLORS = ['#000', '#0ff', '#00f', '#f80', '#ff0', '#0f0', '#a0f', '#f00', '#888'];
const TYPE_COLOR: Record<string, string> = {
  I: COLORS[1],
  J: COLORS[2],
  L: COLORS[3],
  O: COLORS[4],
  S: COLORS[5],
  T: COLORS[6],
  Z: COLORS[7],
};

let ctx: OffscreenCanvasRenderingContext2D;

function draw(state: GameState) {
  ctx.clearRect(0, 0, COLS * CELL_SIZE, ROWS * CELL_SIZE);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const v = state.board[y][x];
      if (v) {
        ctx.fillStyle = COLORS[v];
        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }
  }

  const ghost = cloneState(state);
  while (move(ghost, 0, 1));
  const piece = state.current;
  for (let y = 0; y < piece.shape.length; y++) {
    for (let x = 0; x < piece.shape[y].length; x++) {
      if (piece.shape[y][x]) {
        ctx.fillStyle = TYPE_COLOR[piece.type];
        ctx.globalAlpha = 0.3;
        ctx.fillRect(
          (ghost.current.x + x) * CELL_SIZE,
          (ghost.current.y + y) * CELL_SIZE,
          CELL_SIZE,
          CELL_SIZE
        );
        ctx.globalAlpha = 1;
        ctx.fillRect(
          (piece.x + x) * CELL_SIZE,
          (piece.y + y) * CELL_SIZE,
          CELL_SIZE,
          CELL_SIZE
        );
      }
    }
  }
}

self.onmessage = (e: MessageEvent) => {
  const data = e.data;
  if (data.type === 'init') {
    const canvas = data.canvas as OffscreenCanvas;
    canvas.width = COLS * CELL_SIZE;
    canvas.height = ROWS * CELL_SIZE;
    ctx = canvas.getContext('2d')!;
  } else if (data.type === 'state') {
    draw(data.state as GameState);
  }
};
