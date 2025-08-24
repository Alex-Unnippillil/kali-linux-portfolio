const gravity = 500; // px per second^2
let ctx;
let width;
let height;
let floor;
let ball;
let flippers;
let last = 0;

function reset() {
  ball.x = width / 2;
  ball.y = 50;
  ball.vx = 100 * (Math.random() > 0.5 ? 1 : -1);
  ball.vy = 0;
}

function step(dt) {
  ball.vy += gravity * dt;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  if (ball.x < ball.r) {
    ball.x = ball.r;
    ball.vx *= -1;
  }
  if (ball.x > width - ball.r) {
    ball.x = width - ball.r;
    ball.vx *= -1;
  }

  if (ball.y < ball.r) {
    ball.y = ball.r;
    ball.vy *= -1;
  }

  if (ball.y + ball.r > floor) {
    if (flippers.left && ball.x < width / 2) {
      ball.vy = -300;
      ball.vx = -150;
    } else if (flippers.right && ball.x >= width / 2) {
      ball.vy = -300;
      ball.vx = 150;
    } else {
      reset();
    }
  }
}

function render() {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#ff6f00';
  ctx.save();
  ctx.translate(80, floor);
  ctx.rotate(flippers.left ? -0.5 : 0);
  ctx.fillRect(-40, -5, 40, 10);
  ctx.restore();

  ctx.save();
  ctx.translate(width - 80, floor);
  ctx.rotate(flippers.right ? 0.5 : 0);
  ctx.fillRect(0, -5, 40, 10);
  ctx.restore();

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();
}

const raf =
  typeof self.requestAnimationFrame === 'function'
    ? self.requestAnimationFrame.bind(self)
    : (fn) => setTimeout(() => fn(performance.now()), 16);

function loop(now) {
  const dt = (now - last) / 1000;
  last = now;
  step(dt);
  render();
  raf(loop);
}

self.onmessage = (e) => {
  const data = e.data;
  if (data.canvas) {
    ctx = data.canvas.getContext('2d');
    width = data.canvas.width;
    height = data.canvas.height;
    floor = height - 20;
    flippers = { left: false, right: false };
    ball = { x: width / 2, y: 50, vx: 100, vy: 0, r: 8 };
    reset();
    last = performance.now();
    raf(loop);
  } else if (data.type === 'key' && flippers) {
    if (data.key === 'ArrowLeft') flippers.left = data.down;
    if (data.key === 'ArrowRight') flippers.right = data.down;
  }
};
