const WIDTH = 300;
const HEIGHT = 100;
const MAX_POINTS = 50;
const WINDOW = 5;
let ctx = {};
let data = { cpu: [], memory: [], down: [], up: [] };
let reduceMotion = false;
let stressing = false;
let stressHandle;
let decimate = 1;
let sampleCount = 0;
let hidden = false;
let drawHandle = null;
let sampleHandle = null;
let paused = false;
const lastSample = { cpu: 0, memory: 0, down: 0, up: 0 };

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
    if (!reduceMotion && !hidden) startDrawing();
  } else if (type === 'stress') {
    if (e.data.value && !stressing) {
      stressing = true;
      runStress();
    } else if (!e.data.value && stressing) {
      stressing = false;
      clearTimeout(stressHandle);
    }
  } else if (type === 'decimate') {
    decimate = Math.max(1, e.data.value | 0);
  } else if (type === 'visibility') {
    hidden = !!e.data.hidden;
    if (hidden || reduceMotion) stopDrawing();
    else if (!paused) startDrawing();
  } else if (type === 'pause') {
    paused = !!e.data.value;
    if (paused) {
      stopSampling();
      stopDrawing();
    } else {
      startSampling();
      if (!reduceMotion && !hidden) startDrawing();
    }
  } else if (type === 'resize') {
    const sizes = e.data.sizes || {};
    if (ctx.cpu && sizes.cpu) {
      ctx.cpu.canvas.width = sizes.cpu.w || ctx.cpu.canvas.width;
      ctx.cpu.canvas.height = sizes.cpu.h || ctx.cpu.canvas.height;
    }
    if (ctx.memory && sizes.memory) {
      ctx.memory.canvas.width = sizes.memory.w || ctx.memory.canvas.width;
      ctx.memory.canvas.height = sizes.memory.h || ctx.memory.canvas.height;
    }
    if (ctx.network && sizes.network) {
      ctx.network.canvas.width = sizes.network.w || ctx.network.canvas.width;
      ctx.network.canvas.height = sizes.network.h || ctx.network.canvas.height;
    }
  }
};

function startSampling() {
  if (sampleHandle) return;
  let last = performance.now();
  const sample = () => {
    const now = performance.now();
    const delay = now - last - 1000; // expected interval 1000ms
    last = now;
    const cpu = Math.min(100, Math.max(0, (delay / 1000) * 100));

    let memory = 0;
    if (performance && performance.memory) {
      const { usedJSHeapSize, totalJSHeapSize } = performance.memory;
      memory = (usedJSHeapSize / totalJSHeapSize) * 100;
    }

    const connection = navigator.connection || {};
    const down = connection.downlink || 0;
    const up = connection.uplink || connection.upload || 0;

    push({ cpu, memory, down, up });
    if (reduceMotion && !hidden && !paused) draw();
    sampleHandle = setTimeout(sample, 1000);
  };
  sampleHandle = setTimeout(sample, 1000);
}

function stopSampling() {
  if (sampleHandle) {
    clearTimeout(sampleHandle);
    sampleHandle = null;
  }
}

function runStress() {
  if (!stressing) return;
  const end = performance.now() + 50;
  while (performance.now() < end) {
    Math.sqrt(Math.random());
  }
  stressHandle = setTimeout(runStress, 0);
}

function push(sample) {
  if (!sample || typeof sample !== 'object') return;
  Object.keys(lastSample).forEach((key) => {
    if (typeof sample[key] === 'number' && Number.isFinite(sample[key])) {
      lastSample[key] = sample[key];
    }
  });
  sampleCount++;
  const shouldStore = sampleCount % decimate === 0;
  if (shouldStore) {
    Object.keys(data).forEach((key) => {
      const value = sample[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        data[key].push(value);
      }
    });
    Object.keys(data).forEach((k) => {
      const max = Math.floor(MAX_POINTS / decimate) || 1;
      if (data[k].length > max) data[k].shift();
    });
  }
  postSummary();
}

function postSummary() {
  const summary = computeSummary();
  self.postMessage({
    type: 'summary',
    summary,
    latest: { ...lastSample },
    timestamp: performance.now(),
  });
}

function draw() {
  drawChart(ctx.cpu, data.cpu, '#00ff00', 'CPU %', 100);
  drawChart(ctx.memory, data.memory, '#ffd700', 'Memory %', 100);
  drawNetwork(ctx.network);
}

const raf =
  self.requestAnimationFrame ||
  function (fn) {
    return setTimeout(() => fn(performance.now()), 1000 / 60);
  };
const caf = self.cancelAnimationFrame || clearTimeout;

function startDrawing() {
  if (drawHandle) return;
  const loop = () => {
    if (!paused) draw();
    drawHandle = raf(loop);
  };
  drawHandle = raf(loop);
}

function stopDrawing() {
  if (drawHandle) {
    caf(drawHandle);
    drawHandle = null;
  }
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

function computeSummary() {
  const summary = {};
  Object.keys(data).forEach((key) => {
    summary[key] = summarizeSeries(data[key]);
  });
  return summary;
}

function summarizeSeries(series) {
  const length = series.length;
  if (!length) {
    return {
      latest: 0,
      average: 0,
      min: 0,
      max: 0,
      windowAverage: 0,
      windowMin: 0,
      windowMax: 0,
      trend: 0,
      count: 0,
    };
  }
  let min = series[0];
  let max = series[0];
  let sum = 0;
  for (let i = 0; i < length; i += 1) {
    const value = series[i];
    sum += value;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  const latest = series[length - 1];
  const windowLength = Math.min(WINDOW, length);
  let windowSum = 0;
  let windowMin = series[length - windowLength];
  let windowMax = series[length - windowLength];
  for (let i = length - windowLength; i < length; i += 1) {
    const value = series[i];
    windowSum += value;
    if (value < windowMin) windowMin = value;
    if (value > windowMax) windowMax = value;
  }
  const baseIndex = Math.max(0, length - windowLength);
  return {
    latest,
    average: sum / length,
    min,
    max,
    windowAverage: windowSum / windowLength,
    windowMin,
    windowMax,
    trend: latest - series[baseIndex],
    count: length,
  };
}
