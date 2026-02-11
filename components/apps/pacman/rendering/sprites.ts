import type { GhostState, PacState } from '../../../../apps/pacman/engine';

export const drawPac = (
  ctx: CanvasRenderingContext2D,
  pac: PacState,
  tileSize: number,
  renderTimeSeconds: number,
  reducedMotion: boolean,
) => {
  const angle = Math.atan2(pac.dir.y || 0, pac.dir.x || 1);
  const mouth = reducedMotion ? 0.2 : 0.2 + 0.2 * Math.sin(renderTimeSeconds * 8);
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.moveTo(pac.x * tileSize, pac.y * tileSize);
  ctx.arc(
    pac.x * tileSize,
    pac.y * tileSize,
    tileSize / 2 - 2,
    angle + mouth,
    angle - mouth + Math.PI * 2,
  );
  ctx.closePath();
  ctx.fill();
};

export const drawGhost = (
  ctx: CanvasRenderingContext2D,
  ghost: GhostState,
  frightenedTimer: number,
  tileSize: number,
  renderTimeSeconds: number,
  reducedMotion: boolean,
) => {
  const x = ghost.x * tileSize;
  const y = ghost.y * tileSize;
  const flash = frightenedTimer > 0 && frightenedTimer < 1.5 && !reducedMotion && Math.floor(renderTimeSeconds * 6) % 2 === 0;
  const color = frightenedTimer > 0
    ? flash ? '#fef08a' : '#1d4ed8'
    : ghost.name === 'blinky'
      ? '#ef4444'
      : ghost.name === 'pinky'
        ? '#f9a8d4'
        : ghost.name === 'inky'
          ? '#22d3ee'
          : '#fb923c';
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, tileSize / 2 - 2, Math.PI, 0);
  ctx.lineTo(x + tileSize / 2 - 2, y + tileSize / 2 - 2);
  ctx.lineTo(x - tileSize / 2 + 2, y + tileSize / 2 - 2);
  ctx.closePath();
  ctx.fill();

  const dirAngle = Math.atan2(ghost.dir.y, ghost.dir.x);
  const eyeOffsetX = 5;
  const eyeOffsetY = 3;
  const pupilOffset = 2.5;
  ctx.fillStyle = '#f8fafc';
  [
    { ox: -eyeOffsetX, oy: -eyeOffsetY },
    { ox: eyeOffsetX, oy: -eyeOffsetY },
  ].forEach(({ ox, oy }) => {
    ctx.beginPath();
    ctx.arc(x + ox, y + oy, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = '#0f172a';
  [
    { ox: -eyeOffsetX, oy: -eyeOffsetY },
    { ox: eyeOffsetX, oy: -eyeOffsetY },
  ].forEach(({ ox, oy }) => {
    ctx.beginPath();
    ctx.arc(x + ox + Math.cos(dirAngle) * pupilOffset, y + oy + Math.sin(dirAngle) * pupilOffset, 2, 0, Math.PI * 2);
    ctx.fill();
  });
};
