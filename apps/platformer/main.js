import {
  Player,
  updatePhysics,
  collectCoin,
  movePlayer,
  countCoins,
  isLevelComplete,
  setPhysics,
  physics,
} from './engine.js';

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
let coinsRemaining = 0;
let score = 0;
let balance = 0;
let simTime = 0;
let speed = 1;
let prevJumpHeld = false;

const player = new Player();
const camera = { x: 0, y: 0, deadZone: { w: 100, h: 60 } };
const keys = {};
const effects = [];

const timerEl = document.getElementById('timer');
const completeEl = document.getElementById('complete');

// Settings UI and persistence
const bufferSlider = document.getElementById('bufferSlider');
const bufferLabel = document.getElementById('bufferLabel');
let jumpBufferMs = Number(localStorage.getItem('pf-buffer') || '100');
bufferSlider.value = String(jumpBufferMs);
bufferLabel.textContent = String(jumpBufferMs);
bufferSlider.addEventListener('input', () => {
  jumpBufferMs = Number(bufferSlider.value);
  bufferLabel.textContent = String(jumpBufferMs);
  localStorage.setItem('pf-buffer', String(jumpBufferMs));
});

// physics sliders
const gravSlider = document.getElementById('gravitySlider');
const gravLabel = document.getElementById('gravityLabel');
const accelSlider = document.getElementById('accelSlider');
const accelLabel = document.getElementById('accelLabel');
const frictionSlider = document.getElementById('frictionSlider');
const frictionLabel = document.getElementById('frictionLabel');
const speedSlider = document.getElementById('speedSlider');
const speedLabel = document.getElementById('speedLabel');
const jumpSlider = document.getElementById('jumpSlider');
const jumpLabel = document.getElementById('jumpLabel');
const coinSlider = document.getElementById('coinSlider');
const coinLabel = document.getElementById('coinLabel');
const jumpCostSlider = document.getElementById('jumpCostSlider');
const jumpCostLabel = document.getElementById('jumpCostLabel');
const fastBtn = document.getElementById('fastBtn');
const balanceLabel = document.getElementById('balanceLabel');

const storedPhysics = JSON.parse(
  localStorage.getItem('pf-physics') || '{}'
);
setPhysics({ ...storedPhysics });

function syncPhysicsUI() {
  gravSlider.value = String(physics.GRAVITY);
  gravLabel.textContent = String(Math.round(physics.GRAVITY));
  accelSlider.value = String(physics.ACCEL);
  accelLabel.textContent = String(Math.round(physics.ACCEL));
  frictionSlider.value = String(physics.FRICTION);
  frictionLabel.textContent = String(Math.round(physics.FRICTION));
  speedSlider.value = String(physics.MAX_SPEED);
  speedLabel.textContent = String(Math.round(physics.MAX_SPEED));
  jumpSlider.value = String(physics.JUMP_SPEED);
  jumpLabel.textContent = String(Math.round(physics.JUMP_SPEED));
}

syncPhysicsUI();

function updatePhysicsSetting() {
  setPhysics({
    GRAVITY: Number(gravSlider.value),
    ACCEL: Number(accelSlider.value),
    FRICTION: Number(frictionSlider.value),
    MAX_SPEED: Number(speedSlider.value),
    JUMP_SPEED: Number(jumpSlider.value),
  });
  syncPhysicsUI();
  localStorage.setItem('pf-physics', JSON.stringify(physics));
}

[gravSlider, accelSlider, frictionSlider, speedSlider, jumpSlider].forEach((el) => {
  el.addEventListener('input', updatePhysicsSetting);
});

let coinValue = Number(localStorage.getItem('pf-coinValue') || '1');
let jumpCost = Number(localStorage.getItem('pf-jumpCost') || '0');
coinSlider.value = String(coinValue);
coinLabel.textContent = String(coinValue);
jumpCostSlider.value = String(jumpCost);
jumpCostLabel.textContent = String(jumpCost);

function updateEconomySetting() {
  coinValue = Number(coinSlider.value);
  jumpCost = Number(jumpCostSlider.value);
  coinLabel.textContent = String(coinValue);
  jumpCostLabel.textContent = String(jumpCost);
  localStorage.setItem('pf-coinValue', String(coinValue));
  localStorage.setItem('pf-jumpCost', String(jumpCost));
}

[coinSlider, jumpCostSlider].forEach((el) => {
  el.addEventListener('input', updateEconomySetting);
});

fastBtn.addEventListener('click', () => {
  speed = speed === 1 ? 3 : 1;
  fastBtn.textContent = speed + 'x';
});

const padButtons = {
  left: document.getElementById('padLeft'),
  right: document.getElementById('padRight'),
  jump: document.getElementById('padJump')
};
const padMap = JSON.parse(localStorage.getItem('pf-pad') || '{"left":14,"right":15,"jump":0}');
Object.keys(padButtons).forEach(a => {
  padButtons[a].textContent = padMap[a];
});

const controlsEl = document.getElementById('controls');
const buttonsToggle = document.getElementById('buttonsToggle');
let showButtons = JSON.parse(
  localStorage.getItem('pf-buttons') ||
    (window.matchMedia('(pointer: coarse)').matches ? 'true' : 'false')
);
controlsEl.classList.toggle('hidden', !showButtons);
if (buttonsToggle) {
  buttonsToggle.checked = showButtons;
  buttonsToggle.addEventListener('change', () => {
    showButtons = buttonsToggle.checked;
    controlsEl.classList.toggle('hidden', !showButtons);
    localStorage.setItem('pf-buttons', JSON.stringify(showButtons));
  });
}

let waitingPad = null;
function pollRemap() {
  if (!waitingPad) return;
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const gp of pads) {
    if (!gp) continue;
    for (let i = 0; i < gp.buttons.length; i++) {
      if (gp.buttons[i].pressed) {
        padMap[waitingPad] = i;
        padButtons[waitingPad].textContent = i;
        localStorage.setItem('pf-pad', JSON.stringify(padMap));
        waitingPad = null;
        return;
      }
    }
  }
  requestAnimationFrame(pollRemap);
}
Object.keys(padButtons).forEach(a => {
  padButtons[a].addEventListener('click', () => {
    waitingPad = a;
    padButtons[a].textContent = '...';
    requestAnimationFrame(pollRemap);
  });
});

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
      coinsRemaining = countCoins(tiles);
      coinTotal = coinsRemaining;
      balance = 0;
      balanceLabel.textContent = String(balance);
      simTime = 0;
      prevJumpHeld = false;
      initBackground();
    });
}
loadLevel(levelFile);

let last = 0;
function loop(ts) {
  const dt = Math.min((ts - last) / 1000, 0.1);
  last = ts;
  update(dt * speed);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function update(dt) {
  simTime += dt;
  const input = {
    left: keys['ArrowLeft'],
    right: keys['ArrowRight'],
    jumpHeld: keys['Space'],
    jumpPressed: false,
    jumpReleased: false,
  };
  const gp = navigator.getGamepads ? navigator.getGamepads()[0] : null;
  if (gp) {
    input.left = input.left || gp.buttons[padMap.left]?.pressed;
    input.right = input.right || gp.buttons[padMap.right]?.pressed;
    input.jumpHeld = input.jumpHeld || gp.buttons[padMap.jump]?.pressed;
  }
  input.jumpPressed = input.jumpHeld && !prevJumpHeld;
  input.jumpReleased = !input.jumpHeld && prevJumpHeld;
  prevJumpHeld = input.jumpHeld;
  const wasOnGround = player.onGround;
  const jumped = updatePhysics(player, input, dt, { jumpBuffer: jumpBufferMs / 1000 });
  movePlayer(player, tiles, tileSize, dt);
  if (jumped) {
    balance -= jumpCost;
    balanceLabel.textContent = String(balance);
  }
  if (!reduceMotion && !wasOnGround && player.onGround) {
    spawnDust(player.x + player.w / 2, player.y + player.h);
  }
  updateEffects(dt);

  if (player.y > mapHeight * tileSize) respawn();

  const cx = Math.floor((player.x + player.w / 2) / tileSize);
  const cy = Math.floor((player.y + player.h / 2) / tileSize);
  if (collectCoin(tiles, cx, cy)) {
    score++;
    coinsRemaining--;
    balance += coinValue;
    balanceLabel.textContent = String(balance);
    if (!reduceMotion)
      spawnCoinParticles(
        cx * tileSize + tileSize / 2,
        cy * tileSize + tileSize / 2
      );
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

  let targetX = camera.x;
  let targetY = camera.y;
  const centerX = camera.x + canvas.width / 2;
  const centerY = camera.y + canvas.height / 2;
  if (player.x < centerX - camera.deadZone.w / 2)
    targetX = player.x - (canvas.width / 2 - camera.deadZone.w / 2);
  if (player.x + player.w > centerX + camera.deadZone.w / 2)
    targetX = player.x + player.w - (canvas.width / 2 + camera.deadZone.w / 2);
  if (player.y < centerY - camera.deadZone.h / 2)
    targetY = player.y - (canvas.height / 2 - camera.deadZone.h / 2);
  if (player.y + player.h > centerY + camera.deadZone.h / 2)
    targetY = player.y + player.h - (canvas.height / 2 + camera.deadZone.h / 2);
  targetX = Math.max(0, Math.min(targetX, mapWidth * tileSize - canvas.width));
  targetY = Math.max(0, Math.min(targetY, mapHeight * tileSize - canvas.height));
  camera.x += (targetX - camera.x) * 0.1;
  camera.y += (targetY - camera.y) * 0.1;

  const elapsed = simTime.toFixed(2);
  timerEl.textContent = `Time: ${elapsed}s`;

  if (coinsRemaining >= 0 && isLevelComplete(coinsRemaining, coinTotal)) {
    if (completeEl) completeEl.classList.remove('hidden');
    window.parent.postMessage({ type: 'levelComplete' }, '*');
    announce('Level complete');
    coinsRemaining = -1;
  }
}

function respawn() {
  if (!reduceMotion)
    spawnDamage(player.x + player.w / 2, player.y + player.h / 2);
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
    if (e.type === 'dust' || e.type === 'coin' || e.type === 'damage') {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.vy += 400 * dt;
    }
    if (e.life > 1) effects.splice(i, 1);
  }
}

function spawnCoinParticles(x, y) {
  for (let i = 0; i < 5; i++) {
    effects.push({
      type: 'coin',
      x,
      y,
      life: 0,
      vx: (Math.random() - 0.5) * 80,
      vy: (Math.random() - 0.5) * 80,
    });
  }
}

function spawnDamage(x, y) {
  for (let i = 0; i < 8; i++) {
    effects.push({
      type: 'damage',
      x,
      y,
      life: 0,
      vx: (Math.random() - 0.5) * 120,
      vy: (Math.random() - 0.5) * 120,
    });
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

function drawBackground(camX, camY) {
  if (reduceMotion) {
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }
  bgLayers.forEach(layer => {
    ctx.fillStyle = layer.color;
    ctx.fillRect(-camX * layer.speed, -camY * layer.speed, canvas.width * 2, canvas.height * 2);
    ctx.fillStyle = '#888';
    layer.stars.forEach(s => {
      const x = s.x - camX * layer.speed;
      const y = s.y - camY * layer.speed;
      if (x >= -2 && x <= canvas.width + 2 && y >= -2 && y <= canvas.height + 2) {
        ctx.fillRect(x, y, 2, 2);
      }
    });
  });
}

function drawEffects(camX, camY) {
  if (reduceMotion) return;
  effects.forEach(e => {
    ctx.save();
    ctx.translate(e.x - camX, e.y - camY);
    ctx.globalAlpha = 1 - e.life;
    if (e.type === 'coin') {
      ctx.fillStyle = 'gold';
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'dust') {
      ctx.fillStyle = '#bbb';
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'damage') {
      ctx.fillStyle = 'red';
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });
}

function draw() {
  const camX = Math.round(camera.x);
  const camY = Math.round(camera.y);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground(camX, camY);

  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      const t = tiles[y][x];
      if (t === 0) continue;
      const screenX = x * tileSize - camX;
      const screenY = y * tileSize - camY;
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

  drawEffects(camX, camY);

  ctx.fillStyle = '#0f0';
  ctx.fillRect(
    Math.round(player.x - camX),
    Math.round(player.y - camY),
    player.w,
    player.h
  );
}

window.addEventListener('keydown', e => {
  if (e.code === 'KeyR') respawn();
});
