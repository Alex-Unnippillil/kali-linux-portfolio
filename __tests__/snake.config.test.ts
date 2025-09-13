jest.mock('next/dynamic', () => jest.fn(() => () => null));
jest.mock('../components/apps/x', () => ({ displayX: () => null }));
import { games } from '../apps.config';

describe('snake app config', () => {
  it('includes snake with default sizing and dynamic screen', () => {
    const snake = games.find((g) => g.id === 'snake');
    expect(snake).toBeDefined();
    expect(snake?.preferred).toEqual([50, 60]);
    expect(typeof snake?.screen).toBe('function');
  });
});
