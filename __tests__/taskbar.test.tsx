import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Taskbar from '../components/screen/taskbar';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));

const apps = [{ id: 'app1', title: 'App One', icon: '/icon.png' }];

function createProps(overrides: Record<string, any> = {}) {
  return {
    apps,
    closed_windows: { app1: false },
    minimized_windows: { app1: false },
    focused_windows: { app1: false },
    favourite_apps: { app1: false },
    openApp: jest.fn(),
    minimize: jest.fn(),
    closeApp: jest.fn(),
    pinApp: jest.fn(),
    unpinApp: jest.fn(),
    moveToDesktop: jest.fn(),
    ...overrides,
  };
}

describe('Taskbar', () => {
  it('minimizes focused window on click', () => {
    const openApp = jest.fn();
    const minimize = jest.fn();
    const props = createProps({
      focused_windows: { app1: true },
      openApp,
      minimize,
    });
    render(<Taskbar {...props} />);
    const button = screen.getByRole('button', { name: /app one/i });
    fireEvent.click(button);
    expect(minimize).toHaveBeenCalledWith('app1');
    expect(button).toHaveAttribute('data-context', 'taskbar');
  });

  it('restores minimized window on click', () => {
    const openApp = jest.fn();
    const minimize = jest.fn();
    const props = createProps({
      minimized_windows: { app1: true },
      openApp,
      minimize,
    });
    render(<Taskbar {...props} />);
    const button = screen.getByRole('button', { name: /app one/i });
    fireEvent.click(button);
    expect(openApp).toHaveBeenCalledWith('app1');
  });

  it('opens the taskbar menu via keyboard and invokes actions', async () => {
    const openApp = jest.fn();
    const closeApp = jest.fn();
    const pinApp = jest.fn();
    const moveToDesktop = jest.fn();
    const props = createProps({ openApp, closeApp, pinApp, moveToDesktop });
    render(<Taskbar {...props} />);
    const button = screen.getByRole('button', { name: /app one/i });

    fireEvent.keyDown(button, { key: 'F10', shiftKey: true });
    const menu = await screen.findByRole('menu');
    expect(menu).toBeInTheDocument();

    const closeItem = await screen.findByRole('menuitem', { name: 'Close' });
    fireEvent.click(closeItem);
    expect(closeApp).toHaveBeenCalledWith('app1');

    fireEvent.contextMenu(button);
    const pinItem = await screen.findByRole('menuitem', { name: 'Pin' });
    fireEvent.click(pinItem);
    expect(pinApp).toHaveBeenCalledWith('app1');

    fireEvent.contextMenu(button);
    const moveItem = await screen.findByRole('menuitem', { name: 'Move to Desktop' });
    fireEvent.click(moveItem);
    expect(moveToDesktop).toHaveBeenCalledWith('app1');

    fireEvent.contextMenu(button);
    const newWindowItem = await screen.findByRole('menuitem', { name: 'New Window' });
    fireEvent.click(newWindowItem);
    expect(openApp).toHaveBeenCalledWith('app1');
  });

  it('shows unpin when app is pinned', async () => {
    const unpinApp = jest.fn();
    const props = createProps({
      favourite_apps: { app1: true },
      unpinApp,
    });
    render(<Taskbar {...props} />);
    const button = screen.getByRole('button', { name: /app one/i });
    fireEvent.contextMenu(button);
    const unpinItem = await screen.findByRole('menuitem', { name: 'Unpin' });
    fireEvent.click(unpinItem);
    expect(unpinApp).toHaveBeenCalledWith('app1');
  });
});
