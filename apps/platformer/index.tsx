import React, { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import Matter from 'matter-js';

const STEP = 1000 / 60;
const TILE = 32;
const COYOTE_MS = 100;
const BUFFER_MS = 100;
const JUMP_VEL = -12;
const MAX_SPEED = 5;

const level = [
  '................................................................',
  '................................................................',
  '................................................................',
  '......................#####......................................',
  '................................................................',
  '#########.......................................................',
  '................................................................',
  '################################################################',
];

const tiles: { x: number; y: number; width: number; height: number }[] = [];
level.forEach((row, y) => {
  [...row].forEach((cell, x) => {
    if (cell === '#') tiles.push({ x: x * TILE, y: y * TILE, width: TILE, height: TILE });
  });
});

const Platformer: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [motionEnabled, setMotionEnabled] = useState(
    () => (typeof window !== 'undefined' ? !window.matchMedia('(prefers-reduced-motion: reduce)').matches : true),
  );

  useEffect(() => {
    const app = new PIXI.Application({ resizeTo: window, background: '#6ec5ff' });
    ref.current?.appendChild(app.view as any);

    const engine = Matter.Engine.create({ gravity: { x: 0, y: 1 } });

    // layers
    const far = new PIXI.Graphics();
    far.beginFill(0x99ddff).drawRect(0, 0, 5000, 2000).endFill();
    const mid = new PIXI.Graphics();
    mid.beginFill(0x6ab0e3).drawRect(0, 300, 5000, 1700).endFill();
    const world = new PIXI.Container();
    app.stage.addChild(far);
    app.stage.addChild(mid);
    app.stage.addChild(world);

    // tiles
    const tileGfx = new PIXI.Graphics();
    tileGfx.beginFill(0x654321);
    tiles.forEach((t) => tileGfx.drawRect(t.x, t.y, t.width, t.height));
    tileGfx.endFill();
    world.addChild(tileGfx);

    // player
    const player = Matter.Bodies.rectangle(100, 0, TILE, TILE * 2, { friction: 0, label: 'player' });
    Matter.World.add(engine.world, player);
    const playerGfx = new PIXI.Graphics();
    playerGfx.beginFill(0xff0000).drawRect(-TILE / 2, -TILE, TILE, TILE * 2).endFill();
    world.addChild(playerGfx);

    // camera
    let camX = 0;
    let camY = 0;
    const dead = { w: app.renderer.width / 4, h: app.renderer.height / 3 };

    // particles
    const pool: PIXI.Graphics[] = [];
    const particles: { gfx: PIXI.Graphics; life: number }[] = [];
    function spawnParticle(x: number, y: number) {
      if (!motionEnabled) return;
      const g = pool.pop() || new PIXI.Graphics().beginFill(0xffffff).drawCircle(0, 0, 3).endFill();
      g.position.set(x, y);
      g.alpha = 1;
      world.addChild(g);
      particles.push({ gfx: g, life: 0.5 });
    }

    // input
    const keys = { left: false, right: false, jump: false };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        keys.jump = true;
        jumpBuffer = BUFFER_MS;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') keys.jump = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // timers & helpers
    let coyote = 0;
    let jumpBuffer = 0;
    let smoothed = 0;

    const aabb = (a: any, b: any) =>
      a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

    function resolveCollisions() {
      const bounds = {
        x: player.position.x - TILE / 2,
        y: player.position.y - TILE,
        width: TILE,
        height: TILE * 2,
      };
      let grounded = false;
      tiles.forEach((t) => {
        if (aabb(bounds, t)) {
          const dx1 = t.x + t.width - bounds.x;
          const dx2 = bounds.x + bounds.width - t.x;
          const dy1 = t.y + t.height - bounds.y;
          const dy2 = bounds.y + bounds.height - t.y;
          const minX = Math.min(dx1, dx2);
          const minY = Math.min(dy1, dy2);
          if (minX < minY) {
            if (dx1 < dx2) player.position.x = t.x + t.width + TILE / 2;
            else player.position.x = t.x - TILE / 2;
            Matter.Body.setVelocity(player, { x: 0, y: player.velocity.y });
          } else {
            if (dy1 < dy2) {
              player.position.y = t.y + t.height + TILE;
              Matter.Body.setVelocity(player, { x: player.velocity.x, y: 0 });
            } else {
              player.position.y = t.y - TILE;
              Matter.Body.setVelocity(player, { x: player.velocity.x, y: 0 });
              grounded = true;
            }
          }
        }
      });
      if (grounded) coyote = COYOTE_MS;
      else if (coyote > 0) coyote -= STEP;
    }

    function update() {
      const target = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      smoothed += (target - smoothed) * 0.2;
      Matter.Body.setVelocity(player, { x: smoothed * MAX_SPEED, y: player.velocity.y });
      if (jumpBuffer > 0) jumpBuffer -= STEP;
      if (jumpBuffer > 0 && coyote > 0) {
        Matter.Body.setVelocity(player, { x: player.velocity.x, y: JUMP_VEL });
        jumpBuffer = 0;
        coyote = 0;
        spawnParticle(player.position.x, player.position.y + TILE);
      }
      Matter.Engine.update(engine, STEP);
      resolveCollisions();

      particles.forEach((p, i) => {
        p.life -= STEP / 1000;
        p.gfx.alpha = p.life / 0.5;
        p.gfx.y -= 20 * (STEP / 1000);
        if (p.life <= 0) {
          world.removeChild(p.gfx);
          pool.push(p.gfx);
          particles.splice(i, 1);
        }
      });

      // camera
      const px = player.position.x;
      const py = player.position.y;
      const left = camX + dead.w;
      const right = camX + app.renderer.width - dead.w;
      const top = camY + dead.h;
      const bottom = camY + app.renderer.height - dead.h;
      if (px < left) camX = px - dead.w;
      else if (px > right) camX = px - app.renderer.width + dead.w;
      if (py < top) camY = py - dead.h;
      else if (py > bottom) camY = py - app.renderer.height + dead.h;

      if (motionEnabled) {
        far.position.set(-camX * 0.2, -camY * 0.2);
        mid.position.set(-camX * 0.5, -camY * 0.5);
      } else {
        far.position.set(0, 0);
        mid.position.set(0, 0);
      }
      world.position.set(-camX, -camY);
    }

    function render() {
      playerGfx.position.set(player.position.x, player.position.y);
    }

    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      const delta = now - last;
      last = now;
      acc += delta;
      while (acc >= STEP) {
        update();
        acc -= STEP;
      }
      render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      app.destroy(true);
    };
  }, [motionEnabled]);

  return (
    <div ref={ref} className="w-full h-full relative">
      <label className="absolute top-2 left-2 text-white text-sm bg-black bg-opacity-50 px-1">
        <input
          type="checkbox"
          checked={!motionEnabled}
          onChange={(e) => setMotionEnabled(!e.target.checked)}
        />{' '}
        Reduce motion
      </label>
    </div>
  );
};

export default Platformer;
