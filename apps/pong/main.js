import Paddle from './paddle.js';
import Ball from './ball.js';
import { randomPowerUp, drawPowerUp, applyPowerUp } from './powerups.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const width = canvas.width;
const height = canvas.height;

const player = new Paddle(20, height / 2 - 40, 10, 80);
const opponent = new Paddle(width - 30, height / 2 - 40, 10, 80);
const ball = new Ball(width / 2, height / 2, 8);

let power = null;
let playerScore = 0;
let oppScore = 0;
let aiReaction = 200; // ms
let lastAiUpdate = 0;

// stats
let stats = JSON.parse(
  localStorage.getItem('pongStats') || '{"wins":0,"losses":0,"games":0}'
);

// inputs
const keys = { up: false, down: false };
const keys2 = { up: false, down: false };
const inputBuffer = [];
let humanOpponent = false;

function handleKey(e, down) {
  if (e.key === 'ArrowUp' || e.key === 'w')
    inputBuffer.push({ key: 'up', value: down });
  if (e.key === 'ArrowDown' || e.key === 's')
    inputBuffer.push({ key: 'down', value: down });
}

window.addEventListener('keydown', (e) => handleKey(e, true));
window.addEventListener('keyup', (e) => handleKey(e, false));

// touch support
canvas.addEventListener('touchmove', (e) => {
  const t = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  player.y = t.clientY - rect.top - player.height / 2;
  player.clamp(height);
});

// gamepad support
function pollGamepads() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const gp1 = pads[0];
  const gp2 = pads[1];
  if (gp1) {
    const axis = gp1.axes[1];
    if (axis < -0.2) keys.up = true;
    else if (axis > 0.2) keys.down = true;
    else keys.up = keys.down = false;
  }
  if (gp2) {
    humanOpponent = true;
    const axis2 = gp2.axes[1];
    if (axis2 < -0.2) keys2.up = true;
    else if (axis2 > 0.2) keys2.down = true;
    else keys2.up = keys2.down = false;
  } else {
    humanOpponent = false;
    keys2.up = keys2.down = false;
  }
}

// AI path prediction
function updateAI(dt) {
  lastAiUpdate += dt * 1000;
  if (lastAiUpdate < aiReaction) return;
  lastAiUpdate = 0;
  const timeToReach = (opponent.x - ball.x) / ball.vx;
  let predictedY = ball.y + ball.vy * timeToReach;
  if (predictedY < 0 || predictedY > height) {
    const bounces = Math.floor(Math.abs(predictedY) / height);
    predictedY =
      bounces % 2 === 0
        ? Math.abs(predictedY) % height
        : height - (Math.abs(predictedY) % height);
  }
  const center = opponent.y + opponent.height / 2;
  let dir = 0;
  if (predictedY > center + 10) dir = 1;
  else if (predictedY < center - 10) dir = -1;
  opponent.move(dt, dir);
  opponent.clamp(height);
}

function updateDifficulty() {
  const total = playerScore + oppScore;
  aiReaction = Math.max(50, 200 - total * 10);
}

// websocket
let socket;
function setupSocket() {
  try {
    socket = new WebSocket('ws://localhost:8080');
    socket.onopen = () => console.log('connected');
    socket.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'state') {
        const lag = Date.now() - msg.time;
        opponent.y = msg.y + msg.vy * (lag / 1000);
        ball.x = msg.ballX + msg.ballVx * (lag / 1000);
        ball.y = msg.ballY + msg.ballVy * (lag / 1000);
      }
    };
  } catch (e) {
    console.log('ws disabled');
  }
}
setupSocket();

function sendState() {
  if (!socket || socket.readyState !== 1) return;
  socket.send(
    JSON.stringify({
      type: 'state',
      time: Date.now(),
      y: player.y,
      vy: player.vy || 0,
      ballX: ball.x,
      ballY: ball.y,
      ballVx: ball.vx,
      ballVy: ball.vy,
    })
  );
}

function resetRound(dir) {
  ball.reset(dir);
  player.y = height / 2 - player.height / 2;
  opponent.y = height / 2 - opponent.height / 2;
  power = null;
}

const fixedDt = 1 / 120;
let lastTime = performance.now();
let accumulator = 0;
let shakeTime = 0;
let particles = [];

function spawnGoalEffects(x, y) {
  shakeTime = 0.5;
  for (let i = 0; i < 20; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() * 2 - 1) * 200,
      vy: (Math.random() * 2 - 1) * 200,
      life: 1,
    });
  }
}

function loop(now) {
  accumulator += (now - lastTime) / 1000;
  lastTime = now;

  pollGamepads();
  while (accumulator >= fixedDt) {
    while (inputBuffer.length) {
      const evt = inputBuffer.shift();
      keys[evt.key] = evt.value;
    }

    let dir = 0;
    if (keys.up) dir -= 1;
    if (keys.down) dir += 1;
    player.move(fixedDt, dir);
    player.clamp(height);

    if (humanOpponent) {
      let dir2 = 0;
      if (keys2.up) dir2 -= 1;
      if (keys2.down) dir2 += 1;
      opponent.move(fixedDt, dir2);
      opponent.clamp(height);
    } else {
      updateAI(fixedDt);
    }

    ball.update(fixedDt, [player, opponent], width, height);

    applyPowerUp(power, ball, player);
    applyPowerUp(power, ball, opponent);

    if (!power && Math.random() < 0.002) {
      power = randomPowerUp(width, height);
    }

    if (ball.x < 0) {
      oppScore++;
      spawnGoalEffects(ball.x, ball.y);
      resetRound(1);
    } else if (ball.x > width) {
      playerScore++;
      spawnGoalEffects(ball.x, ball.y);
      resetRound(-1);
    }

    if (playerScore >= 5 || oppScore >= 5) {
      stats.games++;
      if (playerScore > oppScore) stats.wins++;
      else stats.losses++;
      localStorage.setItem('pongStats', JSON.stringify(stats));
      playerScore = oppScore = 0;
      resetRound(Math.random() > 0.5 ? 1 : -1);
    }

    updateDifficulty();

    particles = particles.filter((p) => {
      p.x += p.vx * fixedDt;
      p.y += p.vy * fixedDt;
      p.life -= fixedDt;
      return p.life > 0;
    });
    if (shakeTime > 0) shakeTime -= fixedDt;
    accumulator -= fixedDt;
  }

  sendState();

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  if (shakeTime > 0) {
    const mag = shakeTime * 5;
    ctx.translate((Math.random() * 2 - 1) * mag, (Math.random() * 2 - 1) * mag);
  }
  player.draw(ctx);
  opponent.draw(ctx);
  ball.draw(ctx);
  particles.forEach((p) => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = 'white';
    ctx.fillRect(p.x, p.y, 2, 2);
  });
  ctx.restore();
  ctx.globalAlpha = 1;

  drawPowerUp(ctx, power);
  ctx.fillStyle = 'white';
  ctx.fillText(`${playerScore} : ${oppScore}`, width / 2 - 10, 20);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

// expose for slider
window.setReaction = (v) => (aiReaction = v);
