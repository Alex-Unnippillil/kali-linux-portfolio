import type { GameState } from '../../../../apps/pacman/engine';
import { drawGhost, drawPac } from './sprites';

interface RenderOptions {
  tileSize: number;
  reducedMotion: boolean;
  retroMode?: boolean;
}

export const renderPacman = (
  ctx: CanvasRenderingContext2D,
  state: GameState,
  renderTimeSeconds: number,
  options: RenderOptions,
) => {
  const { tileSize, reducedMotion, retroMode } = options;
  const width = state.width * tileSize;
  const height = state.height * tileSize;
  ctx.imageSmoothingEnabled = !retroMode;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#030712';
  ctx.fillRect(0, 0, width, height);

  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      const tile = state.maze[y][x];
      if (tile === 1) {
        ctx.fillStyle = retroMode ? '#1d4ed8' : '#0f2555';
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      } else if (tile === 2 || tile === 3) {
        const radius = tile === 3
          ? (reducedMotion ? 5 : 5 + Math.sin(renderTimeSeconds * 4) * 1.2)
          : 2.5;
        ctx.fillStyle = tile === 3 ? '#fde68a' : '#f8fafc';
        ctx.beginPath();
        ctx.arc(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  if (state.fruit.active) {
    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.arc(state.fruit.x * tileSize + tileSize / 2, state.fruit.y * tileSize + tileSize / 2, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  drawPac(ctx, state.pac, tileSize, renderTimeSeconds, reducedMotion);
  state.ghosts.forEach((ghost) => drawGhost(ctx, ghost, state.frightenedTimer, tileSize, renderTimeSeconds, reducedMotion));
};
