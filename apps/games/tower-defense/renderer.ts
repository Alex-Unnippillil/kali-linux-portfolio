import { ENEMY_TYPES, TOWER_TYPES, Vec } from '.';
import type { EngineUiState } from './engine';

export type TowerDefenseRenderView = {
  selectedTowerId: number | null;
  hoveredCell: Vec | null;
  showCursor: boolean;
  canBuildAtHover: boolean;
};

const drawGrid = (ctx: CanvasRenderingContext2D, size: number, cellSize: number) => {
  ctx.strokeStyle = 'rgba(120, 120, 120, 0.35)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= size; i += 1) {
    const offset = i * cellSize;
    ctx.beginPath();
    ctx.moveTo(offset, 0);
    ctx.lineTo(offset, size * cellSize);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, offset);
    ctx.lineTo(size * cellSize, offset);
    ctx.stroke();
  }
};

const drawPath = (ctx: CanvasRenderingContext2D, state: EngineUiState) => {
  ctx.fillStyle = 'rgba(251, 191, 36, 0.24)';
  state.path.forEach((cell) => {
    ctx.fillRect(cell.x * state.cellSize, cell.y * state.cellSize, state.cellSize, state.cellSize);
  });

  ctx.strokeStyle = 'rgba(34, 211, 238, 0.95)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  state.path.forEach((cell, idx) => {
    const px = cell.x * state.cellSize + state.cellSize / 2;
    const py = cell.y * state.cellSize + state.cellSize / 2;
    if (idx === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();

  const start = state.path[0];
  const end = state.path[state.path.length - 1];
  if (start) {
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(start.x * state.cellSize + 8, start.y * state.cellSize + 8, state.cellSize - 16, state.cellSize - 16);
  }
  if (end) {
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(end.x * state.cellSize + 8, end.y * state.cellSize + 8, state.cellSize - 16, state.cellSize - 16);
  }
};

const drawTowers = (ctx: CanvasRenderingContext2D, state: EngineUiState, selectedTowerId: number | null) => {
  state.towers.forEach((tower) => {
    const spec = TOWER_TYPES[tower.type];
    ctx.fillStyle = spec.color;
    ctx.fillRect(tower.x * state.cellSize + 7, tower.y * state.cellSize + 7, state.cellSize - 14, state.cellSize - 14);

    if (selectedTowerId === tower.id) {
      ctx.strokeStyle = 'rgba(236, 253, 245, 0.95)';
      ctx.beginPath();
      ctx.arc(
        tower.x * state.cellSize + state.cellSize / 2,
        tower.y * state.cellSize + state.cellSize / 2,
        tower.range * state.cellSize,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }
  });
};

const drawEnemies = (ctx: CanvasRenderingContext2D, state: EngineUiState) => {
  state.enemies.forEach((enemy) => {
    const spec = ENEMY_TYPES[enemy.type];
    ctx.fillStyle = spec.color;
    ctx.beginPath();
    ctx.arc(enemy.x * state.cellSize, enemy.y * state.cellSize, state.cellSize * 0.23, 0, Math.PI * 2);
    ctx.fill();

    const hpRatio = Math.max(0, Math.min(1, enemy.hp / enemy.maxHp));
    const barWidth = state.cellSize * 0.6;
    const left = enemy.x * state.cellSize - barWidth / 2;
    const top = enemy.y * state.cellSize - state.cellSize * 0.38;
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(left, top, barWidth, 4);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(left, top, barWidth * hpRatio, 4);
  });
};

const drawProjectiles = (ctx: CanvasRenderingContext2D, state: EngineUiState) => {
  ctx.fillStyle = '#f8fafc';
  state.projectiles.forEach((projectile) => {
    ctx.beginPath();
    ctx.arc(projectile.x * state.cellSize, projectile.y * state.cellSize, 2.8, 0, Math.PI * 2);
    ctx.fill();
  });
};

export const createTowerDefenseRenderer = () => {
  const render = (ctx: CanvasRenderingContext2D, state: EngineUiState, view: TowerDefenseRenderView) => {
    const dpr = window.devicePixelRatio || 1;
    const pxSize = state.gridSize * state.cellSize;
    const targetWidth = Math.floor(pxSize * dpr);

    if (ctx.canvas.width !== targetWidth || ctx.canvas.height !== targetWidth) {
      ctx.canvas.width = targetWidth;
      ctx.canvas.height = targetWidth;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, pxSize, pxSize);

    drawGrid(ctx, state.gridSize, state.cellSize);
    drawPath(ctx, state);
    drawTowers(ctx, state, view.selectedTowerId);
    drawProjectiles(ctx, state);
    drawEnemies(ctx, state);

    if (view.showCursor && view.hoveredCell) {
      ctx.strokeStyle = view.canBuildAtHover
        ? 'rgba(34, 197, 94, 0.9)'
        : 'rgba(239, 68, 68, 0.9)';
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(
        view.hoveredCell.x * state.cellSize + 2,
        view.hoveredCell.y * state.cellSize + 2,
        state.cellSize - 4,
        state.cellSize - 4,
      );
      ctx.setLineDash([]);
    }
  };

  return { render };
};
