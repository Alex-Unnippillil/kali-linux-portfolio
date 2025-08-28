import { Player, updatePhysics, collectCoin, movePlayer } from './engine.js';

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

const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
let reduceMotion = reduceMotionQuery.matches;
reduceMotionQuery.addEventListener('change', e => (reduceMotion = e.matches));

const announcer = document.getElementById('announcer');
const bgLayers = [
  { speed: 0.2, color: '#141414', stars: [] },
  { speed: 0.5, color: '#0a0a0a', stars: [] },
];

function announce(msg) {
  if (announcer) announcer.textContent = msg;
}

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

function initBackground() {
  const width = mapWidth * tileSize;
  const height = mapHeight * tileSize;
  bgLayers.forEach(layer => {
    const count = reduceMotion ? 0 : 40;
    layer.stars = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height
    }));
  });
}

function playCoinSound() {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.frequency.value = 800;
    osc.connect(gain);
    gain.connect(ac.destination);
    gain.gain.value = 0.5;
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
      initBackground();
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
  const wasOnGround = player.onGround;
  updatePhysics(player, input, dt);
  movePlayer(player, tiles, tileSize, dt);
  if (!reduceMotion && !wasOnGround && player.onGround) {
    spawnDust(player.x + player.w / 2, player.y + player.h);
  }
  updateEffects(dt);

  if (player.y > mapHeight * tileSize) respawn();

  const cx = Math.floor((player.x + player.w / 2) / tileSize);
  const cy = Math.floor((player.y + player.h / 2) / tileSize);
  if (collectCoin(tiles, cx, cy)) {
    score++;
    coinTotal--;
    if (!reduceMotion)
      effects.push({ type: 'coin', x: cx * tileSize + tileSize / 2, y: cy * tileSize + tileSize / 2, life: 0 });
    playCoinSound();
    announce(`Score ${score}`);
  }
  const tile = getTile(cx, cy);
  if (tile === 6) {
    tiles[cy][cx] = 0;
    spawn = { x: cx * tileSize, y: cy * tileSize };
    window.parent.postMessage({ type: 'checkpoint', checkpoint: spawn }, '*');
    announce('Checkpoint reached');
  }

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
    announce('Level complete');
    coinTotal = -1;
  }
}

function respawn() {
  player.x = spawn.x;
  player.y = spawn.y;
  player.vx = player.vy = 0;
  announce('Respawned');
}

function getTile(x, y) {
  if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight) return 0;
  return tiles[y][x];
}

function updateEffects(dt) {
  if (reduceMotion) {
    effects.length = 0;
    return;
  }
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i];
    e.life += dt * 2;
    if (e.type === 'dust') {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.vy += 400 * dt;
    }
    if (e.life > 1) effects.splice(i, 1);
  }
}

function spawnDust(x, y) {
  for (let i = 0; i < 4; i++) {
    effects.push({
      type: 'dust',
      x,
      y,
      life: 0,
      vx: (Math.random() - 0.5) * 60,
      vy: -Math.random() * 50
    });
  }
}

function drawBackground() {
  if (reduceMotion) {
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }
  bgLayers.forEach(layer => {
    ctx.fillStyle = layer.color;
    ctx.fillRect(-camera.x * layer.speed, -camera.y * layer.speed, canvas.width * 2, canvas.height * 2);
    ctx.fillStyle = '#888';
    layer.stars.forEach(s => {
      const x = s.x - camera.x * layer.speed;
      const y = s.y - camera.y * layer.speed;
      if (x >= -2 && x <= canvas.width + 2 && y >= -2 && y <= canvas.height + 2) {
        ctx.fillRect(x, y, 2, 2);
      }
    });
  });
}

function drawEffects() {
  if (reduceMotion) return;
  effects.forEach(e => {
    ctx.save();
    ctx.translate(e.x - camera.x, e.y - camera.y);
    ctx.globalAlpha = 1 - e.life;
    if (e.type === 'coin') {
      ctx.scale(1 + e.life * 2, 1 + e.life * 2);
      ctx.fillStyle = 'yellow';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'dust') {
      ctx.fillStyle = '#bbb';
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();

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
