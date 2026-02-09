// Simple Pong game with spin mechanics and gamepad rumble/audio feedback
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = 600;
canvas.height = 400;

const paddleWidth = 10;
const paddleHeight = 80;

const player = { x: 10, y: canvas.height / 2 - paddleHeight / 2, vy: 0 };
const opponent = { x: canvas.width - paddleWidth - 10, y: canvas.height / 2 - paddleHeight / 2, vy: 0 };
const ball = { x: canvas.width / 2, y: canvas.height / 2, vx: 200, vy: 120, size: 8 };

function computeBallSpin(ballY, paddleY, paddleHeight, paddleVy, spinFactor = 300, velocityFactor = 0.5) {
  const padCenter = paddleY + paddleHeight / 2;
  const relative = (ballY - padCenter) / (paddleHeight / 2);
  const spin = paddleVy * velocityFactor + relative * spinFactor;
  return { spin, relative };
}

const keys = {};
document.addEventListener('keydown', (e) => (keys[e.code] = true));
document.addEventListener('keyup', (e) => (keys[e.code] = false));

let last = performance.now();
requestAnimationFrame(loop);

function loop(ts) {
  const dt = Math.min((ts - last) / 1000, 0.1);
  last = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function update(dt) {
  player.vy = 0;
  if (keys['ArrowUp']) player.vy -= 300;
  if (keys['ArrowDown']) player.vy += 300;

  // Gamepad control
  const gp = navigator.getGamepads ? navigator.getGamepads()[0] : null;
  if (gp) {
    const axis = gp.axes[1] || 0;
    player.vy = axis * 300;
  }

  player.y += player.vy * dt;
  if (player.y < 0) player.y = 0;
  if (player.y > canvas.height - paddleHeight) player.y = canvas.height - paddleHeight;

  // Basic AI for opponent
  const target = ball.y - paddleHeight / 2;
  if (opponent.y < target) opponent.y += 200 * dt;
  else if (opponent.y > target) opponent.y -= 200 * dt;
  opponent.y = Math.max(0, Math.min(canvas.height - paddleHeight, opponent.y));

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  // Wall collisions
  if (ball.y < ball.size) {
    ball.y = ball.size;
    ball.vy *= -1;
    playBeep(200);
    rumble();
  }
  if (ball.y > canvas.height - ball.size) {
    ball.y = canvas.height - ball.size;
    ball.vy *= -1;
    playBeep(200);
    rumble();
  }

  // Paddle collisions with spin
  if (
    ball.x - ball.size < player.x + paddleWidth &&
    ball.y > player.y &&
    ball.y < player.y + paddleHeight &&
    ball.vx < 0
  ) {
    ball.x = player.x + paddleWidth + ball.size;
    paddleBounce(player, 1);
  }
  if (
    ball.x + ball.size > opponent.x &&
    ball.y > opponent.y &&
    ball.y < opponent.y + paddleHeight &&
    ball.vx > 0
  ) {
    ball.x = opponent.x - ball.size;
    paddleBounce(opponent, -1);
  }

  // Reset if ball goes out of bounds
  if (ball.x < 0 || ball.x > canvas.width) resetBall();
}

function paddleBounce(pad, dir) {
  const { spin } = computeBallSpin(
    ball.y,
    pad.y,
    paddleHeight,
    pad.vy
  );
  ball.vx = Math.abs(ball.vx) * dir;
  ball.vy += spin;
  playBeep();
  rumble();
}

function resetBall() {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  ball.vx = (Math.random() > 0.5 ? 1 : -1) * 200;
  ball.vy = (Math.random() * 120) - 60;
}

function draw() {
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'white';
  ctx.fillRect(player.x, player.y, paddleWidth, paddleHeight);
  ctx.fillRect(opponent.x, opponent.y, paddleWidth, paddleHeight);
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.size, 0, Math.PI * 2);
  ctx.fill();
}

let audioCtx;
function playBeep(freq = 440) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = freq;
    osc.type = 'square';
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
  } catch (e) {}
}

function rumble() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const p of pads) {
    const actuator = p && p.vibrationActuator;
    if (actuator && actuator.type === 'dual-rumble') {
      actuator.playEffect('dual-rumble', {
        duration: 100,
        strongMagnitude: 0.5,
        weakMagnitude: 0.5,
      });
    }
  }
}
