jest.mock('next/dynamic', () => jest.fn(() => () => null));
jest.mock('../components/apps/x', () => ({ displayX: () => null }));

import { games } from '../apps.config';

describe('frogger config', () => {
  test('frogger game is registered with defaults', () => {
    const frogger = games.find((g) => g.id === 'frogger');
    expect(frogger).toBeDefined();
    expect(frogger?.defaultWidth).toBe(58);
    expect(frogger?.defaultHeight).toBe(72);
    expect(typeof frogger?.screen).toBe('function');
  });
});
