import { Engine, Render, World, Bodies, Body, Runner, Events } from 'matter-js';

const themes: Record<string, { bg: string; flipper: string }> = {
  classic: { bg: '#0b3d91', flipper: '#ffd700' },
  space: { bg: '#000000', flipper: '#00ffff' },
  forest: { bg: '#064e3b', flipper: '#9acd32' },
};

interface InitMessage {
  type: 'init';
  canvas: OffscreenCanvas;
  theme: keyof typeof themes;
  power: number;
  bounce: number;
}

interface KeyMessage {
  type: 'keydown' | 'keyup';
  code: string;
}

interface SettingsMessage {
  type: 'settings';
  theme: keyof typeof themes;
  power: number;
  bounce: number;
}

interface TiltMessage {
  type: 'tilt';
  value: boolean;
}

type WorkerMessage =
  | InitMessage
  | KeyMessage
  | SettingsMessage
  | TiltMessage
  | { type: 'nudge' };

let engine: Engine | null = null;
let render: Render | null = null;
let runner: Runner | null = null;
let ball: Body | null = null;
let leftFlipper: Body | null = null;
let rightFlipper: Body | null = null;
let power = 1;
let bounce = 0.5;
let currentTheme: keyof typeof themes = 'classic';
let score = 0;
let tilt = false;
const sparks: { x: number; y: number; life: number }[] = [];
const laneGlow = { left: false, right: false };

self.onmessage = ({ data }: MessageEvent<WorkerMessage>) => {
  if (data.type === 'init') {
    power = data.power;
    bounce = data.bounce;
    currentTheme = data.theme;
    const canvas = data.canvas;
    engine = Engine.create();
    engine.gravity.y = 1;
    render = Render.create({
      canvas: canvas as any,
      engine,
      options: {
        width: 400,
        height: 600,
        wireframes: false,
        background: themes[currentTheme].bg,
      },
    });

    ball = Bodies.circle(200, 100, 12, { restitution: 0.9, render: { visible: false } });
    const walls = [
      Bodies.rectangle(200, 0, 400, 40, { isStatic: true }),
      Bodies.rectangle(200, 600, 400, 40, { isStatic: true }),
      Bodies.rectangle(0, 300, 40, 600, { isStatic: true }),
      Bodies.rectangle(400, 300, 40, 600, { isStatic: true }),
    ];
    leftFlipper = Bodies.rectangle(120, 560, 80, 20, {
      isStatic: true,
      angle: Math.PI / 8,
      restitution: bounce,
      render: { fillStyle: themes[currentTheme].flipper },
    });
    rightFlipper = Bodies.rectangle(280, 560, 80, 20, {
      isStatic: true,
      angle: -Math.PI / 8,
      restitution: bounce,
      render: { fillStyle: themes[currentTheme].flipper },
    });
    const leftLane = Bodies.rectangle(80, 80, 40, 10, { isStatic: true, isSensor: true });
    const rightLane = Bodies.rectangle(320, 80, 40, 10, { isStatic: true, isSensor: true });
    World.add(engine.world, [ball, ...walls, leftFlipper, rightFlipper, leftLane, rightLane]);
    Render.run(render);
    runner = Runner.create();
    Runner.run(runner, engine);

    Events.on(engine, 'collisionStart', (evt) => {
      evt.pairs.forEach((pair) => {
        const bodies = [pair.bodyA, pair.bodyB];
        if (ball && bodies.includes(ball) && bodies.includes(leftFlipper!)) {
          const { x, y } = pair.collision.supports[0];
          sparks.push({ x, y, life: 1 });
        }
        if (ball && bodies.includes(ball) && bodies.includes(rightFlipper!)) {
          const { x, y } = pair.collision.supports[0];
          sparks.push({ x, y, life: 1 });
        }
        if (ball && bodies.includes(ball) && bodies.includes(leftLane)) {
          laneGlow.left = true;
          score += 100;
          self.postMessage({ type: 'score', score });
          setTimeout(() => (laneGlow.left = false), 500);
        }
        if (ball && bodies.includes(ball) && bodies.includes(rightLane)) {
          laneGlow.right = true;
          score += 100;
          self.postMessage({ type: 'score', score });
          setTimeout(() => (laneGlow.right = false), 500);
        }
      });
    });

    Events.on(render, 'afterRender', () => {
      if (!ball || !render) return;
      const ctx = render.context as CanvasRenderingContext2D;
      const { x, y } = ball.position;
      const radius = 12;
      const gradient = ctx.createRadialGradient(x - 4, y - 4, radius / 4, x, y, radius);
      gradient.addColorStop(0, '#fff');
      gradient.addColorStop(1, '#999');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      [
        { lane: leftLane, glow: laneGlow.left },
        { lane: rightLane, glow: laneGlow.right },
      ].forEach(({ lane, glow }) => {
        const { x: lx, y: ly } = lane.position;
        ctx.save();
        if (glow) {
          ctx.shadowColor = '#ffff00';
          ctx.shadowBlur = 20;
          ctx.fillStyle = '#ff0';
        } else {
          ctx.fillStyle = '#555';
        }
        ctx.fillRect(lx - 20, ly - 5, 40, 10);
        ctx.restore();
      });

      for (let i = sparks.length - 1; i >= 0; i -= 1) {
        const s = sparks[i];
        const r = 8 * s.life;
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
        g.addColorStop(0, 'rgba(255,255,200,0.8)');
        g.addColorStop(1, 'rgba(255,200,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.fill();
        s.life -= 0.05;
        if (s.life <= 0) sparks.splice(i, 1);
      }
    });
  } else if (data.type === 'settings') {
    power = data.power;
    bounce = data.bounce;
    currentTheme = data.theme;
    if (leftFlipper) {
      leftFlipper.restitution = bounce;
      leftFlipper.render.fillStyle = themes[currentTheme].flipper;
    }
    if (rightFlipper) {
      rightFlipper.restitution = bounce;
      rightFlipper.render.fillStyle = themes[currentTheme].flipper;
    }
    if (render) {
      (render.options as any).background = themes[currentTheme].bg;
    }
  } else if (data.type === 'keydown') {
    if (tilt) return;
    if (data.code === 'ArrowLeft' && leftFlipper) {
      Body.setAngle(leftFlipper, -Math.PI / 4 * power);
    } else if (data.code === 'ArrowRight' && rightFlipper) {
      Body.setAngle(rightFlipper, Math.PI / 4 * power);
    }
  } else if (data.type === 'keyup') {
    if (data.code === 'ArrowLeft' && leftFlipper) {
      Body.setAngle(leftFlipper, Math.PI / 8);
    } else if (data.code === 'ArrowRight' && rightFlipper) {
      Body.setAngle(rightFlipper, -Math.PI / 8);
    }
  } else if (data.type === 'nudge') {
    if (ball) {
      Body.applyForce(ball, ball.position, { x: 0.02, y: 0 });
    }
  } else if (data.type === 'tilt') {
    tilt = data.value;
  }
};

export {};

