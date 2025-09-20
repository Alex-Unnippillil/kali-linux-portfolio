import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import TaskbarMenu from '../components/context-menus/taskbar-menu';

describe('TaskbarMenu', () => {
  it('invokes tile callbacks for each quadrant option', () => {
    const handleTile = jest.fn();
    const handleCloseMenu = jest.fn();
    render(
      <TaskbarMenu
        active
        minimized={false}
        onTile={handleTile}
        onCloseMenu={handleCloseMenu}
      />
    );

    fireEvent.click(screen.getByRole('menuitem', { name: /tile window to the left quadrant/i }));
    expect(handleTile).toHaveBeenCalledWith('left');
    expect(handleCloseMenu).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('menuitem', { name: /tile window to the top quadrant/i }));
    expect(handleTile).toHaveBeenCalledWith('top');
  });

  it('invokes cascade callback', () => {
    const handleCascade = jest.fn();
    render(
      <TaskbarMenu
        active
        minimized={false}
        onCascade={handleCascade}
      />
    );

    fireEvent.click(screen.getByRole('menuitem', { name: /cascade all/i }));
    expect(handleCascade).toHaveBeenCalled();
  });
});
