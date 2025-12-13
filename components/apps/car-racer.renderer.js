const WIDTH = 300;
const HEIGHT = 400;

let ctx;
let state = {
  car: { position: { x: 0, y: 0 } },
  obstacles: [],
  ghost: null,
  color: '#ef4444',
};

self.onmessage = (e) => {
  const { type } = e.data || {};
  if (type === 'init') {
    ctx = e.data.canvas.getContext('2d');
    if (ctx) ctx.imageSmoothingEnabled = false;
  } else if (type === 'state') {
    Object.assign(state, e.data.diff);
    draw();
  }
};

function draw() {
  if (!ctx) return;
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#222';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = '#fff';
  ctx.setLineDash([20, 20]);
  ctx.lineDashOffset = -(state.distance % 40 || 0);
  const laneWidth = WIDTH / 3;
  for (let i = 1; i < 3; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * laneWidth, 0);
    ctx.lineTo(i * laneWidth, HEIGHT);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  if (state.ghost) {
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#fff';
    ctx.fillRect(state.ghost.x, state.ghost.y, state.ghost.width, state.ghost.height);
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = state.color || '#ef4444';
  ctx.fillRect(state.car.x, state.car.y, state.car.width, state.car.height);
  ctx.fillStyle = '#3b82f6';
  state.obstacles.forEach((o) => {
    ctx.fillRect(o.x, o.y, o.width, o.height);
  });
}
