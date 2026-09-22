import { Bodies, Body, Composite, Engine, Events, Vector } from 'matter-js';
import type { IEventCollision } from 'matter-js';
import { PinballRules, clamp, type HitKind, type RuleState } from './rules';
import {
  WIDTH, HEIGHT, BALL_RADIUS, SHOOTER, LEFT_PIVOT, RIGHT_PIVOT,
  FLIPPER_LENGTH, REST_ANGLE, ACTIVE_ANGLE, RAILS, BUMPERS, LANES, TARGETS,
  SLINGS, flipperCenter, type Point, type ThemeConfig,
} from './table';
import { createPinballRenderer, type Scene, type Particle } from './renderer';
export type { ThemeConfig } from './table';

const FIXED_STEP = 1 / 120;
const MAX_STEPS = 8;
const MAX_SPEED = 24; // Matter velocities are normalised to a 60 Hz base tick.
export interface PinballCallbacks {
  onScore: (points: number) => void;
  onBallLost?: () => void;
  onState?: (state: RuleState) => void;
  onSound?: (kind: string) => void;
}
export interface Inspection {
  state: RuleState;
  balls: { x: number; y: number; vx: number; vy: number }[];
  flippers: { x: number; y: number; angle: number; pivot: Point }[];
  steps: number;
  bodyCount: number;
}
export interface PinballWorld {
  step: (seconds: number) => void;
  draw: () => void;
  destroy: () => void;
  setBounce: (value: number) => void;
  setTheme: (value: ThemeConfig) => void;
  setReducedMotion: (value: boolean) => void;
  setFlipperPower: (value: number) => void;
  setLeftFlipper: (angle: number) => void;
  setRightFlipper: (angle: number) => void;
  resetFlippers: () => void;
  nudge: (force?: Point) => void;
  resetBall: () => void;
  resetGame: () => void;
  launchBall: (power: number) => void;
  isBallLocked: () => boolean;
  inspect: () => Inspection;
}
interface GameBall {
  body: Body;
  inShooter: boolean;
  idle: number;
  trail: Point[];
  strikes: [number, number];
}
interface Flipper {
  body: Body;
  pivot: Point;
  angle: number;
  target: number;
  rest: number;
  stroke: number;
  rising: boolean;
}

/** No Runner or Render RAF: the app owns the only animation loop and pause clock. */
export function createPinballWorld(
  canvas: HTMLCanvasElement | null,
  callbacks: PinballCallbacks,
  initialTheme: ThemeConfig,
  bounce = 0.5,
): PinballWorld {
  const engine = Engine.create({ positionIterations: 8, velocityIterations: 8 });
  engine.gravity.y = 1;
  const rules = new PinballRules();
  const renderer = canvas ? createPinballRenderer(canvas) : null;
  const entities = new Map<number, { kind: HitKind; index: number }>();
  const flashes = new Map<string, number>();
  const particles: Particle[] = [];
  const balls: GameBall[] = [];
  let theme = initialTheme;
  let reducedMotion = false;
  let disposed = false;
  let accumulator = 0;
  let clock = 0;
  let steps = 0;
  let lastReport = -Infinity;
  let flipperPower = 1;
  let extraBalls = 0;
  let launchPower = 0.8;
  let eventDirty = true;

  const rails = RAILS.map(([x1, y1, x2, y2]) => Bodies.rectangle(
    (x1 + x2) / 2, (y1 + y2) / 2, Math.hypot(x2 - x1, y2 - y1) + 6, 12,
    { isStatic: true, angle: Math.atan2(y2 - y1, x2 - x1), restitution: 0.65, friction: 0.01, label: 'rail' },
  ));
  const flippers: Flipper[] = [
    { pivot: LEFT_PIVOT, angle: REST_ANGLE },
    { pivot: RIGHT_PIVOT, angle: Math.PI - REST_ANGLE },
  ].map(({ pivot, angle }) => {
    const center = flipperCenter(pivot, angle);
    return {
      pivot, angle, target: angle, rest: angle, stroke: 0, rising: false,
      body: Bodies.rectangle(center.x, center.y, FLIPPER_LENGTH + 8, 16, {
        isStatic: true, angle, chamfer: { radius: 7 }, friction: 0.15,
        restitution: clamp(bounce, 0, 1, 0.5), label: 'flipper',
      }),
    };
  });
  const register = (body: Body, kind: HitKind, index: number) => {
    entities.set(body.id, { kind, index });
    return body;
  };
  const bumpers = BUMPERS.map((b, index) => register(Bodies.circle(b.x, b.y, b.r, {
    isStatic: true, restitution: 0.95, friction: 0, label: `bumper-${index}`,
  }), 'bumper', index));
  const lanes = LANES.map((p, index) => register(Bodies.rectangle(p.x, p.y, 57, 15, {
    isStatic: true, isSensor: true, label: `lane-${index}`,
  }), 'lane', index));
  const targets = TARGETS.map((p, index) => register(Bodies.rectangle(p.x, p.y, 18, 29, {
    isStatic: true, restitution: 0.8, chamfer: { radius: 3 }, label: `target-${index}`,
  }), 'target', index));
  const slings = SLINGS.map((vertices, index) => {
    const center = vertices.reduce((sum, p) => ({ x: sum.x + p.x / 3, y: sum.y + p.y / 3 }), { x: 0, y: 0 });
    return register(Bodies.fromVertices(center.x, center.y, [vertices.map((v) => ({ ...v }))], {
      isStatic: true, restitution: 0.9, label: `sling-${index}`,
    }), 'sling', index);
  });
  const spinner = register(Bodies.rectangle(197, 342, 52, 9, {
    isStatic: true, isSensor: true, label: 'spinner',
  }), 'spinner', 0);
  Composite.add(engine.world, [...rails, ...flippers.map((f) => f.body), ...bumpers, ...lanes, ...targets, ...slings, spinner]);

  const report = (force = false) => {
    if (disposed) return;
    if (force || eventDirty || clock - lastReport >= 0.1) {
      lastReport = clock;
      eventDirty = false;
      callbacks.onState?.(rules.snapshot());
    }
  };
  const createBall = (position: Point, locked = false, velocity: Point = { x: 0, y: 0 }) => {
    const body = Bodies.circle(position.x, position.y, BALL_RADIUS, {
      restitution: 0.72, friction: 0.002, frictionStatic: 0,
      frictionAir: 0.0015, density: 0.004, slop: 0.01, label: 'ball',
    });
    Body.setInertia(body, Infinity);
    Body.setStatic(body, locked);
    if (!locked) Body.setVelocity(body, velocity);
    balls.push({ body, inShooter: locked, idle: 0, trail: [], strikes: [-1, -1] });
    Composite.add(engine.world, body);
  };
  const removeBall = (ball: GameBall) => {
    Composite.remove(engine.world, ball.body);
    const index = balls.indexOf(ball);
    if (index >= 0) balls.splice(index, 1);
  };
  const serve = () => {
    balls.slice().forEach(removeBall);
    if (rules.snapshot().phase !== 'over') createBall(SHOOTER, true);
  };
  const burst = (position: Point, color: string, text: string) => {
    if (reducedMotion) return;
    // Bounded deterministic effects, not one timeout or random allocation per hit.
    for (let i = 0; i < 6; i += 1) {
      const angle = i * Math.PI / 3;
      particles.push({ x: position.x, y: position.y, vx: Math.cos(angle) * 46, vy: Math.sin(angle) * 46,
        life: 0.38, color, text: i === 0 ? text : '' });
    }
    if (particles.length > 72) particles.splice(0, particles.length - 72);
  };
  const boundSpeed = (body: Body) => {
    const velocity = Body.getVelocity(body);
    const speed = Math.hypot(velocity.x, velocity.y);
    if (!Number.isFinite(speed)) {
      Body.setPosition(body, { x: 197, y: 170 });
      Body.setVelocity(body, { x: 0, y: 3 });
    } else if (speed > MAX_SPEED) {
      Body.setVelocity(body, { x: velocity.x * MAX_SPEED / speed, y: velocity.y * MAX_SPEED / speed });
    }
  };
  const kick = (body: Body, origin: Point, speed: number) => {
    const difference = Vector.sub(body.position, origin);
    const length = Math.hypot(difference.x, difference.y);
    const normal = length > 0.001 ? Vector.mult(difference, 1 / length) : { x: 0, y: -1 };
    const velocity = Body.getVelocity(body);
    const outward = Vector.dot(velocity, normal);
    const impulse = Math.max(0, speed - outward);
    Body.setVelocity(body, Vector.add(velocity, Vector.mult(normal, impulse)));
    boundSpeed(body);
  };
  const strike = (ball: GameBall, flipper: Flipper, index: number) => {
    if (!flipper.rising || rules.snapshot().tilted || ball.strikes[index] === flipper.stroke) return;
    ball.strikes[index] = flipper.stroke;
    const relative = Vector.sub(ball.body.position, flipper.pivot);
    const lever = clamp(Math.hypot(relative.x, relative.y) / FLIPPER_LENGTH, 0.18, 1);
    const velocity = Body.getVelocity(ball.body);
    Body.setVelocity(ball.body, {
      x: velocity.x * 0.35 + (index === 0 ? 1 : -1) * (2 + lever * 4),
      y: Math.min(velocity.y, -(8 + lever * 12) * flipperPower),
    });
    boundSpeed(ball.body);
    burst(ball.body.position, theme.flipper, '');
    callbacks.onSound?.('flipper');
  };
  const collide = (event: IEventCollision<Engine>) => {
    if (disposed || rules.snapshot().phase !== 'playing') return;
    for (const pair of event.pairs) {
      const ball = balls.find((b) => b.body === pair.bodyA || b.body === pair.bodyB);
      if (!ball) continue;
      const other = pair.bodyA === ball.body ? pair.bodyB : pair.bodyA;
      const flipperIndex = flippers.findIndex((f) => f.body === other);
      if (flipperIndex >= 0) strike(ball, flippers[flipperIndex], flipperIndex);
      // collisionActive is only for striking a ball already resting on a flipper.
      if (event.name !== 'collisionStart') continue;
      const entity = entities.get(other.id);
      if (!entity) continue;
      const result = rules.hit(entity.kind, entity.index);
      if (result.points <= 0) continue;
      if (entity.kind === 'bumper') kick(ball.body, other.position, 12.5);
      if (entity.kind === 'sling') kick(ball.body, other.position, 10);
      flashes.set(`${entity.kind}:${entity.index}`, clock + 0.18);
      burst(ball.body.position, theme.accent || theme.flipper, `+${result.points}`);
      if (result.multiball) extraBalls += 2;
      eventDirty = true;
      callbacks.onScore(result.points);
      callbacks.onSound?.(result.kind);
    }
  };
  Events.on(engine, 'collisionStart', collide);
  Events.on(engine, 'collisionActive', collide);

  const moveFlippers = () => {
    flippers.forEach((f, index) => {
      const difference = f.target - f.angle;
      const maxMove = FIXED_STEP * (Math.abs(f.target - f.rest) > 0.05 ? 13 * flipperPower : 8);
      const next = f.angle + clamp(difference, -maxMove, maxMove, 0);
      f.rising = Math.abs(difference) > 0.001 && (index === 0 ? difference < 0 : difference > 0);
      const center = flipperCenter(f.pivot, next);
      const velocity = Vector.sub(center, f.body.position);
      const angularVelocity = next - f.body.angle;
      f.angle = next;
      // Static flippers retain Matter's base tick. Explicit setters preserve the
      // inferred motion without relying on missing updateVelocity type overloads.
      Body.setPosition(f.body, center);
      Body.setAngle(f.body, next);
      Body.setVelocity(f.body, velocity);
      Body.setAngularVelocity(f.body, angularVelocity);
    });
  };
  const resetFlippers = () => {
    if (disposed) return;
    flippers.forEach((f) => {
      f.target = f.rest;
      f.angle = f.rest;
      f.rising = false;
      Body.setPosition(f.body, flipperCenter(f.pivot, f.rest));
      Body.setAngle(f.body, f.rest);
      Body.setVelocity(f.body, { x: 0, y: 0 });
      Body.setAngularVelocity(f.body, 0);
    });
  };
  const draw = () => {
    if (disposed || !renderer) return;
    const scene: Scene = {
      theme, state: rules.snapshot(), time: clock, reducedMotion, flashes, particles,
      balls: balls.map((b) => ({ x: b.body.position.x, y: b.body.position.y, trail: b.trail })),
      flippers: flippers.map((f) => ({ pivot: f.pivot, angle: f.angle })),
    };
    renderer.draw(scene);
  };
  const fixedUpdate = () => {
    clock += FIXED_STEP;
    steps += 1;
    rules.advance(FIXED_STEP);
    const state = rules.snapshot();
    targets.forEach((target, index) => { target.isSensor = Boolean(state.targetMask & (1 << index)); });
    moveFlippers();
    balls.forEach((b) => boundSpeed(b.body));
    Engine.update(engine, FIXED_STEP * 1000);
    if (extraBalls > 0) {
      createBall({ x: 165, y: 163 }, false, { x: -3, y: 2 });
      createBall({ x: 229, y: 163 }, false, { x: 3, y: 2 });
      extraBalls = 0;
    }
    for (const ball of balls.slice()) {
      if (ball.body.isStatic) continue;
      const p = ball.body.position;
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
        Body.setPosition(ball.body, { x: 197, y: 170 });
        Body.setVelocity(ball.body, { x: 0, y: 3 });
        ball.inShooter = false;
      }
      if (ball.inShooter && p.y < 165) {
        ball.inShooter = false;
        Body.setVelocity(ball.body, { x: -5.5 - launchPower * 2, y: -7 - launchPower * 2.5 });
      }
      if (ball.inShooter && p.y > SHOOTER.y + 6 && ball.body.velocity.y > 0) {
        rules.returnToShooter();
        serve();
        eventDirty = true;
        break;
      }
      if (p.y > HEIGHT + BALL_RADIUS || p.x < -BALL_RADIUS * 2 || p.x > WIDTH + BALL_RADIUS * 2) {
        const result = rules.drain();
        removeBall(ball);
        if (result !== 'remove' && result !== 'ignore') {
          resetFlippers();
          serve();
          if (result === 'next' || result === 'over') callbacks.onBallLost?.();
          callbacks.onSound?.(result === 'save' ? 'save' : 'drain');
        }
        eventDirty = true;
        continue;
      }
      boundSpeed(ball.body);
      const velocity = Body.getVelocity(ball.body);
      const cradled = p.y > 575 && flippers.some((f) => Math.abs(f.target - f.rest) > 0.1);
      ball.idle = !cradled && Math.hypot(velocity.x, velocity.y) < 0.35 ? ball.idle + FIXED_STEP : 0;
      if (ball.idle > 5) {
        // Recover a genuinely stuck ball, but never eject an intentional cradle.
        Body.setVelocity(ball.body, { x: p.x < WIDTH / 2 ? 2 : -2, y: -5 });
        ball.idle = 0;
      }
      if (!reducedMotion && steps % 2 === 0) {
        ball.trail.unshift({ x: p.x, y: p.y });
        if (ball.trail.length > 9) ball.trail.pop();
      }
    }
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const particle = particles[i];
      particle.life -= FIXED_STEP;
      particle.x += particle.vx * FIXED_STEP;
      particle.y += particle.vy * FIXED_STEP;
      if (particle.life <= 0) particles.splice(i, 1);
    }
    flashes.forEach((until, key) => { if (until < clock) flashes.delete(key); });
  };
  const setFlipper = (index: number, angle: number) => {
    if (disposed || rules.snapshot().tilted || rules.snapshot().phase === 'over') return;
    const f = flippers[index];
    const relative = index === 0 ? clamp(angle, ACTIVE_ANGLE, REST_ANGLE, REST_ANGLE)
      : clamp(angle, -REST_ANGLE, -ACTIVE_ANGLE, -REST_ANGLE);
    const next = index === 0 ? relative : Math.PI + relative;
    if (Math.abs(next - f.rest) > 0.1 && Math.abs(f.target - f.rest) <= 0.1) f.stroke += 1;
    f.target = next;
  };
  const resetGame = () => {
    if (disposed) return;
    rules.reset();
    accumulator = 0;
    extraBalls = 0;
    particles.length = 0;
    flashes.clear();
    resetFlippers();
    serve();
    report(true);
    draw();
  };
  serve();
  report(true);
  draw();
  return {
    step: (seconds) => {
      if (disposed || !Number.isFinite(seconds) || seconds < 0) return;
      accumulator += Math.min(seconds, FIXED_STEP * MAX_STEPS);
      let count = 0;
      while (accumulator + 1e-10 >= FIXED_STEP && count < MAX_STEPS) {
        fixedUpdate();
        accumulator = Math.max(0, accumulator - FIXED_STEP);
        count += 1;
      }
      report();
      draw();
    },
    draw,
    destroy: () => {
      if (disposed) return;
      disposed = true;
      Events.off(engine, 'collisionStart', collide);
      Events.off(engine, 'collisionActive', collide);
      Composite.clear(engine.world, false);
      Engine.clear(engine);
      balls.length = 0;
      particles.length = 0;
      flashes.clear();
      renderer?.destroy();
    },
    setBounce: (value) => { if (!disposed) flippers.forEach((f) => { f.body.restitution = clamp(value, 0, 1, 0.5); }); },
    setFlipperPower: (value) => { if (!disposed) flipperPower = clamp(value, 0.75, 1.25, 1); },
    setTheme: (value) => { if (!disposed) { theme = value; draw(); } },
    setReducedMotion: (value) => {
      if (disposed) return;
      reducedMotion = value;
      particles.length = 0;
      balls.forEach((b) => { b.trail.length = 0; });
      draw();
    },
    setLeftFlipper: (angle) => setFlipper(0, angle),
    setRightFlipper: (angle) => setFlipper(1, angle),
    resetFlippers,
    nudge: (force = { x: 0, y: -1 }) => {
      if (disposed) return;
      const result = rules.nudge();
      if (result === 'ignored') return;
      if (result === 'tilt') resetFlippers();
      else balls.forEach((b) => {
        const v = Body.getVelocity(b.body);
        Body.setVelocity(b.body, { x: v.x + clamp(force.x, -1, 1, 0) * 1.5, y: v.y - 2.4 });
        boundSpeed(b.body);
      });
      callbacks.onSound?.(result);
      report(true);
    },
    resetBall: () => { if (!disposed && rules.snapshot().phase === 'ready') { serve(); draw(); } },
    resetGame,
    launchBall: (power) => {
      if (disposed || !rules.launch()) return;
      launchPower = clamp(power, 0.4, 1.4, 0.8);
      const ball = balls[0];
      if (ball) {
        ball.inShooter = true;
        Body.setStatic(ball.body, false);
        Body.setInertia(ball.body, Infinity);
        Body.setVelocity(ball.body, { x: 0, y: -(18 + launchPower * 5) });
      }
      callbacks.onSound?.('launch');
      report(true);
    },
    isBallLocked: () => rules.snapshot().phase === 'ready',
    inspect: () => ({
      state: rules.snapshot(),
      balls: balls.map((b) => { const v = Body.getVelocity(b.body); return { x: b.body.position.x, y: b.body.position.y, vx: v.x, vy: v.y }; }),
      flippers: flippers.map((f) => ({ x: f.body.position.x, y: f.body.position.y, angle: f.angle, pivot: { ...f.pivot } })),
      steps, bodyCount: Composite.allBodies(engine.world).length,
    }),
  };
}
export const constants = { WIDTH, HEIGHT, DEFAULT_LEFT_ANGLE: REST_ANGLE, DEFAULT_RIGHT_ANGLE: -REST_ANGLE, FIXED_STEP, MAX_STEPS, MAX_SPEED };
