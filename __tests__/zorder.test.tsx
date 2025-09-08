import React from 'react';
import { render, screen } from '@testing-library/react';
import Taskbar from '../components/screen/taskbar';
import { Desktop } from '../components/screen/desktop';

describe('z-order logic', () => {
  const apps = [
    { id: 'app1', title: 'App One', icon: '/1.png' },
    { id: 'app2', title: 'App Two', icon: '/2.png' },
    { id: 'app3', title: 'App Three', icon: '/3.png' },
  ];

  function createDesktop() {
    const desktop = new Desktop();
    desktop.state = {
      focused_windows: { app1: true, app2: false, app3: false },
      minimized_windows: { app1: false, app2: false, app3: false },
      closed_windows: { app1: false, app2: false, app3: false },
    } as any;
    desktop.app_stack = ['app1', 'app2', 'app3'];
    // make setState synchronous for tests
    desktop.setState = function (update: any, cb?: () => void) {
      const next = typeof update === 'function' ? update(this.state, this.props) : update;
      this.state = { ...this.state, ...next };
      cb?.();
    };
    return desktop;
  }

  it('changes active window and taskbar highlight with Alt+Tab', () => {
    const desktop = createDesktop();

    // simulate Alt+Tab cycling to next window
    desktop.cycleApps(1);

    expect(desktop.getFocusedWindowId()).toBe('app2');

    render(
      <Taskbar
        apps={apps}
        closed_windows={desktop.state.closed_windows}
        minimized_windows={desktop.state.minimized_windows}
        focused_windows={desktop.state.focused_windows}
        dock={[]}
        openApp={() => {}}
        minimize={() => {}}
      />
    );

    const focused = screen.getByRole('button', { name: /app two/i });
    expect(focused.className).toMatch(/bg-white/);
  });

  it('skips minimized windows when cycling', () => {
    const desktop = createDesktop();
    desktop.state.minimized_windows.app2 = true;

    desktop.cycleApps(1);

    expect(desktop.getFocusedWindowId()).toBe('app3');
  });
});
