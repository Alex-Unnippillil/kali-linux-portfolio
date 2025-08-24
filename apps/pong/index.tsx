'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { Engine, Bodies, World, Body, Events } from 'matter-js';

const WIDTH = 600;
const HEIGHT = 400;

const Pong: React.FC = () => {
  const divRef = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState({ left: 0, right: 0 });
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  const [twoPlayer, setTwoPlayer] = useState(false);

  useEffect(() => {
    const app = new PIXI.Application({
      width: WIDTH,
      height: HEIGHT,
      background: '#000',
      antialias: true,
      resolution: window.devicePixelRatio,
      autoDensity: true,
    });
    const container = divRef.current as HTMLDivElement;
    container.innerHTML = '';
    container.appendChild(app.view as HTMLCanvasElement);

    const engine = Engine.create();
    const world = engine.world;

    const mobile = 'ontouchstart' in window;
    const paddleHeight = mobile ? 150 : 80;
    const paddleWidth = 20;
    const ballRadius = 10;

    const left = Bodies.rectangle(30, HEIGHT / 2, paddleWidth, paddleHeight, { isStatic: true });
    const right = Bodies.rectangle(WIDTH - 30, HEIGHT / 2, paddleWidth, paddleHeight, { isStatic: true });
    const ball = Bodies.circle(WIDTH / 2, HEIGHT / 2, ballRadius, {
      restitution: 1,
      friction: 0,
      frictionAir: 0,
    });

    const ceiling = Bodies.rectangle(WIDTH / 2, -10, WIDTH, 20, { isStatic: true });
    const floor = Bodies.rectangle(WIDTH / 2, HEIGHT + 10, WIDTH, 20, { isStatic: true });

    World.add(world, [left, right, ball, ceiling, floor]);

    const gLeft = new PIXI.Graphics()
      .beginFill(0xffffff)
      .drawRect(-paddleWidth / 2, -paddleHeight / 2, paddleWidth, paddleHeight)
      .endFill();
    const gRight = new PIXI.Graphics()
      .beginFill(0xffffff)
      .drawRect(-paddleWidth / 2, -paddleHeight / 2, paddleWidth, paddleHeight)
      .endFill();
    const gBall = new PIXI.Graphics().beginFill(0xffffff).drawCircle(0, 0, ballRadius).endFill();
    app.stage.addChild(gLeft, gRight, gBall);

    const keys = { w: false, s: false, up: false, down: false };
    const keyDown = (e: KeyboardEvent) => {
      if (e.key === 'w') keys.w = true;
      if (e.key === 's') keys.s = true;
      if (e.key === 'ArrowUp') keys.up = true;
      if (e.key === 'ArrowDown') keys.down = true;
    };
    const keyUp = (e: KeyboardEvent) => {
      if (e.key === 'w') keys.w = false;
      if (e.key === 's') keys.s = false;
      if (e.key === 'ArrowUp') keys.up = false;
      if (e.key === 'ArrowDown') keys.down = false;
    };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);

    const touchMove = (e: PointerEvent) => {
      if (!mobile) return;
      const rect = (app.view as HTMLCanvasElement).getBoundingClientRect();
      const y = e.clientY - rect.top;
      Body.setPosition(left, { x: left.position.x, y });
    };
    if (mobile) {
      (app.view as HTMLCanvasElement).addEventListener('pointermove', touchMove);
    }

    function pollPads() {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const p1 = pads[0];
      const p2 = pads[1];
      if (p1) {
        const v = p1.axes[1];
        keys.w = v < -0.2;
        keys.s = v > 0.2;
      }
      if (p2 && twoPlayer) {
        const v2 = p2.axes[1];
        keys.up = v2 < -0.2;
        keys.down = v2 > 0.2;
      }
    }

    function reflect(pair: Matter.IPair) {
      const { bodyA, bodyB, collision } = pair;
      if (
        (bodyA === ball && (bodyB === left || bodyB === right)) ||
        (bodyB === ball && (bodyA === left || bodyA === right))
      ) {
        const normal = collision.normal;
        const v = ball.velocity;
        const dot = v.x * normal.x + v.y * normal.y;
        Body.setVelocity(ball, {
          x: v.x - 2 * dot * normal.x,
          y: v.y - 2 * dot * normal.y,
        });
      }
    }

    Events.on(engine, 'collisionStart', (evt) => {
      evt.pairs.forEach(reflect);
    });

    const fixedDt = 1000 / 120;
    let last = performance.now();
    let acc = 0;
    const paddleSpeed = 300;

    function resetBall(dir: number) {
      Body.setPosition(ball, { x: WIDTH / 2, y: HEIGHT / 2 });
      Body.setVelocity(ball, { x: dir * 5, y: 5 });
    }
    resetBall(Math.random() > 0.5 ? 1 : -1);

    function loop(now: number) {
      acc += now - last;
      last = now;
      pollPads();
      while (acc >= fixedDt) {
        const dt = fixedDt / 1000;
        if (keys.w) Body.translate(left, { x: 0, y: -paddleSpeed * dt });
        if (keys.s) Body.translate(left, { x: 0, y: paddleSpeed * dt });
        Body.setPosition(left, {
          x: left.position.x,
          y: Math.max(
            paddleHeight / 2,
            Math.min(HEIGHT - paddleHeight / 2, left.position.y)
          ),
        });

        if (twoPlayer) {
          if (keys.up) Body.translate(right, { x: 0, y: -paddleSpeed * dt });
          if (keys.down) Body.translate(right, { x: 0, y: paddleSpeed * dt });
        } else {
          const speeds = { easy: 200, normal: 300, hard: 450 };
          const dir = ball.position.y > right.position.y ? 1 : -1;
          Body.translate(right, {
            x: 0,
            y: dir * (speeds[difficulty] as number) * dt,
          });
        }
        Body.setPosition(right, {
          x: right.position.x,
          y: Math.max(
            paddleHeight / 2,
            Math.min(HEIGHT - paddleHeight / 2, right.position.y)
          ),
        });

        Engine.update(engine, fixedDt);
        acc -= fixedDt;
      }

      if (ball.position.x < -ballRadius) {
        setScore((s) => ({ left: s.left, right: s.right + 1 }));
        resetBall(1);
      } else if (ball.position.x > WIDTH + ballRadius) {
        setScore((s) => ({ left: s.left + 1, right: s.right }));
        resetBall(-1);
      }

      gLeft.position.set(left.position.x, left.position.y);
      gRight.position.set(right.position.x, right.position.y);
      gBall.position.set(ball.position.x, ball.position.y);
      app.render();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      if (mobile)
        (app.view as HTMLCanvasElement).removeEventListener('pointermove', touchMove);
      app.destroy(true, { children: true });
    };
  }, [difficulty, twoPlayer]);

  return (
    <div className="relative w-full h-full text-white">
      <div ref={divRef} />
      <div className="absolute top-2 left-2">{score.left}</div>
      <div className="absolute top-2 right-2">{score.right}</div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-2 text-xs">
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as any)}
          className="text-black"
        >
          <option value="easy">Easy</option>
          <option value="normal">Normal</option>
          <option value="hard">Hard</option>
        </select>
        <button
          className="px-1 bg-gray-700 rounded"
          onClick={() => setTwoPlayer((p) => !p)}
        >
          {twoPlayer ? '1P' : '2P'}
        </button>
      </div>
    </div>
  );
};

export default Pong;
