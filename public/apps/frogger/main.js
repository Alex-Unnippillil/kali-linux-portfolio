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

function range(min, max) {
  return min + rng() * (max - min);
}

const lanes = [
  // Water lanes
  {
    y: 1,
    dir: 1,
    speed: [1, 2],
    spawn: [2, 4],
    length: 2,
    type: 'log',
    sink: { interval: [3, 6], duration: 1 },
  },
  {
    y: 2,
    dir: -1,
    speed: [1, 2.2],
    spawn: [1.5, 3],
    length: 1,
    type: 'turtle',
    sink: { interval: [2, 5], duration: 1 },
  },
  // Road lanes
  { y: 5, dir: 1, speed: [2, 3], spawn: [1.5, 3], length: 1, type: 'car' },
  { y: 6, dir: -1, speed: [2, 3.5], spawn: [1, 2.5], length: 1, type: 'car' },
];
lanes.forEach((l) => {
  l.entities = [];
  l.next = range(l.spawn[0], l.spawn[1]);
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
  let frogSafe = true;
  lanes.forEach((l) => {
    l.next -= dt;
    if (l.next <= 0) {
      const speed = range(l.speed[0], l.speed[1]) * (rushHour ? 1 + difficulty : 1);
      const entity = {
        x: l.dir === 1 ? -l.length : WIDTH,
        speed,
      };
      if (l.sink) {
        entity.sinkTimer = range(l.sink.interval[0], l.sink.interval[1]);
        entity.sinkDur = l.sink.duration;
        entity.sinking = false;
      }
      l.entities.push(entity);
      l.next = range(l.spawn[0], l.spawn[1]) / (rushHour ? 1 + difficulty : 1);
    }
    l.entities.forEach((e) => {
      e.x += e.speed * l.dir * dt;
      if (e.sinkTimer !== undefined) {
        e.sinkTimer -= dt;
        if (e.sinkTimer <= 0) {
          e.sinking = !e.sinking;
          e.sinkTimer = e.sinking
            ? e.sinkDur
            : range(l.sink.interval[0], l.sink.interval[1]);
        }
      }
    });
    l.entities = l.entities.filter((e) => e.x + l.length > -1 && e.x < WIDTH + 1);

    if (l.y === frog.y) {
      let onEntity = false;
      l.entities.forEach((e) => {
        const frogBox = {
          x: frog.x + 0.1,
          y: frog.y + 0.1,
          w: 0.8,
          h: 0.8,
        };
        const entBox = {
          x: e.x + 0.05,
          y: l.y + 0.05,
          w: l.length - 0.1,
          h: 0.9,
        };
        const hit =
          frogBox.x < entBox.x + entBox.w &&
          frogBox.x + frogBox.w > entBox.x &&
          frogBox.y < entBox.y + entBox.h &&
          frogBox.y + frogBox.h > entBox.y;
        if (hit && l.type === 'car') {
          resetFrog();
          shake(0.3, 5);
        }
        if (hit && l.type !== 'car' && !e.sinking) {
          onEntity = true;
          frog.x += e.speed * l.dir * dt;
        }
      });
      if (l.type !== 'car') {
        frogSafe = frogSafe && onEntity;
      }
    }
  });
  if (!frogSafe) {
    resetFrog();
    shake(0.3, 5);
  }
  if (frog.x < -1 || frog.x > WIDTH) resetFrog();
  if (camera.shakeTime > 0) camera.shakeTime -= dt;
}

function draw() {
  const sx = camera.shakeTime > 0 ? (rng() * 2 - 1) * camera.shakeMag : 0;
  const sy = camera.shakeTime > 0 ? (rng() * 2 - 1) * camera.shakeMag : 0;
  ctx.setTransform(1, 0, 0, 1, sx, sy);
  ctx.clearRect(-sx, -sy, canvas.width, canvas.height);
  ctx.fillStyle = '#222';
  ctx.fillRect(-sx, -sy, canvas.width, canvas.height);
  lanes.forEach((l) => {
    ctx.fillStyle = l.type === 'car' ? '#555' : '#224';
    ctx.fillRect(0, l.y * TILE, canvas.width, TILE);
    l.entities.forEach((e) => {
      if (e.sinking) return;
      ctx.fillStyle =
        l.type === 'car' ? '#f00' : l.type === 'log' ? '#a52a2a' : '#0ff';
      ctx.fillRect(e.x * TILE, l.y * TILE, l.length * TILE, TILE);
    });
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

