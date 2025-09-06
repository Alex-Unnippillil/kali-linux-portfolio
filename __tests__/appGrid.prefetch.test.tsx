import React from 'react';
import { render } from '@testing-library/react';

var apps: any[];
var prefetch: jest.Mock;

jest.mock('../apps.config', () => {
  prefetch = jest.fn();
  apps = [{ id: 'test', title: 'Test', icon: '/test.png', screen: { prefetch } }];
  return {
    __esModule: true,
    default: apps,
    games: [],
    utilities: [],
  };
});

jest.mock('../components/base/ubuntu_app', () => ({
  __esModule: true,
  default: ({ id, name }) => <div data-testid={id}>{name}</div>,
}));

jest.mock('react-virtualized-auto-sizer', () => ({
  __esModule: true,
  default: ({ children }) => children({ width: 100, height: 100 }),
}));

jest.mock('react-window', () => ({
  Grid: ({ columnCount, rowCount, children }) => {
    const cells = [];
    const data = { items: apps, columnCount };
    for (let row = 0; row < rowCount; row++) {
      for (let col = 0; col < columnCount; col++) {
        cells.push(children({ columnIndex: col, rowIndex: row, style: {}, data }));
      }
    }
    return <div>{cells}</div>;
  },
}));

import AppGrid from '../components/apps/app-grid';

beforeEach(() => {
  prefetch.mockClear();
  // Mock fetch HEAD requests for prefetch size checks
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      headers: { get: () => '1000' },
    }) as any,
  );
  global.IntersectionObserver = class {
    constructor(cb) {
      this.cb = cb;
    }
    observe() {
      this.cb([{ isIntersecting: true }]);
    }
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  } as any;
});

test('prefetches when grid item becomes visible', async () => {
  jest.useFakeTimers();
  render(<AppGrid openApp={() => {}} />);
  expect(prefetch).not.toHaveBeenCalled();
  await jest.runAllTimersAsync();
  expect(prefetch).toHaveBeenCalledTimes(1);
  jest.useRealTimers();
});
