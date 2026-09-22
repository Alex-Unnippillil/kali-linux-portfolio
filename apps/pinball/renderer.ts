import type { RuleState } from './rules';
import {
  WIDTH, HEIGHT, BALL_RADIUS, FLIPPER_LENGTH, RAILS, BUMPERS, LANES, TARGETS,
  SLINGS, type Point, type ThemeConfig,
} from './table';
export interface Particle extends Point { vx: number; vy: number; life: number; color: string; text: string; }
export interface Scene {
  theme: ThemeConfig;
  state: RuleState;
  time: number;
  reducedMotion: boolean;
  flashes: Map<string, number>;
  particles: Particle[];
  balls: (Point & { trail: Point[] })[];
  flippers: { pivot: Point; angle: number }[];
}
const rounded = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};
const circle = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) => {
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
};
const text = (ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, color: string) => {
  ctx.font = `600 ${size}px ui-monospace, SFMono-Regular, Consolas, monospace`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color;
  ctx.fillText(value, x, y);
};
function drawStatic(ctx: CanvasRenderingContext2D, theme: ThemeConfig): void {
  const accent = theme.accent || '#68e8f2';
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const glow = ctx.createRadialGradient(197, 252, 5, 197, 305, 395);
  glow.addColorStop(0, '#19354b'); glow.addColorStop(1, theme.bg);
  ctx.fillStyle = glow; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.save();
  ctx.globalAlpha = 0.09; ctx.strokeStyle = accent; ctx.lineWidth = 0.6;
  for (let x = 30; x < 373; x += 26) { ctx.beginPath(); ctx.moveTo(x, 36); ctx.lineTo(x, 706); ctx.stroke(); }
  for (let y = 38; y < 720; y += 26) { ctx.beginPath(); ctx.moveTo(18, y); ctx.lineTo(367, y); ctx.stroke(); }
  ctx.restore();
  // Circuit-board traces are static and cached; no image downloads or frame RNG.
  ctx.strokeStyle = '#315063'; ctx.lineWidth = 1;
  [[37, 184, 70, 225], [355, 184, 321, 225], [35, 326, 76, 377], [359, 326, 317, 377]].forEach(([x, y, ex, ey]) => {
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, y); ctx.lineTo(ex, ey); ctx.stroke();
    circle(ctx, ex, ey, 3); ctx.stroke();
  });
  rounded(ctx, 83, 46, 229, 42, 11); ctx.fillStyle = '#081320'; ctx.fill();
  text(ctx, 'N E O N  C I R C U I T', 197, 61, 13, '#ecf6ff');
  text(ctx, 'P I N B A L L   / /   0 1', 197, 77, 8, accent);
  ctx.fillStyle = '#070f1c'; ctx.fillRect(379, 190, 29, 522);
  ctx.save(); ctx.translate(394, 476); ctx.rotate(-Math.PI / 2);
  text(ctx, 'L A U N C H', 0, 0, 10, '#7693aa'); ctx.restore();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  RAILS.forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = '#02070d'; ctx.lineWidth = 20; ctx.stroke();
    ctx.strokeStyle = '#506879'; ctx.lineWidth = 12; ctx.stroke();
    ctx.strokeStyle = '#b4c9d4'; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = '#e2f5fc'; ctx.lineWidth = 0.8; ctx.stroke();
  });
  for (let i = 0; i < 17; i += 1) {
    const angle = Math.PI + i * Math.PI / 16;
    const x = 197 + Math.cos(angle) * 157;
    const y = 126 + Math.sin(angle) * 94;
    circle(ctx, x, y, 1.8); ctx.fillStyle = i % 2 ? theme.flipper : accent; ctx.fill();
  }
  SLINGS.forEach((vertices) => {
    ctx.save();
    ctx.beginPath(); vertices.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); }); ctx.closePath();
    const g = ctx.createLinearGradient(0, 480, 0, 570); g.addColorStop(0, '#263c51'); g.addColorStop(1, '#0c1526');
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = theme.secondary || '#df83ff'; ctx.lineWidth = 4; ctx.stroke();
    ctx.restore();
  });
  text(ctx, 'DROP BANK', 197, 451, 9, '#7896aa');
  text(ctx, '01', 45, 585, 8, '#617d91'); text(ctx, '02', 349, 585, 8, '#617d91');
  rounded(ctx, 134, 480, 126, 81, 15); ctx.fillStyle = '#071522'; ctx.fill();
  ctx.strokeStyle = '#2c4c62'; ctx.lineWidth = 1; ctx.stroke();
  text(ctx, 'MULTIPLIER', 197, 544, 8, '#a4bdd0');
  text(ctx, 'L', 104, 662, 10, '#6b879c'); text(ctx, 'R', 290, 662, 10, '#6b879c');
  ctx.fillStyle = '#070e18'; ctx.fillRect(19, 713, 347, 27);
  text(ctx, 'D R A I N', 197, 728, 9, '#486177');
}

export function createPinballRenderer(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D rendering is unavailable in this browser.');
  const cache = canvas.ownerDocument?.createElement('canvas');
  const cacheCtx = cache?.getContext('2d', { alpha: false });
  let cachedTheme = '';
  let ratio = 0;
  let disposed = false;
  return {
    draw(scene: Scene): void {
      if (disposed) return;
      const nextRatio = typeof window === 'undefined' ? 1 : Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      if (ratio !== nextRatio) {
        ratio = nextRatio;
        canvas.width = Math.round(WIDTH * ratio); canvas.height = Math.round(HEIGHT * ratio);
        cachedTheme = '';
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const themeKey = JSON.stringify(scene.theme);
      if (cache && cacheCtx) {
        if (cachedTheme !== themeKey) {
          cache.width = WIDTH * ratio; cache.height = HEIGHT * ratio;
          cacheCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
          drawStatic(cacheCtx, scene.theme);
          cachedTheme = themeKey;
        }
        ctx.drawImage(cache, 0, 0, WIDTH, HEIGHT);
      } else drawStatic(ctx, scene.theme);
      const { state, theme } = scene;
      const accent = theme.accent || '#68e8f2';
      const secondary = theme.secondary || '#df83ff';
      LANES.forEach((p, index) => {
        const lit = Boolean(state.laneMask & (1 << index));
        rounded(ctx, p.x - 28, p.y - 11, 56, 22, 9);
        ctx.fillStyle = lit ? accent : '#102639'; ctx.fill();
        ctx.strokeStyle = lit ? '#efffff' : '#3e6b83'; ctx.lineWidth = 1; ctx.stroke();
        text(ctx, ['N', 'E', 'O'][index], p.x, p.y, 12, lit ? '#06141c' : '#91afc2');
      });
      BUMPERS.forEach((b, index) => {
        const flashing = !scene.reducedMotion && scene.flashes.has(`bumper:${index}`);
        const jackpot = index === 0 && state.jackpotLit;
        const color = jackpot ? secondary : accent;
        ctx.save();
        if (flashing || jackpot) { ctx.shadowColor = color; ctx.shadowBlur = flashing ? 22 : 12; }
        circle(ctx, b.x, b.y, b.r + 6); ctx.fillStyle = '#07121d'; ctx.fill();
        ctx.strokeStyle = color; ctx.lineWidth = flashing ? 4 : 2; ctx.stroke();
        const metal = ctx.createLinearGradient(b.x, b.y - b.r, b.x, b.y + b.r);
        metal.addColorStop(0, flashing ? '#f1fdff' : '#809eaf'); metal.addColorStop(0.3, '#344e63'); metal.addColorStop(1, '#102034');
        circle(ctx, b.x, b.y, b.r); ctx.fillStyle = metal; ctx.fill();
        circle(ctx, b.x, b.y, b.r - 8); ctx.strokeStyle = '#829cae'; ctx.lineWidth = 1; ctx.stroke();
        text(ctx, jackpot ? 'JACK' : '100', b.x, b.y, jackpot ? 10 : 12, '#eefbff');
        ctx.restore();
      });
      text(ctx, state.jackpotLit ? 'J A C K P O T  L I T' : 'COMPLETE TARGETS → JACKPOT', 197, 168, 8, state.jackpotLit ? secondary : '#92a9bd');
      TARGETS.forEach((p, index) => {
        const down = Boolean(state.targetMask & (1 << index));
        rounded(ctx, p.x - 11, p.y - 17, 22, 34, 5);
        ctx.fillStyle = down ? '#0a1d2d' : secondary; ctx.fill();
        ctx.strokeStyle = down ? '#36667a' : '#f2d9ff'; ctx.lineWidth = 1.5; ctx.stroke();
        text(ctx, down ? '✓' : String(index + 1), p.x, p.y, 13, down ? accent : '#21142e');
      });
      const spinning = !scene.reducedMotion && scene.flashes.has('spinner:0');
      ctx.save(); ctx.translate(197, 342);
      ctx.strokeStyle = '#9eb7ca'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-32, 0); ctx.lineTo(32, 0); ctx.stroke();
      const width = spinning ? Math.max(5, Math.abs(Math.cos(scene.time * 45)) * 48) : 48;
      rounded(ctx, -width / 2, -7, width, 14, 3); ctx.fillStyle = theme.flipper; ctx.fill();
      text(ctx, '↔', 0, 0, 12, '#302817'); ctx.restore();
      text(ctx, `${state.multiplier}×`, 197, 513, 35, theme.flipper);
      if (state.combo > 1) text(ctx, `${state.combo}× COMBO`, 197, 578, 13, accent);
      scene.flippers.forEach(({ pivot, angle }) => {
        ctx.save(); ctx.translate(pivot.x, pivot.y); ctx.rotate(angle);
        rounded(ctx, -4, -8, FLIPPER_LENGTH + 8, 16, 8);
        const gold = ctx.createLinearGradient(0, -8, 0, 8);
        gold.addColorStop(0, '#fff8dd'); gold.addColorStop(0.45, theme.flipper); gold.addColorStop(1, '#987142');
        ctx.fillStyle = state.tilted ? '#64748b' : gold; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = '#fff0bf'; ctx.stroke();
        ctx.restore();
        circle(ctx, pivot.x, pivot.y, 6); ctx.fillStyle = '#254154'; ctx.fill();
        circle(ctx, pivot.x, pivot.y, 2); ctx.fillStyle = '#daedf4'; ctx.fill();
      });
      scene.balls.forEach((ball) => {
        if (!scene.reducedMotion) ball.trail.forEach((p, index) => {
          ctx.globalAlpha = (1 - index / 9) * 0.16;
          circle(ctx, p.x, p.y, BALL_RADIUS * (1 - index / 12)); ctx.fillStyle = accent; ctx.fill();
        });
        ctx.globalAlpha = 1;
        circle(ctx, ball.x + 2, ball.y + 4, BALL_RADIUS + 1); ctx.fillStyle = '#00000077'; ctx.fill();
        const steel = ctx.createRadialGradient(ball.x - 3, ball.y - 4, 0, ball.x, ball.y, BALL_RADIUS);
        steel.addColorStop(0, '#ffffff'); steel.addColorStop(0.25, '#e2f0f9'); steel.addColorStop(0.65, '#99acbe'); steel.addColorStop(1, '#465e77');
        circle(ctx, ball.x, ball.y, BALL_RADIUS); ctx.fillStyle = steel; ctx.fill();
        ctx.strokeStyle = '#ddecf6'; ctx.lineWidth = 0.8; ctx.stroke();
      });
      if (!scene.reducedMotion) scene.particles.forEach((p) => {
        ctx.globalAlpha = Math.max(0, p.life / 0.38);
        if (p.text) text(ctx, p.text, p.x, p.y - 20, 13, p.color);
        else { circle(ctx, p.x, p.y, 2); ctx.fillStyle = p.color; ctx.fill(); }
      });
      ctx.globalAlpha = 1;
      text(ctx, state.tilted ? 'T I L T' : state.ballSave > 0 ? `BALL SAVE · ${Math.ceil(state.ballSave)}s` : state.activeBalls > 1 ? `${state.activeBalls} BALLS IN PLAY` : 'KEEP THE CIRCUIT ALIVE',
        197, 692, 10, state.tilted ? '#ff9ba8' : state.ballSave > 0 ? accent : '#7893a9');
    },
    destroy(): void { disposed = true; if (cache) { cache.width = 0; cache.height = 0; } },
  };
}
