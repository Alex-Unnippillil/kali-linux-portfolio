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

function addPipe() {
  pipes.push(new Pipe(canvas.width, 80, 40, canvas.height));
}

function startGame() {
  bird = new Bird(50, canvas.height / 2, 0.5, skinSelect.value);
  pipes = [];
  background = new Background(canvas.width, canvas.height);
  score = 0;
  running = true;
  timeLeft = modeSelect.value === 'time' ? 30000 : null;
  addPipe();
  overlay.style.display = 'none';
  requestAnimationFrame(loop);
}

function flap() {
  const force = modeSelect.value === 'reverse' ? 8 : -8;
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

function loop() {
  if (!running) return;
  background.update();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  background.draw(ctx);

  pipes.forEach((p) => {
    p.update();
    p.draw(ctx);
  });
  if (pipes.length && pipes[0].isOffscreen()) {
    pipes.shift();
    score++;
    addPipe();
  }

  bird.update(modeSelect.value === 'reverse');
  bird.draw(ctx);

  if (bird.y - bird.radius < 0 || bird.y + bird.radius > canvas.height) {
    gameOver();
    return;
  }
  for (const p of pipes) {
    if (p.collides(bird)) {
      gameOver();
      return;
    }
  }

  ctx.fillStyle = 'black';
  ctx.font = '16px sans-serif';
  ctx.fillText(`Score: ${score}`, 10, 20);

  if (timeLeft !== null) {
    timeLeft -= 16;
    ctx.fillText(`Time: ${Math.ceil(timeLeft / 1000)}`, canvas.width - 80, 20);
    if (timeLeft <= 0) {
      gameOver();
      return;
    }
  }

  requestAnimationFrame(loop);
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    if (running) {
      flap();
    } else {
      startGame();
    }
  }
});

restartBtn.addEventListener('click', startGame);
loadLeaderboards();
