import React from 'react';
import { render, act } from '@testing-library/react';
import Chrome, {
  SAVE_DEBOUNCE_MS,
  SAVE_INTERVAL_MS,
} from '../components/apps/chrome';

jest.mock('../components/apps/chrome/bookmarks', () => ({
  getCachedFavicon: jest.fn(),
  cacheFavicon: jest.fn(),
  getBookmarks: jest.fn(() => Promise.resolve([])),
  addBookmark: jest.fn(() => Promise.resolve()),
  removeBookmark: jest.fn(() => Promise.resolve()),
  saveBookmarks: jest.fn(() => Promise.resolve()),
  exportBookmarks: jest.fn(() => Promise.resolve(new Blob())),
  importBookmarks: jest.fn(() => Promise.resolve()),
}));

describe('Chrome persistence', () => {
  const originalFetch = global.fetch;
  const originalStorage = (navigator as any).storage;

  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    sessionStorage.clear();

    (global as any).fetch = jest.fn(() =>
      Promise.resolve({
        blob: () => Promise.resolve({} as Blob),
        text: () => Promise.resolve('<html><body></body></html>'),
        headers: { get: () => null },
      }),
    );

    Object.defineProperty(navigator, 'storage', {
      value: undefined,
      configurable: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      delete (global as any).fetch;
    }

    if (originalStorage !== undefined) {
      Object.defineProperty(navigator, 'storage', {
        value: originalStorage,
        configurable: true,
      });
    } else {
      delete (navigator as any).storage;
    }

    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('debounces and periodically saves tab state', async () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');

    render(<Chrome />);

    const chromeCalls = () =>
      setItemSpy.mock.calls.filter(([key]) => key === 'chrome-tabs');

    expect(chromeCalls()).toHaveLength(0);

    await act(async () => {
      jest.advanceTimersByTime(SAVE_DEBOUNCE_MS);
    });

    expect(chromeCalls()).toHaveLength(1);

    await act(async () => {
      jest.advanceTimersByTime(SAVE_INTERVAL_MS);
    });

    expect(chromeCalls().length).toBeGreaterThan(1);
  });
});
