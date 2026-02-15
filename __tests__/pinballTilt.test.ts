import { keyDownToAction, keyUpToAction } from '../components/apps/pinball/input/keybinds';
import { GameEngine } from '../components/apps/pinball/engine/GameEngine';
import { FIXED_TIMESTEP } from '../components/apps/pinball/constants';

describe('pinball input mapping', () => {
  test('maps keyboard keys to expected actions', () => {
    expect(keyDownToAction('KeyZ')).toBe('flipper_left_down');
    expect(keyDownToAction('Slash')).toBe('flipper_right_down');
    expect(keyDownToAction('Space')).toBe('plunger_down');
    expect(keyUpToAction('Space')).toBe('plunger_up');
  });
});

describe('pinball engine transitions', () => {
  test('ball drain decrements balls remaining', () => {
    const engine = new GameEngine();
    engine.handleInput('plunger_down');
    for (let i = 0; i < 30; i += 1) engine.step(FIXED_TIMESTEP);
    engine.handleInput('plunger_up');
    for (let i = 0; i < 900; i += 1) engine.step(FIXED_TIMESTEP);
    engine.ball.position.x = 210;
    engine.ball.position.y = 900;
    engine.step(FIXED_TIMESTEP);
    const snapshot = engine.getSnapshot();
    expect(snapshot.ballsRemaining).toBeLessThan(3);
  });
});
