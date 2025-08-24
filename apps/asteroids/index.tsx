import React, { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import Matter from 'matter-js';
import { createShip, createRock, createBullet, splitRock, wrapBody } from './physics';

const STEP = 1000 / 60;
const BULLETS = 20;

interface Bullet {
  body: Matter.Body;
  sprite: PIXI.Sprite;
  active: boolean;
  life: number;
}

interface Rock {
  body: Matter.Body;
  sprite: PIXI.Sprite;
  ghosts: PIXI.Sprite[];
}

interface Particle {
  sprite: PIXI.Sprite;
  vx: number;
  vy: number;
  life: number;
}

const Asteroids: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState(0);
  const [paused, setPaused] = useState(false);
  const [safeMode, setSafeMode] = useState(false);
  const [crt, setCrt] = useState(false);

  useEffect(() => {
    const app = new PIXI.Application({ background: '#000', resizeTo: window });
    ref.current?.appendChild(app.view as any);

    const engine = Matter.Engine.create({ gravity: { x: 0, y: 0 } });

    // base textures
    const shipShape = new PIXI.Graphics();
    shipShape
      .lineStyle(2, 0xffffff)
      .moveTo(20, 0)
      .lineTo(-20, 14)
      .lineTo(-20, -14)
      .lineTo(20, 0);
    const shipTex = app.renderer.generateTexture(shipShape);
    shipShape.destroy();

    const bulletShape = new PIXI.Graphics();
    bulletShape.beginFill(0xffffff).drawCircle(0, 0, 2).endFill();
    const bulletTex = app.renderer.generateTexture(bulletShape);
    bulletShape.destroy();

    const particleShape = new PIXI.Graphics();
    particleShape.beginFill(0xffa500).drawCircle(0, 0, 2).endFill();
    const particleTex = app.renderer.generateTexture(particleShape);
    particleShape.destroy();

    function createGhosts(sprite: PIXI.Sprite) {
      const arr: PIXI.Sprite[] = [];
      for (let i = 0; i < 8; i += 1) {
        const g = new PIXI.Sprite(sprite.texture);
        g.anchor.set(0.5);
        g.visible = false;
        app.stage.addChild(g);
        arr.push(g);
      }
      return arr;
    }

    // ship
    const shipBody = createShip(app.renderer.width / 2, app.renderer.height / 2);
    const shipSprite = new PIXI.Sprite(shipTex);
    shipSprite.anchor.set(0.5);
    app.stage.addChild(shipSprite);
    const shipGhosts = createGhosts(shipSprite);
    Matter.World.add(engine.world, shipBody);

    // arrays
    const rocks: Rock[] = [];
    const bullets: Bullet[] = [];
    const particles: Particle[] = [];

    // bullet pool
    for (let i = 0; i < BULLETS; i += 1) {
      const body = createBullet(-100, -100, 0);
      const sprite = new PIXI.Sprite(bulletTex);
      sprite.anchor.set(0.5);
      sprite.visible = false;
      bullets.push({ body, sprite, active: false, life: 0 });
      app.stage.addChild(sprite);
    }

    function deactivateBullet(b: Bullet) {
      b.active = false;
      b.life = 0;
      b.sprite.visible = false;
      Matter.World.remove(engine.world, b.body);
    }

    function fire() {
      const b = bullets.find((bb) => !bb.active);
      if (!b) return;
      const angle = shipBody.angle;
      Matter.Body.setPosition(b.body, {
        x: shipBody.position.x + Math.cos(angle) * 20,
        y: shipBody.position.y + Math.sin(angle) * 20,
      });
      Matter.Body.setVelocity(b.body, {
        x: Math.cos(angle) * 5,
        y: Math.sin(angle) * 5,
      });
      b.sprite.visible = true;
      b.life = 60;
      b.active = true;
      Matter.World.add(engine.world, b.body);
    }

    function emitThrust() {
      if (safeMode) return;
      const sprite = new PIXI.Sprite(particleTex);
      sprite.anchor.set(0.5);
      sprite.x = shipBody.position.x - Math.cos(shipBody.angle) * 20;
      sprite.y = shipBody.position.y - Math.sin(shipBody.angle) * 20;
      app.stage.addChild(sprite);
      particles.push({
        sprite,
        vx: -Math.cos(shipBody.angle) * 0.5,
        vy: -Math.sin(shipBody.angle) * 0.5,
        life: 30,
      });
    }

    function spawnExplosion(x: number, y: number) {
      for (let i = 0; i < 8; i += 1) {
        const sprite = new PIXI.Sprite(particleTex);
        sprite.anchor.set(0.5);
        sprite.x = x;
        sprite.y = y;
        app.stage.addChild(sprite);
        const ang = Math.random() * Math.PI * 2;
        const spd = Math.random() * 2;
        particles.push({
          sprite,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          life: 30,
        });
      }
    }

    function addRock(x: number, y: number, r: number) {
      const body = createRock(x, y, r);
      const g = new PIXI.Graphics();
      const verts = body.vertices;
      g.lineStyle(2, 0xffffff);
      g.moveTo(verts[0].x - body.position.x, verts[0].y - body.position.y);
      for (let i = 1; i < verts.length; i += 1) {
        g.lineTo(verts[i].x - body.position.x, verts[i].y - body.position.y);
      }
      g.closePath();
      const tex = app.renderer.generateTexture(g);
      g.destroy();
      const sprite = new PIXI.Sprite(tex);
      sprite.anchor.set(0.5);
      app.stage.addChild(sprite);
      const ghosts = createGhosts(sprite);
      rocks.push({ body, sprite, ghosts });
      Matter.World.add(engine.world, body);
    }
    addRock(100, 100, 40);
    addRock(app.renderer.width - 100, app.renderer.height - 100, 30);

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

    // twin-stick touch controls
    const touchState = { leftId: -1, rightId: -1, startX: 0, startY: 0 };
    const onTouchStart = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.clientX < window.innerWidth / 2 && touchState.leftId === -1) {
          touchState.leftId = t.identifier;
          touchState.startX = t.clientX;
          touchState.startY = t.clientY;
        } else if (touchState.rightId === -1) {
          touchState.rightId = t.identifier;
          keys.shoot = true;
        }
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === touchState.leftId) {
          const dx = t.clientX - touchState.startX;
          const dy = t.clientY - touchState.startY;
          keys.left = dx < -20;
          keys.right = dx > 20;
          keys.thrust = dy < -20;
        }
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === touchState.leftId) {
          touchState.leftId = -1;
          keys.left = keys.right = keys.thrust = false;
        }
        if (t.identifier === touchState.rightId) {
          touchState.rightId = -1;
          keys.shoot = false;
        }
      }
    };
    window.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);

    Matter.Events.on(engine, 'collisionStart', (evt) => {
      evt.pairs.forEach((p) => {
        const bodies = [p.bodyA, p.bodyB];
        const bulletBody = bodies.find((b) => b.label === 'bullet');
        const rockBody = bodies.find((b) => b.label === 'rock');
        if (bulletBody && rockBody) {
          const b = bullets.find((bb) => bb.body === bulletBody);
          if (b) deactivateBullet(b);
          const ri = rocks.findIndex((r) => r.body === rockBody);
          if (ri !== -1) {
            const r = rocks.splice(ri, 1)[0];
            r.ghosts.forEach((g) => app.stage.removeChild(g));
            app.stage.removeChild(r.sprite);
          }
          const parts = splitRock(engine.world, rockBody);
          parts.forEach((body) => {
            const g = new PIXI.Graphics();
            const verts = body.vertices;
            g.lineStyle(2, 0xffffff);
            g.moveTo(verts[0].x - body.position.x, verts[0].y - body.position.y);
            for (let i = 1; i < verts.length; i += 1) {
              g.lineTo(verts[i].x - body.position.x, verts[i].y - body.position.y);
            }
            g.closePath();
            const tex = app.renderer.generateTexture(g);
            g.destroy();
            const sprite = new PIXI.Sprite(tex);
            sprite.anchor.set(0.5);
            app.stage.addChild(sprite);
            const ghosts = createGhosts(sprite);
            rocks.push({ body, sprite, ghosts });
          });
          spawnExplosion(rockBody.position.x, rockBody.position.y);
          setScore((s) => s + 100);
        }
      });
    });

    // CRT filter toggle
    let crtFilter: PIXI.Filter | null = null;
    const applyCrt = () => {
      if (!crt) {
        app.stage.filters = [];
        return;
      }
      if (!crtFilter) {
        const frag = `
        varying vec2 vTextureCoord;
        uniform sampler2D uSampler;
        void main(void){
          vec4 c = texture2D(uSampler, vTextureCoord);
          float scan = sin(vTextureCoord.y * 800.0) * 0.04;
          gl_FragColor = c - scan;
        }`;
        crtFilter = new PIXI.Filter(undefined, frag);
      }
      app.stage.filters = [crtFilter];
    };
    applyCrt();

    let last = performance.now();
    let acc = 0;
    let prevPadShoot = false;
    function step(now: number) {
      if (paused) {
        last = now;
        requestAnimationFrame(step);
        return;
      }
      const dt = now - last;
      last = now;
      acc += dt;

      const pad = navigator.getGamepads ? navigator.getGamepads()[0] : null;
      if (pad) {
        keys.left = pad.axes[0] < -0.2;
        keys.right = pad.axes[0] > 0.2;
        keys.thrust = pad.axes[1] < -0.5;
        if (pad.buttons[0].pressed && !prevPadShoot) keys.shoot = true;
        prevPadShoot = pad.buttons[0].pressed;
      }

      while (acc >= STEP) {
        if (keys.left)
          Matter.Body.setAngularVelocity(
            shipBody,
            shipBody.angularVelocity - 0.05,
          );
        if (keys.right)
          Matter.Body.setAngularVelocity(
            shipBody,
            shipBody.angularVelocity + 0.05,
          );
        if (keys.thrust) {
          const force = {
            x: Math.cos(shipBody.angle) * 0.0005,
            y: Math.sin(shipBody.angle) * 0.0005,
          };
          Matter.Body.applyForce(shipBody, shipBody.position, force);
          emitThrust();
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
        bullets.forEach((b) => {
          if (!b.active) return;
          wrapBody(b.body, w, h);
          b.life -= 1;
          if (b.life <= 0) deactivateBullet(b);
        });
        particles.forEach((p, i) => {
          p.sprite.x += p.vx;
          p.sprite.y += p.vy;
          p.sprite.alpha = p.life / 30;
          p.life -= 1;
          if (p.life <= 0) {
            app.stage.removeChild(p.sprite);
            particles.splice(i, 1);
          }
        });
        acc -= STEP;
      }

      const w = app.renderer.width;
      const h = app.renderer.height;
      function updateGhosts(sprite: PIXI.Sprite, ghosts: PIXI.Sprite[], body: Matter.Body) {
        sprite.x = body.position.x;
        sprite.y = body.position.y;
        sprite.rotation = body.angle;
        const x = sprite.x;
        const y = sprite.y;
        const positions: { x: number; y: number }[] = [];
        const left = x < 20;
        const right = x > w - 20;
        const top = y < 20;
        const bottom = y > h - 20;
        if (left) positions.push({ x: x + w, y });
        if (right) positions.push({ x: x - w, y });
        if (top) positions.push({ x, y: y + h });
        if (bottom) positions.push({ x, y: y - h });
        if (left && top) positions.push({ x: x + w, y: y + h });
        if (left && bottom) positions.push({ x: x + w, y: y - h });
        if (right && top) positions.push({ x: x - w, y: y + h });
        if (right && bottom) positions.push({ x: x - w, y: y - h });
        ghosts.forEach((g, i) => {
          const pos = positions[i];
          if (pos) {
            g.visible = true;
            g.x = pos.x;
            g.y = pos.y;
            g.rotation = sprite.rotation;
          } else {
            g.visible = false;
          }
        });
      }
      updateGhosts(shipSprite, shipGhosts, shipBody);
      rocks.forEach((r) => updateGhosts(r.sprite, r.ghosts, r.body));
      bullets.forEach((b) => {
          if (!b.active) return;
          b.sprite.x = b.body.position.x;
          b.sprite.y = b.body.position.y;
      });
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      app.destroy(true);
    };
  }, [paused, safeMode, crt]);

  return (
    <div ref={ref} className="w-full h-full relative">
      <div className="absolute top-2 left-2 text-white font-mono">Score: {score}</div>
      <div className="absolute top-2 right-2 space-x-2 flex">
        <button
          className="bg-gray-700 text-white px-2"
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          className="bg-gray-700 text-white px-2"
          onClick={() => setCrt((c) => !c)}
        >
          {crt ? 'CRT off' : 'CRT on'}
        </button>
      </div>
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

