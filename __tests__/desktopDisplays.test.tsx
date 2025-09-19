import { Desktop } from '../components/screen/desktop';

describe('Desktop multi-display workspaces', () => {
  const baseDisplayConfig = {
    displays: [
      { id: 'display-1', name: 'Internal Display' },
      { id: 'display-2', name: 'Projector' },
    ],
    primary: 'display-1',
  };

  const baseSession = {
    windows: [],
    wallpaper: 'wall-2',
    dock: [],
    workspaces: {
      'display-1': {
        windows: [{ id: 'terminal', x: 120, y: 80 }],
        minimized: [],
        focused: 'terminal',
        order: ['terminal'],
      },
      'display-2': {
        windows: [{ id: 'browser', x: 300, y: 160 }],
        minimized: ['browser'],
        focused: null,
        order: ['browser'],
      },
    },
    activeDisplay: 'display-1',
    displays: ['display-1', 'display-2'],
  };

  const setupDesktop = () => {
    const setSession = jest.fn();
    const props = {
      displayConfig: baseDisplayConfig,
      session: baseSession,
      setSession,
      clearSession: jest.fn(),
    } as any;
    const desktop = new Desktop(props);
    desktop.setState = (update: any, callback?: () => void) => {
      const partial =
        typeof update === 'function' ? update(desktop.state, desktop.props) : update;
      desktop.state = { ...desktop.state, ...partial };
      if (typeof callback === 'function') callback();
    };
    desktop.initFavourite = { terminal: false, browser: false };
    desktop.state = {
      ...desktop.state,
      focused_windows: { terminal: false, browser: false },
      closed_windows: { terminal: true, browser: true },
      overlapped_windows: { terminal: false, browser: false },
      minimized_windows: { terminal: false, browser: false },
      window_positions: {},
    };
    desktop.initialWorkspaceSnapshot = desktop.createWorkspaceSnapshotFromState();
    return { desktop, setSession };
  };

  it('switches workspace state when the primary display changes', () => {
    const { desktop, setSession } = setupDesktop();

    desktop.initializeWorkspaces(baseSession);
    expect(desktop.state.activeDisplay).toBe('display-1');
    expect(desktop.state.closed_windows.terminal).toBe(false);
    expect(desktop.state.closed_windows.browser).toBe(true);

    setSession.mockClear();

    desktop.handlePrimaryDisplayChange('display-2');

    expect(desktop.state.activeDisplay).toBe('display-2');
    expect(desktop.state.closed_windows.browser).toBe(false);
    expect(desktop.state.minimized_windows.browser).toBe(true);
    expect(desktop.workspaceStates['display-1'].closed_windows.terminal).toBe(false);

    expect(setSession).toHaveBeenCalledTimes(1);
    const payload = setSession.mock.calls[0][0];
    expect(payload.activeDisplay).toBe('display-2');
    expect(payload.workspaces['display-1'].windows).toEqual([
      { id: 'terminal', x: 120, y: 80 },
    ]);
    expect(payload.workspaces['display-2'].windows).toEqual([
      { id: 'browser', x: 300, y: 160 },
    ]);
    expect(payload.workspaces['display-2'].minimized).toEqual(['browser']);
  });
});
