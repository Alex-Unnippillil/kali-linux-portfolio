// Car Racer with time-trial ghost and procedural track generator

const WIDTH = 800;
const HEIGHT = 800;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpColor(c1, c2, t) {
  const r1 = parseInt(c1.slice(1, 3), 16);
  const g1 = parseInt(c1.slice(3, 5), 16);
  const b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16);
  const g2 = parseInt(c2.slice(3, 5), 16);
  const b2 = parseInt(c2.slice(5, 7), 16);
  const r = Math.round(lerp(r1, r2, t));
  const g = Math.round(lerp(g1, g2, t));
  const b = Math.round(lerp(b1, b2, t));
  return `rgb(${r},${g},${b})`;
}

// --- utility PRNG ---
function strToSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- track generation ---
function generateTrack(seed) {
  const rand = mulberry32(seed);
  const points = [];
  const centerX = WIDTH / 2;
  const centerY = HEIGHT / 2;
  const radius = 300;
  const variance = 80;
  const num = 12;
  for (let i = 0; i < num; i++) {
    const ang = (i / num) * Math.PI * 2;
    const r = radius + (rand() * 2 - 1) * variance;
    points.push({ x: centerX + Math.cos(ang) * r, y: centerY + Math.sin(ang) * r });
  }
  return points;
}

// --- steering curve ---
function applyCurve(v, type) {
  if (type === 'ease') return Math.sign(v) * Math.pow(Math.abs(v), 3);
  if (type === 'aggressive') return Math.sign(v) * Math.sqrt(Math.abs(v));
  return v;
}

// --- setup params ---
const params = new URLSearchParams(location.search);
let seed = params.get('seed');
if (!seed) {
  seed = Math.random().toString(36).slice(2, 8);
  params.set('seed', seed);
  history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
}

document.getElementById('seedDisp').textContent = seed;

let curveType = params.get('curve') || 'linear';
const curveSel = document.getElementById('curve');
curveSel.value = curveType;
curveSel.addEventListener('change', () => {
  curveType = curveSel.value;
  params.set('curve', curveType);
  history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
});

let tractionAssist = params.get('assist') === '1';
const assistChk = document.getElementById('assist');
if (assistChk) {
  assistChk.checked = tractionAssist;
  assistChk.addEventListener('change', () => {
    tractionAssist = assistChk.checked;
    params.set('assist', tractionAssist ? '1' : '0');
    history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
  });
}

// --- canvas ---
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const track = generateTrack(strToSeed(seed));

let worldTime = 0;
const rainDrops = Array.from({ length: 80 }, () => ({
  x: Math.random() * WIDTH,
  y: Math.random() * HEIGHT,
}));

function drawTrack(day) {
  ctx.strokeStyle = lerpColor('#333', '#777', day);
  ctx.lineWidth = 80;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(track[0].x, track[0].y);
  for (let i = 1; i < track.length; i++) ctx.lineTo(track[i].x, track[i].y);
  ctx.closePath();
  ctx.stroke();
  // start line
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(track[0].x, track[0].y);
  ctx.lineTo(track[1].x, track[1].y);
  ctx.stroke();
}

// draw a small minimap with car and ghost positions
function renderMiniMap(g) {
  const scale = 0.2;
  const size = WIDTH * scale;
  const pad = 10;
  const x = WIDTH - size - pad;
  const y = pad;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = '#777';
  ctx.lineWidth = 80;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(track[0].x, track[0].y);
  for (let i = 1; i < track.length; i++) ctx.lineTo(track[i].x, track[i].y);
  ctx.closePath();
  ctx.stroke();

  if (g) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.translate(g.x, g.y);
    ctx.rotate(g.angle);
    ctx.fillStyle = '#fff';
    ctx.fillRect(-10, -5, 20, 10);
    ctx.restore();
  }

  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'red';
  ctx.fillRect(-10, -5, 20, 10);
  ctx.restore();

  ctx.restore();
}

// checkpoint helper
function lineSideIdx(p, idx) {
  const a = track[idx];
  const b = track[(idx + 1) % track.length];
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
}

// --- car setup ---
const WHEELBASE = 40;
const car = {
  x: track[0].x,
  y: track[0].y,
  angle: Math.atan2(track[1].y - track[0].y, track[1].x - track[0].x),
  vx: 0,
  vy: 0,
  steer: 0,
  speed: 0,
};

const keys = {};
window.addEventListener('keydown', (e) => (keys[e.key] = true));
window.addEventListener('keyup', (e) => (keys[e.key] = false));

// ghost and lap storage
let lastLapTrace = null;
let lastLapTime = null;
let currentLapTrace = [];
let currentCheckpointTimes = [];
let lastCheckpointTimes = null;
let nextCheckpoint = 1;
let checkpointSide = lineSideIdx(car, nextCheckpoint);
let startSide = lineSideIdx(car, 0);
let lapStart = performance.now();
let lapActive = false;
let ghostIndex = 0;

function update(dt) {
  // compute current speed
  car.speed = Math.hypot(car.vx, car.vy);

  // controls
  let steer = 0;
  if (keys['ArrowLeft']) steer -= 1;
  if (keys['ArrowRight']) steer += 1;
  steer = applyCurve(steer, curveType);
  let accel = 0;
  if (keys['ArrowUp']) accel += 1;
  if (keys['ArrowDown']) accel -= 1;

  if (car.speed < 50) {
    const cx = WIDTH / 2;
    const cy = HEIGHT / 2;
    const desired = Math.atan2(cy - car.y, cx - car.x);
    let diff = desired - car.angle;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    steer += diff * 0.5;
  }

  const MAX_STEER = Math.PI / 3;
  car.steer = steer * MAX_STEER;

  // physics using kinematic bicycle model
  const ACCEL = 400;
  const FRICTION = 1.5;
  const LAT_BASE = 8;

  // heading update
  car.angle += (car.speed / WHEELBASE) * Math.tan(car.steer) * dt;

  // acceleration in forward direction
  car.vx += Math.cos(car.angle) * accel * ACCEL * dt;
  car.vy += Math.sin(car.angle) * accel * ACCEL * dt;

  // transform velocity to car space
  const sinA = Math.sin(car.angle);
  const cosA = Math.cos(car.angle);
  let forward = cosA * car.vx + sinA * car.vy;
  let lateral = -sinA * car.vx + cosA * car.vy;

  // apply friction and lateral slip
  forward -= forward * FRICTION * dt;
  const latFriction = LAT_BASE / (1 + car.speed * 0.05);
  lateral -= lateral * latFriction * dt;
  if (tractionAssist) {
    const maxLat = 0.5 * car.speed;
    if (Math.abs(lateral) > maxLat) lateral = Math.sign(lateral) * maxLat;
  }

  // back to world space
  car.vx = cosA * forward - sinA * lateral;
  car.vy = sinA * forward + cosA * lateral;

  car.x += car.vx * dt;
  car.y += car.vy * dt;

  car.speed = Math.hypot(car.vx, car.vy);

  worldTime += dt;
  for (const drop of rainDrops) {
    drop.y += 400 * dt;
    if (drop.y > HEIGHT) {
      drop.y = -20;
      drop.x = Math.random() * WIDTH;
    }
  }

  // checkpoint logic
  const cpSide = lineSideIdx(car, nextCheckpoint);
  if (checkpointSide < 0 && cpSide >= 0) {
    const t = (performance.now() - lapStart) / 1000;
    currentCheckpointTimes.push(t);
    nextCheckpoint = (nextCheckpoint + 1) % track.length;
    checkpointSide = lineSideIdx(car, nextCheckpoint);
  } else {
    checkpointSide = cpSide;
  }

  // lap logic based on start line
  const sSide = lineSideIdx(car, 0);
  if (startSide < 0 && sSide >= 0) {
    if (lapActive && nextCheckpoint === 0) {
      const t = (performance.now() - lapStart) / 1000;
      lastLapTime = t;
      lastLapTrace = currentLapTrace.slice();
      lastCheckpointTimes = currentCheckpointTimes.slice();
      document.getElementById('lastTime').textContent = t.toFixed(2);
      lapStart = performance.now();
      currentLapTrace = [];
      currentCheckpointTimes = [];
      nextCheckpoint = 1;
      checkpointSide = lineSideIdx(car, nextCheckpoint);
      ghostIndex = 0;
    } else {
      lapStart = performance.now();
      currentLapTrace = [];
      currentCheckpointTimes = [];
      nextCheckpoint = 1;
      checkpointSide = lineSideIdx(car, nextCheckpoint);
      lapActive = true;
      ghostIndex = 0;
    }
  }
  startSide = sSide;

  if (lapActive) currentLapTrace.push({ x: car.x, y: car.y, angle: car.angle });

  if (lapActive)
    document.getElementById('lapTime').textContent = ((performance.now() - lapStart) / 1000).toFixed(2);
}

function render() {
  const day = (Math.sin(worldTime * 0.05) + 1) / 2;
  ctx.fillStyle = lerpColor('#001a33', '#87CEEB', day);
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  drawTrack(day);
  let g = null;
  if (lastLapTrace && lastLapTrace.length) {
    g = lastLapTrace[ghostIndex];
    if (g) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.translate(g.x, g.y);
      ctx.rotate(g.angle);
      ctx.fillStyle = '#fff';
      ctx.fillRect(-10, -5, 20, 10);
      ctx.restore();
    }
  }
  // car reflection
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.scale(1, -1);
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = 'red';
  ctx.fillRect(-10, -5, 20, 10);
  ctx.restore();

  // player car
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'red';
  ctx.fillRect(-10, -5, 20, 10);
  ctx.restore();

  if (day < 0.3) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    ctx.fillStyle = 'rgba(255,255,200,0.3)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(400, -100);
    ctx.lineTo(400, 100);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  for (const drop of rainDrops) {
    ctx.beginPath();
    ctx.moveTo(drop.x, drop.y);
    ctx.lineTo(drop.x + 2, drop.y + 10);
    ctx.stroke();
  }
  renderMiniMap(g);
  if (g) ghostIndex = (ghostIndex + 1) % lastLapTrace.length;
}

let last = performance.now();
function loop(ts) {
  const dt = (ts - last) / 1000;
  last = ts;
  update(dt);
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
