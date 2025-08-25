import { Player, updatePhysics, collectCoin } from './engine.js';

const params = new URLSearchParams(location.search);
const levelFile = params.get('lvl') || 'levels/level1.json';
const cpParam = params.get('cp');
let checkpoint = null;
if (cpParam) {
  const [cx, cy] = cpParam.split(',').map(Number);
  if (!isNaN(cx) && !isNaN(cy)) checkpoint = { x: cx, y: cy };
}

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const tileSize = 16;

let mapWidth = 0;
let mapHeight = 0;
let tiles = [];
let spawn = { x: 0, y: 0 };
let coinTotal = 0;
let score = 0;
let levelStart = 0;

const player = new Player();
const camera = { x: 0, y: 0, deadZone: { w: 100, h: 60 } };
const keys = {};
const effects = [];

const timerEl = document.getElementById('timer');
const completeEl = document.getElementById('complete');

window.addEventListener('keydown', e => {
  keys[e.code] = true;
});
window.addEventListener('keyup', e => {
  keys[e.code] = false;
});

function setupMobile() {
  const map = { btnLeft: 'ArrowLeft', btnRight: 'ArrowRight', btnJump: 'Space' };
  Object.keys(map).forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const key = map[id];
    el.addEventListener('touchstart', e => {
      e.preventDefault();
      keys[key] = true;
    });
    el.addEventListener('touchend', e => {
      e.preventDefault();
      keys[key] = false;
    });
  });
}
setupMobile();

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
  fetch(name)
    .then(r => r.json())
    .then(data => {
      mapWidth = data.width;
      mapHeight = data.height;
      tiles = data.tiles;
      spawn = data.spawn;
      if (checkpoint) spawn = checkpoint;
      player.x = spawn.x;
      player.y = spawn.y;
      player.vx = player.vy = 0;
      score = 0;
      coinTotal = 0;
      for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) if (tiles[y][x] === 5) coinTotal++;
      }
      levelStart = performance.now();
    });
}
loadLevel(levelFile);

let last = 0;
function loop(ts) {
  const dt = Math.min((ts - last) / 1000, 0.1);
  last = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function update(dt) {
  const input = {
    left: keys['ArrowLeft'],
    right: keys['ArrowRight'],
    jump: keys['Space']
  };
  updatePhysics(player, input, dt);
  movePlayer(dt);
  updateEffects(dt);

  if (player.y > mapHeight * tileSize) respawn();

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
  camera.x = Math.max(0, Math.min(camera.x, mapWidth * tileSize - canvas.width));
  camera.y = Math.max(0, Math.min(camera.y, mapHeight * tileSize - canvas.height));

  const elapsed = ((performance.now() - levelStart) / 1000).toFixed(2);
  timerEl.textContent = `Time: ${elapsed}s`;

  if (coinTotal === 0 && score > 0) {
    if (completeEl) completeEl.classList.remove('hidden');
    window.parent.postMessage({ type: 'levelComplete' }, '*');
    coinTotal = -1;
  }
}

function respawn() {
  player.x = spawn.x;
  player.y = spawn.y;
  player.vx = player.vy = 0;
}

function movePlayer(dt) {
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
          } else ny = Math.max(ny, maxY);
        }
      }
    }
  }
  player.y = ny;

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
          if (dirX > 0) nx = Math.min(nx, minX - player.w);
          else nx = Math.max(nx, maxX);
        }
      }
    }
  }
  player.x = nx;

  const cx = Math.floor((player.x + player.w / 2) / tileSize);
  const cy = Math.floor((player.y + player.h / 2) / tileSize);
  if (collectCoin(tiles, cx, cy)) {
    score++;
    coinTotal--;
    effects.push({ x: cx * tileSize + tileSize / 2, y: cy * tileSize + tileSize / 2, life: 0 });
    playCoinSound();
  }
  const tile = getTile(cx, cy);
  if (tile === 6) {
    tiles[cy][cx] = 0;
    spawn = { x: cx * tileSize, y: cy * tileSize };
    window.parent.postMessage({ type: 'checkpoint', checkpoint: spawn }, '*');
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
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(-camera.x * 0.5, -camera.y * 0.5, canvas.width * 2, canvas.height * 2);
  ctx.fillStyle = '#141414';
  ctx.fillRect(-camera.x * 0.2, -camera.y * 0.2, canvas.width * 2, canvas.height * 2);

  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      const t = tiles[y][x];
      if (t === 0) continue;
      const screenX = x * tileSize - camera.x;
      const screenY = y * tileSize - camera.y;
      if (t === 1) {
        ctx.fillStyle = '#888';
        ctx.fillRect(screenX, screenY, tileSize, tileSize);
      } else if (t === 5) {
        ctx.fillStyle = 'gold';
        ctx.beginPath();
        ctx.arc(screenX + tileSize / 2, screenY + tileSize / 2, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (t === 6) {
        ctx.fillStyle = 'blue';
        ctx.fillRect(screenX, screenY, tileSize, tileSize);
      }
    }
  }

  drawEffects();

  ctx.fillStyle = '#0f0';
  ctx.fillRect(player.x - camera.x, player.y - camera.y, player.w, player.h);
}

window.addEventListener('keydown', e => {
  if (e.code === 'KeyR') respawn();
});
