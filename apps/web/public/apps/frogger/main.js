// Simple Frogger implementation with lane speed variance,
// camera shake, Rush Hour mode and gamepad support.

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const TILE = 32;
const WIDTH = 7;
const HEIGHT = 8;
canvas.width = WIDTH * TILE;
canvas.height = HEIGHT * TILE;

// --- Seeded randomness ----------------------------------------------------
function makeRng(seed) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || 1);
const rng = makeRng(seed);
const rushHour = params.get('mode') === 'rush';

// --- Game state -----------------------------------------------------------
const frog = { x: Math.floor(WIDTH / 2), y: HEIGHT - 1 };

const lanes = [
  { y: 5, dir: 1, speed: 2, spawn: 2, variance: 0.4, length: 1 },
  { y: 6, dir: -1, speed: 2.5, spawn: 1.5, variance: 0.3, length: 1 },
];
lanes.forEach((l) => {
  l.baseSpeed = l.speed;
  l.baseSpawn = l.spawn;
  l.entities = [];
  l.next = l.spawn * (0.5 + rng());
});
let difficulty = 0; // used for rush hour scaling

const camera = { shakeTime: 0, shakeMag: 0 };
function shake(duration, magnitude) {
  camera.shakeTime = duration;
  camera.shakeMag = magnitude;
}

function resetFrog() {
  frog.x = Math.floor(WIDTH / 2);
  frog.y = HEIGHT - 1;
}

// --- Input ----------------------------------------------------------------
function moveFrog(dx, dy) {
  const nx = frog.x + dx;
  const ny = frog.y + dy;
  if (nx >= 0 && nx < WIDTH && ny >= 0 && ny < HEIGHT) {
    frog.x = nx;
    frog.y = ny;
    shake(0.1, 2);
  }
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') moveFrog(-1, 0);
  if (e.key === 'ArrowRight') moveFrog(1, 0);
  if (e.key === 'ArrowUp') moveFrog(0, -1);
  if (e.key === 'ArrowDown') moveFrog(0, 1);
});

let gpCooldown = 0;
function pollGamepad(dt) {
  const gp = navigator.getGamepads && navigator.getGamepads()[0];
  if (!gp) return;
  gpCooldown -= dt;
  if (gpCooldown > 0) return;
  const threshold = 0.5;
  const ax = gp.axes[0] || 0;
  const ay = gp.axes[1] || 0;
  if (ax < -threshold) {
    moveFrog(-1, 0);
    gpCooldown = 0.2;
  } else if (ax > threshold) {
    moveFrog(1, 0);
    gpCooldown = 0.2;
  } else if (ay < -threshold) {
    moveFrog(0, -1);
    gpCooldown = 0.2;
  } else if (ay > threshold) {
    moveFrog(0, 1);
    gpCooldown = 0.2;
  } else {
    if (gp.buttons[14]?.pressed) {
      moveFrog(-1, 0);
      gpCooldown = 0.2;
    } else if (gp.buttons[15]?.pressed) {
      moveFrog(1, 0);
      gpCooldown = 0.2;
    } else if (gp.buttons[12]?.pressed) {
      moveFrog(0, -1);
      gpCooldown = 0.2;
    } else if (gp.buttons[13]?.pressed) {
      moveFrog(0, 1);
      gpCooldown = 0.2;
    }
  }
}

// --- Update & draw --------------------------------------------------------
function update(dt) {
  pollGamepad(dt);
  if (rushHour) difficulty += dt * 0.1;
  lanes.forEach((l) => {
    if (rushHour) {
      l.spawn = Math.max(0.3, l.baseSpawn / (1 + difficulty));
      l.speed = l.baseSpeed * (1 + difficulty);
    }
    l.next -= dt;
    if (l.next <= 0) {
      const speedMult = 1 + (rng() - 0.5) * l.variance;
      l.entities.push({
        x: l.dir === 1 ? -l.length : WIDTH,
        speed: l.speed * speedMult,
      });
      l.next = l.spawn * (0.5 + rng());
    }
    l.entities.forEach((e) => {
      e.x += e.speed * l.dir * dt;
    });
    l.entities = l.entities.filter((e) => e.x + l.length > -1 && e.x < WIDTH + 1);
    l.entities.forEach((e) => {
      if (l.y === frog.y && frog.x < e.x + l.length && frog.x + 1 > e.x) {
        resetFrog();
        shake(0.3, 5);
      }
    });
  });
  if (camera.shakeTime > 0) camera.shakeTime -= dt;
}

function draw() {
  const sx = camera.shakeTime > 0 ? (rng() * 2 - 1) * camera.shakeMag : 0;
  const sy = camera.shakeTime > 0 ? (rng() * 2 - 1) * camera.shakeMag : 0;
  ctx.setTransform(1, 0, 0, 1, sx, sy);
  ctx.clearRect(-sx, -sy, canvas.width, canvas.height);
  ctx.fillStyle = '#222';
  ctx.fillRect(-sx, -sy, canvas.width, canvas.height);
  ctx.fillStyle = '#555';
  lanes.forEach((l) => {
    ctx.fillRect(0, l.y * TILE, canvas.width, TILE);
    ctx.fillStyle = '#f00';
    l.entities.forEach((e) => {
      ctx.fillRect(e.x * TILE, l.y * TILE, l.length * TILE, TILE);
    });
    ctx.fillStyle = '#555';
  });
  ctx.fillStyle = '#0f0';
  ctx.fillRect(frog.x * TILE, frog.y * TILE, TILE, TILE);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

let last = performance.now();
function loop(ts) {
  const dt = (ts - last) / 1000;
  last = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

