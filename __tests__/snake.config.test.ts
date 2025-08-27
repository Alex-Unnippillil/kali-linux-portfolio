import { games } from '../apps.config';

describe('snake app config', () => {
  it('includes snake with default sizing and dynamic screen', () => {
    const snake = games.find((g) => g.id === 'snake');
    expect(snake).toBeDefined();
    expect(snake?.defaultWidth).toBe(50);
    expect(snake?.defaultHeight).toBe(60);
    expect(typeof snake?.screen).toBe('function');
  });
});
