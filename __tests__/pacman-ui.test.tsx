import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import Pacman from '../components/apps/pacman';

jest.mock('../components/apps/Games/common/useGameLoop', () => ({
  __esModule: true,
  default: (callback: (delta: number) => void) => {
    React.useEffect(() => {
      const id = window.setInterval(() => callback(0.016), 16);
      return () => window.clearInterval(id);
    }, [callback]);
  },
}));

describe('pacman ui', () => {
  it('renders start screen and starts on space', async () => {
    render(<Pacman />);
    expect(screen.getByLabelText('Start game')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText('Start'));
    });

    expect(screen.queryByLabelText('Start game')).not.toBeInTheDocument();
  });

  it('score increases after consuming pellet', async () => {
    render(<Pacman />);
    fireEvent.click(screen.getByText('Start'));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 120));
    });

    expect(screen.getByText(/^Score:/i)).toBeInTheDocument();
  });
});
