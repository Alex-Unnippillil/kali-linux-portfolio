import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DockMenu from '../../../components/context-menus/dock-menu';

describe('DockMenu', () => {
  it('renders dock actions when active', () => {
    render(
      <DockMenu
        active
        canQuit
        canToggleMinimize
        canNewWindow
        canUnpin
      />,
    );

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /quit/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /hide/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /new window/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /unpin/i })).toBeInTheDocument();
  });

  it('dispatches callbacks for enabled actions and closes menu', () => {
    const onQuit = jest.fn();
    const onToggleMinimize = jest.fn();
    const onNewWindow = jest.fn();
    const onUnpin = jest.fn();
    const onCloseMenu = jest.fn();

    render(
      <DockMenu
        active
        canQuit
        canToggleMinimize
        canNewWindow
        canUnpin
        onQuit={onQuit}
        onToggleMinimize={onToggleMinimize}
        onNewWindow={onNewWindow}
        onUnpin={onUnpin}
        onCloseMenu={onCloseMenu}
      />,
    );

    fireEvent.click(screen.getByRole('menuitem', { name: /quit/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /hide/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /new window/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /unpin/i }));

    expect(onQuit).toHaveBeenCalledTimes(1);
    expect(onToggleMinimize).toHaveBeenCalledTimes(1);
    expect(onNewWindow).toHaveBeenCalledTimes(1);
    expect(onUnpin).toHaveBeenCalledTimes(1);
    expect(onCloseMenu).toHaveBeenCalledTimes(4);
  });

  it('disables unavailable actions', () => {
    const onQuit = jest.fn();
    const onToggleMinimize = jest.fn();
    const onNewWindow = jest.fn();

    render(
      <DockMenu
        active
        canQuit={false}
        canToggleMinimize={false}
        canNewWindow={false}
        canUnpin={false}
        onQuit={onQuit}
        onToggleMinimize={onToggleMinimize}
        onNewWindow={onNewWindow}
      />,
    );

    const quit = screen.getByRole('menuitem', { name: /quit/i });
    const hide = screen.getByRole('menuitem', { name: /hide/i });
    const newWindow = screen.getByRole('menuitem', { name: /new window/i });

    expect(quit).toHaveAttribute('aria-disabled', 'true');
    expect(hide).toHaveAttribute('aria-disabled', 'true');
    expect(newWindow).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(quit);
    fireEvent.click(hide);
    fireEvent.click(newWindow);

    expect(onQuit).not.toHaveBeenCalled();
    expect(onToggleMinimize).not.toHaveBeenCalled();
    expect(onNewWindow).not.toHaveBeenCalled();
  });
});
