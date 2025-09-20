import type { Projectile } from '../../games/tower-defense';

type CanvasLike = HTMLCanvasElement | OffscreenCanvas;
type ContextLike =
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D
  | null;

type ProjectileRenderer = {
  draw: (projectiles: Projectile[], cellSize: number) => void;
  blit: (ctx: CanvasRenderingContext2D) => void;
  resize: (width: number, height: number) => void;
  getCanvas: () => CanvasLike | null;
};

const projectileSprites = new Map<number, CanvasLike>();

const createCanvas = (width: number, height: number): CanvasLike | null => {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  return null;
};

const getContext = (canvas: CanvasLike | null): ContextLike =>
  canvas ? canvas.getContext('2d') : null;

const getSprite = (radius: number): CanvasLike | null => {
  if (projectileSprites.has(radius)) {
    return projectileSprites.get(radius) ?? null;
  }
  const size = radius * 2;
  const canvas = createCanvas(size, size);
  if (!canvas) {
    projectileSprites.set(radius, null as unknown as CanvasLike);
    return null;
  }
  const ctx = getContext(canvas);
  if (!ctx) {
    projectileSprites.set(radius, canvas);
    return canvas;
  }
  ctx.clearRect(0, 0, size, size);
  const gradient = ctx.createRadialGradient(
    radius,
    radius,
    Math.max(1, radius / 4),
    radius,
    radius,
    radius,
  );
  gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
  gradient.addColorStop(1, 'rgba(255,120,0,0.7)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(radius, radius, radius, 0, Math.PI * 2);
  ctx.fill();
  projectileSprites.set(radius, canvas);
  return canvas;
};

let instance: (ProjectileRenderer & {
  canvas: CanvasLike | null;
  ctx: ContextLike;
  width: number;
  height: number;
  hasContent: boolean;
}) | null = null;

const ensureRenderer = (
  width: number,
  height: number,
): ProjectileRenderer & {
  canvas: CanvasLike | null;
  ctx: ContextLike;
  hasContent: boolean;
} => {
  if (!instance) {
    const canvas = createCanvas(width, height);
    if (canvas && 'dataset' in canvas) {
      (canvas as HTMLCanvasElement).dataset.layer = 'tower-defense-projectiles';
    }
    instance = {
      canvas,
      ctx: getContext(canvas),
      width,
      height,
      hasContent: false,
      draw(projectiles: Projectile[], cellSize: number) {
        if (!instance?.ctx || !instance.canvas) return;
        const ctx = instance.ctx;
        const active = projectiles.filter((p) => p.active);
        if (!active.length) {
          instance.hasContent = false;
          ctx.clearRect(0, 0, instance.width, instance.height);
          return;
        }
        ctx.clearRect(0, 0, instance.width, instance.height);
        const radius = Math.max(2, Math.round(cellSize / 6));
        const sprite = getSprite(radius);
        instance.hasContent = true;
        active.forEach((projectile) => {
          const x = projectile.x - radius;
          const y = projectile.y - radius;
          if (sprite) {
            ctx.drawImage(sprite as CanvasImageSource, x, y);
          } else {
            ctx.beginPath();
            ctx.arc(projectile.x, projectile.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,160,0,0.8)';
            ctx.fill();
          }
        });
      },
      blit(ctx: CanvasRenderingContext2D) {
        if (!instance?.canvas || !instance.hasContent) return;
        ctx.drawImage(instance.canvas as CanvasImageSource, 0, 0);
      },
      resize(newWidth: number, newHeight: number) {
        if (!instance) return;
        instance.width = newWidth;
        instance.height = newHeight;
        const { canvas } = instance;
        if (!canvas) return;
        if ('width' in canvas) {
          (canvas as HTMLCanvasElement).width = newWidth;
          (canvas as HTMLCanvasElement).height = newHeight;
        } else if (canvas instanceof OffscreenCanvas) {
          canvas.width = newWidth;
          canvas.height = newHeight;
        }
      },
      getCanvas() {
        return instance?.canvas ?? null;
      },
    };
  } else if (instance.width !== width || instance.height !== height) {
    instance.resize(width, height);
  }
  return instance;
};

export const getProjectileRenderer = (
  width: number,
  height: number,
): ProjectileRenderer => ensureRenderer(width, height);

export const resetProjectileRenderer = () => {
  instance = null;
  projectileSprites.clear();
};
