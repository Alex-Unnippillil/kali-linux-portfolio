import { GameState, Shield } from './types';

const drawShield = (ctx: CanvasRenderingContext2D, shield: Shield) => {
  const segmentWidth = 72 / shield.cols;
  const segmentHeight = 24 / shield.rows;
  for (let row = 0; row < shield.rows; row += 1) {
    for (let col = 0; col < shield.cols; col += 1) {
      const index = row * shield.cols + col;
      const hp = shield.segments[index];
      if (hp <= 0) continue;
      ctx.fillStyle = hp > 1 ? '#94a3b8' : '#475569';
      ctx.fillRect(shield.x + col * segmentWidth, shield.y + row * segmentHeight, segmentWidth - 1, segmentHeight - 1);
    }
  }
};

export const renderGame = (ctx: CanvasRenderingContext2D, state: GameState) => {
  ctx.clearRect(0, 0, state.width, state.height);
  const gradient = ctx.createLinearGradient(0, 0, 0, state.height);
  gradient.addColorStop(0, '#020617');
  gradient.addColorStop(1, '#0f172a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, state.width, state.height);

  ctx.fillStyle = state.player.respawnGraceMs > 0 ? '#38bdf8' : '#e2e8f0';
  ctx.fillRect(state.player.x, state.player.y, state.player.w, state.player.h);

  state.invaders.forEach((invader) => {
    if (!invader.alive) return;
    ctx.fillStyle = invader.points >= 30 ? '#f472b6' : invader.points >= 20 ? '#22d3ee' : '#a3e635';
    ctx.fillRect(invader.x, invader.y, invader.w, invader.h);
  });

  state.playerBullets.forEach((bullet) => {
    if (!bullet.active) return;
    ctx.fillStyle = '#fde047';
    ctx.fillRect(bullet.x, bullet.y, bullet.w, bullet.h);
  });

  state.invaderBullets.forEach((bullet) => {
    if (!bullet.active) return;
    ctx.fillStyle = '#fb7185';
    ctx.fillRect(bullet.x, bullet.y, bullet.w, bullet.h);
  });

  state.shields.forEach((shield) => drawShield(ctx, shield));

  if (state.ufo.active) {
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(state.ufo.x, state.ufo.y, state.ufo.w, state.ufo.h);
    ctx.fillStyle = '#fda4af';
    ctx.fillRect(state.ufo.x + 3, state.ufo.y + 3, state.ufo.w - 6, 3);
  }
};
