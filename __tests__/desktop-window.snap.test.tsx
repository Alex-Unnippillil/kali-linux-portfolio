import React, { act } from 'react';
import { render, screen } from '@testing-library/react';
import Window from '../components/desktop/Window';

describe('Desktop Window snapping', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    });
  });

  it('disables transitions when reduced motion is preferred', async () => {
    (window.matchMedia as jest.Mock).mockImplementation(() => ({
      matches: true,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));

    render(
      <Window title="Motion">
        <div>content</div>
      </Window>
    );

    await act(async () => {});

    const winEl = screen.getByText('Motion').parentElement?.parentElement as HTMLElement;
    expect(winEl.style.transition).toBe('none');
  });
});
