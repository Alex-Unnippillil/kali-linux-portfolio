import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Taskbar from '../components/screen/taskbar';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));

const apps = [{ id: 'app1', title: 'App One', icon: '/icon.png' }];

describe('Taskbar', () => {
  beforeEach(() => {
    localStorage.clear();
  });
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
        minimize={minimize}
      />
    );
    const button = screen.getByRole('button', { name: /app one/i });
    fireEvent.click(button);
    expect(minimize).toHaveBeenCalledWith('app1');
    expect(button).toHaveAttribute('data-context', 'taskbar');
  });

  it('restores minimized window on click', () => {
    const openApp = jest.fn();
    const minimize = jest.fn();
    render(
      <Taskbar
        apps={apps}
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
  });

  it('filters windows by monitor when enabled', () => {
    localStorage.setItem('xfce.panel.currentMonitorOnly', 'true');
    const openApp = jest.fn();
    const minimize = jest.fn();
    const multiApps = [
      { id: 'app1', title: 'App One', icon: '/icon.png', screenId: 0 },
      { id: 'app2', title: 'App Two', icon: '/icon.png', screenId: 1 },
    ];
    render(
      <Taskbar
        apps={multiApps}
        closed_windows={{ app1: false, app2: false }}
        minimized_windows={{}}
        focused_windows={{}}
        openApp={openApp}
        minimize={minimize}
        monitorId={0}
      />
    );
    expect(screen.getByRole('button', { name: /app one/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /app two/i })).toBeNull();
  });
});
