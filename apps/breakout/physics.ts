import { Bodies, SAT } from 'matter-js';
import Ball from './Ball';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Resolve collision between a ball and an axis-aligned rectangle using
 * Matter.js bodies. Returns true if a collision occurred.
 */
export function collideBallRect(ball: Ball, rect: Rect, paddleVx = 0): boolean {
  const circle = Bodies.circle(ball.x, ball.y, ball.r, { isStatic: true });
  const box = Bodies.rectangle(
    rect.x + rect.w / 2,
    rect.y + rect.h / 2,
    rect.w,
    rect.h,
    {
      isStatic: true,
    }
  );
  const result = SAT.collides(circle, box);
  if (!result.collided) return false;
  if (paddleVx) {
    const center = rect.x + rect.w / 2;
    const rel = (ball.x - center) / (rect.w / 2);
    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    const angle = rel * (Math.PI / 3);
    ball.vx = speed * Math.sin(angle) + paddleVx * 0.1;
    ball.vy = -Math.abs(speed * Math.cos(angle));
  } else {
    const n = result.normal;
    const v = { x: ball.vx, y: ball.vy };
    const dot = v.x * n.x + v.y * n.y;
    ball.vx = v.x - 2 * dot * n.x;
    ball.vy = v.y - 2 * dot * n.y;
  }
  ball.spin = paddleVx * 2;
  ball.x += result.depth * result.normal.x;
  ball.y += result.depth * result.normal.y;
  return true;
}
