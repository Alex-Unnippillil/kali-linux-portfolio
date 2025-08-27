const WIDTH = 300;
const HEIGHT = 100;
const MAX_POINTS = 50;
let ctx = {};
let data = { cpu: [], memory: [], down: [], up: [] };
let reduceMotion = false;

self.onmessage = (e) => {
  const { type } = e.data || {};
  if (type === 'init') {
    const { cpu, memory, network } = e.data.canvases || {};
    if (cpu && memory && network) {
      ctx.cpu = cpu.getContext('2d');
      ctx.memory = memory.getContext('2d');
      ctx.network = network.getContext('2d');
    }
    reduceMotion = !!e.data.reduceMotion;
    startSampling();
    if (!reduceMotion) self.requestAnimationFrame(draw);
  }
};

function startSampling() {
  let last = performance.now();
  setInterval(() => {
    const now = performance.now();
    const delay = now - last - 1000; // expected interval 1000ms
    last = now;
    const cpu = Math.min(100, Math.max(0, (delay / 1000) * 100));

    let memory = null;
    if (performance && performance.memory) {
      const { usedJSHeapSize, totalJSHeapSize } = performance.memory;
      memory = (usedJSHeapSize / totalJSHeapSize) * 100;
    }

    const connection = navigator.connection || {};
    const down = connection.downlink || 0;
    const up = connection.uplink || connection.upload || 0;

    push(cpu, memory ?? 0, down, up);
    if (reduceMotion) draw();
    self.postMessage({ cpu, memory, down, up });
  }, 1000);
}

function push(cpu, memory, down, up) {
  data.cpu.push(cpu);
  data.memory.push(memory);
  data.down.push(down);
  data.up.push(up);
  Object.keys(data).forEach((k) => {
    if (data[k].length > MAX_POINTS) data[k].shift();
  });
}

function draw() {
  drawChart(ctx.cpu, data.cpu, '#00ff00', 'CPU %', 100);
  drawChart(ctx.memory, data.memory, '#ffd700', 'Memory %', 100);
  drawNetwork(ctx.network);
  if (!reduceMotion) self.requestAnimationFrame(draw);
}

function drawChart(ctx2d, values, color, label, maxVal) {
  if (!ctx2d) return;
  const w = ctx2d.canvas.width || WIDTH;
  const h = ctx2d.canvas.height || HEIGHT;
  ctx2d.clearRect(0, 0, w, h);
  ctx2d.strokeStyle = color;
  ctx2d.lineWidth = 2;
  ctx2d.beginPath();
  values.forEach((v, i) => {
    const x = (i / (values.length - 1 || 1)) * w;
    const y = h - (v / maxVal) * h;
    if (i === 0) ctx2d.moveTo(x, y);
    else ctx2d.lineTo(x, y);
  });
  ctx2d.stroke();
  ctx2d.fillStyle = '#ffffff';
  ctx2d.font = '12px sans-serif';
  const latest = values[values.length - 1] || 0;
  ctx2d.fillText(`${label}: ${latest.toFixed(1)}`, 4, 12);
}

function drawNetwork(ctx2d) {
  if (!ctx2d) return;
  const w = ctx2d.canvas.width || WIDTH;
  const h = ctx2d.canvas.height || HEIGHT;
  ctx2d.clearRect(0, 0, w, h);
  const maxNet = Math.max(Math.max(...data.down, 1), Math.max(...data.up, 1));
  // Download
  ctx2d.strokeStyle = '#00ffff';
  ctx2d.lineWidth = 2;
  ctx2d.beginPath();
  data.down.forEach((v, i) => {
    const x = (i / (data.down.length - 1 || 1)) * w;
    const y = h - (v / maxNet) * h;
    if (i === 0) ctx2d.moveTo(x, y);
    else ctx2d.lineTo(x, y);
  });
  ctx2d.stroke();
  // Upload
  ctx2d.strokeStyle = '#ff00ff';
  ctx2d.beginPath();
  data.up.forEach((v, i) => {
    const x = (i / (data.up.length - 1 || 1)) * w;
    const y = h - (v / maxNet) * h;
    if (i === 0) ctx2d.moveTo(x, y);
    else ctx2d.lineTo(x, y);
  });
  ctx2d.stroke();
  const latestDown = data.down[data.down.length - 1] || 0;
  const latestUp = data.up[data.up.length - 1] || 0;
  ctx2d.fillStyle = '#ffffff';
  ctx2d.font = '12px sans-serif';
  ctx2d.fillText(`Down: ${latestDown.toFixed(1)} Mbps`, 4, 12);
  ctx2d.fillText(`Up: ${latestUp.toFixed(1)} Mbps`, 4, 26);
}
