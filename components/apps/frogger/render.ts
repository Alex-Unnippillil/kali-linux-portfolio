import {
  CELL_SIZE,
  GRID_HEIGHT,
  GRID_WIDTH,
  PAD_POSITIONS,
  RIPPLE_DURATION,
} from './types';
import type {
  FrogPosition,
  FroggerAnimationState,
  FroggerSplash,
  LaneState,
} from './types';

const smoothStep = (t: number) => t * t * (3 - 2 * t);
const withAlpha = (hex: string, alpha: number) => {
  const raw = hex.replace('#', '');
  const bigint = parseInt(raw, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
};

const hashNoise = (x: number, y: number, seed: number) => {
  const v = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return v - Math.floor(v);
};

const drawTextureDots = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  alpha: number,
  density: number,
  seed: number,
) => {
  ctx.save();
  ctx.fillStyle = withAlpha(color, alpha);
  const step = Math.max(2, Math.floor(8 / density));
  for (let yy = y; yy < y + height; yy += step) {
    for (let xx = x; xx < x + width; xx += step) {
      if (hashNoise(xx, yy, seed) > 0.82) {
        ctx.fillRect(xx, yy, 1.5, 1.5);
      }
    }
  }
  ctx.restore();
};

const drawDiagonalHatch = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  alpha: number,
  spacing = 10,
) => {
  ctx.save();
  ctx.strokeStyle = withAlpha(color, alpha);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = -height; i < width; i += spacing) {
    ctx.moveTo(x + i, y + height);
    ctx.lineTo(x + i + height, y);
  }
  ctx.stroke();
  ctx.restore();
};

export interface FroggerRenderState {
  frog: FrogPosition;
  cars: LaneState[];
  logs: LaneState[];
  pads: boolean[];
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
  const {
    colors,
    reduceMotion,
    showHitboxes,
    paused,
    status,
    timeLeft,
    showPauseOverlay = true,
  } = options;
  const widthPx = GRID_WIDTH * CELL_SIZE;
  const heightPx = GRID_HEIGHT * CELL_SIZE;
  const phase = effects.ripple;
  const sparkle = (Math.sin(effects.lighting) + 1) / 2;
  const gradientCache = options.gradientCache;
  const ensureGradient = (key: string, factory: () => CanvasGradient) => {
    if (!gradientCache[key]) gradientCache[key] = factory();
    return gradientCache[key];
  };

  const waterBase = colors.water || '#0f172a';
  const waterHighlight = colors.waterHighlight || waterBase;
  const waterShadow = colors.waterShadow || waterBase;
  const rippleColor = colors.ripple || waterHighlight;
  const grassBase = colors.grass || '#14532d';
  const grassHighlight = colors.grassHighlight || grassBase;
  const grassGlow = colors.grassGlow || grassHighlight;
  const padHighlight = colors.padHighlight || grassHighlight;
  const padShadow = colors.padShadow || grassBase;
  const laneStripe = colors.laneStripe || '#cbd5f5';
  const laneEdge = colors.laneEdge || '#0b1120';
  const roadDark = colors.roadDark || '#111827';
  const roadLight = colors.roadLight || roadDark;
  const hudAccent = colors.hudAccent || colors.frog || '#facc15';
  const vignetteColor = colors.vignette || '#020617';

  ctx.clearRect(0, 0, widthPx, heightPx);
  ctx.fillStyle = roadDark;
  ctx.fillRect(0, 0, widthPx, heightPx);
  const ambient = ensureGradient('ambient', () => {
    const grad = ctx.createLinearGradient(0, 0, 0, heightPx);
    grad.addColorStop(0, withAlpha(waterHighlight, 0.35));
    grad.addColorStop(1, withAlpha(roadDark, 0.9));
    return grad;
  });
  ctx.fillStyle = ambient;
  ctx.fillRect(0, 0, widthPx, heightPx);

  for (let y = 0; y < GRID_HEIGHT; y += 1) {
    const top = y * CELL_SIZE;
    if (y === 3 || y === 6) {
      const gradient = ensureGradient(`grass-${y}`, () => {
        const grad = ctx.createLinearGradient(0, top, 0, top + CELL_SIZE);
        grad.addColorStop(0, grassHighlight);
        grad.addColorStop(1, grassBase);
        return grad;
      });
      ctx.fillStyle = gradient;
      ctx.fillRect(0, top, widthPx, CELL_SIZE);
      ctx.fillStyle = withAlpha(grassGlow, 0.12 + sparkle * 0.08);
      ctx.fillRect(0, top + CELL_SIZE * 0.18, widthPx, CELL_SIZE * 0.15);
      drawDiagonalHatch(
        ctx,
        0,
        top,
        widthPx,
        CELL_SIZE,
        grassHighlight,
        0.08,
        12,
      );
      ctx.fillStyle = withAlpha(hudAccent, 0.08 + effects.safeFlash * 0.1);
      ctx.fillRect(0, top, widthPx, 3);
      ctx.fillRect(0, top + CELL_SIZE - 3, widthPx, 3);
      if (effects.safeFlash > 0 && Math.floor(phase * 8) % 2 === 0) {
        ctx.fillStyle = withAlpha(hudAccent, 0.25);
        ctx.fillRect(0, top, widthPx, CELL_SIZE);
      }
    } else if (y >= 4 && y <= 5) {
      const gradient = ensureGradient(`road-${y}`, () => {
        const grad = ctx.createLinearGradient(0, top, 0, top + CELL_SIZE);
        grad.addColorStop(0, roadLight);
        grad.addColorStop(0.6, roadDark);
        grad.addColorStop(1, laneEdge);
        return grad;
      });
      ctx.fillStyle = gradient;
      ctx.fillRect(0, top, widthPx, CELL_SIZE);
      ctx.fillStyle = withAlpha(laneEdge, 0.25);
      ctx.fillRect(0, top + CELL_SIZE * 0.2, widthPx, 1);
      ctx.fillRect(0, top + CELL_SIZE * 0.8, widthPx, 1);
      drawTextureDots(ctx, 0, top, widthPx, CELL_SIZE, laneEdge, 0.18, 0.6, y);
      ctx.fillStyle = withAlpha(laneStripe, 0.55 + sparkle * 0.25);
      ctx.fillRect(0, top + CELL_SIZE / 2 - 1, widthPx, 2);
      ctx.fillStyle = withAlpha(laneEdge, 0.35);
      ctx.fillRect(0, top, widthPx, 2);
      ctx.fillRect(0, top + CELL_SIZE - 2, widthPx, 2);
    } else {
      const gradient = ensureGradient(`water-${y}`, () => {
        const grad = ctx.createLinearGradient(0, top, 0, top + CELL_SIZE);
        grad.addColorStop(0, waterHighlight);
        grad.addColorStop(0.5, waterBase);
        grad.addColorStop(1, waterShadow);
        return grad;
      });
      ctx.fillStyle = gradient;
      ctx.fillRect(0, top, widthPx, CELL_SIZE);
      ctx.fillStyle = withAlpha(waterHighlight, 0.08 + sparkle * 0.06);
      ctx.fillRect(0, top + CELL_SIZE * 0.15, widthPx, 1);
      ctx.fillRect(0, top + CELL_SIZE * 0.78, widthPx, 1);
      drawTextureDots(
        ctx,
        0,
        top,
        widthPx,
        CELL_SIZE,
        waterHighlight,
        0.12,
        0.5,
        y + 12,
      );
      if (!reduceMotion) {
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = rippleColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x <= GRID_WIDTH; x += 1) {
          const px = x * CELL_SIZE;
          const wave = Math.sin(phase * 1.6 + x * 0.9 + y * 0.6) * 3;
          const py = top + CELL_SIZE * 0.5 + wave;
          if (x === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.fillStyle = withAlpha(rippleColor, 0.2);
        ctx.fillRect(0, top + CELL_SIZE * 0.45, widthPx, 2);
      }
    }
  }

  PAD_POSITIONS.forEach((padX, idx) => {
    const padActive = state.pads[idx];
    const baseX = padX * CELL_SIZE;
    const bob = reduceMotion ? 0 : Math.sin(phase * 1.4 + padX) * 2;
    ctx.save();
    ctx.translate(baseX + CELL_SIZE / 2, CELL_SIZE / 2 + bob);
    const padGradient = ctx.createRadialGradient(0, 0, CELL_SIZE * 0.1, 0, 0, CELL_SIZE * 0.45);
    padGradient.addColorStop(
      0,
      padActive ? colors.frogLight || colors.frog : padHighlight,
    );
    padGradient.addColorStop(
      1,
      padActive ? colors.frogShadow || colors.frog : padShadow,
    );
    ctx.fillStyle = padGradient;
    ctx.beginPath();
    ctx.arc(0, 0, CELL_SIZE * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = withAlpha(padHighlight, 0.35);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, CELL_SIZE * 0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = withAlpha(padShadow, 0.4);
    ctx.beginPath();
    ctx.arc(0, 0, CELL_SIZE * 0.38, 0, Math.PI * 2);
    ctx.stroke();
    if (padActive) {
      ctx.fillStyle = withAlpha(hudAccent, 0.6 + sparkle * 0.2);
      ctx.beginPath();
      ctx.arc(0, 0, CELL_SIZE * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });

  state.logs.forEach((lane) => {
    lane.entities.forEach((e) => {
      const x = e.x * CELL_SIZE;
      const y = lane.y * CELL_SIZE;
      const width = lane.length * CELL_SIZE;
      const logLight = colors.logLight || colors.log;
      const logShadow = colors.logShadow || colors.log;
      const gradient = ctx.createLinearGradient(x, y, x, y + CELL_SIZE);
      gradient.addColorStop(0, logLight);
      gradient.addColorStop(0.7, colors.log);
      gradient.addColorStop(1, logShadow);
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, width, CELL_SIZE);
      drawDiagonalHatch(ctx, x, y + 2, width, CELL_SIZE - 4, logShadow, 0.08, 8);
      ctx.fillStyle = withAlpha(logShadow, 0.35);
      ctx.fillRect(x, y + CELL_SIZE * 0.3, width, 2);
      ctx.fillRect(x, y + CELL_SIZE * 0.7, width, 2);
      ctx.fillStyle = withAlpha(logShadow, 0.35);
      ctx.beginPath();
      ctx.arc(x + 4, y + CELL_SIZE / 2, CELL_SIZE * 0.18, 0, Math.PI * 2);
      ctx.arc(x + width - 4, y + CELL_SIZE / 2, CELL_SIZE * 0.18, 0, Math.PI * 2);
      ctx.fill();
      const reflectionTop = y + CELL_SIZE;
      if (reflectionTop < heightPx) {
        const reflectionGradient = ctx.createLinearGradient(
          x,
          reflectionTop,
          x,
          reflectionTop + CELL_SIZE * 0.9,
        );
        reflectionGradient.addColorStop(0, withAlpha(logLight, 0.25));
        reflectionGradient.addColorStop(1, 'rgba(0,0,0,0)');
        const offset = reduceMotion ? 0 : Math.sin(phase * 1.2 + e.x * 0.8) * 2;
        ctx.save();
        ctx.translate(0, offset);
        ctx.fillStyle = reflectionGradient;
        ctx.fillRect(x, reflectionTop, width, CELL_SIZE * 0.9);
        ctx.restore();
      }
    });
  });

  state.cars.forEach((lane) => {
    lane.entities.forEach((e) => {
      const x = e.x * CELL_SIZE;
      const y = lane.y * CELL_SIZE;
      const width = lane.length * CELL_SIZE;
      const carLight = colors.carLight || colors.car;
      const carShadow = colors.carShadow || colors.car;
      const gradient = ctx.createLinearGradient(x, y, x, y + CELL_SIZE);
      gradient.addColorStop(0, carLight);
      gradient.addColorStop(0.6, colors.car);
      gradient.addColorStop(1, carShadow);
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, width, CELL_SIZE);
      ctx.fillStyle = withAlpha('#ffffff', 0.08);
      ctx.fillRect(x + 2, y + 2, width - 4, 3);
      ctx.fillStyle = withAlpha(colors.carAccent || carLight, 0.35 + sparkle * 0.2);
      ctx.fillRect(x + 4, y + CELL_SIZE * 0.25, width - 8, 3);
      ctx.save();
      const lightLength = CELL_SIZE * 0.6;
      ctx.globalAlpha = 0.3 + sparkle * 0.2;
      ctx.fillStyle = withAlpha(colors.carAccent || carLight, 1);
      if (lane.dir === 1) {
        ctx.fillRect(x + width - 2, y + CELL_SIZE * 0.35, lightLength, 4);
      } else {
        ctx.fillRect(x - lightLength + 2, y + CELL_SIZE * 0.35, lightLength, 4);
      }
      ctx.restore();
    });
  });

  effects.splashes.forEach((sp) => {
    const progress = sp.t / RIPPLE_DURATION;
    const radius = progress * CELL_SIZE;
    ctx.strokeStyle = withAlpha(rippleColor, 1 - progress);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  });

  const anim = effects.frogAnimation;
  let frogX = state.frog.x;
  let frogY = state.frog.y;
  if (anim.progress < 1) {
    const t = smoothStep(anim.progress);
    frogX = anim.start.x + (anim.end.x - anim.start.x) * t;
    frogY = anim.start.y + (anim.end.y - anim.start.y) * t;
  }
  const hopHeight =
    anim.progress < 1 && !reduceMotion
      ? Math.sin(anim.progress * Math.PI) * CELL_SIZE * 0.35
      : 0;
  const frogPixelX = frogX * CELL_SIZE + CELL_SIZE / 2;
  const frogPixelY = frogY * CELL_SIZE + CELL_SIZE / 2;
  const isOnWater = frogY <= 2 || frogY === 7 || frogY === 0;
  if (!isOnWater) {
    ctx.save();
    ctx.globalAlpha = 0.35 * (1 - hopHeight / (CELL_SIZE * 0.35 || 1));
    ctx.fillStyle = withAlpha(colors.frogShadow || colors.frog, 1);
    ctx.beginPath();
    ctx.ellipse(
      frogPixelX,
      frogPixelY + CELL_SIZE * 0.25,
      CELL_SIZE * 0.28,
      CELL_SIZE * 0.14,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();
  }
  ctx.save();
  ctx.translate(frogPixelX, frogPixelY - hopHeight);
  const tilt = anim.progress < 1 ? (anim.end.x - anim.start.x) * 0.25 : 0;
  ctx.rotate(tilt);
  const frogGradient = ctx.createLinearGradient(0, -CELL_SIZE * 0.35, 0, CELL_SIZE * 0.35);
  frogGradient.addColorStop(0, colors.frogLight || colors.frog);
  frogGradient.addColorStop(1, colors.frogShadow || colors.frog);
  ctx.fillStyle = frogGradient;
  ctx.beginPath();
  ctx.ellipse(0, 0, CELL_SIZE * 0.32, CELL_SIZE * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.frogOutline || withAlpha(colors.frog, 0.8);
  ctx.beginPath();
  ctx.arc(-CELL_SIZE * 0.12, -CELL_SIZE * 0.12, CELL_SIZE * 0.1, 0, Math.PI * 2);
  ctx.arc(CELL_SIZE * 0.12, -CELL_SIZE * 0.12, CELL_SIZE * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-CELL_SIZE * 0.12, -CELL_SIZE * 0.12, CELL_SIZE * 0.055, 0, Math.PI * 2);
  ctx.arc(CELL_SIZE * 0.12, -CELL_SIZE * 0.12, CELL_SIZE * 0.055, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(-CELL_SIZE * 0.12, -CELL_SIZE * 0.12, CELL_SIZE * 0.025, 0, Math.PI * 2);
  ctx.arc(CELL_SIZE * 0.12, -CELL_SIZE * 0.12, CELL_SIZE * 0.025, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (showHitboxes) {
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    state.logs.forEach((lane) => {
      lane.entities.forEach((e) => {
        ctx.strokeRect(
          e.x * CELL_SIZE,
          lane.y * CELL_SIZE,
          lane.length * CELL_SIZE,
          CELL_SIZE,
        );
      });
    });
    state.cars.forEach((lane) => {
      lane.entities.forEach((e) => {
        ctx.strokeRect(
          e.x * CELL_SIZE,
          lane.y * CELL_SIZE,
          lane.length * CELL_SIZE,
          CELL_SIZE,
        );
      });
    });
    ctx.strokeRect(
      state.frog.x * CELL_SIZE,
      state.frog.y * CELL_SIZE,
      CELL_SIZE,
      CELL_SIZE,
    );
  }

  if (effects.hitFlash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${effects.hitFlash / 0.2})`;
    ctx.fillRect(0, 0, widthPx, heightPx);
  }

  const vignette = ctx.createRadialGradient(
    widthPx / 2,
    heightPx / 2,
    heightPx * 0.1,
    widthPx / 2,
    heightPx / 2,
    heightPx * 0.75,
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, withAlpha(vignetteColor, 0.55));
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, widthPx, heightPx);

  if (status || (paused && showPauseOverlay)) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, widthPx, heightPx);
    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      paused && showPauseOverlay ? 'Paused' : status,
      widthPx / 2,
      heightPx / 2,
    );
  }

  if (timeLeft <= 10 && !paused) {
    const urgency = Math.min(0.45, (10 - timeLeft) / 20);
    ctx.fillStyle = withAlpha('#f87171', urgency);
    ctx.fillRect(0, 0, widthPx, heightPx);
  }
};
