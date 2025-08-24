import React, { useEffect, useRef } from 'react';
import {
  wrap,
  createBulletPool,
  spawnBullet,
  updateBullets,
  Bullet,
  Quadtree,
} from './utils';

interface Vec { x: number; y: number; }
interface Asteroid {
  x: number;
  y: number;
  dx: number;
  dy: number;
  r: number;
  verts: number; // number of vertices for rendering
}
interface Saucer {
  active: boolean;
  x: number;
  y: number;
  dx: number;
  dy: number;
  r: number;
  cooldown: number;
}

const TAU = Math.PI * 2;
const STEP = 1000 / 60; // fixed timestep in ms

function polygonCircle(poly: Vec[], cx: number, cy: number, r: number): boolean {
  // Ray casting for point in polygon
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect = yi > cy !== yj > cy && cx < ((xj - xi) * (cy - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  if (inside) return true;
  // Edge distance check
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const t = ((cx - a.x) * (b.x - a.x) + (cy - a.y) * (b.y - a.y)) /
      ((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
    const tClamped = Math.max(0, Math.min(1, t));
    const px = a.x + (b.x - a.x) * tClamped;
    const py = a.y + (b.y - a.y) * tClamped;
    const dist = Math.hypot(cx - px, cy - py);
    if (dist < r) return true;
  }
  return false;
}

const Asteroids: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let width = 0;
    let height = 0;
    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width;
      canvas.height = height;
    };
    resize();
    window.addEventListener('resize', resize);

    // state
    const keys: Record<string, boolean> = {};
    const ship = { x: width / 2, y: height / 2, angle: 0, dx: 0, dy: 0, r: 12, cooldown: 0 };
    const bullets: Bullet[] = createBulletPool(60);
    const asteroids: Asteroid[] = [];
    const saucer: Saucer = { active: false, x: 0, y: 0, dx: 0, dy: 0, r: 15, cooldown: 0 };
    const saucerBullets: Bullet[] = createBulletPool(8);
    let spawnTimer = 0;
    let saucerTimer = 30 * 60;
    let score = 0;
    let level = 1;
    let crt = false;
    let safeMode = false;

    const telemetry = (event: string, detail: any = {}) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('telemetry', { detail: { event, ...detail } }));
      }
    };

    const rumble = (strong: number, weak: number, duration: number) => {
      if (safeMode) return;
      const gp = navigator.getGamepads ? navigator.getGamepads()[0] : null;
      gp?.vibrationActuator?.playEffect?.('dual-rumble', {
        duration,
        strongMagnitude: strong,
        weakMagnitude: weak,
      }).catch?.(() => {});
    };

    const spawnAsteroid = () => {
      const edge = Math.random() < 0.5 ? 0 : 1;
      const x = edge ? Math.random() * width : Math.random() < 0.5 ? 0 : width;
      const y = edge ? Math.random() < 0.5 ? 0 : height : Math.random() * height;
      const angle = Math.random() * TAU;
      const speed = Math.random() * 0.5 + 0.5 + level * 0.05;
      asteroids.push({ x, y, dx: Math.cos(angle) * speed, dy: Math.sin(angle) * speed, r: 40, verts: 8 });
      telemetry('asteroidSpawn', { level });
    };

    const splitAsteroid = (index: number) => {
      const a = asteroids[index];
      if (a.r > 12) {
        for (let i = 0; i < 2; i++) {
          const angle = Math.random() * TAU;
          const speed = Math.random() * 1 + 1;
          asteroids.push({
            x: a.x,
            y: a.y,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            r: a.r / 2,
            verts: 6,
          });
        }
      }
      asteroids.splice(index, 1);
      score += 100;
      telemetry('asteroidSplit', { score });
      if (score / 1000 > level) {
        level += 1;
        telemetry('levelUp', { level });
      }
    };

    const spawnSaucer = () => {
      saucer.active = true;
      saucer.x = Math.random() < 0.5 ? 0 : width;
      saucer.y = Math.random() * height;
      saucer.dx = (Math.random() < 0.5 ? 1 : -1) * (1 + level * 0.1);
      saucer.dy = (Math.random() - 0.5) * 1.5;
      saucer.cooldown = 120;
      telemetry('ufoSpawn', { level });
    };

    const shoot = () => {
      if (ship.cooldown > 0) return;
      const dx = Math.cos(ship.angle) * 6;
      const dy = Math.sin(ship.angle) * 6;
      spawnBullet(bullets, ship.x + dx * 2, ship.y + dy * 2, dx, dy, 60);
      ship.cooldown = 15;
      telemetry('playerShoot');
      rumble(0.5, 0.5, 100);
    };

    const handleKey = (e: KeyboardEvent, down: boolean) => {
      keys[e.key] = down;
      if (down && e.key === ' ') shoot();
      if (down && e.key === 'c') {
        crt = !crt;
        canvas.classList.toggle('crt', crt);
        telemetry('crt', { enabled: crt });
      }
      if (down && e.key === 's') {
        safeMode = !safeMode;
        canvas.classList.toggle('safe-mode', safeMode);
        telemetry('safeMode', { enabled: safeMode });
      }
    };
    window.addEventListener('keydown', (e) => handleKey(e, true));
    window.addEventListener('keyup', (e) => handleKey(e, false));

    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      if (!t) return;
      const rect = canvas.getBoundingClientRect();
      const tx = t.clientX - rect.left;
      const ty = t.clientY - rect.top;
      ship.angle = Math.atan2(ty - ship.y, tx - ship.x);
      ship.dx += Math.cos(ship.angle) * 0.1;
      ship.dy += Math.sin(ship.angle) * 0.1;
    };
    const touchEnd = () => shoot();
    canvas.addEventListener('touchstart', handleTouch, { passive: false });
    canvas.addEventListener('touchmove', handleTouch, { passive: false });
    canvas.addEventListener('touchend', touchEnd);

    let last = performance.now();
    let acc = 0;
    let anim: number;

    const pollGamepad = () => {
      const gp = navigator.getGamepads ? navigator.getGamepads()[0] : null;
      if (!gp) return;
      const [lx, ly] = gp.axes;
      if (Math.abs(lx) > 0.2) ship.angle += lx * 0.1;
      if (ly < -0.3) {
        ship.dx += Math.cos(ship.angle) * 0.1;
        ship.dy += Math.sin(ship.angle) * 0.1;
      }
      if (gp.buttons[0].pressed) shoot();
    };

    const update = () => {
      pollGamepad();
      if (keys['ArrowLeft']) ship.angle -= 0.1;
      if (keys['ArrowRight']) ship.angle += 0.1;
      if (keys['ArrowUp']) {
        ship.dx += Math.cos(ship.angle) * 0.1;
        ship.dy += Math.sin(ship.angle) * 0.1;
      }
      ship.x = wrap(ship.x + ship.dx, width);
      ship.y = wrap(ship.y + ship.dy, height);
      ship.dx *= 0.99;
      ship.dy *= 0.99;
      if (ship.cooldown > 0) ship.cooldown -= 1;

      updateBullets(bullets);
      updateBullets(saucerBullets);
      for (const b of bullets) {
        if (!b.active) continue;
        b.x = wrap(b.x, width);
        b.y = wrap(b.y, height);
      }
      for (const b of saucerBullets) {
        if (!b.active) continue;
        b.x = wrap(b.x, width);
        b.y = wrap(b.y, height);
      }

      const tree = new Quadtree<{ index: number; asteroid: Asteroid }>({
        x: 0,
        y: 0,
        w: width,
        h: height,
      });
      for (let i = 0; i < asteroids.length; i++) {
        const a = asteroids[i];
        a.x = wrap(a.x + a.dx, width);
        a.y = wrap(a.y + a.dy, height);
        tree.insert({ x: a.x, y: a.y, r: a.r, data: { index: i, asteroid: a } });
      }

      spawnTimer -= 1;
      if (spawnTimer <= 0) {
        spawnAsteroid();
        spawnTimer = Math.max(60 - level * 2, 20);
      }

      saucerTimer -= 1;
      if (!saucer.active && saucerTimer <= 0) {
        spawnSaucer();
        saucerTimer = 30 * 60;
      }
      if (saucer.active) {
        saucer.x = wrap(saucer.x + saucer.dx, width);
        saucer.y = wrap(saucer.y + saucer.dy, height);
        saucer.cooldown -= 1;
        if (saucer.cooldown <= 0) {
          const angle = Math.atan2(ship.y - saucer.y, ship.x - saucer.x) + (Math.random() - 0.5) * (1 / (level + 1));
          const dx = Math.cos(angle) * 3;
          const dy = Math.sin(angle) * 3;
          spawnBullet(saucerBullets, saucer.x, saucer.y, dx, dy, 150);
          saucer.cooldown = Math.max(90 - level * 5, 30);
        }
      }

      for (const b of bullets) {
        if (!b.active) continue;
        const candidates = tree.retrieve({ x: b.x, y: b.y, r: b.r });
        for (const c of candidates) {
          const { asteroid, index } = c.data;
          if (Math.hypot(asteroid.x - b.x, asteroid.y - b.y) < asteroid.r + b.r) {
            b.active = false;
            splitAsteroid(index);
            rumble(1, 1, 150);
            break;
          }
        }
      }

      // collisions ship vs asteroids / saucer bullets
      const shipPoly: Vec[] = [
        { x: ship.x + Math.cos(ship.angle) * ship.r, y: ship.y + Math.sin(ship.angle) * ship.r },
        {
          x: ship.x + Math.cos(ship.angle + 2.5) * ship.r,
          y: ship.y + Math.sin(ship.angle + 2.5) * ship.r,
        },
        {
          x: ship.x + Math.cos(ship.angle - 2.5) * ship.r,
          y: ship.y + Math.sin(ship.angle - 2.5) * ship.r,
        },
      ];
      const shipCandidates = tree.retrieve({ x: ship.x, y: ship.y, r: ship.r });
      for (const c of shipCandidates) {
        const a = c.data.asteroid;
        if (polygonCircle(shipPoly, a.x, a.y, a.r)) {
          ship.x = width / 2;
          ship.y = height / 2;
          ship.dx = ship.dy = 0;
          score = 0;
          level = 1;
          asteroids.length = 0;
          rumble(1, 1, 300);
          telemetry('shipHit');
          break;
        }
      }
      for (const b of saucerBullets) {
        if (!b.active) continue;
        if (polygonCircle(shipPoly, b.x, b.y, b.r)) {
          b.active = false;
          ship.x = width / 2;
          ship.y = height / 2;
          ship.dx = ship.dy = 0;
          score = 0;
          level = 1;
          asteroids.length = 0;
          rumble(1, 1, 300);
          telemetry('shipHit');
          break;
        }
      }
    };

    const draw = (
      context: CanvasRenderingContext2D,
      state: {
        ship: typeof ship;
        bullets: Bullet[];
        saucerBullets: Bullet[];
        asteroids: Asteroid[];
        saucer: Saucer;
        score: number;
        level: number;
        safeMode: boolean;
      },
    ) => {
      const { ship, bullets, saucerBullets, asteroids, saucer, score, level, safeMode } = state;
      context.clearRect(0, 0, width, height);
      context.lineWidth = 1.5;
      context.strokeStyle = '#ffffff';
      context.shadowBlur = safeMode ? 0 : 4;
      context.shadowColor = '#0ff';
      context.beginPath();
      // ship
      context.moveTo(
        ship.x + Math.cos(ship.angle) * ship.r,
        ship.y + Math.sin(ship.angle) * ship.r,
      );
      context.lineTo(
        ship.x + Math.cos(ship.angle + 2.5) * ship.r,
        ship.y + Math.sin(ship.angle + 2.5) * ship.r,
      );
      context.lineTo(
        ship.x + Math.cos(ship.angle - 2.5) * ship.r,
        ship.y + Math.sin(ship.angle - 2.5) * ship.r,
      );
      context.closePath();
      context.stroke();
      // bullets
      bullets.forEach((b) => {
        if (!b.active) return;
        context.moveTo(b.x + b.r, b.y);
        context.arc(b.x, b.y, b.r, 0, TAU);
      });
      // saucer bullets
      saucerBullets.forEach((b) => {
        if (!b.active) return;
        context.moveTo(b.x + b.r, b.y);
        context.arc(b.x, b.y, b.r, 0, TAU);
      });
      // asteroids
      asteroids.forEach((a) => {
        context.moveTo(a.x + a.r, a.y);
        for (let i = 1; i <= a.verts; i++) {
          const ang = (i / a.verts) * TAU;
          context.lineTo(a.x + Math.cos(ang) * a.r, a.y + Math.sin(ang) * a.r);
        }
        context.closePath();
      });
      // saucer
      if (saucer.active) {
        context.moveTo(saucer.x + saucer.r, saucer.y);
        context.arc(saucer.x, saucer.y, saucer.r, 0, TAU);
      }
      context.stroke();
      context.shadowBlur = 0;
      context.fillStyle = '#fff';
      context.font = '14px monospace';
      context.fillText(`Score: ${score}`, 10, 20);
      context.fillText(`Level: ${level}`, 10, 40);
    };

    const renderDirect = (state: any) => draw(ctx, state);
    let render: (state: any) => void = renderDirect;
    if (typeof window !== 'undefined' && (canvas as any).transferControlToOffscreen && typeof Worker !== 'undefined') {
      try {
        const off = (canvas as any).transferControlToOffscreen();
        const w = new Worker(new URL('./renderer.ts', import.meta.url));
        w.postMessage({ type: 'init', canvas: off }, [off]);
        render = (state: any) => w.postMessage({ type: 'render', state });
        workerRef.current = w;
      } catch {
        // ignore if OffscreenCanvas not supported
      }
    }

    const loop = (time: number) => {
      acc += time - last;
      last = time;
      while (acc >= STEP) {
        update();
        acc -= STEP;
      }
      render({ ship, bullets, asteroids, saucer, saucerBullets, score, level, safeMode });
      anim = requestAnimationFrame(loop);
    };
    anim = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(anim);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', (e) => handleKey(e, true));
      window.removeEventListener('keyup', (e) => handleKey(e, false));
       canvas.removeEventListener('touchstart', handleTouch);
       canvas.removeEventListener('touchmove', handleTouch);
       canvas.removeEventListener('touchend', touchEnd);
      workerRef.current?.terminate();
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full bg-black" />;
};

export default Asteroids;
