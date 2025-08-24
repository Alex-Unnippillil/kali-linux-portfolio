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

const GRAVITY = 0.5;
const FLAP_FORCE = -8;
const PIPE_GAP = 80;
const PIPE_WIDTH = 40;
const PIPE_SPEED = 2;
const PIPE_SPACING = 200;
const PIPE_COUNT = 3;

const SKINS = [
  { name: 'Yellow', color: 'yellow', cost: 0 },
  { name: 'Blue', color: 'blue', cost: 10 },
  { name: 'Red', color: 'red', cost: 20 },
];

let points = parseInt(localStorage.getItem('fb_points') || '0');
let unlocked = JSON.parse(localStorage.getItem('fb_unlocked') || '["yellow"]');

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

let bird;
let pipes;
let background;
let score;
let running;
let timeLeft;
let lastTime;

function startGame() {
  bird = new Bird(50, canvas.height / 2, GRAVITY, skinSelect.value);
  pipes = [];
  for (let i = 0; i < PIPE_COUNT; i++) {
    pipes.push(
      new Pipe(
        canvas.width + i * PIPE_SPACING,
        PIPE_GAP,
        PIPE_WIDTH,
        canvas.height,
        PIPE_SPEED
      )
    );
  }
  background = new Background(
    canvas.width,
    canvas.height,
    Math.random() < 0.5 ? 'day' : 'night'
  );
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

function gameOver() {
  running = false;
  points += score;
  saveProgress();
  pointsEl.textContent = `Points: ${points}`;
  submitScore(score);
  loadLeaderboards();
  overlay.style.display = 'flex';
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

  background.update(dt);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  background.draw(ctx);

  for (const p of pipes) {
    p.update(dt);
    p.draw(ctx);
    if (p.isOffscreen()) {
      p.reset(canvas.width + PIPE_SPACING);
    }
    if (!p.passed && bird.x > p.x + p.width / 2) {
      score++;
      p.passed = true;
    }
    if (p.collides(bird)) {
      gameOver();
      return;
    }
  }

  bird.update(modeSelect.value === 'reverse', dt);
  bird.draw(ctx);

  const b = bird.bounds;
  if (b.top < 0 || b.bottom > canvas.height) {
    gameOver();
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
  if (e.code === 'Space') {
    handleInput(e);
  }
});
['mousedown', 'touchstart'].forEach((ev) => {
  document.addEventListener(ev, handleInput, { passive: false });
});

restartBtn.addEventListener('click', startGame);
loadLeaderboards();
