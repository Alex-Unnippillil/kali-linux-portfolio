import Matter from 'matter-js';
const { Engine, Bodies, World } = Matter;

function runBenchmark(label, config) {
  const engine = Engine.create({
    gravity: { y: 1 },
    positionIterations: config.positionIterations,
    velocityIterations: config.velocityIterations,
    constraintIterations: config.constraintIterations,
  });

  for (let i = 0; i < 100; i++) {
    const box = Bodies.rectangle(0, i * 10, 32, 32);
    World.add(engine.world, box);
  }

  const steps = 1000;
  console.time(label);
  for (let i = 0; i < steps; i++) {
    Engine.update(engine, 1000 / 60);
  }
  console.timeEnd(label);
}

runBenchmark('default(6,4,2)', {
  positionIterations: 6,
  velocityIterations: 4,
  constraintIterations: 2,
});

runBenchmark('optimized(4,3,2)', {
  positionIterations: 4,
  velocityIterations: 3,
  constraintIterations: 2,
});
