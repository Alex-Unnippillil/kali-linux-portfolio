import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Chrome from '../components/apps/chrome';

jest.mock('html-to-image', () => ({
  toPng: jest.fn(() => Promise.resolve('data:image/png;base64,')),
}));

jest.mock('@mozilla/readability', () => ({
  Readability: jest.fn().mockImplementation(() => ({
    parse: () => ({ content: '<p>Mock content</p>' }),
  })),
}));

jest.mock('../components/apps/chrome/bookmarks', () => ({
  getCachedFavicon: jest.fn(() => Promise.resolve(null)),
  cacheFavicon: jest.fn(),
  getBookmarks: jest.fn(() => Promise.resolve([])),
  saveBookmarks: jest.fn(() => Promise.resolve()),
}));

const mockFetch = jest.fn(async () => ({
  headers: new Map(),
  blob: async () => new Blob(),
  text: async () => '<html><body></body></html>',
}));

describe('Chrome tab management', () => {
  const originalFetch = global.fetch;
  const OriginalFileReader = global.FileReader;
  const originalWindowOpen = window.open;
  const originalLocalStorage = window.localStorage;
  const originalSessionStorage = window.sessionStorage;

  beforeAll(() => {
    // @ts-expect-error - override for tests
    global.fetch = mockFetch;
    // Minimal FileReader stub for favicon caching
    class MockFileReader {
      public result: string | ArrayBuffer | null = null;
      public onload: null | (() => void) = null;
      readAsDataURL() {
        this.result = 'data:image/png;base64,';
        if (this.onload) {
          this.onload();
        }
      }
    }
    // @ts-expect-error - override for tests
    global.FileReader = MockFileReader;
    window.open = jest.fn();
    const createStorage = () => {
      let store: Record<string, string> = {};
      return {
        getItem: (key: string) => (key in store ? store[key] : null),
        setItem: (key: string, value: string) => {
          store[key] = String(value);
        },
        removeItem: (key: string) => {
          delete store[key];
        },
        clear: () => {
          store = {};
        },
      } as Storage;
    };
    Object.defineProperty(window, 'localStorage', {
      value: createStorage(),
      configurable: true,
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: createStorage(),
      configurable: true,
    });
  });

  beforeEach(() => {
    mockFetch.mockClear();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterAll(() => {
    global.fetch = originalFetch;
    if (OriginalFileReader) {
      // @ts-expect-error - restore original implementation
      global.FileReader = OriginalFileReader;
    } else {
      // @ts-expect-error - cleanup mock when no original existed
      delete global.FileReader;
    }
    window.open = originalWindowOpen;
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      configurable: true,
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: originalSessionStorage,
      configurable: true,
    });
  });

  it('persists pinned tabs even if primary storage is cleared', async () => {
    const { unmount } = render(<Chrome />);

    const [homeTab] = await screen.findAllByRole('tab');
    fireEvent.contextMenu(homeTab);

    const pinOption = await screen.findByRole('menuitem', { name: /pin tab/i });
    fireEvent.click(pinOption);

    await screen.findByRole('button', { name: /unpin tab/i });

    await waitFor(() => {
      const stored = window.localStorage.getItem('chrome-tabs-pinned');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored || '[]');
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
    });

    window.localStorage.removeItem('chrome-tabs');

    unmount();

    render(<Chrome />);

    await screen.findByRole('button', { name: /unpin tab/i });
  });

  it('supports closing others and reopening the most recent closed tab from the context menu', async () => {
    const tabs = [
      {
        id: 1,
        url: 'https://example.com/one',
        history: ['https://example.com/one'],
        historyIndex: 0,
        scroll: 0,
        blocked: false,
        muted: false,
        pinned: false,
        crashed: false,
      },
      {
        id: 2,
        url: 'https://example.com/two',
        history: ['https://example.com/two'],
        historyIndex: 0,
        scroll: 0,
        blocked: false,
        muted: false,
        pinned: false,
        crashed: false,
      },
      {
        id: 3,
        url: 'https://example.com/three',
        history: ['https://example.com/three'],
        historyIndex: 0,
        scroll: 0,
        blocked: false,
        muted: false,
        pinned: false,
        crashed: false,
      },
    ];

    window.localStorage.setItem('chrome-tabs', JSON.stringify({ tabs, active: 2 }));
    window.localStorage.setItem('chrome-tabs-pinned', JSON.stringify([]));

    render(<Chrome />);

    const targetTab = await screen.findByRole('tab', { name: /example.com\/two/i });
    fireEvent.contextMenu(targetTab);

    const closeOthers = await screen.findByRole('menuitem', { name: /close other tabs/i });
    expect(closeOthers).not.toBeDisabled();
    fireEvent.click(closeOthers);

    await waitFor(() => {
      expect(screen.getAllByRole('tab')).toHaveLength(1);
    });

    const remainingTab = screen.getByRole('tab', { name: /example.com\/two/i });
    fireEvent.contextMenu(remainingTab);

    const reopen = await screen.findByRole('menuitem', { name: /reopen closed tab/i });
    expect(reopen).not.toBeDisabled();
    fireEvent.click(reopen);

    await waitFor(() => {
      expect(screen.getAllByRole('tab')).toHaveLength(2);
    });

    const reopened = await screen.findByRole('tab', { name: /example.com\/three/i });
    expect(reopened).toHaveAttribute('aria-selected', 'true');
  });
});
