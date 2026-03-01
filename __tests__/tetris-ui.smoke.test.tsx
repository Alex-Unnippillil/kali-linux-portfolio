import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Tetris from '../components/apps/tetris';

describe('Tetris UI smoke test', () => {
  it('opens the pause overlay with keyboard input', async () => {
    const user = userEvent.setup();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<Tetris windowMeta={{ isFocused: true }} />);

    const board = screen.getByRole('application');
    await user.click(board);
    await user.keyboard('p');

    expect(screen.getByRole('heading', { name: /paused/i })).toBeInTheDocument();
    expect(errorSpy).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
