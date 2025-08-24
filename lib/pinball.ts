import { Engine, Runner, Bodies, Body, Composite, Events, Vector } from 'matter-js';
import { Howl } from 'howler';

export type HitClass = 'flipper' | 'bumper' | 'slingshot';

export interface ScoreEntry {
  name: string;
  score: number;
}

export interface PinballSettings {
  sound: boolean;
  tiltLimit: number;
}

/**
 * Minimal pinball engine using Matter.js and OffscreenCanvas.
 * This is a starting point and does not provide a full featured game.
 */
export class PinballGame {
  private engine: Engine;
  private runner: Runner;
  private ball: Body;
  private canvas: OffscreenCanvas;
  private ctx: OffscreenCanvasRenderingContext2D;
  private scores: ScoreEntry[] = [];
  private settings: PinballSettings = { sound: true, tiltLimit: 3 };
  private tiltCount = 0;
  private tilted = false;
  private sounds: Record<HitClass, Howl>;

  constructor(private width = 600, private height = 800) {
    this.engine = Engine.create();
    this.runner = Runner.create({ delta: 1000 / 60 });
    this.canvas = new OffscreenCanvas(width, height);
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D context not supported');
    this.ctx = ctx;

    // create table
    this.ball = Bodies.circle(width / 2, height - 30, 10, {
      restitution: 0.8,
      frictionAir: 0.01,
    });

    const walls = [
      Bodies.rectangle(width / 2, -5, width, 10, { isStatic: true }),
      Bodies.rectangle(width / 2, height + 5, width, 10, { isStatic: true }),
      Bodies.rectangle(-5, height / 2, 10, height, { isStatic: true }),
      Bodies.rectangle(width + 5, height / 2, 10, height, { isStatic: true }),
    ];

    const leftFlipper = Bodies.rectangle(150, height - 100, 80, 20, {
      isStatic: true,
      restitution: 0.9,
    });
    const rightFlipper = Bodies.rectangle(width - 150, height - 100, 80, 20, {
      isStatic: true,
      restitution: 0.9,
    });

    const bumper = Bodies.circle(width / 2, height / 2, 30, {
      isStatic: true,
      restitution: 1.2,
    });

    const slingshotLeft = Bodies.rectangle(100, 200, 40, 100, {
      isStatic: true,
      restitution: 1.1,
    });
    const slingshotRight = Bodies.rectangle(width - 100, 200, 40, 100, {
      isStatic: true,
      restitution: 1.1,
    });

    Composite.add(this.engine.world, [
      this.ball,
      leftFlipper,
      rightFlipper,
      bumper,
      slingshotLeft,
      slingshotRight,
      ...walls,
    ]);

    this.sounds = {
      flipper: new Howl({ src: ['flipper.wav'], volume: 0.5 }),
      bumper: new Howl({ src: ['bumper.wav'], volume: 0.5 }),
      slingshot: new Howl({ src: ['slingshot.wav'], volume: 0.5 }),
    };

    this.loadState();

    Events.on(this.engine, 'collisionStart', (evt) => {
      for (const pair of evt.pairs) {
        const label = pair.bodyA === this.ball ? pair.bodyB.label : pair.bodyA.label;
        if (label && (label as HitClass) in this.sounds && this.settings.sound) {
          this.sounds[label as HitClass].play();
        }
      }
    });
  }

  /** Begin the simulation and rendering loop */
  start() {
    Runner.run(this.runner, this.engine);
    const step = () => {
      this.draw();
      if (!this.tilted) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }

  /** Draws the scene with a simple glow trail */
  private draw() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = 'rgba(0,255,255,0.7)';
    ctx.fillStyle = '#fff';
    const { x, y } = this.ball.position;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Nudges the table by applying a force to the ball */
  nudge(force: Vector) {
    if (this.tilted) return;
    Body.applyForce(this.ball, this.ball.position, force);
    this.tiltCount++;
    if (this.tiltCount > this.settings.tiltLimit) {
      this.tilted = true;
    }
  }

  /** Resets tilt state */
  resetTilt() {
    this.tiltCount = 0;
    this.tilted = false;
  }

  addScore(entry: ScoreEntry) {
    this.scores.push(entry);
    this.scores.sort((a, b) => b.score - a.score);
    this.scores = this.scores.slice(0, 10);
    this.persist();
  }

  getScores() {
    return this.scores.slice();
  }

  updateSettings(partial: Partial<PinballSettings>) {
    this.settings = { ...this.settings, ...partial };
    this.persist();
  }

  /** Persist scores and settings */
  private persist() {
    try {
      localStorage.setItem('pinballScores', JSON.stringify(this.scores));
      localStorage.setItem('pinballSettings', JSON.stringify(this.settings));
    } catch {
      // ignore
    }
  }

  private loadState() {
    try {
      const scores = localStorage.getItem('pinballScores');
      const settings = localStorage.getItem('pinballSettings');
      if (scores) this.scores = JSON.parse(scores);
      if (settings) this.settings = JSON.parse(settings);
    } catch {
      // ignore
    }
  }
}

export function initGamepadControls(game: PinballGame) {
  function update() {
    const pads = navigator.getGamepads();
    if (!pads) return;
    for (const pad of pads) {
      if (!pad) continue;
      // left trigger nudges left, right trigger nudges right
      if (pad.buttons[6]?.pressed) game.nudge({ x: -0.005, y: 0 });
      if (pad.buttons[7]?.pressed) game.nudge({ x: 0.005, y: 0 });
    }
    requestAnimationFrame(update);
  }
  update();
}

export function initKeyboardControls(game: PinballGame) {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') game.nudge({ x: -0.005, y: 0 });
    if (e.key === 'ArrowRight') game.nudge({ x: 0.005, y: 0 });
  });
}

export function initTouchControls(game: PinballGame) {
  window.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    if (!touch) return;
    const x = touch.clientX;
    if (x < window.innerWidth / 2) game.nudge({ x: -0.005, y: 0 });
    else game.nudge({ x: 0.005, y: 0 });
  });
}
