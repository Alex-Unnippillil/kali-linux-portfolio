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
const MAX_SPARKS = 120;
const MAX_TRAIL_POINTS = 32;
const MAX_MULTIPLIER_RIPPLES = 6;
const PLUNGER_X = WIDTH - 60;
const PLUNGER_Y = HEIGHT - 110;
const BUMPER_RADIUS = 28;
const DRAIN_LABEL = "drain";
const BUMPER_LABEL = "bumper";
const SLING_LABEL = "sling";
const TARGET_LABEL = "target";

export interface ThemeConfig {
  bg: string;
  bgSecondary: string;
  flipper: string;
  accent: string;
  bumper: string;
  sling: string;
  lane: string;
  trail: string;
  light: string;
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
  pulseMultiplier: (level: number) => void;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  color: string;
}

interface LaneGlow {
  left: boolean;
  right: boolean;
}

type Lane = keyof LaneGlow;

interface TrailPoint {
  x: number;
  y: number;
  life: number;
}

interface MultiplierRipple {
  x: number;
  y: number;
  life: number;
  strength: number;
}

export function createPinballWorld(
  canvas: HTMLCanvasElement,
  callbacks: PinballCallbacks,
  theme: ThemeConfig,
  bounce: number,
): PinballWorld {
  const engine = Engine.create();
  engine.gravity.y = 1.1;
  let currentTheme = theme;
  let ambientPhase = 0;

  const render = Render.create({
    canvas,
    engine,
    options: {
      width: WIDTH,
      height: HEIGHT,
      wireframes: false,
      background: theme.bgSecondary,
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
      render: { fillStyle: theme.bgSecondary },
    }),
    Bodies.rectangle(WIDTH / 2 + 70, 130, 140, 16, {
      isStatic: true,
      angle: -0.32,
      render: { fillStyle: theme.bgSecondary },
    }),
    Bodies.rectangle(WIDTH - 40, HEIGHT / 2, 20, HEIGHT, { isStatic: true }),
    Bodies.rectangle(WIDTH - 100, HEIGHT - 60, 160, 16, {
      isStatic: true,
      angle: -0.3,
      render: { fillStyle: theme.bgSecondary },
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
      render: { fillStyle: theme.bumper },
    }),
    Bodies.circle(WIDTH / 2 - 80, 260, BUMPER_RADIUS, {
      isStatic: true,
      restitution: 1.25,
      label: `${BUMPER_LABEL}-left`,
      render: { fillStyle: theme.bumper },
    }),
    Bodies.circle(WIDTH / 2 + 80, 260, BUMPER_RADIUS, {
      isStatic: true,
      restitution: 1.25,
      label: `${BUMPER_LABEL}-right`,
      render: { fillStyle: theme.bumper },
    }),
  ];

  const slings = [
    Bodies.rectangle(85, HEIGHT - 120, 120, 16, {
      isStatic: true,
      angle: 0.7,
      restitution: 1.05,
      label: `${SLING_LABEL}-left`,
      render: { fillStyle: theme.sling },
    }),
    Bodies.rectangle(WIDTH - 85, HEIGHT - 120, 120, 16, {
      isStatic: true,
      angle: -0.7,
      restitution: 1.05,
      label: `${SLING_LABEL}-right`,
      render: { fillStyle: theme.sling },
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

  applyThemeStyles(theme);

  const sparks: Spark[] = [];
  const neonTrail: TrailPoint[] = [];
  const multiplierRipples: MultiplierRipple[] = [];
  const glow: LaneGlow = { left: false, right: false };
  const glowTimers: Partial<Record<Lane, number>> = {};
  const bumperPulse = new Map<Matter.Body, number>();
  const targetPulse = new Map<Matter.Body, number>();
  const targetResetTimers = new Map<Matter.Body, number>();
  const targetStates = new Map<Matter.Body, boolean>();
  const flipperGlow = { left: 0, right: 0 };
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

  const spawnSparks = (
    x: number,
    y: number,
    color: string,
    count = 6,
  ) => {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 1.6;
      sparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        size: 3 + Math.random() * 3,
        color,
      });
    }
  };

  const flashBumper = (bumper: Matter.Body) => {
    bumperPulse.set(bumper, 1);
  };

  const dropTarget = (target: Matter.Body) => {
    if (targetStates.get(target)) return;
    targetStates.set(target, true);
    targetPulse.set(target, 1);
    callbacks.onScore(250);
    if (targetResetTimers.has(target)) {
      window.clearTimeout(targetResetTimers.get(target));
    }
    const timer = window.setTimeout(() => {
      targetStates.set(target, false);
      targetPulse.delete(target);
      targetResetTimers.delete(target);
    }, 4000);
    targetResetTimers.set(target, timer);
  };

  const applyThemeStyles = (nextTheme: ThemeConfig) => {
    (render.options as any).background = nextTheme.bgSecondary;
    leftFlipper.render.fillStyle = nextTheme.flipper;
    rightFlipper.render.fillStyle = nextTheme.flipper;
    bumpers.forEach((bumper) => {
      bumper.render.fillStyle = nextTheme.bumper;
    });
    slings.forEach((sling) => {
      sling.render.fillStyle = nextTheme.sling;
    });
    funnelGuides.forEach((guide) => {
      guide.render.fillStyle = nextTheme.bgSecondary;
    });
  };

  const handleCollision = ({ pairs }: Matter.IEventCollision<Engine>) => {
    pairs.forEach((pair) => {
      const bodies = [pair.bodyA, pair.bodyB];
      if (bodies.includes(ball) && bodies.includes(leftFlipper)) {
        const contact = pair.collision.supports[0];
        if (contact) {
          spawnSparks(contact.x, contact.y, currentTheme.flipper, 5);
        }
        flipperGlow.left = 1;
      }
      if (bodies.includes(ball) && bodies.includes(rightFlipper)) {
        const contact = pair.collision.supports[0];
        if (contact) {
          spawnSparks(contact.x, contact.y, currentTheme.flipper, 5);
        }
        flipperGlow.right = 1;
      }
      if (bodies.includes(ball) && bodies.includes(leftLane)) {
        lightLane("left");
        const contact = pair.collision.supports[0];
        if (contact) {
          spawnSparks(contact.x, contact.y, currentTheme.lane, 4);
        }
        callbacks.onScore(100);
      }
      if (bodies.includes(ball) && bodies.includes(rightLane)) {
        lightLane("right");
        const contact = pair.collision.supports[0];
        if (contact) {
          spawnSparks(contact.x, contact.y, currentTheme.lane, 4);
        }
        callbacks.onScore(100);
      }
      bumpers.forEach((bumper) => {
        if (bodies.includes(ball) && bodies.includes(bumper)) {
          const contact = pair.collision.supports[0];
          if (contact) {
            spawnSparks(contact.x, contact.y, currentTheme.bumper, 7);
          }
          flashBumper(bumper);
          callbacks.onScore(50);
        }
      });
      slings.forEach((sling) => {
        if (bodies.includes(ball) && bodies.includes(sling)) {
          const contact = pair.collision.supports[0];
          if (contact) {
            spawnSparks(contact.x, contact.y, currentTheme.sling, 5);
          }
          callbacks.onScore(25);
        }
      });
      targets.forEach((target) => {
        if (bodies.includes(ball) && bodies.includes(target)) {
          const contact = pair.collision.supports[0];
          if (contact) {
            spawnSparks(contact.x, contact.y, currentTheme.accent, 6);
          }
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

  const handleBeforeRender = () => {
    const ctx = render.context;
    ambientPhase = (ambientPhase + 0.015) % (Math.PI * 2);
    ctx.save();
    const gradientBg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    gradientBg.addColorStop(0, currentTheme.bg);
    gradientBg.addColorStop(1, currentTheme.bgSecondary);
    ctx.fillStyle = gradientBg;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.1;
    for (let i = 0; i < 5; i += 1) {
      const offset = Math.sin(ambientPhase + i * 0.8) * 60;
      ctx.fillStyle = currentTheme.accent;
      ctx.fillRect(WIDTH / 2 + offset - 1.5, 0, 3, HEIGHT);
    }
    const halo = ctx.createRadialGradient(
      WIDTH / 2,
      HEIGHT * 0.35,
      40,
      WIDTH / 2,
      HEIGHT * 0.35,
      260,
    );
    halo.addColorStop(0, currentTheme.light);
    halo.addColorStop(1, "transparent");
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(WIDTH / 2, HEIGHT * 0.35, 260, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const handleAfterRender = () => {
    const ctx = render.context;
    const { x, y } = ball.position;

    neonTrail.push({ x, y, life: 1 });
    if (neonTrail.length > MAX_TRAIL_POINTS) {
      neonTrail.shift();
    }

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < neonTrail.length - 1; i += 1) {
      const start = neonTrail[i];
      const end = neonTrail[i + 1];
      const alpha = Math.max(Math.min(end.life, 1), 0);
      if (alpha <= 0) continue;
      ctx.strokeStyle = currentTheme.trail;
      ctx.globalAlpha = alpha * 0.6;
      ctx.lineWidth = 6 * alpha;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }
    ctx.restore();

    const ballGradient = ctx.createRadialGradient(
      x - 4,
      y - 4,
      BALL_RADIUS / 4,
      x,
      y,
      BALL_RADIUS * 1.2,
    );
    ballGradient.addColorStop(0, "#ffffff");
    ballGradient.addColorStop(1, currentTheme.trail);
    ctx.fillStyle = ballGradient;
    ctx.beginPath();
    ctx.arc(x, y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    const drawLane = (lane: Body, active: boolean) => {
      const { x: lx, y: ly } = lane.position;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.globalAlpha = active ? 0.9 : 0.35;
      ctx.fillStyle = active ? currentTheme.lane : "rgba(148,163,184,0.35)";
      if (active) {
        ctx.shadowColor = currentTheme.lane;
        ctx.shadowBlur = 18;
      }
      ctx.fillRect(-20, -5, 40, 10);
      if (active) {
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fillRect(-20, -4, 40, 2);
      }
      ctx.restore();
    };

    drawLane(leftLane, glow.left);
    drawLane(rightLane, glow.right);

    const drawSling = (sling: Body) => {
      ctx.save();
      ctx.translate(sling.position.x, sling.position.y);
      ctx.rotate(sling.angle);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = currentTheme.sling;
      ctx.shadowColor = currentTheme.sling;
      ctx.shadowBlur = 15;
      ctx.fillRect(-60, -8, 120, 16);
      ctx.restore();
    };

    slings.forEach(drawSling);

    bumpers.forEach((bumper) => {
      const pulse = bumperPulse.get(bumper) ?? 0;
      ctx.save();
      ctx.translate(bumper.position.x, bumper.position.y);
      const gradientBumper = ctx.createRadialGradient(
        0,
        0,
        6,
        0,
        0,
        BUMPER_RADIUS + pulse * 4,
      );
      gradientBumper.addColorStop(0, "rgba(255,255,255,0.9)");
      gradientBumper.addColorStop(1, currentTheme.bumper);
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = gradientBumper;
      ctx.shadowColor = currentTheme.light;
      ctx.shadowBlur = 25 * (0.4 + pulse);
      ctx.beginPath();
      ctx.arc(0, 0, BUMPER_RADIUS + pulse * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      if (pulse > 0) {
        const next = Math.max(0, pulse - 0.07);
        if (next <= 0.01) {
          bumperPulse.delete(bumper);
        } else {
          bumperPulse.set(bumper, next);
        }
      }
    });

    targets.forEach((target) => {
      ctx.save();
      ctx.translate(target.position.x, target.position.y);
      const dropped = Boolean(targetStates.get(target));
      const pulse = targetPulse.get(target) ?? 0;
      ctx.globalAlpha = dropped ? 0.5 : 0.95;
      ctx.fillStyle = dropped ? currentTheme.bgSecondary : currentTheme.accent;
      if (!dropped) {
        ctx.shadowColor = currentTheme.accent;
        ctx.shadowBlur = 16 + pulse * 20;
      }
      ctx.fillRect(-7, -20, 14, 40);
      if (!dropped) {
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.fillRect(-7, -18, 14, 6);
      }
      ctx.restore();
      if (pulse > 0) {
        const next = Math.max(0, pulse - 0.05);
        if (next <= 0.01) {
          targetPulse.delete(target);
        } else {
          targetPulse.set(target, next);
        }
      }
    });

    for (let i = sparks.length - 1; i >= 0; i -= 1) {
      const spark = sparks[i];
      spark.x += spark.vx;
      spark.y += spark.vy;
      spark.vx *= 0.92;
      spark.vy = spark.vy * 0.92 + 0.04;
      spark.life -= 0.05;
      if (spark.life <= 0) {
        sparks.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = Math.max(spark.life, 0) * 0.85;
      ctx.fillStyle = spark.color;
      ctx.shadowColor = spark.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, spark.size * spark.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (let i = multiplierRipples.length - 1; i >= 0; i -= 1) {
      const ripple = multiplierRipples[i];
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = ripple.life * 0.45;
      ctx.strokeStyle = currentTheme.accent;
      ctx.lineWidth = 2 + ripple.strength * 0.6;
      const radius =
        BALL_RADIUS + (1 - ripple.life) * 80 * (ripple.strength / 6);
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      ripple.life -= 0.05;
      if (ripple.life <= 0) {
        multiplierRipples.splice(i, 1);
      }
    }

    const drawFlipperGlow = (flipper: Matter.Body, intensity: number) => {
      if (intensity <= 0) return;
      ctx.save();
      ctx.translate(flipper.position.x, flipper.position.y);
      ctx.rotate(flipper.angle);
      ctx.globalAlpha = intensity * 0.75;
      ctx.shadowColor = currentTheme.light;
      ctx.shadowBlur = 24 * intensity;
      const gradientFlipper = ctx.createLinearGradient(-40, 0, 40, 0);
      gradientFlipper.addColorStop(0, currentTheme.trail);
      gradientFlipper.addColorStop(1, currentTheme.flipper);
      ctx.fillStyle = gradientFlipper;
      ctx.fillRect(-40, -12, 80, 24);
      ctx.restore();
    };

    drawFlipperGlow(leftFlipper, flipperGlow.left);
    drawFlipperGlow(rightFlipper, flipperGlow.right);
    flipperGlow.left = Math.max(0, flipperGlow.left - 0.07);
    flipperGlow.right = Math.max(0, flipperGlow.right - 0.07);

    for (let i = neonTrail.length - 1; i >= 0; i -= 1) {
      neonTrail[i].life -= 0.04;
      if (neonTrail[i].life <= 0) {
        neonTrail.splice(i, 1);
      }
    }

    while (sparks.length > MAX_SPARKS) {
      sparks.shift();
    }
  };

  Events.on(engine, "collisionStart", handleCollision);
  Events.on(render, "beforeRender", handleBeforeRender);
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
    currentTheme = value;
    applyThemeStyles(value);
  };

  const setLeftFlipper = (angle: number) => {
    Body.setAngle(leftFlipper, angle);
    if (Math.abs(angle - DEFAULT_LEFT_ANGLE) > 0.01) {
      flipperGlow.left = 1;
    }
  };

  const setRightFlipper = (angle: number) => {
    Body.setAngle(rightFlipper, angle);
    if (Math.abs(angle - DEFAULT_RIGHT_ANGLE) > 0.01) {
      flipperGlow.right = 1;
    }
  };

  const resetFlippers = () => {
    setLeftFlipper(DEFAULT_LEFT_ANGLE);
    setRightFlipper(DEFAULT_RIGHT_ANGLE);
  };

  const resetBall = () => {
    Body.setPosition(ball, spawnPosition);
    Body.setVelocity(ball, { x: 0, y: 0 });
    locked = true;
    neonTrail.length = 0;
    multiplierRipples.length = 0;
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

  const pulseMultiplier = (level: number) => {
    const strength = Math.max(1, Math.min(level, 8));
    multiplierRipples.push({
      x: ball.position.x,
      y: ball.position.y,
      life: 1,
      strength,
    });
    while (multiplierRipples.length > MAX_MULTIPLIER_RIPPLES) {
      multiplierRipples.shift();
    }
  };

  return {
    step,
    destroy: () => {
      Events.off(engine, "collisionStart", handleCollision);
      Events.off(render, "beforeRender", handleBeforeRender);
      Events.off(render, "afterRender", handleAfterRender);
      Object.values(glowTimers).forEach((timer) => {
        if (timer) window.clearTimeout(timer);
      });
      targetResetTimers.forEach((timer) => window.clearTimeout(timer));
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
    pulseMultiplier,
    isBallLocked: () => locked,
  };
}

export const constants = {
  WIDTH,
  HEIGHT,
  DEFAULT_LEFT_ANGLE,
  DEFAULT_RIGHT_ANGLE,
};
