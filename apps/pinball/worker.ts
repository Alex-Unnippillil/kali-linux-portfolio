import Matter from 'matter-js';
const { Engine, World, Bodies, Body, Constraint, Runner, Render, Composite, Events } = Matter as any;

let engine: any;
let runner: any;
let render: any;
let flippers: any[] = [];
let bumpers: any[] = [];
let ball: any;
let ballSave = true;
const width = 400;
const height = 600;

function setup(table: any) {
  World.clear(engine.world, false);
  flippers = [];
  bumpers = [];
  World.add(engine.world, [
    Bodies.rectangle(width / 2, height, width, 20, { isStatic: true }),
    Bodies.rectangle(0, height / 2, 20, height, { isStatic: true }),
    Bodies.rectangle(width, height / 2, 20, height, { isStatic: true }),
    Bodies.rectangle(width / 2, 0, width, 20, { isStatic: true }),
  ]);
  table.elements.forEach((el: any) => {
    if (el.type === 'bumper') {
      const bumper = Bodies.circle(el.x, el.y, el.radius || 20, {
        isStatic: true,
        restitution: 1.2,
      });
      bumpers.push(bumper);
      World.add(engine.world, bumper);
    } else if (el.type === 'flipper') {
      const widthF = el.width || 80;
      const flipper = Bodies.rectangle(
        el.x,
        el.y,
        widthF,
        el.height || 20,
      );
      const dir = el.x < width / 2 ? -1 : 1;
      const hinge = Constraint.create({
        bodyA: flipper,
        pointA: { x: (widthF / 2) * dir, y: 0 },
        pointB: { x: el.x + (widthF / 2) * dir, y: el.y },
        length: 0,
        stiffness: 1,
      });
      flippers.push(flipper);
      World.add(engine.world, [flipper, hinge]);
    } else if (el.type === 'slingshot') {
      const sling = Bodies.polygon(el.x, el.y, 3, el.radius || 40, {
        isStatic: true,
        restitution: 1.2,
      });
      bumpers.push(sling);
      World.add(engine.world, sling);
    } else if (el.type === 'lane') {
      const lane = Bodies.rectangle(
        el.x,
        el.y,
        el.width || 100,
        el.height || 20,
        { isStatic: true, angle: el.radius || 0 },
      );
      World.add(engine.world, lane);
    }
  });
  ball = Bodies.circle(width / 2, height - 120, 10, { restitution: 0.9 });
  World.add(engine.world, ball);
  ballSave = true;
  setTimeout(() => (ballSave = false), 5000);

  Events.on(engine, 'collisionStart', (event: any) => {
    event.pairs.forEach((pair: any) => {
      if (bumpers.includes(pair.bodyA) || bumpers.includes(pair.bodyB)) {
        const p = bumpers.includes(pair.bodyA)
          ? pair.bodyA.position
          : pair.bodyB.position;
        (self as any).postMessage({ type: 'bumperHit', x: p.x, y: p.y });
      }
    });
  });
  Events.on(engine, 'afterUpdate', () => {
    if (ball.position.y > height && ballSave) {
      Body.setPosition(ball, { x: width / 2, y: height - 120 });
      Body.setVelocity(ball, { x: 0, y: -10 });
    }
  });
}

(self as any).onmessage = (e: any) => {
  const data = e.data;
  if (data.canvas) {
    engine = Engine.create();
    render = Render.create({
      canvas: data.canvas,
      engine,
      options: { width, height, wireframes: false, background: '#111' },
    });
    setup(data.table);
    runner = Runner.create({ isFixed: true, delta: 1000 / 60 });
    Runner.run(runner, engine);
    const renderLoop = () => {
      Render.world(render);
      if ((self as any).requestAnimationFrame) {
        (self as any).requestAnimationFrame(renderLoop);
      } else {
        setTimeout(renderLoop, 1000 / 60);
      }
    };
    renderLoop();
  } else if (data.type === 'flip') {
    const fl = flippers[data.index];
    if (fl) Body.applyAngularImpulse(fl, data.dir * 0.02);
  } else if (data.type === 'nudge') {
    Composite.allBodies(engine.world).forEach((b: any) => {
      if (!b.isStatic) Body.applyForce(b, b.position, data.force);
    });
  } else if (data.type === 'updateTable') {
    setup(data.table);
  } else if (data.type === 'visibility') {
    if (data.hidden) {
      runner.delta = 1000 / 20;
    } else {
      runner.delta = 1000 / 60;
    }
  }
};
