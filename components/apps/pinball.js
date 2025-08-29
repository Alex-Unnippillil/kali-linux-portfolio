import React, { useEffect, useRef } from 'react';
import Matter from 'matter-js';

const WIDTH = 400;
const HEIGHT = 500;
const FLIPPER_OFFSET = 60;

const Pinball = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const { Engine, Render, Runner, Bodies, Composite, Body, Constraint, Events } = Matter;

    const engine = Engine.create();
    const world = engine.world;

    // Walls
    const walls = [
      Bodies.rectangle(WIDTH / 2, -10, WIDTH, 20, { isStatic: true }),
      Bodies.rectangle(WIDTH / 2, HEIGHT + 10, WIDTH, 20, { isStatic: true }),
      Bodies.rectangle(-10, HEIGHT / 2, 20, HEIGHT, { isStatic: true }),
      Bodies.rectangle(WIDTH + 10, HEIGHT / 2, 20, HEIGHT, { isStatic: true }),
    ];
    Composite.add(world, walls);

    // Ball
    const ball = Bodies.circle(WIDTH / 2, 100, 10, {
      restitution: 0.9,
      label: 'ball',
      render: { fillStyle: '#fff' },
    });
    Composite.add(world, ball);

    // Flippers
    const flipperLeft = Bodies.rectangle(110, HEIGHT - FLIPPER_OFFSET, 80, 20, {
      density: 1,
      friction: 0,
    });
    const flipperRight = Bodies.rectangle(WIDTH - 110, HEIGHT - FLIPPER_OFFSET, 80, 20, {
      density: 1,
      friction: 0,
    });
    Body.setInertia(flipperLeft, Infinity);
    Body.setInertia(flipperRight, Infinity);
    const pivotLeft = Constraint.create({
      bodyA: flipperLeft,
      pointB: { x: 70, y: HEIGHT - FLIPPER_OFFSET },
      length: 0,
      stiffness: 1,
    });
    const pivotRight = Constraint.create({
      bodyA: flipperRight,
      pointB: { x: WIDTH - 70, y: HEIGHT - FLIPPER_OFFSET },
      length: 0,
      stiffness: 1,
    });
    Composite.add(world, [flipperLeft, flipperRight, pivotLeft, pivotRight]);

    const render = Render.create({
      canvas: canvasRef.current,
      engine,
      options: { width: WIDTH, height: HEIGHT, wireframes: false, background: '#000' },
    });
    Render.run(render);

    const runner = Runner.create();
    Runner.run(runner, engine);

    const handleKeyDown = (e) => {
      if (e.code === 'ArrowLeft') Body.setAngularVelocity(flipperLeft, -2);
      if (e.code === 'ArrowRight') Body.setAngularVelocity(flipperRight, 2);
    };
    const handleKeyUp = () => {
      Body.setAngularVelocity(flipperLeft, 2);
      Body.setAngularVelocity(flipperRight, -2);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    Events.on(engine, 'beforeUpdate', () => {
      if (flipperLeft.angle < -0.5) {
        Body.setAngle(flipperLeft, -0.5);
        Body.setAngularVelocity(flipperLeft, 0);
      } else if (flipperLeft.angle > 0) {
        Body.setAngle(flipperLeft, 0);
        Body.setAngularVelocity(flipperLeft, 0);
      }
      if (flipperRight.angle > 0.5) {
        Body.setAngle(flipperRight, 0.5);
        Body.setAngularVelocity(flipperRight, 0);
      } else if (flipperRight.angle < 0) {
        Body.setAngle(flipperRight, 0);
        Body.setAngularVelocity(flipperRight, 0);
      }
    });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      Render.stop(render);
      Runner.stop(runner);
      Engine.clear(engine);
      render.canvas.remove();
    };
  }, []);

  return <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} />;
};

export default Pinball;

