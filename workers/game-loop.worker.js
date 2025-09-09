let canvas;
let ctx = null;
let width = 0;
let height = 0;
let x = 0;
let dir = 1;
let last = 0;

function raf(cb) {
  const rAF = self.requestAnimationFrame;
  if (typeof rAF === 'function') return rAF(cb);
  return self.setTimeout(() => cb(performance.now()), 16);
}

function start() {
  last = performance.now();
  raf(loop);
}

function loop(now) {
  const dt = (now - last) / 1000;
  last = now;
  update(dt);
  draw();
  raf(loop);
}

function update(dt) {
  x += dir * dt * 100;
  if (x < 0) {
    x = 0;
    dir = 1;
  } else if (x > width - 20) {
    x = width - 20;
    dir = -1;
  }
}

function draw() {
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#0f0';
  ctx.fillRect(x, height / 2 - 10, 20, 20);
}

self.onmessage = (e) => {
  const { type } = e.data || {};
  if (type === 'init') {
    canvas = e.data.canvas;
    width = e.data.width;
    height = e.data.height;
    const dpr = e.data.dpr || 1;
    ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    start();
  } else if (type === 'resize') {
    width = e.data.width;
    height = e.data.height;
    const dpr = e.data.dpr || 1;
    if (canvas && ctx) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }
};

export {};

