const MAX_SAMPLES = 120;
const MAX_MS = 50;

let ctx;
let samples = [];

self.onmessage = (e) => {
  const { type } = e.data || {};
  if (type === 'init') {
    ctx = e.data.canvas.getContext('2d');
  } else if (type === 'frame') {
    const dt = e.data.dt;
    const t = samples.length ? samples[samples.length - 1].t + dt : dt;
    samples.push({ t, dt });
    if (samples.length > MAX_SAMPLES) samples.shift();
    draw();
  } else if (type === 'dump') {
    self.postMessage({ type: 'dump', samples });
  }
};

function draw() {
  if (!ctx) return;
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#00ff00';
  ctx.beginPath();
  samples.forEach((s, i) => {
    const x = (i / (samples.length - 1 || 1)) * w;
    const clamped = Math.min(s.dt, MAX_MS);
    const y = h - (clamped / MAX_MS) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  const latest = samples[samples.length - 1];
  const fps = latest ? (1000 / latest.dt).toFixed(1) : '0';
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px sans-serif';
  ctx.fillText(`${fps} FPS`, 4, 12);
}

