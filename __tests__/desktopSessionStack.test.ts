import { Desktop } from '../components/screen/desktop';

const mockSession = {
  windows: [],
  wallpaper: 'wallpaper',
  dock: [],
  stack: [],
};

describe('Desktop window stack persistence', () => {
  it('saves focus order and restores it after hydration', () => {
    const setSession = jest.fn();
    const desktop = new Desktop({} as any);
    desktop.props = { session: { ...mockSession }, setSession } as any;
    desktop.workspaceSnapshots = Array.from(
      { length: desktop.workspaceCount },
      () => desktop.createEmptyWorkspaceState(),
    );
    desktop.workspaceStacks = Array.from(
      { length: desktop.workspaceCount },
      () => [],
    );
    desktop.state = {
      ...desktop.state,
      focused_windows: { about: false, terminal: false },
      closed_windows: { about: false, terminal: false },
      minimized_windows: { about: false, terminal: false },
      window_positions: {},
    } as any;
    desktop.setState = jest.fn((partial: any, callback?: () => void) => {
      const next = typeof partial === 'function' ? partial(desktop.state) : partial;
      if (next) {
        desktop.state = { ...desktop.state, ...next };
      }
      if (typeof callback === 'function') {
        callback();
      }
    });

    desktop.focus('about');
    desktop.focus('terminal');

    expect(setSession).toHaveBeenCalled();
    const savedSession = setSession.mock.calls[setSession.mock.calls.length - 1][0];
    expect(savedSession.stack).toEqual(['terminal', 'about']);

    const reloadSetSession = jest.fn();
    const desktopReloaded = new Desktop({} as any);
    desktopReloaded.props = { session: savedSession, setSession: reloadSetSession } as any;
    desktopReloaded.workspaceSnapshots = Array.from(
      { length: desktopReloaded.workspaceCount },
      () => desktopReloaded.createEmptyWorkspaceState(),
    );
    desktopReloaded.workspaceStacks = Array.from(
      { length: desktopReloaded.workspaceCount },
      () => [],
    );
    desktopReloaded.state = {
      ...desktopReloaded.state,
      focused_windows: { about: false, terminal: false },
      closed_windows: { about: true, terminal: true },
      minimized_windows: { about: false, terminal: false },
      window_positions: {},
    } as any;
    desktopReloaded.setState = jest.fn((partial: any, callback?: () => void) => {
      const next = typeof partial === 'function' ? partial(desktopReloaded.state) : partial;
      if (next) {
        desktopReloaded.state = { ...desktopReloaded.state, ...next };
      }
      if (typeof callback === 'function') {
        callback();
      }
    });

    const opened: string[] = [];
    desktopReloaded.openApp = jest.fn((id: string) => {
      opened.push(id);
    });

    desktopReloaded.hydrateSession(savedSession);

    expect(desktopReloaded.workspaceStacks[0]).toEqual(['terminal', 'about']);
    expect(opened).toEqual(['terminal', 'about']);
  });
});
