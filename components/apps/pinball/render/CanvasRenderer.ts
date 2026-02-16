import { TABLE_HEIGHT, TABLE_WIDTH } from '../constants';
import type { GameEngine } from '../engine/GameEngine';

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.resize(canvas.clientWidth || TABLE_WIDTH, canvas.clientHeight || TABLE_HEIGHT);
  }

  resize(width: number, height: number) {
    this.canvas.width = Math.max(240, Math.floor(width));
    this.canvas.height = Math.max(300, Math.floor(height));
  }

  render(engine: GameEngine, reducedMotion: boolean) {
    const { ctx } = this;
    const sx = this.canvas.width / TABLE_WIDTH;
    const sy = this.canvas.height / TABLE_HEIGHT;

    ctx.save();
    ctx.scale(sx, sy);
    ctx.clearRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

    ctx.fillStyle = '#0a1728';
    ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

    ctx.fillStyle = '#131f2f';
    ctx.fillRect(TABLE_WIDTH - 48, 0, 48, TABLE_HEIGHT);

    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, TABLE_WIDTH - 20, TABLE_HEIGHT - 20);

    engine.bumpers.forEach((bumper) => {
      ctx.beginPath();
      const flash = reducedMotion ? 0 : bumper.flash;
      ctx.fillStyle = flash > 0 ? '#fde047' : '#f59e0b';
      ctx.arc(bumper.position.x, bumper.position.y, bumper.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    engine.slings.forEach((sling) => {
      const flash = reducedMotion ? 0 : sling.flash;
      ctx.fillStyle = flash > 0 ? '#86efac' : '#22c55e';
      ctx.fillRect(sling.center.x - sling.size.x / 2, sling.center.y - sling.size.y / 2, sling.size.x, sling.size.y);
    });

    engine.targets.forEach((target) => {
      ctx.fillStyle = target.active ? '#f43f5e' : '#334155';
      ctx.fillRect(target.position.x - target.size.x / 2, target.position.y - target.size.y / 2, target.size.x, target.size.y);
    });

    this.drawFlipper(engine.leftFlipper.pivot, engine.leftFlipper.angle, '#fcd34d');
    this.drawFlipper(engine.rightFlipper.pivot, engine.rightFlipper.angle, '#fcd34d');

    ctx.beginPath();
    ctx.fillStyle = '#e5e7eb';
    ctx.arc(engine.ball.position.x, engine.ball.position.y, engine.ball.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawFlipper(pivot: { x: number; y: number }, angle: number, color: string) {
    const tip = { x: pivot.x + Math.cos(angle) * 70, y: pivot.y + Math.sin(angle) * 70 };
    const ctx = this.ctx;
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(pivot.x, pivot.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
  }
}
