export function randomPowerUp(width, height) {
  const types = ['speed', 'shrink'];
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    size: 10,
    type: types[Math.floor(Math.random() * types.length)],
    active: true,
  };
}

export function drawPowerUp(ctx, pu) {
  if (!pu || !pu.active) return;
  ctx.fillStyle = pu.type === 'speed' ? 'yellow' : 'red';
  ctx.fillRect(pu.x - pu.size / 2, pu.y - pu.size / 2, pu.size, pu.size);
}

export function applyPowerUp(pu, ball, paddle) {
  if (!pu || !pu.active) return;
  if (
    ball.x + ball.radius > pu.x - pu.size / 2 &&
    ball.x - ball.radius < pu.x + pu.size / 2 &&
    ball.y + ball.radius > pu.y - pu.size / 2 &&
    ball.y - ball.radius < pu.y + pu.size / 2
  ) {
    pu.active = false;
    if (pu.type === 'speed') {
      ball.vx *= 1.5;
      ball.vy *= 1.5;
    } else if (pu.type === 'shrink') {
      paddle.height *= 0.5;
    }
  }
}
