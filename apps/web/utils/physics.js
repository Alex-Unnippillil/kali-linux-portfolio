/**
 * Calculate spin-induced velocity change for a ball hitting a paddle.
 * The spin is proportional to how far from the paddle's centre the ball
 * makes contact and to the paddle's vertical velocity.
 *
 * @param {number} ballY - The y position of the ball at impact.
 * @param {number} paddleY - The top y position of the paddle.
 * @param {number} paddleHeight - The height of the paddle.
 * @param {number} paddleVy - The vertical velocity of the paddle.
 * @param {number} [spinFactor=200] - Multiplier for contact based spin.
 * @param {number} [velocityFactor=0.1] - Multiplier for paddle velocity influence.
 * @returns {{ spin: number, relative: number }} Spin amount to add to the ball's
 * vertical velocity and the relative impact position (-1 to 1).
 */
export function computeBallSpin(
  ballY,
  paddleY,
  paddleHeight,
  paddleVy,
  spinFactor = 200,
  velocityFactor = 0.1
) {
  const padCenter = paddleY + paddleHeight / 2;
  const relative = (ballY - padCenter) / (paddleHeight / 2);
  const spin = paddleVy * velocityFactor + relative * spinFactor;
  return { spin, relative };
}
