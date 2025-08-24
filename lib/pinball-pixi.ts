import { Engine, Runner, Bodies, Body, World, Events, Vector } from 'matter-js';
import type { Application, Graphics } from 'pixi.js';

/**
 * Pinball game using Matter.js for physics and PixiJS for rendering.
 * Rendering can be disabled by passing render=false which is useful for tests.
 */
export class PinballPixiGame {
  private engine: Engine;
  private runner: Runner;
  private app?: Application;
  private ball: Body;
  private flippers: Body[] = [];
  private bumpers: Body[] = [];
  private graphics?: {
    ball: Graphics;
    flippers: Graphics[];
    bumpers: Graphics[];
  };
  private score = 0;
  private tiltCount = 0;
  private tiltLimit = 3;
  private tilted = false;

  constructor(private width = 400, private height = 600, render = true) {
    this.engine = Engine.create();
    this.runner = Runner.create();

    // table boundaries
    const walls = [
      Bodies.rectangle(width / 2, -5, width, 10, { isStatic: true }),
      Bodies.rectangle(width / 2, height + 5, width, 10, { isStatic: true }),
      Bodies.rectangle(-5, height / 2, 10, height, { isStatic: true }),
      Bodies.rectangle(width + 5, height / 2, 10, height, { isStatic: true }),
    ];

    // rolling ball with tuned restitution & friction
    this.ball = Bodies.circle(width / 2, height - 50, 10, {
      restitution: 0.9,
      friction: 0.005,
      label: 'ball',
    });

    // flippers
    const leftFlipper = Bodies.rectangle(120, height - 80, 80, 20, {
      isStatic: true,
      restitution: 0.2,
      friction: 0.001,
      label: 'flipper',
    });
    const rightFlipper = Bodies.rectangle(width - 120, height - 80, 80, 20, {
      isStatic: true,
      restitution: 0.2,
      friction: 0.001,
      label: 'flipper',
    });
    this.flippers.push(leftFlipper, rightFlipper);

    // bumper
    const bumper = Bodies.circle(width / 2, height / 2, 30, {
      isStatic: true,
      restitution: 1.2,
      label: 'bumper',
    });
    this.bumpers.push(bumper);

    World.add(this.engine.world, [
      this.ball,
      leftFlipper,
      rightFlipper,
      bumper,
      ...walls,
    ]);

    Events.on(this.engine, 'collisionStart', (evt) => {
      for (const pair of evt.pairs) {
        if (
          this.bumpers.includes(pair.bodyA) ||
          this.bumpers.includes(pair.bodyB)
        ) {
          this.score += 100;
        }
      }
    });

    if (render && typeof window !== 'undefined') {
      // dynamically require pixi only when rendering
      const pixi = require('pixi.js') as typeof import('pixi.js');
      this.app = new pixi.Application({
        width,
        height,
        background: '#000',
      });
      const ballG = new pixi.Graphics()
        .beginFill(0xffffff)
        .drawCircle(0, 0, 10)
        .endFill();
      const flipperG1 = new pixi.Graphics()
        .beginFill(0x00ff00)
        .drawRect(-40, -10, 80, 20)
        .endFill();
      const flipperG2 = new pixi.Graphics()
        .beginFill(0x00ff00)
        .drawRect(-40, -10, 80, 20)
        .endFill();
      const bumperG = new pixi.Graphics()
        .beginFill(0xff0000)
        .drawCircle(0, 0, 30)
        .endFill();
      this.app.stage.addChild(ballG, flipperG1, flipperG2, bumperG);
      this.graphics = {
        ball: ballG,
        flippers: [flipperG1, flipperG2],
        bumpers: [bumperG],
      };
      this.updateGraphics();
    }
  }

  /** Start physics runner and rendering */
  start() {
    Runner.run(this.runner, this.engine);
    this.app?.ticker.add(() => this.updateGraphics());
  }

  /** Step the physics engine manually */
  step(delta = 1000 / 60) {
    Engine.update(this.engine, delta);
    this.updateGraphics();
  }

  /** Update Pixi graphics to match physics bodies */
  private updateGraphics() {
    if (!this.graphics) return;
    const { ball, flippers, bumpers } = this.graphics;
    ball.position.set(this.ball.position.x, this.ball.position.y);
    ball.rotation = this.ball.angle;
    flippers[0].position.set(
      this.flippers[0].position.x,
      this.flippers[0].position.y
    );
    flippers[0].rotation = this.flippers[0].angle;
    flippers[1].position.set(
      this.flippers[1].position.x,
      this.flippers[1].position.y
    );
    flippers[1].rotation = this.flippers[1].angle;
    bumpers[0].position.set(
      this.bumpers[0].position.x,
      this.bumpers[0].position.y
    );
  }

  /** Apply a small force to the ball, tracking tilt state */
  nudge(force: Vector) {
    if (this.tilted) return;
    Body.applyForce(this.ball, this.ball.position, force);
    this.tiltCount += 1;
    if (this.tiltCount > this.tiltLimit) {
      this.tilted = true;
    }
  }

  resetTilt() {
    this.tiltCount = 0;
    this.tilted = false;
  }

  getScore() {
    return this.score;
  }

  isTilted() {
    return this.tilted;
  }

  // Accessors used in tests
  getBall() {
    return this.ball;
  }

  getBumpers() {
    return this.bumpers;
  }
}

