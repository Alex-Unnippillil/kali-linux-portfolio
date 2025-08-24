import React, { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import Matter from 'matter-js';
import { createShip, createRock, createBullet, splitRock, wrapBody } from './physics';

const STEP = 1000 / 60;

const Asteroids: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState(0);
  const [paused, setPaused] = useState(false);
  const [safeMode, setSafeMode] = useState(false);

  useEffect(() => {
    const app = new PIXI.Application({ background: '#000', resizeTo: window });
    ref.current?.appendChild(app.view as any);

    const engine = Matter.Engine.create({ gravity: { x: 0, y: 0 } });

    // ship
    const shipBody = createShip(app.renderer.width / 2, app.renderer.height / 2);
    const shipGfx = new PIXI.Graphics();
    shipGfx.lineStyle(2, 0xffffff)
      .moveTo(20, 0)
      .lineTo(-20, 14)
      .lineTo(-20, -14)
      .lineTo(20, 0);
    app.stage.addChild(shipGfx);
    Matter.World.add(engine.world, shipBody);

    // arrays
    const rocks: { body: Matter.Body; gfx: PIXI.Graphics }[] = [];
    const bullets: { body: Matter.Body; gfx: PIXI.Graphics }[] = [];
    const particles: PIXI.Graphics[] = [];

    function addRock(x: number, y: number, r: number) {
      const body = createRock(x, y, r);
      const g = new PIXI.Graphics();
      g.lineStyle(2, 0xffffff);
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const px = Math.cos(ang) * r;
        const py = Math.sin(ang) * r;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      app.stage.addChild(g);
      rocks.push({ body, gfx: g });
      Matter.World.add(engine.world, body);
    }
    addRock(100, 100, 40);
    addRock(app.renderer.width - 100, app.renderer.height - 100, 30);

    function fire() {
      const angle = shipBody.angle;
      const bullet = createBullet(
        shipBody.position.x + Math.cos(angle) * 20,
        shipBody.position.y + Math.sin(angle) * 20,
        angle,
      );
      const g = new PIXI.Graphics();
      g.beginFill(0xffffff).drawCircle(0, 0, 2).endFill();
      app.stage.addChild(g);
      bullets.push({ body: bullet, gfx: g });
      Matter.World.add(engine.world, bullet);
    }

    function emitParticle() {
      if (safeMode) return;
      const p = new PIXI.Graphics();
      p.beginFill(0xffa500).drawCircle(0, 0, 2).endFill();
      p.x = shipBody.position.x - Math.cos(shipBody.angle) * 20;
      p.y = shipBody.position.y - Math.sin(shipBody.angle) * 20;
      p.alpha = 1;
      app.stage.addChild(p);
      particles.push(p);
    }

    const keys = { left: false, right: false, thrust: false, shoot: false };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') keys.left = true;
      if (e.code === 'ArrowRight') keys.right = true;
      if (e.code === 'ArrowUp') keys.thrust = true;
      if (e.code === 'Space') keys.shoot = true;
      if (e.code === 'KeyP') setPaused((p) => !p);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') keys.left = false;
      if (e.code === 'ArrowRight') keys.right = false;
      if (e.code === 'ArrowUp') keys.thrust = false;
      if (e.code === 'Space') keys.shoot = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      const mid = window.innerWidth / 2;
      keys.thrust = true;
      keys.left = t.clientX < mid;
      keys.right = t.clientX >= mid;
    };
    const onTouchEnd = () => {
      keys.left = keys.right = keys.thrust = false;
    };
    window.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchend', onTouchEnd);

    Matter.Events.on(engine, 'collisionStart', (evt) => {
      evt.pairs.forEach((p) => {
        const bodies = [p.bodyA, p.bodyB];
        const bullet = bodies.find((b) => b.label === 'bullet');
        const rock = bodies.find((b) => b.label === 'rock');
        if (bullet && rock) {
          const bi = bullets.findIndex((b) => b.body === bullet);
          if (bi !== -1) {
            app.stage.removeChild(bullets[bi].gfx);
            bullets.splice(bi, 1);
          }
          Matter.World.remove(engine.world, bullet);
          const ri = rocks.findIndex((r) => r.body === rock);
          if (ri !== -1) {
            app.stage.removeChild(rocks[ri].gfx);
            rocks.splice(ri, 1);
          }
          const parts = splitRock(engine.world, rock);
          parts.forEach((body) => {
            const r = (body as any).radius;
            const g = new PIXI.Graphics();
            g.lineStyle(2, 0xffffff);
            for (let i = 0; i < 6; i++) {
              const ang = (i / 6) * Math.PI * 2;
              const px = Math.cos(ang) * r;
              const py = Math.sin(ang) * r;
              if (i === 0) g.moveTo(px, py);
              else g.lineTo(px, py);
            }
            g.closePath();
            app.stage.addChild(g);
            rocks.push({ body, gfx: g });
          });
          setScore((s) => s + 100);
        }
      });
    });

    let last = performance.now();
    let acc = 0;
    function step(now: number) {
      if (paused) {
        last = now;
        requestAnimationFrame(step);
        return;
      }
      const dt = now - last;
      last = now;
      acc += dt;
      while (acc >= STEP) {
        if (keys.left) Matter.Body.setAngularVelocity(shipBody, shipBody.angularVelocity - 0.05);
        if (keys.right) Matter.Body.setAngularVelocity(shipBody, shipBody.angularVelocity + 0.05);
        if (keys.thrust) {
          const force = {
            x: Math.cos(shipBody.angle) * 0.0005,
            y: Math.sin(shipBody.angle) * 0.0005,
          };
          Matter.Body.applyForce(shipBody, shipBody.position, force);
          emitParticle();
        }
        if (keys.shoot) {
          fire();
          keys.shoot = false;
        }
        Matter.Engine.update(engine, STEP);
        const w = app.renderer.width;
        const h = app.renderer.height;
        wrapBody(shipBody, w, h);
        rocks.forEach((r) => wrapBody(r.body, w, h));
        bullets.forEach((b) => wrapBody(b.body, w, h));
        particles.forEach((p, i) => {
          p.alpha -= 0.05;
          if (p.alpha <= 0) {
            app.stage.removeChild(p);
            particles.splice(i, 1);
          }
        });
        acc -= STEP;
      }
      shipGfx.x = shipBody.position.x;
      shipGfx.y = shipBody.position.y;
      shipGfx.rotation = shipBody.angle;
      rocks.forEach((r) => {
        r.gfx.x = r.body.position.x;
        r.gfx.y = r.body.position.y;
        r.gfx.rotation = r.body.angle;
      });
      bullets.forEach((b) => {
        b.gfx.x = b.body.position.x;
        b.gfx.y = b.body.position.y;
      });
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
      app.destroy(true);
    };
  }, [paused, safeMode]);

  return (
    <div ref={ref} className="w-full h-full relative">
      <div className="absolute top-2 left-2 text-white font-mono">Score: {score}</div>
      <button
        className="absolute top-2 right-2 bg-gray-700 text-white px-2"
        onClick={() => setPaused((p) => !p)}
      >
        {paused ? 'Resume' : 'Pause'}
      </button>
      {paused && (
        <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center space-y-2">
          <div className="text-white text-xl">Paused</div>
          <label className="text-white text-sm">
            <input
              type="checkbox"
              checked={safeMode}
              onChange={(e) => setSafeMode(e.target.checked)}
            />{' '}
            Safe mode
          </label>
        </div>
      )}
    </div>
  );
};

export default Asteroids;
