jest.mock('../apps.config', () => ({
  __esModule: true,
  default: [],
  games: [],
}));

jest.mock('../components/apps/all-apps', () => ({
  __esModule: true,
  default: () => null,
  displayAllApps: () => null,
}));

import { metadata } from '@apps/all-apps';

describe('all-apps metadata', () => {
  it('sets title', () => {
    expect(metadata.title).toBe('All Apps');
  });
});
