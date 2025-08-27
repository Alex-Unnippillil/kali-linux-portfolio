import { pollTwinStick } from '../../utils/gamepad.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// basic audio ping
let audioCtx;
function ping(freq = 880) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    gain.gain.value = 0.1;
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  } catch {}
}

// ship state
const ship = { x: canvas.width / 2, y: canvas.height / 2, vx: 0, vy: 0, angle: 0, r: 12 };
let lives = 3;
let score = 0;

// arrays for entities
const bullets = [];
const asteroids = [];
const ufoBullets = [];
let ufo = null;
let level = 1;
let lastUFOSpawn = 0;

function randomAsteroidShape(r) {
  const points = [];
  const sides = Math.floor(Math.random() * 5) + 5; // 5-9 sides
  for (let i = 0; i < sides; i++) {
    const ang = (i / sides) * Math.PI * 2;
    const rad = r * (0.7 + Math.random() * 0.3);
    points.push({ x: Math.cos(ang) * rad, y: Math.sin(ang) * rad });
  }
  return points;
}

function spawnAsteroid(x, y, r) {
  const angle = Math.random() * Math.PI * 2;
  const speed = (Math.random() * 1.5 + 0.5) * 60; // pixels per second
  asteroids.push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r,
    points: randomAsteroidShape(r),
    lastPing: 0,
  });
}

function spawnWave() {
  const count = 2 + level;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      const edge = Math.floor(Math.random() * 4);
      x = edge < 2 ? Math.random() * canvas.width : edge === 2 ? 0 : canvas.width;
      y = edge >= 2 ? Math.random() * canvas.height : edge === 0 ? 0 : canvas.height;
    } while (Math.hypot(x - ship.x, y - ship.y) < 80);
    spawnAsteroid(x, y, 40);
  }
}

function spawnUFO() {
  const y = Math.random() * canvas.height * 0.8 + canvas.height * 0.1;
  const dir = Math.random() < 0.5 ? 1 : -1;
  const x = dir === 1 ? -20 : canvas.width + 20;
  ufo = { x, y, vx: dir * 2, vy: 0, r: 15, lastPing: 0 };
  lastUFOSpawn = performance.now();
}

function splitAsteroid(a) {
  const newR = a.r / 2;
  if (newR < 10) return;
  const pieces = Math.random() < 0.6 ? 2 : 3; // weighted split
  for (let i = 0; i < pieces; i++) {
    spawnAsteroid(a.x, a.y, newR);
    score += 100;
  }
}

function shootBullet(x, y, angle) {
  bullets.push({
    x,
    y,
    vx: Math.cos(angle) * 300,
    vy: Math.sin(angle) * 300,
    r: 2,
    life: 1.5,
  });
}

let keyState = {};
window.addEventListener('keydown', (e) => (keyState[e.code] = true));
window.addEventListener('keyup', (e) => (keyState[e.code] = false));

let lastTime = 0;
let accumulator = 0;
let fireCooldown = 0;
spawnWave();

function fixedUpdate(dt) {
  const gp = pollTwinStick();

  // ship control: keyboard
  const rotSpeed = 3; // rad/sec
  const thrust = 6; // px/sec^2
  if (keyState['ArrowLeft']) ship.angle -= rotSpeed * dt;
  if (keyState['ArrowRight']) ship.angle += rotSpeed * dt;
  if (keyState['ArrowUp']) {
    ship.vx += Math.cos(ship.angle) * thrust * dt;
    ship.vy += Math.sin(ship.angle) * thrust * dt;
  }
  if (keyState['Space'] && fireCooldown <= 0) {
    shootBullet(ship.x, ship.y, ship.angle);
    fireCooldown = 0.2;
  }

  // gamepad twin stick
  if (gp.moveX || gp.moveY) {
    ship.vx += gp.moveX * thrust * dt;
    ship.vy += gp.moveY * thrust * dt;
  }
  if (gp.aimX || gp.aimY) ship.angle = Math.atan2(gp.aimY, gp.aimX);
  if ((gp.fire || gp.aimX || gp.aimY) && fireCooldown <= 0) {
    const ang = gp.aimX || gp.aimY ? Math.atan2(gp.aimY, gp.aimX) : ship.angle;
    shootBullet(ship.x, ship.y, ang);
    fireCooldown = 0.2;
  }

  fireCooldown -= dt;

  // move ship
  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;
  const friction = Math.pow(0.99, dt * 60);
  ship.vx *= friction;
  ship.vy *= friction;
  wrap(ship);

  // update bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    wrap(b);
    if (b.life <= 0) bullets.splice(i, 1);
  }

  // update asteroids
  for (let i = asteroids.length - 1; i >= 0; i--) {
    const a = asteroids[i];
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    wrap(a);
    // collision with bullets
    for (let j = bullets.length - 1; j >= 0; j--) {
      const b = bullets[j];
      const poly = a.points.map((p) => ({ x: a.x + p.x, y: a.y + p.y }));
      if (circlePolyCollision(b, poly)) {
        bullets.splice(j, 1);
        asteroids.splice(i, 1);
        splitAsteroid(a);
        break;
      }
    }
    radarPing(a);
  }

  // update UFO
  if (ufo) {
    ufo.x += ufo.vx * dt;
    ufo.y += ufo.vy * dt;
    radarPing(ufo);
    if (ufo.x < -40 || ufo.x > canvas.width + 40) ufo = null;
  } else if (performance.now() - lastUFOSpawn > 15000) {
    spawnUFO();
  }

  // endless waves
  if (asteroids.length === 0) {
    level++;
    spawnWave();
  }
}

function frame(ts) {
  if (!lastTime) lastTime = ts;
  const delta = ts - lastTime;
  lastTime = ts;
  accumulator += delta;
  const step = 1000 / 60;
  while (accumulator >= step) {
    fixedUpdate(step / 1000);
    accumulator -= step;
  }
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

function wrap(obj) {
  if (obj.x < -obj.r) obj.x = canvas.width + obj.r;
  if (obj.x > canvas.width + obj.r) obj.x = -obj.r;
  if (obj.y < -obj.r) obj.y = canvas.height + obj.r;
  if (obj.y > canvas.height + obj.r) obj.y = -obj.r;
}

function circlePolyCollision(c, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x,
      yi = poly[i].y;
    const xj = poly[j].x,
      yj = poly[j].y;
    const intersect = yi > c.y !== yj > c.y && c.x < ((xj - xi) * (c.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
    const dist = pointSegDist(c.x, c.y, xi, yi, xj, yj);
    if (dist <= c.r) return true;
  }
  return inside;
}

function pointSegDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function radarPing(obj) {
  const off = obj.x < 0 || obj.x > canvas.width || obj.y < 0 || obj.y > canvas.height;
  if (off && performance.now() - obj.lastPing > 1000) {
    ping(440);
    obj.lastPing = performance.now();
  }
}

function drawRadar() {
  const size = 100;
  const x = canvas.width - size - 10;
  const y = 10;
  ctx.strokeStyle = 'white';
  ctx.strokeRect(x, y, size, size);
  const scaleX = size / canvas.width;
  const scaleY = size / canvas.height;
  ctx.fillStyle = 'white';
  ctx.fillRect(x + ship.x * scaleX - 2, y + ship.y * scaleY - 2, 4, 4);
  ctx.fillStyle = 'red';
  asteroids.forEach((a) => {
    ctx.fillRect(x + a.x * scaleX - 1, y + a.y * scaleY - 1, 2, 2);
  });
  if (ufo) {
    ctx.fillStyle = 'cyan';
    ctx.fillRect(x + ufo.x * scaleX - 2, y + ufo.y * scaleY - 2, 4, 4);
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // ship
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.lineTo(-10, 7);
  ctx.lineTo(-10, -7);
  ctx.closePath();
  ctx.strokeStyle = 'white';
  ctx.stroke();
  ctx.restore();

  // bullets
  ctx.fillStyle = 'white';
  bullets.forEach((b) => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // asteroids
  ctx.strokeStyle = 'white';
  asteroids.forEach((a) => {
    ctx.beginPath();
    const first = a.points[0];
    ctx.moveTo(a.x + first.x, a.y + first.y);
    for (let i = 1; i < a.points.length; i++) {
      const p = a.points[i];
      ctx.lineTo(a.x + p.x, a.y + p.y);
    }
    ctx.closePath();
    ctx.stroke();
  });

  // UFO
  if (ufo) {
    ctx.beginPath();
    ctx.arc(ufo.x, ufo.y, ufo.r, 0, Math.PI * 2);
    ctx.strokeStyle = 'cyan';
    ctx.stroke();
  }

  ctx.fillStyle = 'white';
  ctx.font = '16px monospace';
  ctx.fillText(`Score: ${score}`, 10, 20);
  drawRadar();
}
