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
const levelCode = params.get('level');
const mode = params.get('mode');
const menu = document.getElementById('menu');
if (!seed && !levelCode) {
  const tracks = [
    { name: 'Layout A', seed: 'trackA' },
    { name: 'Layout B', seed: 'trackB' },
    { name: 'Layout C', seed: 'trackC' },
  ];
  menu.style.display = 'flex';
  tracks.forEach((t) => {
    const btn = document.createElement('button');
    const best = JSON.parse(localStorage.getItem(`car-racer-best-${t.seed}`) || 'null');
    btn.textContent = best ? `${t.name} (Best: ${best.time.toFixed(2)}s)` : t.name;
    btn.addEventListener('click', () => {
      params.set('seed', t.seed);
      location.search = `${location.pathname}?${params.toString()}`;
    });
    menu.appendChild(btn);
  });
} else {
  menu.style.display = 'none';
  document.getElementById('seedDisp').textContent = seed || 'custom';

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

  let track;
  if (levelCode) {
    try {
      track = JSON.parse(atob(levelCode));
      seed = 'custom';
    } catch (e) {
      track = generateTrack(strToSeed(seed));
    }
  } else {
    track = generateTrack(strToSeed(seed));
  }

  let worldTime = 0;
  let speedScale = 1;
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

  // line side helper for lap detection
  let startLine = { x1: track[0].x, y1: track[0].y, x2: track[1].x, y2: track[1].y };
  function lineSide(p) {
    return (startLine.x2 - startLine.x1) * (p.y - startLine.y1) - (startLine.y2 - startLine.y1) * (p.x - startLine.x1);
  }

  // --- car setup ---
  const car = {
    x: track[0].x,
    y: track[0].y,
    angle: Math.atan2(track[1].y - track[0].y, track[1].x - track[0].x),
    speed: 0,
  };

  const keys = {};
  window.addEventListener('keydown', (e) => (keys[e.key] = true));
  window.addEventListener('keyup', (e) => (keys[e.key] = false));

  // tilt controls
  let tiltSteer = 0;
  let tiltActive = false;

  function enableTilt() {
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      DeviceOrientationEvent.requestPermission().then((state) => {
        if (state === 'granted') tiltActive = true;
      });
    } else {
      tiltActive = true;
    }
  }

  window.addEventListener('deviceorientation', (e) => {
    if (!tiltActive) return;
    if (e.gamma != null) {
      tiltSteer = Math.max(-1, Math.min(1, e.gamma / 30));
    }
  });

  window.addEventListener('click', enableTilt, { once: true });

  // ghost storage
  let bestReplay = null;
  try {
    bestReplay = JSON.parse(localStorage.getItem(`car-racer-best-${seed}`));
  } catch (e) {}
  let bestLapTrace = bestReplay ? bestReplay.trace : null;
  let bestLapTime = bestReplay ? bestReplay.time : null;
  if (bestLapTime) document.getElementById('bestTime').textContent = bestLapTime.toFixed(2);

  let lapHistory = [];
  try {
    lapHistory = JSON.parse(localStorage.getItem(`car-racer-laps-${seed}`)) || [];
  } catch (e) {}

  let currentLapTrace = [];
  let lapLineCrossed = false;
  let lapStart = performance.now();
  let prevSide = lineSide(car);
  let ghostIndex = 0;

  function saveBest() {
    if (bestLapTrace)
      localStorage.setItem(
        `car-racer-best-${seed}`,
        JSON.stringify({ time: bestLapTime, trace: bestLapTrace }),
      );
  }

  function saveLaps() {
    localStorage.setItem(`car-racer-laps-${seed}`, JSON.stringify(lapHistory));
  }

  function update(dt) {
    // controls
    let steer = tiltActive ? tiltSteer : 0;
    if (keys['ArrowLeft']) steer -= 1;
    if (keys['ArrowRight']) steer += 1;
    steer = applyCurve(steer, curveType);
    let accel = tiltActive ? 1 : 0;
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

    // physics
    if (mode === 'endless') {
      speedScale += dt * 0.02;
    }
    const ACCEL = 200;
    const FRICTION = 50;
    car.speed += accel * ACCEL * dt * speedScale;
    car.speed -= FRICTION * dt;
    if (car.speed < 0) car.speed = 0;
    let turn = steer * car.speed * 0.002;
    if (tractionAssist) {
      const maxLat = 300;
      const lat = Math.abs(car.speed * turn);
      if (lat > maxLat) turn = (Math.sign(turn) * maxLat) / car.speed;
    }
    car.angle += turn;
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;

    worldTime += dt;
    for (const drop of rainDrops) {
      drop.y += 400 * dt;
      if (drop.y > HEIGHT) {
        drop.y = -20;
        drop.x = Math.random() * WIDTH;
      }
    }

    // lap logic
    const side = lineSide(car);
    if (prevSide < 0 && side >= 0) {
      if (lapLineCrossed) {
        const t = (performance.now() - lapStart) / 1000;
        lapHistory.push(t);
        saveLaps();
        if (!bestLapTime || t < bestLapTime) {
          bestLapTime = t;
          bestLapTrace = currentLapTrace.slice();
          document.getElementById('bestTime').textContent = t.toFixed(2);
          saveBest();
        }
      }
      lapStart = performance.now();
      currentLapTrace = [];
      ghostIndex = 0;
      lapLineCrossed = true;
    } else if (prevSide >= 0 && side < 0) {
      lapLineCrossed = false;
    }
    prevSide = side;

    if (lapLineCrossed) currentLapTrace.push({ x: car.x, y: car.y, angle: car.angle });
    document.getElementById('lapTime').textContent = ((performance.now() - lapStart) / 1000).toFixed(2);
  }

  function render() {
    const day = (Math.sin(worldTime * 0.05) + 1) / 2;
    ctx.fillStyle = lerpColor('#001a33', '#87CEEB', day);
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    drawTrack(day);
    let g = null;
    if (bestLapTrace && bestLapTrace.length) {
      g = bestLapTrace[ghostIndex];
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
    if (g) ghostIndex = (ghostIndex + 1) % bestLapTrace.length;
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
}

