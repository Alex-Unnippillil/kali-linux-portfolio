import type Matter from "matter-js";
import {
  Bodies,
  Body,
  Engine,
  Events,
  Render,
  World,
} from "matter-js";

const WIDTH = 400;
const HEIGHT = 600;
const BALL_RADIUS = 12;
const DEFAULT_LEFT_ANGLE = Math.PI / 8;
const DEFAULT_RIGHT_ANGLE = -Math.PI / 8;

export interface ThemeConfig {
  bg: string;
  flipper: string;
}

export interface PinballCallbacks {
  onScore: (points: number) => void;
}

export interface PinballWorld {
  step: (delta: number) => void;
  destroy: () => void;
  setBounce: (bounce: number) => void;
  setTheme: (theme: ThemeConfig) => void;
  setLeftFlipper: (angle: number) => void;
  setRightFlipper: (angle: number) => void;
  resetFlippers: () => void;
  nudge: (force: { x: number; y: number }) => void;
  resetBall: () => void;
}

interface Spark {
  x: number;
  y: number;
  life: number;
}

interface LaneGlow {
  left: boolean;
  right: boolean;
}

type Lane = keyof LaneGlow;

export function createPinballWorld(
  canvas: HTMLCanvasElement,
  callbacks: PinballCallbacks,
  theme: ThemeConfig,
  bounce: number,
): PinballWorld {
  const engine = Engine.create();
  engine.gravity.y = 1;

  const render = Render.create({
    canvas,
    engine,
    options: {
      width: WIDTH,
      height: HEIGHT,
      wireframes: false,
      background: theme.bg,
    },
  });

  const ball = Bodies.circle(WIDTH / 2, 100, BALL_RADIUS, {
    restitution: 0.9,
    render: { visible: false },
    label: "ball",
  });

  const walls = [
    Bodies.rectangle(WIDTH / 2, 0, WIDTH, 40, { isStatic: true }),
    Bodies.rectangle(WIDTH / 2, HEIGHT, WIDTH, 40, { isStatic: true }),
    Bodies.rectangle(0, HEIGHT / 2, 40, HEIGHT, { isStatic: true }),
    Bodies.rectangle(WIDTH, HEIGHT / 2, 40, HEIGHT, { isStatic: true }),
  ];

  const leftFlipper = Bodies.rectangle(120, HEIGHT - 40, 80, 20, {
    isStatic: true,
    angle: DEFAULT_LEFT_ANGLE,
    restitution: bounce,
    render: { fillStyle: theme.flipper },
  });

  const rightFlipper = Bodies.rectangle(WIDTH - 120, HEIGHT - 40, 80, 20, {
    isStatic: true,
    angle: DEFAULT_RIGHT_ANGLE,
    restitution: bounce,
    render: { fillStyle: theme.flipper },
  });

  const leftLane = Bodies.rectangle(80, 80, 40, 10, {
    isStatic: true,
    isSensor: true,
    label: "lane-left",
  });

  const rightLane = Bodies.rectangle(WIDTH - 80, 80, 40, 10, {
    isStatic: true,
    isSensor: true,
    label: "lane-right",
  });

  World.add(engine.world, [
    ball,
    ...walls,
    leftFlipper,
    rightFlipper,
    leftLane,
    rightLane,
  ]);

  const sparks: Spark[] = [];
  const glow: LaneGlow = { left: false, right: false };
  const glowTimers: Partial<Record<Lane, number>> = {};

  const lightLane = (lane: Lane) => {
    glow[lane] = true;
    if (glowTimers[lane]) {
      window.clearTimeout(glowTimers[lane]);
    }
    glowTimers[lane] = window.setTimeout(() => {
      glow[lane] = false;
    }, 500);
  };

  const handleCollision = ({ pairs }: Matter.IEventCollision<Engine>) => {
    pairs.forEach((pair) => {
      const bodies = [pair.bodyA, pair.bodyB];
      if (bodies.includes(ball) && bodies.includes(leftFlipper)) {
        const { x, y } = pair.collision.supports[0];
        sparks.push({ x, y, life: 1 });
      }
      if (bodies.includes(ball) && bodies.includes(rightFlipper)) {
        const { x, y } = pair.collision.supports[0];
        sparks.push({ x, y, life: 1 });
      }
      if (bodies.includes(ball) && bodies.includes(leftLane)) {
        lightLane("left");
        callbacks.onScore(100);
      }
      if (bodies.includes(ball) && bodies.includes(rightLane)) {
        lightLane("right");
        callbacks.onScore(100);
      }
    });
  };

  const handleAfterRender = () => {
    const ctx = render.context;
    const { x, y } = ball.position;
    const gradient = ctx.createRadialGradient(
      x - 4,
      y - 4,
      BALL_RADIUS / 4,
      x,
      y,
      BALL_RADIUS,
    );
    gradient.addColorStop(0, "#fff");
    gradient.addColorStop(1, "#999");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    const drawLane = (lane: Body, active: boolean) => {
      const { x: lx, y: ly } = lane.position;
      ctx.save();
      if (active) {
        ctx.shadowColor = "#ffff00";
        ctx.shadowBlur = 20;
        ctx.fillStyle = "#ff0";
      } else {
        ctx.fillStyle = "#555";
      }
      ctx.fillRect(lx - 20, ly - 5, 40, 10);
      ctx.restore();
    };

    drawLane(leftLane, glow.left);
    drawLane(rightLane, glow.right);

    for (let i = sparks.length - 1; i >= 0; i -= 1) {
      const spark = sparks[i];
      const radius = 8 * spark.life;
      const sparkGradient = ctx.createRadialGradient(
        spark.x,
        spark.y,
        0,
        spark.x,
        spark.y,
        radius,
      );
      sparkGradient.addColorStop(0, "rgba(255,255,200,0.8)");
      sparkGradient.addColorStop(1, "rgba(255,200,0,0)");
      ctx.fillStyle = sparkGradient;
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, radius, 0, Math.PI * 2);
      ctx.fill();
      spark.life -= 0.05;
      if (spark.life <= 0) {
        sparks.splice(i, 1);
      }
    }
  };

  Events.on(engine, "collisionStart", handleCollision);
  Events.on(render, "afterRender", handleAfterRender);

  const step = (delta: number) => {
    Engine.update(engine, delta * 1000);
    Render.world(render);
  };

  const setBounce = (value: number) => {
    leftFlipper.restitution = value;
    rightFlipper.restitution = value;
  };

  const setTheme = (value: ThemeConfig) => {
    (render.options as any).background = value.bg;
    leftFlipper.render.fillStyle = value.flipper;
    rightFlipper.render.fillStyle = value.flipper;
  };

  const setLeftFlipper = (angle: number) => {
    Body.setAngle(leftFlipper, angle);
  };

  const setRightFlipper = (angle: number) => {
    Body.setAngle(rightFlipper, angle);
  };

  const resetFlippers = () => {
    setLeftFlipper(DEFAULT_LEFT_ANGLE);
    setRightFlipper(DEFAULT_RIGHT_ANGLE);
  };

  const resetBall = () => {
    Body.setPosition(ball, { x: WIDTH / 2, y: 120 });
    Body.setVelocity(ball, { x: 0, y: 0 });
  };

  const nudge = (force: { x: number; y: number }) => {
    Body.applyForce(ball, ball.position, force);
  };

  return {
    step,
    destroy: () => {
      Events.off(engine, "collisionStart", handleCollision);
      Events.off(render, "afterRender", handleAfterRender);
      Object.values(glowTimers).forEach((timer) => {
        if (timer) window.clearTimeout(timer);
      });
      Render.stop(render);
      World.clear(engine.world, false);
      Engine.clear(engine);
    },
    setBounce,
    setTheme,
    setLeftFlipper,
    setRightFlipper,
    resetFlippers,
    nudge,
    resetBall,
  };
}

export const constants = {
  WIDTH,
  HEIGHT,
  DEFAULT_LEFT_ANGLE,
  DEFAULT_RIGHT_ANGLE,
};
