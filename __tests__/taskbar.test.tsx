import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Taskbar from '../components/screen/taskbar';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));

const apps = [{ id: 'app1', title: 'App One', icon: '/icon.png' }];

describe('Taskbar', () => {
  it('minimizes focused window on click', () => {
    const openApp = jest.fn();
    const minimize = jest.fn();
    render(
      <Taskbar
        apps={apps}
        closed_windows={{ app1: false }}
        minimized_windows={{ app1: false }}
        focused_windows={{ app1: true }}
        openApp={openApp}
        focusWindow={jest.fn()}
        minimize={minimize}
      />
    );
    const button = screen.getByRole('button', { name: /app one/i });
    fireEvent.click(button);
    expect(minimize).toHaveBeenCalledWith('app1');
    expect(button).toHaveAttribute('data-context', 'taskbar');
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveAttribute('data-active', 'true');
    const indicator = button.querySelector('[data-testid="running-indicator"]');
    expect(indicator).toBeTruthy();
    expect(indicator).toHaveClass('rounded-full');
  });

  it('restores minimized window on click', () => {
    const openApp = jest.fn();
    const minimize = jest.fn();
    const focusWindow = jest.fn();
    render(
      <Taskbar
        apps={apps}
        closed_windows={{ app1: false }}
        minimized_windows={{ app1: true }}
        focused_windows={{ app1: false }}
        openApp={openApp}
        focusWindow={focusWindow}
        minimize={minimize}
      />
    );
    const button = screen.getByRole('button', { name: /app one/i });
    fireEvent.click(button);
    expect(openApp).toHaveBeenCalledWith('app1');
    expect(openApp).toHaveBeenCalledTimes(1);
    expect(focusWindow).not.toHaveBeenCalled();
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveAttribute('data-active', 'false');
    expect(button.querySelector('[data-testid="running-indicator"]')).toBeFalsy();
  });

  it('focuses existing window when clicked while running', () => {
    const openApp = jest.fn();
    const minimize = jest.fn();
    const focusWindow = jest.fn();
    render(
      <Taskbar
        apps={apps}
        closed_windows={{ app1: false }}
        minimized_windows={{ app1: false }}
        focused_windows={{ app1: false }}
        openApp={openApp}
        focusWindow={focusWindow}
        minimize={minimize}
      />
    );
    const button = screen.getByRole('button', { name: /app one/i });
    fireEvent.click(button);
    expect(focusWindow).toHaveBeenCalledWith('app1');
    expect(openApp).not.toHaveBeenCalled();
    expect(minimize).not.toHaveBeenCalled();
  });

  it('restores minimized apps without duplicating windows', () => {
    const openApp = jest.fn();
    const minimize = jest.fn();
    const focusWindow = jest.fn();
    const { rerender } = render(
      <Taskbar
        apps={apps}
        closed_windows={{ app1: false }}
        minimized_windows={{ app1: true }}
        focused_windows={{ app1: false }}
        openApp={openApp}
        focusWindow={focusWindow}
        minimize={minimize}
      />
    );

    const button = screen.getByRole('button', { name: /app one/i });
    fireEvent.click(button);

    expect(openApp).toHaveBeenCalledTimes(1);
    expect(focusWindow).not.toHaveBeenCalled();

    rerender(
      <Taskbar
        apps={apps}
        closed_windows={{ app1: false }}
        minimized_windows={{ app1: false }}
        focused_windows={{ app1: false }}
        openApp={openApp}
        focusWindow={focusWindow}
        minimize={minimize}
      />
    );

    fireEvent.click(button);

    expect(openApp).toHaveBeenCalledTimes(1);
    expect(focusWindow).toHaveBeenCalledWith('app1');
  });
});
