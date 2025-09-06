jest.mock('next/dynamic', () => jest.fn(() => () => null));

import appsConfig, {
  chromeDefaultTiles,
  utilities,
  gameDefaults,
  games,
} from '../apps.config';

describe('apps.config snapshot', () => {
  test('matches snapshot', () => {
    expect({
      chromeDefaultTiles,
      utilities,
      gameDefaults,
      games,
      default: appsConfig,
    }).toMatchSnapshot();
  });
});
