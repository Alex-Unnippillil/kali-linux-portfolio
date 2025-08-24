import Bird from './bird.js';
import Pipe from './pipe.js';
import Background from './background.js';
import { submitScore, fetchLeaderboard } from './scoreService.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const modeSelect = document.getElementById('modeSelect');
const skinSelect = document.getElementById('skinSelect');
const pointsEl = document.getElementById('points');
const overlay = document.getElementById('overlay');
const restartBtn = document.getElementById('restart');
const globalBoard = document.getElementById('globalBoard');
const friendsBoard = document.getElementById('friendsBoard');
const flapBtn = document.getElementById('flapBtn');
const shakeToggle = document.getElementById('shakeToggle');
const motionToggle = document.getElementById('motionToggle');
const colorToggle = document.getElementById('colorToggle');
const bestScoreEl = document.getElementById('bestScore');

const GRAVITY = 1.8;
const FLAP_FORCE = -15; // tuned for ~0.28s airtime
const PIPE_GAP = 100;
const PIPE_WIDTH = 40;
const PIPE_SPEED = 2;
const PIPE_SPACING = 200;
const PIPE_COUNT = 3;
const HIT_PAUSE = 200; // ms

const SKINS = [
  { name: 'Yellow', color: 'yellow', cost: 0 },
  { name: 'Blue', color: 'blue', cost: 10 },
  { name: 'Red', color: 'red', cost: 20 },
];

let points = parseInt(localStorage.getItem('fb_points') || '0');
let unlocked = JSON.parse(localStorage.getItem('fb_unlocked') || '["yellow"]');
let highScore = parseInt(localStorage.getItem('fb_highScore') || '0');
let settings = JSON.parse(
  localStorage.getItem('fb_settings') ||
    '{"shake":true,"reduced":false,"colorBlind":false}'
);

shakeToggle.checked = settings.shake;
motionToggle.checked = settings.reduced;
colorToggle.checked = settings.colorBlind;
bestScoreEl.textContent = `Best: ${highScore}`;

function updateSkinOptions() {
  skinSelect.innerHTML = '';
  SKINS.forEach((s) => {
    const option = document.createElement('option');
    option.value = s.color;
    const isUnlocked = unlocked.includes(s.color);
    option.disabled = !isUnlocked && points < s.cost;
    option.textContent = isUnlocked ? s.name : `${s.name} (${s.cost} pts)`;
    skinSelect.appendChild(option);
  });
  skinSelect.value = unlocked.includes(skinSelect.value) ? skinSelect.value : unlocked[0];
}

function saveProgress() {
  localStorage.setItem('fb_points', points);
  localStorage.setItem('fb_unlocked', JSON.stringify(unlocked));
}

function saveSettings() {
  localStorage.setItem('fb_settings', JSON.stringify(settings));
}

pointsEl.textContent = `Points: ${points}`;
updateSkinOptions();

skinSelect.addEventListener('change', () => {
  const val = skinSelect.value;
  if (!unlocked.includes(val)) {
    const skin = SKINS.find((s) => s.color === val);
    if (skin && points >= skin.cost) {
      points -= skin.cost;
      unlocked.push(val);
      pointsEl.textContent = `Points: ${points}`;
      saveProgress();
    }
    updateSkinOptions();
  }
});

shakeToggle.addEventListener('change', () => {
  settings.shake = shakeToggle.checked;
  saveSettings();
});

motionToggle.addEventListener('change', () => {
  settings.reduced = motionToggle.checked;
  background?.setReducedMotion(settings.reduced);
  saveSettings();
});

colorToggle.addEventListener('change', () => {
  settings.colorBlind = colorToggle.checked;
  background?.setColorBlind(settings.colorBlind);
  pipes?.forEach((p) =>
    p.setColor(settings.colorBlind ? '#555555' : '#228B22')
  );
  bird?.setSkin(settings.colorBlind ? 'orange' : skinSelect.value);
  saveSettings();
});

let bird;
let pipes;
let background;
let score;
let running;
let timeLeft;
let lastTime;
let hitPause = 0;
let ghostData = JSON.parse(localStorage.getItem('fb_ghost') || '[]');
let ghostIndex = 0;
let currentRun = [];
let ghost;

function startGame() {
  bird = new Bird(
    50,
    canvas.height / 2,
    GRAVITY,
    settings.colorBlind ? 'orange' : skinSelect.value
  );
  pipes = [];
  for (let i = 0; i < PIPE_COUNT; i++) {
    pipes.push(
      new Pipe(
        canvas.width + i * PIPE_SPACING,
        PIPE_GAP,
        PIPE_WIDTH,
        canvas.height,
        PIPE_SPEED,
        settings.colorBlind ? '#555555' : '#228B22'
      )
    );
  }
  background = new Background(
    canvas.width,
    canvas.height,
    Math.random() < 0.5 ? 'day' : 'night'
  );
  background.setReducedMotion(settings.reduced);
  background.setColorBlind(settings.colorBlind);
  ghost = ghostData.length
    ? new Bird(50, ghostData[0], GRAVITY, 'rgba(255,255,255,0.3)')
    : null;
  ghostIndex = 0;
  currentRun = [];
  score = 0;
  running = true;
  timeLeft = modeSelect.value === 'time' ? 30000 : null;
  overlay.style.display = 'none';
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

function flap() {
  const force = modeSelect.value === 'reverse' ? -FLAP_FORCE : FLAP_FORCE;
  bird.flap(force);
}

function screenShake() {
  if (!settings.shake || settings.reduced) return;
  const intensity = 5;
  const duration = 100;
  const start = performance.now();
  function shake() {
    const elapsed = performance.now() - start;
    if (elapsed < duration) {
      const x = (Math.random() - 0.5) * intensity;
      const y = (Math.random() - 0.5) * intensity;
      canvas.style.transform = `translate(${x}px, ${y}px)`;
      requestAnimationFrame(shake);
    } else {
      canvas.style.transform = '';
    }
  }
  shake();
}

function gameOver() {
  running = false;
  points += score;
  saveProgress();
  pointsEl.textContent = `Points: ${points}`;
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('fb_highScore', highScore);
  }
  bestScoreEl.textContent = `Best: ${highScore}`;
  submitScore(score);
  loadLeaderboards();
  overlay.style.display = 'flex';
  localStorage.setItem('fb_ghost', JSON.stringify(currentRun));
  ghostData = currentRun.slice();
}

async function loadLeaderboards() {
  const global = await fetchLeaderboard('global');
  const friends = await fetchLeaderboard('friends');
  renderBoard(globalBoard, global);
  renderBoard(friendsBoard, friends);
}

function renderBoard(el, data) {
  el.innerHTML = '';
  data.slice(0, 5).forEach((entry) => {
    const li = document.createElement('li');
    li.textContent = `${entry.name || 'Anon'}: ${entry.score}`;
    el.appendChild(li);
  });
}

function loop(timestamp) {
  if (!running) return;
  const delta = timestamp - lastTime;
  lastTime = timestamp;
  const dt = delta / 16.6667;

  if (hitPause > 0) {
    hitPause -= delta;
    if (hitPause <= 0) {
      gameOver();
    } else {
      requestAnimationFrame(loop);
    }
    return;
  }
  if (!settings.reduced) background.update(dt);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  background.draw(ctx);

  if (ghost) {
    if (ghostIndex < ghostData.length) {
      ghost.y = ghostData[ghostIndex++];
    }
    ghost.draw(ctx);
  }

  for (const p of pipes) {
    p.update(dt);
    p.draw(ctx);
    if (p.isOffscreen()) {
      p.reset(canvas.width + PIPE_SPACING, score);
      p.setColor(settings.colorBlind ? '#555555' : '#228B22');
    }
    if (!p.passed && bird.x > p.x + p.width / 2) {
      score++;
      p.passed = true;
    }
    if (p.collides(bird)) {
      screenShake();
      hitPause = HIT_PAUSE;
      break;
    }
  }
  if (hitPause > 0) {
    requestAnimationFrame(loop);
    return;
  }

  bird.update(modeSelect.value === 'reverse', dt);
  bird.draw(ctx);
  currentRun.push(bird.y);

  const b = bird.bounds;
  if (b.top < 0 || b.bottom > canvas.height) {
    screenShake();
    hitPause = HIT_PAUSE;
    requestAnimationFrame(loop);
    return;
  }

  ctx.fillStyle = 'black';
  ctx.font = '16px sans-serif';
  ctx.fillText(`Score: ${score}`, 10, 20);

  if (timeLeft !== null) {
    timeLeft -= delta;
    ctx.fillText(`Time: ${Math.ceil(timeLeft / 1000)}`, canvas.width - 80, 20);
    if (timeLeft <= 0) {
      gameOver();
      return;
    }
  }

  requestAnimationFrame(loop);
}

function handleInput(e) {
  e.preventDefault();
  if (running) {
    flap();
  } else {
    startGame();
  }
}

document.addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) {
    handleInput(e);
  }
});
['mousedown', 'touchstart'].forEach((ev) => {
  document.addEventListener(ev, handleInput, { passive: false });
});

flapBtn.addEventListener('click', handleInput);
flapBtn.addEventListener('touchstart', handleInput, { passive: false });

restartBtn.addEventListener('click', startGame);
loadLeaderboards();
