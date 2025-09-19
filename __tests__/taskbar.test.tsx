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
        minimize={minimize}
        pinned={[]}
        recentItems={[]}
        onPin={jest.fn()}
        onUnpin={jest.fn()}
        recentRequestKey={0}
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
        pinned={[]}
        recentItems={[]}
        onPin={jest.fn()}
        onUnpin={jest.fn()}
        recentRequestKey={0}
      />
    );
    const button = screen.getByRole('button', { name: /app one/i });
    fireEvent.click(button);
    expect(openApp).toHaveBeenCalledWith('app1');
  });

  it('persists pinned ids to storage', () => {
    window.localStorage.clear();
    const { rerender } = render(
      <Taskbar
        apps={apps}
        closed_windows={{}}
        minimized_windows={{}}
        focused_windows={{}}
        openApp={jest.fn()}
        minimize={jest.fn()}
        pinned={[]}
        recentItems={[]}
        onPin={jest.fn()}
        onUnpin={jest.fn()}
        recentRequestKey={0}
      />
    );
    expect(window.localStorage.getItem('pinnedApps')).toBe('[]');
    rerender(
      <Taskbar
        apps={apps}
        closed_windows={{}}
        minimized_windows={{}}
        focused_windows={{}}
        openApp={jest.fn()}
        minimize={jest.fn()}
        pinned={['app1']}
        recentItems={[]}
        onPin={jest.fn()}
        onUnpin={jest.fn()}
        recentRequestKey={0}
      />
    );
    expect(window.localStorage.getItem('pinnedApps')).toBe(JSON.stringify(['app1']));
  });

  it('shows recents after an app is unpinned', () => {
    const now = Date.now();
    const recentItems = [{ id: 'app1', title: 'App One', icon: '/icon.png', lastOpened: now }];
    const { rerender } = render(
      <Taskbar
        apps={apps}
        closed_windows={{}}
        minimized_windows={{}}
        focused_windows={{}}
        openApp={jest.fn()}
        minimize={jest.fn()}
        pinned={['app1']}
        recentItems={recentItems}
        onPin={jest.fn()}
        onUnpin={jest.fn()}
        recentRequestKey={1}
      />
    );
    expect(screen.queryByRole('menuitem', { name: /app one/i })).not.toBeInTheDocument();
    rerender(
      <Taskbar
        apps={apps}
        closed_windows={{}}
        minimized_windows={{}}
        focused_windows={{}}
        openApp={jest.fn()}
        minimize={jest.fn()}
        pinned={[]}
        recentItems={recentItems}
        onPin={jest.fn()}
        onUnpin={jest.fn()}
        recentRequestKey={2}
      />
    );
    expect(screen.getByRole('menuitem', { name: /app one/i })).toBeInTheDocument();
  });
});
