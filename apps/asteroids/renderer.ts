import { Bullet } from './utils';

interface Asteroid {
  x: number;
  y: number;
  r: number;
  verts: number;
}
interface Saucer {
  active: boolean;
  x: number;
  y: number;
  r: number;
}

let ctx: OffscreenCanvasRenderingContext2D | null = null;

self.onmessage = (e: MessageEvent) => {
  const { type } = e.data;
  if (type === 'init') {
    ctx = (e.data.canvas as OffscreenCanvas).getContext('2d');
  } else if (type === 'render' && ctx) {
    const { ship, bullets, saucerBullets, asteroids, saucer, score, level, safeMode } =
      e.data.state as {
        ship: { x: number; y: number; angle: number; r: number };
        bullets: Bullet[];
        saucerBullets: Bullet[];
        asteroids: Asteroid[];
        saucer: Saucer;
        score: number;
        level: number;
        safeMode: boolean;
      };
    const width = (ctx.canvas as OffscreenCanvas).width;
    const height = (ctx.canvas as OffscreenCanvas).height;
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ffffff';
    ctx.shadowBlur = safeMode ? 0 : 4;
    ctx.shadowColor = '#0ff';
    ctx.beginPath();
    ctx.moveTo(ship.x + Math.cos(ship.angle) * ship.r, ship.y + Math.sin(ship.angle) * ship.r);
    ctx.lineTo(
      ship.x + Math.cos(ship.angle + 2.5) * ship.r,
      ship.y + Math.sin(ship.angle + 2.5) * ship.r,
    );
    ctx.lineTo(
      ship.x + Math.cos(ship.angle - 2.5) * ship.r,
      ship.y + Math.sin(ship.angle - 2.5) * ship.r,
    );
    ctx.closePath();
    ctx.stroke();
    bullets.forEach((b) => {
      if (!b.active) return;
      ctx.moveTo(b.x + b.r, b.y);
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    });
    saucerBullets.forEach((b) => {
      if (!b.active) return;
      ctx.moveTo(b.x + b.r, b.y);
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    });
    asteroids.forEach((a) => {
      ctx.moveTo(a.x + a.r, a.y);
      for (let i = 1; i <= a.verts; i++) {
        const ang = (i / a.verts) * Math.PI * 2;
        ctx.lineTo(a.x + Math.cos(ang) * a.r, a.y + Math.sin(ang) * a.r);
      }
      ctx.closePath();
    });
    if (saucer.active) {
      ctx.moveTo(saucer.x + saucer.r, saucer.y);
      ctx.arc(saucer.x, saucer.y, saucer.r, 0, Math.PI * 2);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = '14px monospace';
    ctx.fillText(`Score: ${score}`, 10, 20);
    ctx.fillText(`Level: ${level}`, 10, 40);
  }
};
