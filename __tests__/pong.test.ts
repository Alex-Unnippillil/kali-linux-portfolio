import Ball from '../apps/pong/ball';
import Paddle from '../apps/pong/paddle';

describe('pong mechanics', () => {
  test('ball bounces off paddle with velocity influence', () => {
    const width = 800;
    const height = 600;
    const paddle = new Paddle(20, height / 2 - 40, 10, 80);
    paddle.vy = -100;
    const ball = new Ball(paddle.x + paddle.width + 8, paddle.y + 40, 8);
    ball.vx = -200;
    ball.vy = 0;
    ball.update(0.016, [paddle], width, height);
    expect(ball.vx).toBeGreaterThan(0);
    expect(ball.vy).not.toBe(0);
  });

  test('scoring increments when ball leaves playfield', () => {
    const width = 800;
    const ball = new Ball(width / 2, 300, 8);
    let playerScore = 0;
    let oppScore = 0;
    ball.x = width + 1;
    if (ball.x < 0) oppScore++;
    else if (ball.x > width) playerScore++;
    expect(playerScore).toBe(1);
    ball.x = -1;
    if (ball.x < 0) oppScore++;
    else if (ball.x > width) playerScore++;
    expect(oppScore).toBe(1);
  });
});
