import {
  CELL_SIZE,
  GRID_HEIGHT,
  GRID_WIDTH,
  HOME_ROW,
  MEDIAN_ROW,
  PAD_POSITIONS,
  RIPPLE_DURATION,
  ROAD_ROWS,
  WATER_ROWS,
} from './types';
import type {
  FrogPosition,
  FroggerAnimationState,
  FroggerSplash,
  HomeBayState,
  LaneState,
} from './types';

const withAlpha = (hex: string, alpha: number) => {
  const raw = hex.replace('#', '');
  const bigint = parseInt(raw, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
};

export interface FroggerRenderState {
  frog: FrogPosition;
  cars: LaneState[];
  logs: LaneState[];
  pads: boolean[];
  homes: HomeBayState[];
}

export interface FroggerRenderEffects {
  ripple: number;
  lighting: number;
  splashes: FroggerSplash[];
  safeFlash: number;
  hitFlash: number;
  frogAnimation: FroggerAnimationState;
}

export interface FroggerRenderOptions {
  colors: Record<string, string>;
  reduceMotion: boolean;
  showHitboxes: boolean;
  paused: boolean;
  status: string;
  timeLeft: number;
  gradientCache: Record<string, CanvasGradient>;
  showPauseOverlay?: boolean;
}

export const renderFroggerFrame = (
  ctx: CanvasRenderingContext2D,
  state: FroggerRenderState,
  effects: FroggerRenderEffects,
  options: FroggerRenderOptions,
) => {
  const { colors, showHitboxes, paused, status, timeLeft, showPauseOverlay = true } = options;
  const widthPx = GRID_WIDTH * CELL_SIZE;
  const heightPx = GRID_HEIGHT * CELL_SIZE;

  ctx.clearRect(0, 0, widthPx, heightPx);
  for (let y = 0; y < GRID_HEIGHT; y += 1) {
    const top = y * CELL_SIZE;
    if (y === HOME_ROW || y === MEDIAN_ROW || y === GRID_HEIGHT - 1) {
      ctx.fillStyle = colors.grass;
    } else if (WATER_ROWS.includes(y as (typeof WATER_ROWS)[number])) {
      ctx.fillStyle = colors.water;
    } else if (ROAD_ROWS.includes(y as (typeof ROAD_ROWS)[number])) {
      ctx.fillStyle = colors.roadDark;
    } else {
      ctx.fillStyle = '#000';
    }
    ctx.fillRect(0, top, widthPx, CELL_SIZE);
  }

  PAD_POSITIONS.forEach((x, idx) => {
    const home = state.homes[idx];
    ctx.fillStyle = home.filled ? '#22c55e' : colors.pad;
    ctx.fillRect(x * CELL_SIZE, 0, CELL_SIZE, CELL_SIZE);
    if (home.fly) {
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(x * CELL_SIZE + CELL_SIZE / 2, CELL_SIZE / 2, CELL_SIZE * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
    if (home.gatorHead) {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(x * CELL_SIZE + CELL_SIZE * 0.2, CELL_SIZE * 0.35, CELL_SIZE * 0.6, CELL_SIZE * 0.3);
    }
  });

  state.logs.forEach((lane) => {
    lane.entities.forEach((entity) => {
      const x = entity.x * CELL_SIZE;
      const y = lane.y * CELL_SIZE;
      const w = lane.length * CELL_SIZE;
      ctx.fillStyle = lane.kind === 'turtle' ? '#14b8a6' : lane.kind === 'gator' ? '#22c55e' : colors.log;
      if (lane.kind === 'turtle' && entity.phase && (Math.sin(entity.phase) + 1) / 2 < 0.18) {
        ctx.fillStyle = '#0f766e';
      }
      ctx.fillRect(x, y + 3, w, CELL_SIZE - 6);
      if (lane.kind === 'gator') {
        ctx.fillStyle = '#ef4444';
        const mouthX = lane.dir === 1 ? x + w - CELL_SIZE * 0.6 : x;
        ctx.fillRect(mouthX, y + CELL_SIZE * 0.35, CELL_SIZE * 0.6, CELL_SIZE * 0.2);
      }
    });
  });

  state.cars.forEach((lane) => {
    lane.entities.forEach((entity) => {
      const x = entity.x * CELL_SIZE;
      const y = lane.y * CELL_SIZE;
      ctx.fillStyle = colors.car;
      ctx.fillRect(x, y + 4, lane.length * CELL_SIZE, CELL_SIZE - 8);
    });
  });

  effects.splashes.forEach((sp) => {
    const progress = sp.t / RIPPLE_DURATION;
    ctx.strokeStyle = withAlpha(colors.ripple || '#38bdf8', 1 - progress);
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, progress * CELL_SIZE, 0, Math.PI * 2);
    ctx.stroke();
  });

  const anim = effects.frogAnimation;
  const t = Math.min(1, Math.max(0, anim.progress));
  const frogX = (anim.start.x + (anim.end.x - anim.start.x) * t) * CELL_SIZE + CELL_SIZE / 2;
  const frogY = (anim.start.y + (anim.end.y - anim.start.y) * t) * CELL_SIZE + CELL_SIZE / 2;
  ctx.fillStyle = colors.frog;
  ctx.beginPath();
  ctx.arc(frogX, frogY, CELL_SIZE * 0.32, 0, Math.PI * 2);
  ctx.fill();

  if (showHitboxes) {
    ctx.strokeStyle = '#fff';
    state.cars.forEach((lane) => lane.entities.forEach((e) => ctx.strokeRect(e.x * CELL_SIZE, lane.y * CELL_SIZE, lane.length * CELL_SIZE, CELL_SIZE)));
    state.logs.forEach((lane) => lane.entities.forEach((e) => ctx.strokeRect(e.x * CELL_SIZE, lane.y * CELL_SIZE, lane.length * CELL_SIZE, CELL_SIZE)));
  }

  if (effects.hitFlash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${effects.hitFlash / 0.2})`;
    ctx.fillRect(0, 0, widthPx, heightPx);
  }

  if (status || (paused && showPauseOverlay)) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, widthPx, heightPx);
    ctx.fillStyle = '#fff';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(paused && showPauseOverlay ? 'Paused' : status, widthPx / 2, heightPx / 2);
  }

  if (timeLeft <= 10 && !paused) {
    ctx.fillStyle = withAlpha('#f87171', 0.16);
    ctx.fillRect(0, 0, widthPx, heightPx);
  }
};
