import { createGame, step } from '../apps/snake/engine';

describe('snake engine', () => {
  test('detects wall and self collisions', () => {
    const state = createGame(5, 1, false);
    state.snake[0] = { x: 0, y: 0 };
    expect(step(state, { x: -1, y: 0 })).toBe('dead');

    state.snake = [
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 2, y: 1 },
    ];
    expect(step(state, { x: 0, y: 1 })).toBe('dead');
  });

  test('grows when eating food', () => {
    const state = createGame(5, 2, false);
    const head = state.snake[0];
    state.food = { x: head.x + 1, y: head.y };
    const len = state.snake.length;
    expect(step(state, { x: 1, y: 0 })).toBe('ate');
    expect(state.snake.length).toBe(len + 1);
  });
});
