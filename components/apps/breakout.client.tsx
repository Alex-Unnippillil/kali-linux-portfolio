import React, { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import Paddle from '../../apps/breakout/Paddle';
import Ball from '../../apps/breakout/Ball';
import Brick from '../../apps/breakout/Brick';
import { collideBallRect } from '../../apps/breakout/physics';

const BreakoutClient: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const app = new PIXI.Application({
      resizeTo: container,
      background: '#000',
    });
    container.appendChild(app.view as any);

    let width = container.clientWidth;
    let height = container.clientHeight;

    const paddle = new Paddle(width, height, app.stage);
    const ball = new Ball(width, height, app.stage);
    const bricks: Brick[] = [];
    const particles: any[] = [];
    const particlePool: any[] = [];
    const powerUps: any[] = [];
    const powerPool: any[] = [];

    fetch('/api/breakout/levels')
      .then((res) => res.json())
      .then((levels) => {
        const layout = levels[0];
        if (!layout) return;
        const rows = layout.length;
        const cols = layout[0].length;
        const bw = width / cols;
        const bh = 20;
        for (let r = 0; r < rows; r += 1) {
          for (let c = 0; c < cols; c += 1) {
            if (!layout[r][c]) continue;
            const type = Math.random() < 0.1 ? 'expand' : null;
            const br = new Brick(
              c * bw,
              r * bh + 40,
              bw - 2,
              bh - 2,
              type,
              1,
              app.stage
            );
            bricks.push(br);
          }
        }
      });

    const keys = { left: false, right: false };
    let tilt = 0;

    const keyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') keys.left = true;
      if (e.key === 'ArrowRight') keys.right = true;
      if (e.key === ' ') ball.stuck = false;
    };
    const keyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') keys.left = false;
      if (e.key === 'ArrowRight') keys.right = false;
    };
    const pointerMove = (e: PointerEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const rect = container.getBoundingClientRect();
      paddle.x = clientX - rect.left - paddle.width / 2;
      if (paddle.x < 0) paddle.x = 0;
      if (paddle.x + paddle.width > width) paddle.x = width - paddle.width;
      if (paddle.sprite) paddle.sprite.x = paddle.x;
    };
    const deviceTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma != null) tilt = e.gamma / 45; // roughly -2 to 2
    };

    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    container.addEventListener('pointermove', pointerMove);
    container.addEventListener('touchmove', pointerMove);
    window.addEventListener('deviceorientation', deviceTilt);

    const spawnParticles = (x: number, y: number) => {
      for (let i = 0; i < 10; i += 1) {
        const p = particlePool.pop() || {
          gfx: new PIXI.Graphics(),
          vx: 0,
          vy: 0,
          life: 0,
        };
        p.gfx.clear();
        p.gfx.beginFill(0xffffff);
        p.gfx.drawRect(0, 0, 2, 2);
        p.gfx.endFill();
        p.gfx.x = x;
        p.gfx.y = y;
        p.vx = (Math.random() - 0.5) * 200;
        p.vy = (Math.random() - 0.5) * 200;
        p.life = 1;
        app.stage.addChild(p.gfx);
        particles.push(p);
      }
    };

    const spawnPower = (x: number, y: number, type: string) => {
      const p = powerPool.pop() || {
        gfx: new PIXI.Graphics(),
        vy: 50,
        type: '',
      };
      p.type = type;
      p.vy = 50;
      p.gfx.clear();
      p.gfx.beginFill(0xffd700);
      p.gfx.drawRect(-5, -5, 10, 10);
      p.gfx.endFill();
      p.gfx.x = x;
      p.gfx.y = y;
      app.stage.addChild(p.gfx);
      powerUps.push(p);
    };

    let last = performance.now();
    let acc = 0;
    const step = 1 / 60;

    const update = (dt: number) => {
      const input = (keys.right ? 1 : 0) - (keys.left ? 1 : 0) + tilt;
      paddle.move(input, dt);
      if (ball.stuck) {
        ball.x = paddle.x + paddle.width / 2;
        ball.y = paddle.y - ball.r;
        if (ball.sprite) {
          ball.sprite.x = ball.x;
          ball.sprite.y = ball.y;
        }
      } else {
        ball.update(dt);
      }
      collideBallRect(
        ball,
        { x: paddle.x, y: paddle.y, w: paddle.width, h: paddle.height },
        paddle.vx
      );
      bricks.forEach((br) => {
        if (
          !br.destroyed &&
          collideBallRect(ball, { x: br.x, y: br.y, w: br.w, h: br.h })
        ) {
          br.hit();
          spawnParticles(br.x + br.w / 2, br.y + br.h / 2);
          if (br.destroyed && br.powerUp) {
            spawnPower(br.x + br.w / 2, br.y + br.h / 2, br.powerUp);
          }
        }
      });
      for (let i = powerUps.length - 1; i >= 0; i -= 1) {
        const p = powerUps[i];
        p.gfx.y += p.vy * dt;
        if (p.gfx.y > height) {
          app.stage.removeChild(p.gfx);
          powerUps.splice(i, 1);
          powerPool.push(p);
          continue;
        }
        if (
          p.gfx.y > paddle.y &&
          p.gfx.y < paddle.y + paddle.height &&
          p.gfx.x > paddle.x &&
          p.gfx.x < paddle.x + paddle.width
        ) {
          if (p.type === 'expand') paddle.expand();
          app.stage.removeChild(p.gfx);
          powerUps.splice(i, 1);
          powerPool.push(p);
        }
      }
      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const p = particles[i];
        p.gfx.x += p.vx * dt;
        p.gfx.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) {
          app.stage.removeChild(p.gfx);
          particles.splice(i, 1);
          particlePool.push(p);
        }
      }
    };

    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      acc += dt;
      while (acc >= step) {
        update(step);
        acc -= step;
      }
      app.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      container.removeEventListener('pointermove', pointerMove);
      container.removeEventListener('touchmove', pointerMove);
      window.removeEventListener('deviceorientation', deviceTilt);
      app.destroy(true, { children: true });
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

export default BreakoutClient;
