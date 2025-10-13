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
const MAX_SPARKS = 60;
const PLUNGER_X = WIDTH - 60;
const PLUNGER_Y = HEIGHT - 110;
const BUMPER_RADIUS = 28;
const DRAIN_LABEL = "drain";
const BUMPER_LABEL = "bumper";
const SLING_LABEL = "sling";
const TARGET_LABEL = "target";

export interface ThemeConfig {
  bg: string;
  flipper: string;
}

export interface PinballCallbacks {
  onScore: (points: number) => void;
  onBallLost?: () => void;
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
  launchBall: (power: number) => void;
  isBallLocked: () => boolean;
}

interface Spark {
  x: number;
  y: number;
  life: number;
  hue: number;
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
  engine.gravity.y = 1.1;

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

  const spawnPosition = { x: PLUNGER_X, y: PLUNGER_Y };

  const ball = Bodies.circle(spawnPosition.x, spawnPosition.y, BALL_RADIUS, {
    restitution: 0.92,
    friction: 0.001,
    render: { visible: false },
    label: "ball",
  });

  Body.setInertia(ball, Infinity);

  const boundaries = [
    Bodies.rectangle(WIDTH / 2, -20, WIDTH, 40, { isStatic: true }),
    Bodies.rectangle(WIDTH / 2, HEIGHT + 20, WIDTH, 40, { isStatic: true, isSensor: true, label: DRAIN_LABEL }),
    Bodies.rectangle(-20, HEIGHT / 2, 40, HEIGHT, { isStatic: true }),
    Bodies.rectangle(WIDTH + 20, HEIGHT / 2, 40, HEIGHT, { isStatic: true }),
  ];

  const funnelGuides = [
    Bodies.rectangle(WIDTH / 2 - 70, 130, 140, 16, {
      isStatic: true,
      angle: 0.32,
      render: { fillStyle: "#1f2937" },
    }),
    Bodies.rectangle(WIDTH / 2 + 70, 130, 140, 16, {
      isStatic: true,
      angle: -0.32,
      render: { fillStyle: "#1f2937" },
    }),
    Bodies.rectangle(WIDTH - 40, HEIGHT / 2, 20, HEIGHT, { isStatic: true }),
    Bodies.rectangle(WIDTH - 100, HEIGHT - 60, 160, 16, {
      isStatic: true,
      angle: -0.3,
      render: { fillStyle: "#1f2937" },
    }),
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

  const bumpers = [
    Bodies.circle(WIDTH / 2, 210, BUMPER_RADIUS, {
      isStatic: true,
      restitution: 1.3,
      label: `${BUMPER_LABEL}-center`,
      render: { fillStyle: "#f59e0b" },
    }),
    Bodies.circle(WIDTH / 2 - 80, 260, BUMPER_RADIUS, {
      isStatic: true,
      restitution: 1.25,
      label: `${BUMPER_LABEL}-left`,
      render: { fillStyle: "#f59e0b" },
    }),
    Bodies.circle(WIDTH / 2 + 80, 260, BUMPER_RADIUS, {
      isStatic: true,
      restitution: 1.25,
      label: `${BUMPER_LABEL}-right`,
      render: { fillStyle: "#f59e0b" },
    }),
  ];

  const slings = [
    Bodies.rectangle(85, HEIGHT - 120, 120, 16, {
      isStatic: true,
      angle: 0.7,
      restitution: 1.05,
      label: `${SLING_LABEL}-left`,
      render: { fillStyle: "#4ade80" },
    }),
    Bodies.rectangle(WIDTH - 85, HEIGHT - 120, 120, 16, {
      isStatic: true,
      angle: -0.7,
      restitution: 1.05,
      label: `${SLING_LABEL}-right`,
      render: { fillStyle: "#4ade80" },
    }),
  ];

  const targets = [
    Bodies.rectangle(120, 320, 14, 40, {
      isStatic: true,
      isSensor: true,
      label: `${TARGET_LABEL}-1`,
    }),
    Bodies.rectangle(WIDTH - 120, 320, 14, 40, {
      isStatic: true,
      isSensor: true,
      label: `${TARGET_LABEL}-2`,
    }),
    Bodies.rectangle(WIDTH / 2, 360, 14, 40, {
      isStatic: true,
      isSensor: true,
      label: `${TARGET_LABEL}-3`,
    }),
  ];

  World.add(engine.world, [
    ball,
    ...boundaries,
    ...funnelGuides,
    leftFlipper,
    rightFlipper,
    leftLane,
    rightLane,
    ...bumpers,
    ...slings,
    ...targets,
  ]);

  const sparks: Spark[] = [];
  const glow: LaneGlow = { left: false, right: false };
  const glowTimers: Partial<Record<Lane, number>> = {};
  const bumperTimers = new Map<Matter.Body, number>();
  const targetStates = new Map<Matter.Body, boolean>();
  let locked = true;

  const lightLane = (lane: Lane) => {
    glow[lane] = true;
    if (glowTimers[lane]) {
      window.clearTimeout(glowTimers[lane]);
    }
    glowTimers[lane] = window.setTimeout(() => {
      glow[lane] = false;
    }, 500);
  };

  const flashBumper = (bumper: Matter.Body) => {
    if (bumperTimers.has(bumper)) {
      window.clearTimeout(bumperTimers.get(bumper));
    }
    bumper.render.fillStyle = "#fde68a";
    const timer = window.setTimeout(() => {
      bumper.render.fillStyle = "#f59e0b";
      bumperTimers.delete(bumper);
    }, 150);
    bumperTimers.set(bumper, timer);
  };

  const dropTarget = (target: Matter.Body) => {
    if (targetStates.get(target)) return;
    targetStates.set(target, true);
    callbacks.onScore(250);
    const timer = window.setTimeout(() => {
      targetStates.set(target, false);
    }, 4000);
    bumperTimers.set(target, timer);
  };

  const handleCollision = ({ pairs }: Matter.IEventCollision<Engine>) => {
    pairs.forEach((pair) => {
      const bodies = [pair.bodyA, pair.bodyB];
      if (bodies.includes(ball) && bodies.includes(leftFlipper)) {
        const { x, y } = pair.collision.supports[0];
        sparks.push({ x, y, life: 1, hue: 45 });
      }
      if (bodies.includes(ball) && bodies.includes(rightFlipper)) {
        const { x, y } = pair.collision.supports[0];
        sparks.push({ x, y, life: 1, hue: 45 });
      }
      if (bodies.includes(ball) && bodies.includes(leftLane)) {
        lightLane("left");
        callbacks.onScore(100);
      }
      if (bodies.includes(ball) && bodies.includes(rightLane)) {
        lightLane("right");
        callbacks.onScore(100);
      }
      bumpers.forEach((bumper) => {
        if (bodies.includes(ball) && bodies.includes(bumper)) {
          const { x, y } = pair.collision.supports[0];
          sparks.push({ x, y, life: 1, hue: 50 });
          flashBumper(bumper);
          callbacks.onScore(50);
        }
      });
      slings.forEach((sling) => {
        if (bodies.includes(ball) && bodies.includes(sling)) {
          const { x, y } = pair.collision.supports[0];
          sparks.push({ x, y, life: 1, hue: 150 });
          callbacks.onScore(25);
        }
      });
      targets.forEach((target) => {
        if (bodies.includes(ball) && bodies.includes(target)) {
          dropTarget(target);
        }
      });
      const drain = boundaries[1];
      if (bodies.includes(ball) && bodies.includes(drain)) {
        locked = true;
        callbacks.onBallLost?.();
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

    bumpers.forEach((bumper) => {
      const angle = bumper.render.fillStyle === "#fde68a" ? 0.6 : 0.3;
      ctx.save();
      ctx.translate(bumper.position.x, bumper.position.y);
      const gradientBumper = ctx.createRadialGradient(0, 0, 6, 0, 0, BUMPER_RADIUS);
      gradientBumper.addColorStop(0, "rgba(255,255,255,0.9)");
      gradientBumper.addColorStop(1, bumper.render.fillStyle || "#f59e0b");
      ctx.fillStyle = gradientBumper;
      ctx.beginPath();
      ctx.arc(0, 0, BUMPER_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    });

    targets.forEach((target) => {
      ctx.save();
      ctx.translate(target.position.x, target.position.y);
      ctx.fillStyle = targetStates.get(target) ? "#111827" : "#f43f5e";
      ctx.fillRect(-7, -20, 14, 40);
      if (!targetStates.get(target)) {
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillRect(-7, -18, 14, 6);
      }
      ctx.restore();
    });

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
      const hue = spark.hue ?? 45;
      sparkGradient.addColorStop(0, `hsla(${hue}, 100%, 70%, 0.9)`);
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

    while (sparks.length > MAX_SPARKS) {
      sparks.shift();
    }
  };

  Events.on(engine, "collisionStart", handleCollision);
  Events.on(render, "afterRender", handleAfterRender);

  const step = (delta: number) => {
    Engine.update(engine, delta * 1000);
    if (locked) {
      Body.setPosition(ball, spawnPosition);
      Body.setVelocity(ball, { x: 0, y: 0 });
    }
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
    Body.setPosition(ball, spawnPosition);
    Body.setVelocity(ball, { x: 0, y: 0 });
    locked = true;
  };

  const nudge = (force: { x: number; y: number }) => {
    Body.applyForce(ball, ball.position, force);
  };

  const launchBall = (power: number) => {
    if (!locked) return;
    locked = false;
    const launchForce = Math.min(Math.max(power, 0.2), 1.5);
    Body.setPosition(ball, spawnPosition);
    Body.setVelocity(ball, { x: -launchForce * 2, y: -launchForce * 24 });
  };

  return {
    step,
    destroy: () => {
      Events.off(engine, "collisionStart", handleCollision);
      Events.off(render, "afterRender", handleAfterRender);
      Object.values(glowTimers).forEach((timer) => {
        if (timer) window.clearTimeout(timer);
      });
      bumperTimers.forEach((timer) => window.clearTimeout(timer));
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
    launchBall,
    isBallLocked: () => locked,
  };
}

export const constants = {
  WIDTH,
  HEIGHT,
  DEFAULT_LEFT_ANGLE,
  DEFAULT_RIGHT_ANGLE,
};
