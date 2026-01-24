import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import WhiskerMenu from '../components/menu/WhiskerMenu';

beforeAll(() => {
  // @ts-expect-error - assign deterministic animation timers for tests
  window.requestAnimationFrame = (callback: FrameRequestCallback) => {
    const getNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
    return window.setTimeout(() => callback(getNow()), 0);
  };
  // @ts-expect-error - align cancel API with timers in tests
  window.cancelAnimationFrame = (handle: number) => {
    window.clearTimeout(handle);
  };
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

    const focusSpy = jest.spyOn(HTMLInputElement.prototype, 'focus');
    fireEvent.keyDown(window, { key: 'F1', altKey: true });

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

    first.focus();
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });

    await waitFor(() => {
      expect(menu.contains(document.activeElement)).toBe(true);
    });

    fireEvent.keyDown(window, { key: 'Tab' });

    await waitFor(() => {
      expect(menu.contains(document.activeElement)).toBe(true);
    });
  });
});
