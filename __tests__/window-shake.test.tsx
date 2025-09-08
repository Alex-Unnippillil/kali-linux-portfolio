import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Window from '../components/desktop/Window';

describe('window shake effect', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (window as any).PointerEvent = window.PointerEvent || window.MouseEvent;
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('dims other windows when shaken', () => {
    render(
      <>
        <Window title="One">
          <div>content</div>
        </Window>
        <Window title="Two">
          <div>content</div>
        </Window>
      </>
    );

    const header = screen.getByText('One').parentElement!;
    fireEvent.pointerDown(header, { clientX: 100, clientY: 0 });
    act(() => {
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: 150 }));
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: 100 }));
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: 150 }));
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: 100 }));
    });

    const other = screen.getByText('Two').parentElement!.parentElement!;
    expect(other.classList.contains('window-dimmed')).toBe(true);

    act(() => {
      jest.advanceTimersByTime(600);
    });

    expect(other.classList.contains('window-dimmed')).toBe(false);
  });
});
