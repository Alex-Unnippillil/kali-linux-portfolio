export default class Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  destroyed = false;
  powerUp: 'multiball' | 'laser' | 'expand' | 'sticky' | 'slow' | null;
  hp: number;
  type: 'normal' | 'durable' | 'power';

  constructor(
    x: number,
    y: number,
    w: number,
    h: number,
    powerUp: 'multiball' | 'laser' | 'expand' | 'sticky' | 'slow' | null = null,
    hp = 1,
  ) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.powerUp = powerUp;
    this.hp = hp;
    this.type = powerUp ? 'power' : hp > 1 ? 'durable' : 'normal';
  }

  hit() {
    this.hp -= 1;
    if (this.hp <= 0) this.destroyed = true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.destroyed) return;
    ctx.fillStyle =
      this.type === 'durable' ? 'purple' : this.type === 'power' ? 'gold' : 'blue';
    ctx.fillRect(this.x, this.y, this.w, this.h);
  }
}
