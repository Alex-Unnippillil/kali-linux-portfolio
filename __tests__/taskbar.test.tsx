import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Taskbar from '../components/screen/taskbar';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));

const singleApp = [{ id: 'app1', title: 'App One', icon: '/icon.png' }];
const twoApps = [
  singleApp[0],
  { id: 'app2', title: 'App Two', icon: '/icon-2.png' },
];

describe('Taskbar', () => {
  it('minimizes focused window on click', () => {
    const openApp = jest.fn();
    const minimize = jest.fn();
    render(
      <Taskbar
        apps={singleApp}
        closed_windows={{ app1: false }}
        minimized_windows={{ app1: false }}
        focused_windows={{ app1: true }}
        openApp={openApp}
        minimize={minimize}
      />
    );
    const button = screen.getByRole('button', { name: /app one/i });
    fireEvent.click(button);
    expect(minimize).toHaveBeenCalledWith('app1');
    expect(button).toHaveAttribute('data-context', 'taskbar');
    expect(button).toHaveAttribute('aria-label', 'App One (active window)');
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveAttribute('aria-posinset', '1');
    expect(button).toHaveAttribute('aria-setsize', '1');
    expect(button).toHaveAttribute('data-state', 'active');
  });

  it('restores minimized window on click', () => {
    const openApp = jest.fn();
    const minimize = jest.fn();
    render(
      <Taskbar
        apps={singleApp}
        closed_windows={{ app1: false }}
        minimized_windows={{ app1: true }}
        focused_windows={{ app1: false }}
        openApp={openApp}
        minimize={minimize}
      />
    );
    const button = screen.getByRole('button', { name: /app one/i });
    fireEvent.click(button);
    expect(openApp).toHaveBeenCalledWith('app1');
    expect(button).toHaveAttribute('aria-label', 'App One (minimized)');
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveAttribute('data-state', 'minimized');
  });

  it('describes background state for non-focused windows', () => {
    render(
      <Taskbar
        apps={singleApp}
        closed_windows={{ app1: false }}
        minimized_windows={{ app1: false }}
        focused_windows={{ app1: false }}
        openApp={jest.fn()}
        minimize={jest.fn()}
      />
    );
    const button = screen.getByRole('button', { name: /running in background/i });
    expect(button).toHaveAttribute('aria-label', 'App One (running in background)');
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveAttribute('data-state', 'background');
  });

  it('allows arrow key navigation to follow visual order', () => {
    render(
      <Taskbar
        apps={twoApps}
        closed_windows={{ app1: false, app2: false }}
        minimized_windows={{ app1: false, app2: false }}
        focused_windows={{ app1: true, app2: false }}
        openApp={jest.fn()}
        minimize={jest.fn()}
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveAttribute('aria-posinset', '1');
    expect(buttons[0]).toHaveAttribute('aria-setsize', '2');
    expect(buttons[1]).toHaveAttribute('aria-posinset', '2');
    expect(buttons[1]).toHaveAttribute('aria-setsize', '2');

    buttons[0].focus();
    expect(document.activeElement).toBe(buttons[0]);

    fireEvent.keyDown(buttons[0], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(buttons[1]);

    fireEvent.keyDown(buttons[1], { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(buttons[0]);
  });
});
