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

describe('WhiskerMenu accessibility attributes', () => {
  it('updates aria attributes when the menu toggles', async () => {
    render(<WhiskerMenu />);

    const button = screen.getByRole('button', { name: /applications/i });

    expect(button).toHaveAttribute('aria-haspopup', 'menu');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-controls', 'whisker-menu-dropdown');

    fireEvent.click(button);

    const menu = await screen.findByTestId('whisker-menu-dropdown');
    expect(menu).toHaveAttribute('id', 'whisker-menu-dropdown');
    expect(button).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByTestId('whisker-menu-dropdown')).not.toBeInTheDocument();
    });
  });
});
