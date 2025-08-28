import { pollTwinStick } from '../../utils/gamepad.ts';

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

// arrays for entities
const bullets = [];
const asteroids = [];
const ufoBullets = [];
let ufo = null;
let level = 1;
let lastUFOSpawn = 0;

function spawnAsteroid(x, y, r) {
  const angle = Math.random() * Math.PI * 2;
  const speed = Math.random() * 1.5 + 0.5;
  asteroids.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r, lastPing: 0 });
}

function spawnWave() {
  const count = 2 + level;
  for (let i = 0; i < count; i++) {
    const edge = Math.floor(Math.random() * 4);
    const x = edge < 2 ? Math.random() * canvas.width : edge === 2 ? 0 : canvas.width;
    const y = edge >= 2 ? Math.random() * canvas.height : edge === 0 ? 0 : canvas.height;
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
  for (let i = 0; i < pieces; i++) spawnAsteroid(a.x, a.y, newR);
}

function shootBullet(x, y, angle) {
  bullets.push({ x, y, vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5, life: 60 });
}

let keyState = {};
window.addEventListener('keydown', (e) => (keyState[e.code] = true));
window.addEventListener('keyup', (e) => (keyState[e.code] = false));

let lastTime = 0;
let fireCooldown = 0;
spawnWave();

function update(ts) {
  lastTime = ts;
  const gp = pollTwinStick();

  // ship control: keyboard
  if (keyState['ArrowLeft']) ship.angle -= 0.05;
  if (keyState['ArrowRight']) ship.angle += 0.05;
  if (keyState['ArrowUp']) {
    ship.vx += Math.cos(ship.angle) * 0.1;
    ship.vy += Math.sin(ship.angle) * 0.1;
  }
  if (keyState['Space'] && fireCooldown <= 0) {
    shootBullet(ship.x, ship.y, ship.angle);
    fireCooldown = 10;
  }

  // gamepad twin stick
  if (gp.moveX || gp.moveY) {
    ship.vx += gp.moveX * 0.1;
    ship.vy += gp.moveY * 0.1;
  }
  if (gp.aimX || gp.aimY) ship.angle = Math.atan2(gp.aimY, gp.aimX);
  if ((gp.fire || gp.aimX || gp.aimY) && fireCooldown <= 0) {
    const ang = gp.aimX || gp.aimY ? Math.atan2(gp.aimY, gp.aimX) : ship.angle;
    shootBullet(ship.x, ship.y, ang);
    fireCooldown = 10;
  }

  fireCooldown -= 1;

  // move ship
  ship.x += ship.vx;
  ship.y += ship.vy;
  ship.vx *= 0.99;
  ship.vy *= 0.99;
  wrap(ship);

  // update bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx;
    b.y += b.vy;
    b.life -= 1;
    wrap(b);
    if (b.life <= 0) bullets.splice(i, 1);
  }

  // update asteroids
  for (let i = asteroids.length - 1; i >= 0; i--) {
    const a = asteroids[i];
    a.x += a.vx;
    a.y += a.vy;
    wrap(a);
    // collision with bullets
    for (let j = bullets.length - 1; j >= 0; j--) {
      const b = bullets[j];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist < a.r + 2) {
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
    ufo.x += ufo.vx;
    ufo.y += ufo.vy;
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

  draw();
  requestAnimationFrame(update);
}
requestAnimationFrame(update);

function wrap(obj) {
  if (obj.x < -obj.r) obj.x = canvas.width + obj.r;
  if (obj.x > canvas.width + obj.r) obj.x = -obj.r;
  if (obj.y < -obj.r) obj.y = canvas.height + obj.r;
  if (obj.y > canvas.height + obj.r) obj.y = -obj.r;
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
    ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  // asteroids
  ctx.strokeStyle = 'white';
  asteroids.forEach((a) => {
    ctx.beginPath();
    ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
    ctx.stroke();
  });

  // UFO
  if (ufo) {
    ctx.beginPath();
    ctx.arc(ufo.x, ufo.y, ufo.r, 0, Math.PI * 2);
    ctx.strokeStyle = 'cyan';
    ctx.stroke();
  }

  drawRadar();
}
