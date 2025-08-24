import type { Graphics, Container } from 'pixi.js';

export default class Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  destroyed = false;
  powerUp: 'multiball' | 'laser' | 'expand' | 'sticky' | 'slow' | null;
  hp: number;
  type: 'normal' | 'durable' | 'power';
  sprite?: Graphics;

  constructor(
    x: number,
    y: number,
    w: number,
    h: number,
    powerUp: 'multiball' | 'laser' | 'expand' | 'sticky' | 'slow' | null = null,
    hp = 1,
    container?: Container
  ) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.powerUp = powerUp;
    this.hp = hp;
    this.type = powerUp ? 'power' : hp > 1 ? 'durable' : 'normal';
    if (container) {
      const { Graphics } = require('pixi.js') as typeof import('pixi.js');
      this.sprite = new Graphics();
      this.drawSprite();
      this.sprite.x = this.x;
      this.sprite.y = this.y;
      container.addChild(this.sprite);
    }
  }

  private drawSprite() {
    if (!this.sprite) return;
    this.sprite.clear();
    const color =
      this.type === 'durable'
        ? 0x800080
        : this.type === 'power'
          ? 0xffd700
          : 0x0000ff;
    this.sprite.beginFill(color);
    this.sprite.drawRect(0, 0, this.w, this.h);
    this.sprite.endFill();
  }

  hit() {
    this.hp -= 1;
    if (this.hp <= 0) {
      this.destroyed = true;
      if (this.sprite) this.sprite.visible = false;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.destroyed) return;
    ctx.fillStyle =
      this.type === 'durable'
        ? 'purple'
        : this.type === 'power'
          ? 'gold'
          : 'blue';
    ctx.fillRect(this.x, this.y, this.w, this.h);
  }
}
