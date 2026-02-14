const LANES = 3;
const DEFAULT_WIDTH = 300;
const DEFAULT_HEIGHT = 400;
const CAR_HEIGHT = 50;
const OBSTACLE_HEIGHT = 40;

let ctx;
let baseWidth = DEFAULT_WIDTH;
let baseHeight = DEFAULT_HEIGHT;
let viewportWidth = DEFAULT_WIDTH;
let viewportHeight = DEFAULT_HEIGHT;
let state = {
  car: { lane: 1, y: DEFAULT_HEIGHT - CAR_HEIGHT - 10 },
  carColor: '#ef4444',
  obstacles: [],
  roadside: { near: [], far: [] },
  background: { near: [], far: [] },
  lineOffsetNear: 0,
  lineOffsetFar: 0,
  ghost: null,
};

self.onmessage = (e) => {
  const { type } = e.data || {};
  if (type === 'init') {
    ctx = e.data.canvas.getContext('2d');
    if (ctx) ctx.imageSmoothingEnabled = false;
    updateTransform();
  } else if (type === 'resize') {
    baseWidth = e.data.baseWidth || baseWidth;
    baseHeight = e.data.baseHeight || baseHeight;
    viewportWidth = e.data.width || viewportWidth;
    viewportHeight = e.data.height || viewportHeight;
    if (ctx?.canvas) {
      ctx.canvas.width = viewportWidth;
      ctx.canvas.height = viewportHeight;
    }
    updateTransform();
  } else if (type === 'state') {
    Object.assign(state, e.data.diff);
    draw();
  }
};

function updateTransform() {
  if (!ctx) return;
  const scaleX = viewportWidth / baseWidth;
  const scaleY = viewportHeight / baseHeight;
  ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

function draw() {
  if (!ctx) return;
  const laneWidth = baseWidth / LANES;
  const carWidth = laneWidth * 0.6;
  ctx.fillStyle = '#333';
  ctx.fillRect(0, 0, baseWidth, baseHeight);

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
      ctx.fillRect(baseWidth - 8, y, 6, 20);
    });
    ctx.fillStyle = '#ccc';
    state.roadside.near.forEach((y) => {
      ctx.fillRect(0, y, 10, 30);
      ctx.fillRect(baseWidth - 10, y, 10, 30);
    });
  }

  ctx.strokeStyle = '#fff';
  ctx.setLineDash([20, 20]);
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 2;
  ctx.lineDashOffset = -(state.lineOffsetFar || 0);
  for (let i = 1; i < LANES; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * laneWidth, 0);
    ctx.lineTo(i * laneWidth, baseHeight);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.lineWidth = 4;
  ctx.lineDashOffset = -(state.lineOffsetNear || 0);
  for (let i = 1; i < LANES; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * laneWidth, 0);
    ctx.lineTo(i * laneWidth, baseHeight);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  if (state.ghost) {
    const gx = state.ghost.lane * laneWidth + (laneWidth - carWidth) / 2;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = 'white';
    ctx.fillRect(gx, state.ghost.y, carWidth, CAR_HEIGHT);
    ctx.globalAlpha = 1;
  }

  const carX = state.car.lane * laneWidth + (laneWidth - carWidth) / 2;
  ctx.fillStyle = state.carColor || 'red';
  ctx.fillRect(carX, state.car.y, carWidth, CAR_HEIGHT);

  ctx.fillStyle = 'blue';
  state.obstacles.forEach((o) => {
    const ox = o.lane * laneWidth + (laneWidth - carWidth) / 2;
    ctx.fillRect(ox, o.y, carWidth, OBSTACLE_HEIGHT);
  });
}
