import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import WhiskerMenu from '../components/menu/WhiskerMenu';

beforeAll(() => {
  if (!window.requestAnimationFrame) {
    // @ts-expect-error - assigning to allow the component to schedule animations in tests
    window.requestAnimationFrame = (callback: FrameRequestCallback) => {
      const getNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
      return window.setTimeout(() => callback(getNow()), 0);
    };
  }
});

describe('WhiskerMenu keyboard shortcuts', () => {
  it('opens the menu when the Alt+F1 fallback shortcut is pressed', () => {
    render(<WhiskerMenu />);

    expect(screen.queryByText('Categories')).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'F1', altKey: true });

    expect(screen.getByText('Categories')).toBeInTheDocument();
  });
});

describe('WhiskerMenu touch pointer behavior', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('does not focus the search input when coarse pointer is preferred', async () => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => {
      const listeners = new Set<(event: MediaQueryListEvent) => void>();
      const mediaQueryList = {
        matches: query === '(pointer: coarse)',
        media: query,
        onchange: null,
        addEventListener: jest.fn((eventName: string, listener: (event: MediaQueryListEvent) => void) => {
          if (eventName === 'change') {
            listeners.add(listener);
          }
        }),
        removeEventListener: jest.fn((eventName: string, listener: (event: MediaQueryListEvent) => void) => {
          if (eventName === 'change') {
            listeners.delete(listener);
          }
        }),
        addListener: jest.fn((listener: (event: MediaQueryListEvent) => void) => listeners.add(listener)),
        removeListener: jest.fn((listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener)),
        dispatchEvent: jest.fn(),
      } satisfies MediaQueryList;
      return mediaQueryList;
    });

    render(<WhiskerMenu />);

    fireEvent.click(screen.getByRole('button', { name: /applications/i }));

    const searchInput = await screen.findByPlaceholderText('Search applications');

    await waitFor(() => {
      expect(searchInput).not.toHaveFocus();
    });
  });
});

describe('WhiskerMenu favorites reordering', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('persists reordered favorites across sessions', async () => {
    const { unmount } = render(<WhiskerMenu />);

    fireEvent.click(screen.getByRole('button', { name: /applications/i }));

    const initialShortcuts = await screen.findAllByTestId(/favorite-shortcut-/);
    const initialOrder = initialShortcuts
      .map((button) => button.getAttribute('data-app-id'))
      .filter((id): id is string => Boolean(id));

    expect(initialOrder.length).toBeGreaterThan(1);

    fireEvent.keyDown(initialShortcuts[0], { key: 'ArrowRight', ctrlKey: true });

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem('pinnedApps') ?? '[]');
      expect(stored[0]).toBe(initialOrder[1]);
    });

    const reorderedShortcuts = await screen.findAllByTestId(/favorite-shortcut-/);
    const reorderedOrder = reorderedShortcuts
      .map((button) => button.getAttribute('data-app-id'))
      .filter((id): id is string => Boolean(id));

    expect(reorderedOrder[0]).toBe(initialOrder[1]);
    expect(reorderedOrder[1]).toBe(initialOrder[0]);

    unmount();

    render(<WhiskerMenu />);
    fireEvent.click(screen.getByRole('button', { name: /applications/i }));

    const persistedShortcuts = await screen.findAllByTestId(/favorite-shortcut-/);
    const persistedOrder = persistedShortcuts
      .map((button) => button.getAttribute('data-app-id'))
      .filter((id): id is string => Boolean(id));

    expect(persistedOrder.slice(0, reorderedOrder.length)).toEqual(reorderedOrder.slice(0, persistedOrder.length));
  });
});
