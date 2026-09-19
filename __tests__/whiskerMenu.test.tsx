import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import WhiskerMenu from '../components/menu/WhiskerMenu';

jest.setTimeout(20000);

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
  it.each(['input', 'textarea', 'contenteditable'])(
    'leaves Command editing chords with a focused %s',
    (kind) => {
      render(<WhiskerMenu />);
      const control = document.createElement(kind === 'contenteditable' ? 'div' : kind);
      if (kind === 'contenteditable') {
        control.setAttribute('contenteditable', 'true');
        control.tabIndex = 0;
      }
      document.body.append(control);
      try {
        control.focus();
        for (const key of ['Meta', 'z', 'f', 'ArrowUp']) {
          const event = new KeyboardEvent('keydown', {
            key, metaKey: true, bubbles: true, cancelable: true,
          });
          fireEvent(control, event);
          expect(event.defaultPrevented).toBe(false);
          expect(screen.queryByTestId('whisker-menu-dropdown')).not.toBeInTheDocument();
          expect(control).toHaveFocus();
        }
      } finally {
        control.remove();
      }
    },
  );

  it('does not reopen a launcher shortcut already consumed by the desktop', () => {
    render(<WhiskerMenu />);
    const event = new KeyboardEvent('keydown', {
      key: 'Meta', metaKey: true, bubbles: true, cancelable: true,
    });
    event.preventDefault();
    fireEvent(window, event);
    expect(screen.queryByTestId('whisker-menu-dropdown')).not.toBeInTheDocument();
  });

  it('retains standalone Super activation outside text controls', () => {
    render(<WhiskerMenu />);
    fireEvent.keyDown(window, { key: 'Meta', metaKey: true });
    expect(screen.getByTestId('whisker-menu-dropdown')).toBeInTheDocument();
  });

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

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });

    await waitFor(() => {
      expect(menu.contains(document.activeElement)).toBe(true);
    });

    fireEvent.keyDown(document, { key: 'Tab' });

    await waitFor(() => {
      expect(menu.contains(document.activeElement)).toBe(true);
    });
  });
});

describe('WhiskerMenu dismissal', () => {
  it('retains the menu during a transient focus loss and still closes on Escape', async () => {
    render(<WhiskerMenu />);
    fireEvent.keyDown(window, { key: 'F1', altKey: true });
    await screen.findByTestId('whisker-menu-dropdown');
    const search = screen.getByRole('searchbox', { name: 'Search applications' });
    fireEvent.blur(search, { relatedTarget: null });
    expect(screen.getByTestId('whisker-menu-dropdown')).toHaveClass('opacity-100');
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByTestId('whisker-menu-dropdown')).not.toBeInTheDocument());
  });
  it('still dismisses when the pointer presses outside the launcher', async () => {
    render(<WhiskerMenu />);
    fireEvent.keyDown(window, { key: 'F1', altKey: true });
    await screen.findByTestId('whisker-menu-dropdown');
    fireEvent.mouseDown(document.body);
    await waitFor(() => expect(screen.queryByTestId('whisker-menu-dropdown')).not.toBeInTheDocument());
  });
});
