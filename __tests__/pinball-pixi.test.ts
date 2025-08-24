import { PinballPixiGame } from '../lib/pinball-pixi';
import { Body } from 'matter-js';
import { describe, test, expect } from '@jest/globals';

describe('PinballPixiGame physics', () => {
  test('ball restitution and friction tuned', () => {
    const game = new PinballPixiGame(400, 600, false);
    const ball = game.getBall();
    expect(ball.restitution).toBeCloseTo(0.9);
    expect(ball.friction).toBeLessThan(0.01);
  });

  test('bumper collision increases score', () => {
    const game = new PinballPixiGame(400, 600, false);
    const bumper = game.getBumpers()[0];
    const ball = game.getBall();
    Body.setPosition(ball, { x: bumper.position.x, y: bumper.position.y - 40 });
    Body.setVelocity(ball, { x: 0, y: 10 });
    for (let i = 0; i < 60; i++) game.step(16);
    expect(game.getScore()).toBe(100);
  });

  test('nudge beyond limit causes tilt', () => {
    const game = new PinballPixiGame(400, 600, false);
    game.nudge({ x: 0.01, y: 0 });
    game.nudge({ x: 0.01, y: 0 });
    game.nudge({ x: 0.01, y: 0 });
    game.nudge({ x: 0.01, y: 0 });
    expect(game.isTilted()).toBe(true);
  });
});
