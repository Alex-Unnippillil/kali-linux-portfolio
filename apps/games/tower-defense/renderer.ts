import { ENEMY_TYPES } from '.';
import type {
  TowerDefenseState,
  Vec,
  ShotLine,
  HitRing,
  DamageNumber,
} from './engine';

export type TowerDefenseRenderView = {
  hoveredIndex: number | null;
  selectedIndex: number | null;
  cursor: Vec;
  showCursor: boolean;
};

const drawGrid = (ctx: CanvasRenderingContext2D, gridSize: number, cellSize: number) => {
  ctx.strokeStyle = '#555';
  for (let i = 0; i <= gridSize; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * cellSize, 0);
    ctx.lineTo(i * cellSize, gridSize * cellSize);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * cellSize);
    ctx.lineTo(gridSize * cellSize, i * cellSize);
    ctx.stroke();
  }
};

const drawRouteLayer = (
  ctx: CanvasRenderingContext2D,
  pathCells: Vec[],
  route: Vec[],
  cellSize: number,
) => {
  ctx.fillStyle = 'rgba(255,255,0,0.18)';
  pathCells.forEach((cell) => {
    ctx.fillRect(cell.x * cellSize, cell.y * cellSize, cellSize, cellSize);
  });

  if (route.length) {
    ctx.strokeStyle = 'rgba(0,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    route.forEach((cell, idx) => {
      const px = cell.x * cellSize + cellSize / 2;
      const py = cell.y * cellSize + cellSize / 2;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  const start = pathCells[0];
  const goal = pathCells[pathCells.length - 1];
  if (start) {
    ctx.fillStyle = 'rgba(0,255,0,0.6)';
    ctx.fillRect(
      start.x * cellSize + 6,
      start.y * cellSize + 6,
      cellSize - 12,
      cellSize - 12,
    );
  }
  if (goal) {
    ctx.fillStyle = 'rgba(255,0,0,0.6)';
    ctx.fillRect(
      goal.x * cellSize + 6,
      goal.y * cellSize + 6,
      cellSize - 12,
      cellSize - 12,
    );
  }
};

const drawTowers = (
  ctx: CanvasRenderingContext2D,
  state: TowerDefenseState,
  view: TowerDefenseRenderView,
) => {
  state.towers.forEach((tower, i) => {
    ctx.fillStyle = '#24f0ff';
    ctx.fillRect(
      tower.x * state.cellSize + 8,
      tower.y * state.cellSize + 8,
      state.cellSize - 16,
      state.cellSize - 16,
    );
    if (view.selectedIndex === i || view.hoveredIndex === i) {
      ctx.strokeStyle = 'rgba(255,255,0,0.9)';
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

const drawEnemies = (ctx: CanvasRenderingContext2D, state: TowerDefenseState) => {
  state.enemies.forEach((enemy) => {
    ctx.fillStyle = '#ff4b4b';
    ctx.beginPath();
    ctx.arc(
      enemy.x * state.cellSize + state.cellSize / 2,
      enemy.y * state.cellSize + state.cellSize / 2,
      state.cellSize / 4,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    const hp = Math.max(0, enemy.health);
    const maxHealth =
      ENEMY_TYPES[enemy.type as keyof typeof ENEMY_TYPES]?.health ??
      enemy.health;
    const hpWidth = (state.cellSize / 2) * (hp / Math.max(1, maxHealth));
    ctx.fillStyle = '#111';
    ctx.fillRect(
      enemy.x * state.cellSize + state.cellSize / 4,
      enemy.y * state.cellSize + 6,
      state.cellSize / 2,
      4,
    );
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(
      enemy.x * state.cellSize + state.cellSize / 4,
      enemy.y * state.cellSize + 6,
      hpWidth,
      4,
    );
  });
};

const drawShots = (
  ctx: CanvasRenderingContext2D,
  shotLines: ShotLine[],
  cellSize: number,
) => {
  shotLines.forEach((shot) => {
    ctx.strokeStyle = `rgba(36,240,255,${shot.life * 2})`;
    ctx.beginPath();
    ctx.moveTo(shot.x1 * cellSize + cellSize / 2, shot.y1 * cellSize + cellSize / 2);
    ctx.lineTo(shot.x2 * cellSize + cellSize / 2, shot.y2 * cellSize + cellSize / 2);
    ctx.stroke();
  });
};

const drawHitRings = (
  ctx: CanvasRenderingContext2D,
  hitRings: HitRing[],
  cellSize: number,
) => {
  hitRings.forEach((ring) => {
    ctx.strokeStyle = `rgba(255,0,0,${ring.life})`;
    ctx.beginPath();
    ctx.arc(
      ring.x * cellSize + cellSize / 2,
      ring.y * cellSize + cellSize / 2,
      (cellSize / 2) * (1 - ring.life * 0.5),
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  });
};

const drawDamageNumbers = (
  ctx: CanvasRenderingContext2D,
  damageNumbers: DamageNumber[],
  cellSize: number,
) => {
  damageNumbers.forEach((d) => {
    ctx.fillStyle = `rgba(255,255,255,${d.life})`;
    ctx.font = '12px sans-serif';
    ctx.fillText(
      d.value.toString(),
      d.x * cellSize + cellSize / 2,
      d.y * cellSize + cellSize / 2 - (1 - d.life) * 10,
    );
  });
};

export const createTowerDefenseRenderer = () => {
  let staticCanvas: HTMLCanvasElement | null = null;
  let staticCtx: CanvasRenderingContext2D | null = null;
  let lastKey = '';
  let lastDpr = 1;
  let lastSize = 0;

  const buildStaticLayer = (state: TowerDefenseState, dpr: number) => {
    const size = state.gridSize * state.cellSize;
    const desiredSize = size * dpr;
    if (!staticCanvas) {
      staticCanvas = document.createElement('canvas');
    }
    if (staticCanvas.width !== desiredSize || staticCanvas.height !== desiredSize) {
      staticCanvas.width = desiredSize;
      staticCanvas.height = desiredSize;
    }
    staticCtx = staticCanvas.getContext('2d');
    if (!staticCtx) return;
    staticCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    staticCtx.clearRect(0, 0, size, size);
    drawGrid(staticCtx, state.gridSize, state.cellSize);
    drawRouteLayer(staticCtx, state.pathCells, state.route, state.cellSize);
  };

  const render = (
    ctx: CanvasRenderingContext2D,
    state: TowerDefenseState,
    view: TowerDefenseRenderView,
  ) => {
    const dpr = window.devicePixelRatio || 1;
    const size = state.gridSize * state.cellSize;
    const desiredSize = size * dpr;

    if (ctx.canvas.width !== desiredSize || ctx.canvas.height !== desiredSize) {
      ctx.canvas.width = desiredSize;
      ctx.canvas.height = desiredSize;
    }

    const pathKey = state.pathCells.map((cell) => `${cell.x},${cell.y}`).join('|');
    if (pathKey !== lastKey || dpr !== lastDpr || size !== lastSize) {
      lastKey = pathKey;
      lastDpr = dpr;
      lastSize = size;
      buildStaticLayer(state, dpr);
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (staticCanvas) {
      ctx.drawImage(staticCanvas, 0, 0);
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawTowers(ctx, state, view);
    drawEnemies(ctx, state);
    drawShots(ctx, state.shotLines, state.cellSize);
    drawHitRings(ctx, state.hitRings, state.cellSize);
    drawDamageNumbers(ctx, state.damageNumbers, state.cellSize);

    if (view.showCursor) {
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(
        view.cursor.x * state.cellSize + 2,
        view.cursor.y * state.cellSize + 2,
        state.cellSize - 4,
        state.cellSize - 4,
      );
      ctx.setLineDash([]);
    }
  };

  return { render };
};
