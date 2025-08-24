import { Player, updatePhysics, collectCoin } from './engine.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const tileSize = 16;

let mapWidth = 0;
let mapHeight = 0;
let tiles = [];
let spawn = { x: 0, y: 0 };
let coinTotal = 0;
let score = 0;
let currentLevel = '';
let levelStart = 0;

const player = new Player();
const camera = { x: 0, y: 0, deadZone: { w: 100, h: 60 } };
const keys = {};
const touch = { left: false, right: false, jump: false };
const effects = [];
let replay = [];
let reduceMotion = false;

const timerEl = document.getElementById('timer');
const levelSelect = document.getElementById('levelSelect');
const reduceMotionToggle = document.getElementById('reduceMotion');
const exportBtn = document.getElementById('export');

// levels list
const levels = ['level1.json', 'level2.json'];
levels.forEach((lvl, i) => {
  const opt = document.createElement('option');
  opt.value = lvl;
  opt.textContent = `Level ${i + 1}`;
  levelSelect.appendChild(opt);
});
levelSelect.onchange = () => loadLevel(levelSelect.value);
reduceMotion = localStorage.getItem('platformer-reduceMotion') === '1';
reduceMotionToggle.checked = reduceMotion;
reduceMotionToggle.onchange = () => {
  reduceMotion = reduceMotionToggle.checked;
  localStorage.setItem('platformer-reduceMotion', reduceMotion ? '1' : '0');
};

// input handling
window.addEventListener('keydown', e => {
  keys[e.code] = true;
});
window.addEventListener('keyup', e => {
  keys[e.code] = false;
});

canvas.addEventListener('touchstart', handleTouch, { passive: false });
canvas.addEventListener('touchmove', handleTouch, { passive: false });
canvas.addEventListener('touchend', handleTouch, { passive: false });

function handleTouch(e) {
  e.preventDefault();
  touch.left = touch.right = touch.jump = false;
  for (const t of e.touches) {
    const rect = canvas.getBoundingClientRect();
    const x = t.clientX - rect.left;
    const y = t.clientY - rect.top;
    if (x < rect.width / 3) touch.left = true;
    else if (x > (rect.width * 2) / 3) touch.right = true;
    if (y < rect.height / 2) touch.jump = true;
  }
}

function pollGamepad() {
  const gp = navigator.getGamepads ? navigator.getGamepads()[0] : null;
  if (!gp) return { left: false, right: false, jump: false };
  const left = gp.axes[0] < -0.2 || gp.buttons[14]?.pressed;
  const right = gp.axes[0] > 0.2 || gp.buttons[15]?.pressed;
  const jump = gp.buttons[0]?.pressed;
  return { left, right, jump };
}

function recordReplay(input) {
  replay.push({ t: performance.now() - levelStart, ...input });
}

exportBtn.onclick = () => {
  const blob = new Blob([
    JSON.stringify({ level: currentLevel, replay }, null, 2),
  ], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `replay-${currentLevel}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

function gaEvent(action, params = {}) {
  try {
    window.parent.ReactGA?.event({ category: 'platformer', action, ...params });
  } catch (e) {}
}

function playCoinSound() {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.frequency.value = 800;
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.2);
    osc.stop(ac.currentTime + 0.2);
  } catch (e) {}
}

function loadLevel(name) {
  fetch(`levels/${name}`)
    .then(r => r.json())
    .then(data => {
      mapWidth = data.width;
      mapHeight = data.height;
      tiles = data.tiles;
      spawn = data.spawn;
      player.x = spawn.x;
      player.y = spawn.y;
      player.vx = player.vy = 0;
      score = 0;
      coinTotal = 0;
      for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) if (tiles[y][x] === 5) coinTotal++;
      }
      currentLevel = name;
      levelStart = performance.now();
      replay = [];
      gaEvent('level_start', { level: name });
    });
}

// initial level with persistence
const savedProgress = JSON.parse(localStorage.getItem('platformer-progress') || 'null');
if (savedProgress && levels.includes(savedProgress.level)) {
  levelSelect.value = savedProgress.level;
  loadLevel(savedProgress.level);
} else {
  loadLevel(levels[0]);
}

// game loop with fixed timestep
const STEP = 1 / 60;
let last = 0;
let acc = 0;
function loop(ts) {
  if (!last) last = ts;
  acc += Math.min((ts - last) / 1000, 0.05);
  last = ts;
  let steps = 0;
  while (acc >= STEP && steps < 3) {
    update(STEP);
    acc -= STEP;
    steps++;
  }
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function update(dt) {
  const pad = pollGamepad();
  const input = {
    left: keys['ArrowLeft'] || pad.left || touch.left,
    right: keys['ArrowRight'] || pad.right || touch.right,
    jump: keys['Space'] || pad.jump || touch.jump
  };
  updatePhysics(player, input, dt);
  movePlayer(dt);
  if (!reduceMotion) updateEffects(dt);
  recordReplay(input);

  if (player.y > mapHeight * tileSize) respawn();

  // camera with dead zone
  const centerX = camera.x + canvas.width / 2;
  const centerY = camera.y + canvas.height / 2;
  if (player.x < centerX - camera.deadZone.w / 2)
    camera.x = player.x - (canvas.width / 2 - camera.deadZone.w / 2);
  if (player.x + player.w > centerX + camera.deadZone.w / 2)
    camera.x = player.x + player.w - (canvas.width / 2 + camera.deadZone.w / 2);
  if (player.y < centerY - camera.deadZone.h / 2)
    camera.y = player.y - (canvas.height / 2 - camera.deadZone.h / 2);
  if (player.y + player.h > centerY + camera.deadZone.h / 2)
    camera.y = player.y + player.h - (canvas.height / 2 + camera.deadZone.h / 2);
  camera.x += player.vx * 0.1;
  camera.y += player.vy * 0.05;
  camera.x = Math.max(0, Math.min(camera.x, mapWidth * tileSize - canvas.width));
  camera.y = Math.max(0, Math.min(camera.y, mapHeight * tileSize - canvas.height));

  const elapsed = ((performance.now() - levelStart) / 1000).toFixed(2);
  timerEl.textContent = `Time: ${elapsed}s`;

  if (coinTotal === 0 && score > 0) {
    gaEvent('level_complete', { level: currentLevel, time: elapsed });
    localStorage.setItem('platformer-progress', JSON.stringify({ level: currentLevel, time: elapsed }));
    coinTotal = -1; // prevent repeat
  }
}

function respawn() {
  player.x = spawn.x;
  player.y = spawn.y;
  player.vx = player.vy = 0;
}

function movePlayer(dt) {
  // vertical move first
  let ny = player.y + player.vy * dt;
  player.onGround = false;
  const dirY = Math.sign(player.vy);
  if (dirY !== 0) {
    const rangeY = dirY > 0 ? [player.y + player.h, ny + player.h] : [ny, player.y];
    const startTileY = Math.floor(rangeY[0] / tileSize);
    const endTileY = Math.floor(rangeY[1] / tileSize);
    for (let ty = startTileY; dirY > 0 ? ty <= endTileY : ty >= endTileY; ty += dirY) {
      const minY = ty * tileSize;
      const maxY = minY + tileSize;
      const tilesLeft = Math.floor(player.x / tileSize);
      const tilesRight = Math.floor((player.x + player.w - 1) / tileSize);
      for (let tx = tilesLeft; tx <= tilesRight; tx++) {
        const t = getTile(tx, ty);
        if (t === 1) {
          if (dirY > 0) {
            ny = Math.min(ny, minY - player.h);
            player.onGround = true;
          } else {
            ny = Math.max(ny, maxY);
            player.vy = 0; // head-bump smoothing
          }
        } else if (t === 6) {
          if (dirY > 0 && player.y + player.h <= minY) {
            ny = Math.min(ny, minY - player.h);
            player.onGround = true;
          }
        } else if (t === 2 || t === 3) {
          if (dirY > 0) {
            const xOff = (player.x + player.w / 2) - tx * tileSize;
            let surface = t === 2 ? maxY - xOff : minY + xOff;
            if (ny + player.h > surface && player.y + player.h <= surface) {
              ny = surface - player.h;
              player.onGround = true;
            }
          }
        }
      }
    }
  }
  player.y = ny;

  // horizontal move
  let nx = player.x + player.vx * dt;
  const dirX = Math.sign(player.vx);
  if (dirX !== 0) {
    const rangeX = dirX > 0 ? [player.x + player.w, nx + player.w] : [nx, player.x];
    const startTileX = Math.floor(rangeX[0] / tileSize);
    const endTileX = Math.floor(rangeX[1] / tileSize);
    for (let tx = startTileX; dirX > 0 ? tx <= endTileX : tx >= endTileX; tx += dirX) {
      const minX = tx * tileSize;
      const maxX = minX + tileSize;
      const tilesTop = Math.floor(player.y / tileSize);
      const tilesBottom = Math.floor((player.y + player.h - 1) / tileSize);
      for (let ty = tilesTop; ty <= tilesBottom; ty++) {
        const t = getTile(tx, ty);
        if (t === 1) {
          if (dirX > 0) {
            if (player.y + player.h - maxY < 5 && !getTile(tx, ty - 1)) {
              ny -= player.y + player.h - maxY; // ledge forgiveness step up
              player.onGround = true;
            } else {
              nx = Math.min(nx, minX - player.w);
            }
          } else {
            if (player.y + player.h - maxY < 5 && !getTile(tx, ty - 1)) {
              ny -= player.y + player.h - maxY;
              player.onGround = true;
            } else {
              nx = Math.max(nx, maxX);
            }
          }
        }
      }
    }
  }
  player.x = nx;
  player.y = ny;

  // coin collection
  const cx = Math.floor((player.x + player.w / 2) / tileSize);
  const cy = Math.floor((player.y + player.h / 2) / tileSize);
  if (collectCoin(tiles, cx, cy)) {
    score++;
    coinTotal--;
    effects.push({ x: cx * tileSize + tileSize / 2, y: cy * tileSize + tileSize / 2, life: 0 });
    playCoinSound();
    gaEvent('coin_collect', { total: score });
  }
}

function getTile(x, y) {
  if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight) return 0;
  return tiles[y][x];
}

function updateEffects(dt) {
  for (let i = effects.length - 1; i >= 0; i--) {
    effects[i].life += dt * 4;
    if (effects[i].life > 1) effects.splice(i, 1);
  }
}

function drawEffects() {
  effects.forEach(e => {
    ctx.save();
    ctx.translate(e.x - camera.x, e.y - camera.y);
    ctx.scale(1 + e.life * 2, 1 + e.life * 2);
    ctx.globalAlpha = 1 - e.life;
    ctx.fillStyle = 'yellow';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!reduceMotion) {
    // parallax background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(-camera.x * 0.5, -camera.y * 0.5, canvas.width * 2, canvas.height * 2);
    ctx.fillStyle = '#141414';
    ctx.fillRect(-camera.x * 0.2, -camera.y * 0.2, canvas.width * 2, canvas.height * 2);
  }

  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      const t = tiles[y][x];
      if (t === 0) continue;
      const screenX = x * tileSize - camera.x;
      const screenY = y * tileSize - camera.y;
      if (t === 1) {
        ctx.fillStyle = '#888';
        ctx.fillRect(screenX, screenY, tileSize, tileSize);
      } else if (t === 2) {
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.moveTo(screenX, screenY + tileSize);
        ctx.lineTo(screenX + tileSize, screenY + tileSize);
        ctx.lineTo(screenX + tileSize, screenY);
        ctx.closePath();
        ctx.fill();
      } else if (t === 3) {
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(screenX, screenY + tileSize);
        ctx.lineTo(screenX + tileSize, screenY + tileSize);
        ctx.closePath();
        ctx.fill();
      } else if (t === 6) {
        ctx.fillStyle = '#55f';
        ctx.fillRect(screenX, screenY, tileSize, 4);
      } else if (t === 4) {
        ctx.fillStyle = 'yellow';
        ctx.fillRect(screenX, screenY, tileSize, tileSize);
      } else if (t === 5) {
        ctx.fillStyle = 'gold';
        ctx.beginPath();
        ctx.arc(screenX + tileSize / 2, screenY + tileSize / 2, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  if (!reduceMotion) drawEffects();

  ctx.fillStyle = '#0f0';
  ctx.fillRect(player.x - camera.x, player.y - camera.y, player.w, player.h);
}

window.addEventListener('keydown', e => {
  if (e.code === 'KeyR') respawn();
});
