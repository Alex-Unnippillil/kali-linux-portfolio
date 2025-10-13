import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import WhiskerMenu from '../../../components/menu/WhiskerMenu';

describe('WhiskerMenu mobile layout', () => {
  const originalInnerWidth = window.innerWidth;

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalInnerWidth,
    });
    document.documentElement.style.removeProperty('--safe-area-left');
    document.documentElement.style.removeProperty('--safe-area-right');
  });

  it('keeps the menu within the viewport on narrow screens', async () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 360,
    });
    document.documentElement.style.setProperty('--safe-area-left', '16px');
    document.documentElement.style.setProperty('--safe-area-right', '12px');

    render(<WhiskerMenu />);

    fireEvent.click(screen.getByRole('button', { name: /applications/i }));

    const menu = await screen.findByTestId('whisker-menu-dropdown');

    await waitFor(() => {
      expect(menu.style.width).toBeTruthy();
      expect(menu.style.left).toBeTruthy();
    });

    const width = parseFloat(menu.style.width);
    const left = parseFloat(menu.style.left);
    const safeAreaLeft = 16;
    const safeAreaRight = 12;

    expect(width).toBeLessThanOrEqual(Math.min(360 - 24, 680));
    expect(left).toBeGreaterThanOrEqual(safeAreaLeft);
    expect(left + width).toBeLessThanOrEqual(360 - safeAreaRight);
  });
});
