import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ShowDesktopButton from '../components/ShowDesktopButton';

describe('ShowDesktopButton', () => {
  it('sets data-minimized on all windows and hides them', () => {
    render(
      <div>
        <div data-window id="window-1" />
        <div data-window id="window-2" />
        <ShowDesktopButton>Show Desktop</ShowDesktopButton>
      </div>
    );

    fireEvent.click(screen.getByRole('button', { name: /show desktop/i }));

    const windows = Array.from(document.querySelectorAll<HTMLElement>('[data-window]'));
    expect(windows).toHaveLength(2);
    windows.forEach((windowEl) => {
      expect(windowEl).toHaveAttribute('data-minimized', 'true');
      expect(windowEl.style.pointerEvents).toBe('none');
      expect(windowEl.style.opacity).toBe('0');
      expect(windowEl.style.transform).toBe('scale(0.9) translateY(20px)');
    });
  });
});
