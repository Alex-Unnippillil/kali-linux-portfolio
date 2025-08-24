import Matter from 'matter-js';
const { Engine, World, Bodies, Body, Constraint, Runner, Render, Composite, Events } = Matter as any;

let engine: any;
let runner: any;
let render: any;
let flippers: any[] = [];
let bumpers: any[] = [];
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
        restitution: 1,
      });
      bumpers.push(bumper);
      World.add(engine.world, bumper);
    } else if (el.type === 'flipper') {
      const flipper = Bodies.rectangle(
        el.x,
        el.y,
        el.width || 80,
        el.height || 20,
      );
      const hinge = Constraint.create({
        bodyA: flipper,
        pointB: { x: el.x, y: el.y },
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
    }
  });
  const ball = Bodies.circle(width / 2, height - 120, 10, { restitution: 0.9 });
  World.add(engine.world, ball);

  Events.on(engine, 'collisionStart', (event: any) => {
    event.pairs.forEach((pair: any) => {
      if (bumpers.includes(pair.bodyA) || bumpers.includes(pair.bodyB)) {
        (self as any).postMessage({ type: 'bumperHit' });
      }
    });
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
    runner = Runner.create({ isFixed: true, delta: 1000 / 100 });
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
    if (fl) Body.setAngularVelocity(fl, data.dir * 10);
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
      runner.delta = 1000 / 100;
    }
  }
};
