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

describe('WhiskerMenu focus management', () => {
  const getFocusableElements = (container: HTMLElement) =>
    Array.from(
      container.querySelectorAll<HTMLElement>(
        'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, object, embed, [contenteditable="true"], [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => element.tabIndex >= 0 && !element.hasAttribute('disabled'));

  it('focuses the first focusable element when the menu opens', async () => {
    render(<WhiskerMenu />);

    fireEvent.keyDown(window, { key: 'F1', altKey: true });

    const searchInput = await screen.findByPlaceholderText('Search applications');
    const focusSpy = jest.spyOn(searchInput, 'focus');

    await waitFor(() => {
      expect(focusSpy).toHaveBeenCalled();
    });

    focusSpy.mockRestore();
  });

  it('traps focus within the dropdown when tabbing forward and backward', async () => {
    render(<WhiskerMenu />);

    fireEvent.keyDown(window, { key: 'F1', altKey: true });

    const menu = await screen.findByTestId('whisker-menu-dropdown');
    const focusable = getFocusableElements(menu);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const firstFocusSpy = jest.spyOn(first, 'focus');
    const lastFocusSpy = jest.spyOn(last, 'focus');

    await waitFor(() => {
      expect(firstFocusSpy).toHaveBeenCalled();
    });

    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });

    await waitFor(() => {
      expect(lastFocusSpy).toHaveBeenCalled();
    });

    const initialFirstCallCount = firstFocusSpy.mock.calls.length;
    fireEvent.keyDown(last, { key: 'Tab' });

    await waitFor(() => {
      expect(firstFocusSpy.mock.calls.length).toBeGreaterThan(initialFirstCallCount);
    });

    firstFocusSpy.mockRestore();
    lastFocusSpy.mockRestore();
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
