import { BreakoutState, PowerUpType } from './engine';

const drawPowerupIcon = (ctx: CanvasRenderingContext2D, type: PowerUpType, x: number, size: number) => {
  ctx.save();
  ctx.translate(x, 4);
  ctx.strokeStyle = '#fff';
  ctx.fillStyle = '#fff';
  ctx.lineWidth = 2;
  if (type === 'magnet') {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 1, Math.PI * 0.1, Math.PI * 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(size / 2, size / 2);
    ctx.lineTo(size / 2, size - 1);
    ctx.stroke();
  } else if (type === 'multi-ball') {
    ctx.beginPath();
    ctx.arc(size / 3, size / 2, size / 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc((size / 3) * 2, size / 2, size / 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'big-paddle') {
    ctx.fillRect(1, size / 2 - 2, size - 2, 4);
  } else if (type === 'laser') {
    ctx.beginPath();
    ctx.moveTo(size / 2, 1);
    ctx.lineTo(size / 2, size - 1);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
};

const brickColor = (type: number) => {
  if (type === 1) return '#999';
  if (type === 2) return '#0f0';
  if (type === 3) return '#f00';
  return '#555';
};

export const renderBreakout = (
  ctx: CanvasRenderingContext2D,
  state: BreakoutState,
) => {
  ctx.clearRect(0, 0, state.width, state.height);
  ctx.fillStyle = '#fff';
  ctx.font = '12px sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText(`Lives: ${state.lives}`, 4, 2);
  ctx.fillText(`Level: ${state.levelIndex}`, state.width - 70, 2);
  ctx.fillText(`Score: ${state.score}`, state.width / 2 - 30, 2);

  const icons: PowerUpType[] = [];
  if (state.activePowerups.magnet) icons.push('magnet');
  if (state.activePowerups['big-paddle']) icons.push('big-paddle');
  if (state.activePowerups.laser) icons.push('laser');
  if (state.balls.length > 1) icons.push('multi-ball');

  const iconSize = 12;
  const spacing = 6;
  let iconX =
    state.width / 2 - (icons.length * iconSize + Math.max(0, icons.length - 1) * spacing) / 2;
  icons.forEach((ic) => {
    drawPowerupIcon(ctx, ic, iconX, iconSize);
    iconX += iconSize + spacing;
  });

  ctx.fillStyle = '#fff';
  ctx.fillRect(state.paddle.x, state.paddle.y, state.paddle.w, state.paddle.h);

  state.bricks.forEach((brick) => {
    if (!brick.alive) return;
    ctx.fillStyle = brickColor(brick.type);
    ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
  });

  state.powerupsFalling.forEach((drop) => {
    ctx.fillStyle = '#ff0';
    ctx.beginPath();
    ctx.arc(drop.x, drop.y, 6, 0, Math.PI * 2);
    ctx.fill();
  });

  state.balls.forEach((ball) => {
    ball.trail.forEach((p, i) => {
      ctx.fillStyle = `rgba(255,255,255,${((i + 1) / ball.trail.length) * 0.5})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
  });
};
