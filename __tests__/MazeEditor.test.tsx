import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MazeEditor from '../games/pacman/components/MazeEditor';

describe('MazeEditor', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('saves and loads designs', () => {
    render(<MazeEditor />);

    fireEvent.click(screen.getByText('Empty'));
    const cell = screen.getByTestId('cell-1-1');
    fireEvent.click(cell);
    expect(cell).toHaveAttribute('data-tile', '0');

    const promptSpy = jest.spyOn(window, 'prompt').mockReturnValue('test');
    fireEvent.click(screen.getByText('Save Maze'));
    promptSpy.mockRestore();

    fireEvent.click(screen.getByText('Wall'));
    fireEvent.click(cell);
    expect(cell).toHaveAttribute('data-tile', '1');

    fireEvent.change(screen.getByLabelText('Load maze'), {
      target: { value: 'test' },
    });
    expect(cell).toHaveAttribute('data-tile', '0');
  });
});

