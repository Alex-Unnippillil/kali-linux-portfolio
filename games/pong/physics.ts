import { computeBallSpin } from '@/utils';

export interface SpinResult {
  spin: number;
  relative: number;
}

/**
 * Compute ball spin for Pong with optional spin effect.
 * Returns zero spin when disabled but still provides relative impact position.
 */
export function getBallSpin(
  ballY: number,
  paddleY: number,
  paddleHeight: number,
  paddleVy: number,
  enabled: boolean,
): SpinResult {
  if (!enabled) {
    const padCenter = paddleY + paddleHeight / 2;
    const relative = (ballY - padCenter) / (paddleHeight / 2);
    return { spin: 0, relative };
  }
  return computeBallSpin(ballY, paddleY, paddleHeight, paddleVy);
}
