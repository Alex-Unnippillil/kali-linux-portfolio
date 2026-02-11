import {
  BALLS_PER_GAME,
  BALL_FRICTION,
  BALL_RADIUS,
  BALL_RESTITUTION,
  BALL_SAVE_SECONDS,
  FIXED_TIMESTEP,
  GRAVITY,
  PLUNGER_MAX_CHARGE,
  PLUNGER_SPAWN_Y,
  PLUNGER_X,
  TABLE_HEIGHT,
  TABLE_WIDTH,
  TILT_DISABLE_SECONDS,
  TILT_WARNING_LIMIT,
  TILT_WINDOW_SECONDS,
} from '../constants';
import { ScoreSystem } from '../rules/scoring';
import type { Bumper, EngineSnapshot, InputAction, Sling, Target, Vec2 } from '../types';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export class GameEngine {
  readonly ball = { position: { x: PLUNGER_X, y: PLUNGER_SPAWN_Y }, velocity: { x: 0, y: 0 }, radius: BALL_RADIUS };
  readonly bumpers: Bumper[] = [
    { id: 'b1', position: { x: 160, y: 200 }, radius: 25, flash: 0 },
    { id: 'b2', position: { x: 260, y: 220 }, radius: 25, flash: 0 },
    { id: 'b3', position: { x: 210, y: 300 }, radius: 27, flash: 0 },
  ];
  readonly slings: Sling[] = [
    { id: 's1', center: { x: 110, y: 545 }, size: { x: 80, y: 30 }, flash: 0, impulse: { x: 220, y: -260 } },
    { id: 's2', center: { x: 280, y: 545 }, size: { x: 80, y: 30 }, flash: 0, impulse: { x: -220, y: -260 } },
  ];
  readonly targets: Target[] = [
    { id: 't1', position: { x: 120, y: 120 }, size: { x: 18, y: 36 }, active: true, cooldown: 0 },
    { id: 't2', position: { x: 210, y: 105 }, size: { x: 18, y: 36 }, active: true, cooldown: 0 },
    { id: 't3', position: { x: 300, y: 120 }, size: { x: 18, y: 36 }, active: true, cooldown: 0 },
  ];

  leftFlipper = { angle: -0.2, targetAngle: -0.2, pivot: { x: 138, y: 610 }, length: 70 };
  rightFlipper = { angle: Math.PI + 0.2, targetAngle: Math.PI + 0.2, pivot: { x: 282, y: 610 }, length: 70 };

  private scoreSystem = new ScoreSystem();
  private elapsed = 0;
  private ballsRemaining = BALLS_PER_GAME;
  private currentBall = 1;
  private ballSaveRemaining = 0;
  private plungerCharge = 0;
  private plungerHeld = false;
  private ballLocked = true;
  private paused = false;
  private gameOver = false;
  private statusMessage = 'Press and hold Space to pull plunger';
  private tiltWarnings = 0;
  private tiltActive = false;
  private tiltTimer = 0;
  private nudgeTimes: number[] = [];

  private fps = 0;
  private stepMs = 0;
  private contacts = 0;

  resetGame() {
    this.scoreSystem.resetGame();
    this.elapsed = 0;
    this.ballsRemaining = BALLS_PER_GAME;
    this.currentBall = 1;
    this.ballSaveRemaining = 0;
    this.plungerCharge = 0;
    this.plungerHeld = false;
    this.ballLocked = true;
    this.paused = false;
    this.gameOver = false;
    this.statusMessage = 'New game started';
    this.tiltWarnings = 0;
    this.tiltActive = false;
    this.tiltTimer = 0;
    this.nudgeTimes = [];
    this.resetBallToPlunger();
  }

  start() {
    this.paused = false;
  }

  pause() {
    this.paused = true;
  }

  resize() {
    // logical coordinates are fixed; renderer scales.
  }

  handleInput(action: InputAction) {
    if (action === 'pause_toggle') {
      this.paused = !this.paused;
      return;
    }
    if (this.gameOver) return;

    if (action === 'flipper_left_down' && !this.tiltActive) this.leftFlipper.targetAngle = -0.9;
    if (action === 'flipper_left_up') this.leftFlipper.targetAngle = -0.2;
    if (action === 'flipper_right_down' && !this.tiltActive) this.rightFlipper.targetAngle = Math.PI + 0.9;
    if (action === 'flipper_right_up') this.rightFlipper.targetAngle = Math.PI + 0.2;

    if (action === 'plunger_down' && this.ballLocked) this.plungerHeld = true;
    if (action === 'plunger_up' && this.ballLocked) {
      this.launchBall();
      this.plungerHeld = false;
    }

    if (action.startsWith('nudge_')) this.nudge(action);
  }

  step(dt: number) {
    const start = performance.now();
    if (this.paused) return;
    const delta = clamp(dt, 0, FIXED_TIMESTEP * 2);
    this.elapsed += delta;
    this.contacts = 0;

    if (this.plungerHeld && this.ballLocked) {
      this.plungerCharge = clamp(this.plungerCharge + delta * 1.1, 0, PLUNGER_MAX_CHARGE);
    }

    this.updateFlippers(delta);
    this.updateTimers(delta);

    if (!this.ballLocked) {
      this.integrateBall(delta);
      this.resolveCollisions();
      this.checkDrain();
    }

    if (!Number.isFinite(this.ball.position.x) || !Number.isFinite(this.ball.position.y)) {
      this.statusMessage = 'Physics recovery: ball reset';
      this.resetBallToPlunger();
    }

    const duration = performance.now() - start;
    this.stepMs = duration;
    this.fps = delta > 0 ? 1 / delta : 0;
  }

  getSnapshot(): EngineSnapshot {
    const s = this.scoreSystem.getSnapshot();
    return {
      score: s.score,
      multiplier: s.multiplier,
      comboCount: s.comboCount,
      currentBall: this.currentBall,
      ballsRemaining: this.ballsRemaining,
      ballSaveRemaining: this.ballSaveRemaining,
      plungerCharge: this.plungerCharge,
      paused: this.paused,
      gameOver: this.gameOver,
      tiltWarnings: this.tiltWarnings,
      tiltActive: this.tiltActive,
      statusMessage: this.statusMessage,
      debug: {
        fps: this.fps,
        physicsMs: this.stepMs,
        contacts: this.contacts,
        bodies: 2 + this.bumpers.length + this.slings.length + this.targets.length,
      },
    };
  }

  private launchBall() {
    if (!this.ballLocked) return;
    const power = clamp(this.plungerCharge || 0.45, 0.35, PLUNGER_MAX_CHARGE);
    this.ballLocked = false;
    this.ball.position = { x: PLUNGER_X - 14, y: PLUNGER_SPAWN_Y };
    this.ball.velocity = { x: -40 * power, y: -900 * power };
    this.ballSaveRemaining = BALL_SAVE_SECONDS;
    this.plungerCharge = 0;
    this.statusMessage = 'Ball launched';
  }

  private nudge(action: InputAction) {
    const now = this.elapsed;
    this.nudgeTimes = this.nudgeTimes.filter((t) => now - t <= TILT_WINDOW_SECONDS);
    this.nudgeTimes.push(now);
    if (this.nudgeTimes.length > TILT_WARNING_LIMIT + 1) {
      this.tiltActive = true;
      this.tiltTimer = TILT_DISABLE_SECONDS;
      this.statusMessage = 'TILT! controls disabled';
      return;
    }
    this.tiltWarnings = Math.max(0, this.nudgeTimes.length - 1);
    if (this.ballLocked) return;
    const impulse: Record<InputAction, Vec2> = {
      nudge_left: { x: -100, y: -20 },
      nudge_right: { x: 100, y: -20 },
      nudge_up: { x: 0, y: -150 },
      flipper_left_down: { x: 0, y: 0 },
      flipper_left_up: { x: 0, y: 0 },
      flipper_right_down: { x: 0, y: 0 },
      flipper_right_up: { x: 0, y: 0 },
      plunger_down: { x: 0, y: 0 },
      plunger_up: { x: 0, y: 0 },
      pause_toggle: { x: 0, y: 0 },
    };
    const force = impulse[action] ?? { x: 0, y: 0 };
    this.ball.velocity.x += force.x;
    this.ball.velocity.y += force.y;
  }

  private updateTimers(delta: number) {
    this.ballSaveRemaining = Math.max(0, this.ballSaveRemaining - delta);
    this.tiltWarnings = this.nudgeTimes.filter((t) => this.elapsed - t <= TILT_WINDOW_SECONDS).length > 0 ? Math.min(this.nudgeTimes.length, TILT_WARNING_LIMIT) : 0;
    if (this.tiltActive) {
      this.tiltTimer = Math.max(0, this.tiltTimer - delta);
      if (this.tiltTimer <= 0) {
        this.tiltActive = false;
        this.nudgeTimes = [];
        this.tiltWarnings = 0;
      }
    }
    this.bumpers.forEach((b) => (b.flash = Math.max(0, b.flash - delta * 4)));
    this.slings.forEach((s) => (s.flash = Math.max(0, s.flash - delta * 5)));
    this.targets.forEach((t) => {
      if (!t.active) {
        t.cooldown = Math.max(0, t.cooldown - delta);
        if (t.cooldown <= 0) t.active = true;
      }
    });
  }

  private updateFlippers(delta: number) {
    const speedUp = 18;
    const speedDown = 10;
    const move = (current: number, target: number) => {
      const speed = Math.abs(target - current) > 0.25 ? speedUp : speedDown;
      const step = clamp((target - current) * speed * delta, -0.35, 0.35);
      return current + step;
    };
    this.leftFlipper.angle = move(this.leftFlipper.angle, this.leftFlipper.targetAngle);
    this.rightFlipper.angle = move(this.rightFlipper.angle, this.rightFlipper.targetAngle);
  }

  private integrateBall(delta: number) {
    this.ball.velocity.y += GRAVITY * delta;
    this.ball.velocity.x *= BALL_FRICTION;
    this.ball.velocity.y *= BALL_FRICTION;
    this.ball.position.x += this.ball.velocity.x * delta;
    this.ball.position.y += this.ball.velocity.y * delta;
  }

  private resolveCollisions() {
    const r = this.ball.radius;
    if (this.ball.position.x < r + 12) {
      this.ball.position.x = r + 12;
      this.ball.velocity.x = Math.abs(this.ball.velocity.x) * BALL_RESTITUTION;
      this.contacts += 1;
    }
    if (this.ball.position.x > TABLE_WIDTH - 52) {
      this.ball.position.x = TABLE_WIDTH - 52;
      this.ball.velocity.x = -Math.abs(this.ball.velocity.x) * BALL_RESTITUTION;
      this.contacts += 1;
    }
    if (this.ball.position.y < r + 10) {
      this.ball.position.y = r + 10;
      this.ball.velocity.y = Math.abs(this.ball.velocity.y) * BALL_RESTITUTION;
      this.contacts += 1;
    }

    this.bumpers.forEach((bumper) => {
      const dx = this.ball.position.x - bumper.position.x;
      const dy = this.ball.position.y - bumper.position.y;
      const dist = Math.hypot(dx, dy);
      const minDist = bumper.radius + r;
      if (dist > 0 && dist <= minDist) {
        const nx = dx / dist;
        const ny = dy / dist;
        this.ball.position.x = bumper.position.x + nx * (minDist + 0.5);
        this.ball.position.y = bumper.position.y + ny * (minDist + 0.5);
        const speed = Math.max(320, Math.hypot(this.ball.velocity.x, this.ball.velocity.y));
        this.ball.velocity.x = nx * speed;
        this.ball.velocity.y = ny * speed;
        bumper.flash = 1;
        this.scoreSystem.onHit('bumper', this.elapsed);
        this.contacts += 1;
      }
    });

    this.slings.forEach((sling) => {
      const withinX = Math.abs(this.ball.position.x - sling.center.x) <= sling.size.x / 2;
      const withinY = Math.abs(this.ball.position.y - sling.center.y) <= sling.size.y / 2;
      if (withinX && withinY && this.ball.velocity.y > -200) {
        this.ball.velocity.x += sling.impulse.x;
        this.ball.velocity.y += sling.impulse.y;
        sling.flash = 1;
        this.scoreSystem.onHit('slingshot', this.elapsed);
        this.contacts += 1;
      }
    });

    this.targets.forEach((target) => {
      if (!target.active) return;
      const withinX = Math.abs(this.ball.position.x - target.position.x) < target.size.x / 2 + r;
      const withinY = Math.abs(this.ball.position.y - target.position.y) < target.size.y / 2 + r;
      if (withinX && withinY) {
        target.active = false;
        target.cooldown = 3;
        this.ball.velocity.y = Math.abs(this.ball.velocity.y) * 0.9;
        this.scoreSystem.onHit('target', this.elapsed);
        this.contacts += 1;
      }
    });

    this.resolveFlipperBounce(this.leftFlipper.pivot, this.leftFlipper.angle, this.leftFlipper.targetAngle < -0.5);
    this.resolveFlipperBounce(this.rightFlipper.pivot, this.rightFlipper.angle, this.rightFlipper.targetAngle > Math.PI + 0.5);
  }

  private resolveFlipperBounce(pivot: Vec2, angle: number, active: boolean) {
    const tip = { x: pivot.x + Math.cos(angle) * 70, y: pivot.y + Math.sin(angle) * 70 };
    const ap = { x: this.ball.position.x - pivot.x, y: this.ball.position.y - pivot.y };
    const ab = { x: tip.x - pivot.x, y: tip.y - pivot.y };
    const t = clamp((ap.x * ab.x + ap.y * ab.y) / (ab.x * ab.x + ab.y * ab.y), 0, 1);
    const closest = { x: pivot.x + ab.x * t, y: pivot.y + ab.y * t };
    const dx = this.ball.position.x - closest.x;
    const dy = this.ball.position.y - closest.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= this.ball.radius + 6) {
      const nx = dist > 0 ? dx / dist : 0;
      const ny = dist > 0 ? dy / dist : -1;
      this.ball.position.x = closest.x + nx * (this.ball.radius + 6);
      this.ball.position.y = closest.y + ny * (this.ball.radius + 6);
      const strength = active && !this.tiltActive ? 420 : 160;
      this.ball.velocity.x += nx * strength;
      this.ball.velocity.y += ny * strength - (active ? 220 : 0);
      this.contacts += 1;
    }
  }

  private checkDrain() {
    if (this.ball.position.y < TABLE_HEIGHT + this.ball.radius) return;
    if (this.ball.position.x > 170 && this.ball.position.x < 250) {
      if (this.ballSaveRemaining > 0) {
        this.statusMessage = 'Ball save!';
        this.resetBallToPlunger();
        return;
      }
      const bonus = this.scoreSystem.endBallBonus();
      if (bonus > 0) this.statusMessage = `Bonus +${bonus}`;
      this.ballsRemaining = Math.max(0, this.ballsRemaining - 1);
      this.currentBall = Math.min(BALLS_PER_GAME, this.currentBall + 1);
      if (this.ballsRemaining <= 0) {
        this.gameOver = true;
        this.statusMessage = 'Game over';
      }
      this.resetBallToPlunger();
    }
  }

  private resetBallToPlunger() {
    this.ballLocked = true;
    this.ball.position = { x: PLUNGER_X, y: PLUNGER_SPAWN_Y };
    this.ball.velocity = { x: 0, y: 0 };
    this.plungerCharge = 0;
  }
}
