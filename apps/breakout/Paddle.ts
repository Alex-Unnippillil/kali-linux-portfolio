import type { Graphics, Container } from 'pixi.js';

export default class Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  canvasWidth: number;
  lasers: { x: number; y: number }[] = [];
  laserActive = false;
  vx = 0;
  baseWidth: number;
  sticky = false;
  ax = 1500;
  maxSpeed = 500;
  friction = 2000;
  sprite?: Graphics;

  constructor(
    canvasWidth: number,
    canvasHeight: number,
    container?: Container
  ) {
    this.baseWidth = 80;
    this.width = this.baseWidth;
    this.height = 10;
    this.x = canvasWidth / 2 - this.width / 2;
    this.y = canvasHeight - this.height * 2;
    this.canvasWidth = canvasWidth;
    if (container) {
      const { Graphics } = require('pixi.js') as typeof import('pixi.js');
      this.sprite = new Graphics();
      this.sprite.beginFill(0xffffff);
      this.sprite.drawRect(0, 0, this.width, this.height);
      this.sprite.endFill();
      container.addChild(this.sprite);
    }
  }

  move(dir: number, dt: number) {
    if (dir !== 0) {
      this.vx += dir * this.ax * dt;
    } else if (this.vx) {
      const sign = Math.sign(this.vx);
      this.vx -= sign * this.friction * dt;
      if (Math.sign(this.vx) !== sign) this.vx = 0;
    }
    if (this.vx > this.maxSpeed) this.vx = this.maxSpeed;
    if (this.vx < -this.maxSpeed) this.vx = -this.maxSpeed;
    this.x += this.vx * dt;
    if (this.x < 0) this.x = 0;
    if (this.x + this.width > this.canvasWidth)
      this.x = this.canvasWidth - this.width;
    if (this.sprite) {
      this.sprite.x = this.x;
      this.sprite.y = this.y;
    }
  }

  shoot() {
    if (!this.laserActive) return;
    this.lasers.push({ x: this.x + this.width / 2, y: this.y });
  }

  updateLasers(dt: number) {
    this.lasers = this.lasers
      .map((l) => ({ ...l, y: l.y - 400 * dt }))
      .filter((l) => l.y > 0);
  }

  expand() {
    this.width = Math.min(this.canvasWidth, this.width * 1.5);
    if (this.sprite) {
      this.sprite.clear();
      this.sprite.beginFill(0xffffff);
      this.sprite.drawRect(0, 0, this.width, this.height);
      this.sprite.endFill();
    }
  }

  resetWidth() {
    this.width = this.baseWidth;
    if (this.sprite) {
      this.sprite.clear();
      this.sprite.beginFill(0xffffff);
      this.sprite.drawRect(0, 0, this.width, this.height);
      this.sprite.endFill();
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'white';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.fillStyle = 'red';
    this.lasers.forEach((l) => {
      ctx.fillRect(l.x - 1, l.y - 10, 2, 10);
    });
  }
}
