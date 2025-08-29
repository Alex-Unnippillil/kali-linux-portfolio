const WIDTH = 300;
const HEIGHT = 400;
const LANES = 3;
const LANE_WIDTH = WIDTH / LANES;
const CAR_WIDTH = LANE_WIDTH * 0.6;
const CAR_HEIGHT = 50;
const OBSTACLE_HEIGHT = 40;

let ctx;
let state = {
  car: { lane: 1, y: HEIGHT - CAR_HEIGHT - 10 },
  carColor: '#ef4444',
  obstacles: [],
  roadside: { near: [], far: [] },
  background: { near: [], far: [] },
  lineOffset: 0,
  ghost: null,
};

self.onmessage = (e) => {
  const { type } = e.data || {};
  if (type === 'init') {
    ctx = e.data.canvas.getContext('2d');
  } else if (type === 'state') {
    Object.assign(state, e.data.diff);
    draw();
  }
};

function draw() {
  if (!ctx) return;
  ctx.fillStyle = '#333';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  if (state.background) {
    ctx.fillStyle = '#111';
    state.background.far.forEach(({ x, y }) => {
      ctx.fillRect(x, y, 2, 2);
    });
    ctx.fillStyle = '#555';
    state.background.near.forEach(({ x, y }) => {
      ctx.fillRect(x, y, 3, 3);
    });
  }

  if (state.roadside) {
    ctx.fillStyle = '#999';
    state.roadside.far.forEach((y) => {
      ctx.fillRect(2, y, 6, 20);
      ctx.fillRect(WIDTH - 8, y, 6, 20);
    });
    ctx.fillStyle = '#ccc';
    state.roadside.near.forEach((y) => {
      ctx.fillRect(0, y, 10, 30);
      ctx.fillRect(WIDTH - 10, y, 10, 30);
    });
  }

  ctx.strokeStyle = '#fff';
  ctx.setLineDash([20, 20]);
  ctx.lineWidth = 2;
  ctx.lineDashOffset = -(state.lineOffset || 0);
  for (let i = 1; i < LANES; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * LANE_WIDTH, 0);
    ctx.lineTo(i * LANE_WIDTH, HEIGHT);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  if (state.ghost) {
    const gx = state.ghost.lane * LANE_WIDTH + (LANE_WIDTH - CAR_WIDTH) / 2;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = 'white';
    ctx.fillRect(gx, state.ghost.y, CAR_WIDTH, CAR_HEIGHT);
    ctx.globalAlpha = 1;
  }

  const carX = state.car.lane * LANE_WIDTH + (LANE_WIDTH - CAR_WIDTH) / 2;
  ctx.fillStyle = state.carColor || 'red';
  ctx.fillRect(carX, state.car.y, CAR_WIDTH, CAR_HEIGHT);

  ctx.fillStyle = 'blue';
  state.obstacles.forEach((o) => {
    const ox = o.lane * LANE_WIDTH + (LANE_WIDTH - CAR_WIDTH) / 2;
    ctx.fillRect(ox, o.y, CAR_WIDTH, OBSTACLE_HEIGHT);
  });
}
