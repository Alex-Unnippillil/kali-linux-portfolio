import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import MazeEditor from '../games/pacman/components/MazeEditor';

describe('MazeEditor', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('save and load still works', () => {
    render(<MazeEditor />);

    fireEvent.click(screen.getByText('Empty'));
    const cell = screen.getByTestId('cell-1-1');
    fireEvent.click(cell);
    expect(cell).toHaveAttribute('data-tile', '0');

    const promptSpy = jest.spyOn(window, 'prompt').mockReturnValue('test-level');
    fireEvent.click(screen.getByText('Save Level'));
    promptSpy.mockRestore();

    fireEvent.click(screen.getByText('Wall'));
    fireEvent.click(cell);
    expect(cell).toHaveAttribute('data-tile', '1');

    fireEvent.change(screen.getByLabelText('Load maze'), { target: { value: 'test-level' } });
    expect(cell).toHaveAttribute('data-tile', '0');
  });

  it('import and export still works', () => {
    render(<MazeEditor />);
    fireEvent.click(screen.getByText('Export JSON'));
    const textarea = screen.getByLabelText('Maze JSON') as HTMLTextAreaElement;
    expect(textarea.value).toContain('"maze"');

    const levelJson = JSON.stringify({
      name: 'Imported',
      maze: [
        [1,1,1],
        [1,2,1],
        [1,1,1],
      ],
      pacStart: { x: 1, y: 1 },
      ghostStart: { x: 1, y: 1 },
      fruit: { x: 1, y: 1 },
    });
    fireEvent.change(textarea, { target: { value: levelJson } });
    fireEvent.click(screen.getByText('Import JSON'));
    expect(screen.getByTestId('cell-1-1')).toHaveAttribute('data-tile', '2');
  });

  it('painting still changes tiles', () => {
    render(<MazeEditor />);
    const cell = screen.getByTestId('cell-2-2');
    fireEvent.click(screen.getByText('Energizer'));
    fireEvent.click(cell);
    expect(cell).toHaveAttribute('data-tile', '3');
  });
});
