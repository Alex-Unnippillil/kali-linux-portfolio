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
        window_timestamps={{ app1: 1 }}
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
        window_timestamps={{ app1: 1 }}
      />
    );
    const button = screen.getByRole('button', { name: /app one/i });
    fireEvent.click(button);
    expect(openApp).toHaveBeenCalledWith('app1');
  });

  it('sorts alphabetically when preference set', () => {
    localStorage.setItem('xfce.panel.sort', 'alphabetical');
    const openApp = jest.fn();
    const minimize = jest.fn();
    const testApps = [
      { id: 'b', title: 'Beta', icon: '/icon.png' },
      { id: 'a', title: 'Alpha', icon: '/icon.png' },
    ];
    render(
      <Taskbar
        apps={testApps}
        closed_windows={{ a: false, b: false }}
        minimized_windows={{}}
        focused_windows={{}}
        openApp={openApp}
        minimize={minimize}
        window_timestamps={{ a: 2, b: 1 }}
      />
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveAttribute('aria-label', 'Alpha');
  });

  it('groups windows when preference is always', () => {
    localStorage.setItem('xfce.panel.group', 'always');
    const openApp = jest.fn();
    const minimize = jest.fn();
    const testApps = [
      { id: 'dup', title: 'Dup', icon: '/icon.png' },
      { id: 'dup', title: 'Dup', icon: '/icon.png' },
    ];
    render(
      <Taskbar
        apps={testApps}
        closed_windows={{ dup: false }}
        minimized_windows={{}}
        focused_windows={{}}
        openApp={openApp}
        minimize={minimize}
        window_timestamps={{ dup: 1 }}
      />
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
