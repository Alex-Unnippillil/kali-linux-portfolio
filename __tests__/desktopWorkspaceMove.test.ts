import { Desktop } from '../components/screen/desktop';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('html-to-image', () => ({ toPng: jest.fn().mockResolvedValue('data:image/png;base64,') }));
jest.mock('../components/util-components/background-image', () => () => null);
jest.mock('../components/base/window', () => () => null);
jest.mock('../utils/recentStorage', () => ({ addRecentApp: jest.fn() }));

const createSynchronousSetState = (desktop: Desktop) =>
  jest.fn(<T extends Partial<Desktop['state']> | null>(update: T | ((prev: Desktop['state']) => T), callback?: () => void) => {
    let partial: T | null = null;
    if (typeof update === 'function') {
      partial = update(desktop.state);
    } else {
      partial = update;
    }
    if (partial && typeof partial === 'object') {
      desktop.state = { ...desktop.state, ...partial };
    }
    if (typeof callback === 'function') {
      callback();
    }
  });

describe('Desktop workspace window moves', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('moves an open window from the active workspace to a target workspace', () => {
    const desktop = new Desktop({});
    desktop.setState = createSynchronousSetState(desktop);
    desktop.saveSession = jest.fn();
    const broadcastSpy = jest.spyOn(desktop, 'broadcastWorkspaceState').mockImplementation(() => {});
    const giveFocusSpy = jest.spyOn(desktop, 'giveFocusToLastApp').mockImplementation(() => {});

    desktop.state = {
      ...desktop.state,
      activeWorkspace: 0,
      closed_windows: { about: false },
      focused_windows: { about: true },
      minimized_windows: { about: false },
      window_positions: { about: { x: 120, y: 200 } },
    };

    desktop.workspaceSnapshots[0] = desktop.cloneWorkspaceState({
      focused_windows: desktop.state.focused_windows,
      closed_windows: desktop.state.closed_windows,
      minimized_windows: desktop.state.minimized_windows,
      window_positions: desktop.state.window_positions,
    });
    desktop.workspaceSnapshots[1] = desktop.createEmptyWorkspaceState();
    desktop.workspaceStacks[0] = ['about'];
    desktop.workspaceStacks[1] = [];

    const result = desktop.moveWindowToWorkspace('about', 1);

    expect(result).toBe(true);
    expect(desktop.state.closed_windows.about).toBe(true);
    expect(desktop.state.focused_windows.about).toBe(false);
    expect(desktop.state.window_positions.about).toBeUndefined();
    expect(desktop.workspaceSnapshots[1].closed_windows.about).toBe(false);
    expect(desktop.workspaceSnapshots[1].window_positions.about).toEqual({ x: 120, y: 200 });
    expect(desktop.workspaceStacks[0]).not.toContain('about');
    expect(desktop.workspaceStacks[1][0]).toBe('about');
    expect(desktop.saveSession).toHaveBeenCalledTimes(1);
    expect(broadcastSpy).toHaveBeenCalledTimes(1);
    expect(giveFocusSpy).toHaveBeenCalledTimes(1);
  });

  it('brings a window into the active workspace and focuses it when not minimized', () => {
    const desktop = new Desktop({});
    desktop.setState = createSynchronousSetState(desktop);
    desktop.saveSession = jest.fn();
    const broadcastSpy = jest.spyOn(desktop, 'broadcastWorkspaceState').mockImplementation(() => {});
    const focusSpy = jest.spyOn(desktop, 'focus');

    desktop.state = {
      ...desktop.state,
      activeWorkspace: 0,
      closed_windows: { about: true },
      focused_windows: { about: false },
      minimized_windows: { about: false },
      window_positions: {},
    };

    const sourceSnapshot = desktop.createEmptyWorkspaceState();
    sourceSnapshot.closed_windows.about = false;
    sourceSnapshot.focused_windows.about = false;
    sourceSnapshot.minimized_windows.about = false;
    sourceSnapshot.window_positions.about = { x: 64, y: 128 };

    desktop.workspaceSnapshots[0] = desktop.createEmptyWorkspaceState();
    desktop.workspaceSnapshots[1] = desktop.cloneWorkspaceState(sourceSnapshot);
    desktop.workspaceStacks[0] = [];
    desktop.workspaceStacks[1] = ['about'];

    const result = desktop.moveWindowToWorkspace('about', 0);

    expect(result).toBe(true);
    expect(desktop.state.closed_windows.about).toBe(false);
    expect(desktop.state.minimized_windows.about).toBe(false);
    expect(desktop.state.window_positions.about).toEqual({ x: 64, y: 128 });
    expect(desktop.workspaceSnapshots[1].closed_windows.about).toBe(true);
    expect(desktop.workspaceSnapshots[1].window_positions.about).toBeUndefined();
    expect(desktop.workspaceStacks[0][0]).toBe('about');
    expect(desktop.workspaceStacks[1]).not.toContain('about');
    expect(desktop.saveSession).toHaveBeenCalledTimes(1);
    expect(broadcastSpy).toHaveBeenCalledTimes(1);
    expect(focusSpy).toHaveBeenCalledWith('about');
  });
});
