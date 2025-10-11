import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt = '', priority: _priority, ...props }: any) => <img alt={alt} {...props} />,
}));

import BeefPage from '../apps/beef/index';

const getFrame = () => screen.getByTestId('beef-window-frame');

describe('BeEF standalone window controls', () => {
  it('renders in normal state by default', () => {
    render(<BeefPage />);
    expect(screen.getByRole('heading', { name: /beef demo/i })).toBeInTheDocument();
    expect(getFrame()).toHaveAttribute('data-window-state', 'normal');
  });

  it('minimizes and restores the window', () => {
    render(<BeefPage />);
    const minimizeButton = screen.getByRole('button', { name: /minimize window/i });
    fireEvent.click(minimizeButton);

    expect(getFrame()).toHaveAttribute('data-window-state', 'minimized');
    expect(screen.getByText(/beef demo is minimized/i)).toBeInTheDocument();

    const restoreButtons = screen.getAllByRole('button', { name: /restore window/i });
    fireEvent.click(restoreButtons[restoreButtons.length - 1]);
    expect(getFrame()).toHaveAttribute('data-window-state', 'normal');
  });

  it('toggles maximize state', () => {
    render(<BeefPage />);
    const maximizeButton = screen.getByRole('button', { name: /maximize window/i });
    fireEvent.click(maximizeButton);

    expect(getFrame()).toHaveAttribute('data-window-state', 'maximized');
    expect(screen.getByRole('button', { name: /restore window size/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /restore window size/i }));
    expect(getFrame()).toHaveAttribute('data-window-state', 'normal');
  });

  it('closes and reopens the window', () => {
    render(<BeefPage />);
    fireEvent.click(screen.getByRole('button', { name: /close window/i }));

    expect(screen.getByText(/window closed/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /reopen window/i }));

    expect(getFrame()).toHaveAttribute('data-window-state', 'normal');
  });
});
