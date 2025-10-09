import { Desktop } from '../components/screen/desktop';

describe('Desktop workspace icon persistence', () => {
  const createDesktop = () => {
    const desktop = new Desktop({});
    desktop.state = {
      ...desktop.state,
      activeWorkspace: 0,
      workspaces: [
        { id: 0, label: 'Workspace 1' },
        { id: 1, label: 'Workspace 2' },
      ],
      desktop_icon_positions: { 'app-1': { x: 16, y: 32 } },
      focused_windows: {},
      closed_windows: {},
      minimized_windows: {},
      window_positions: {},
    };

    desktop.workspaceSnapshots[0] = {
      ...desktop.createEmptyWorkspaceState(),
      desktop_icon_positions: { 'app-1': { x: 16, y: 32 } },
    };

    desktop.workspaceSnapshots[1] = {
      ...desktop.createEmptyWorkspaceState(),
      desktop_icon_positions: { 'app-1': { x: 128, y: 256 } },
    };

    desktop.setState = jest.fn((updater: any, callback?: () => void) => {
      const partial =
        typeof updater === 'function' ? updater(desktop.state) : updater;
      if (partial) {
        desktop.state = { ...desktop.state, ...partial };
      }
      if (callback) {
        callback();
      }
    });

    return desktop;
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it('restores per-workspace icon layouts when switching workspaces', () => {
    const desktop = createDesktop();

    desktop.switchWorkspace(1);
    expect(desktop.state.desktop_icon_positions).toEqual({
      'app-1': { x: 128, y: 256 },
    });

    desktop.setWorkspaceState({
      desktop_icon_positions: { 'app-1': { x: 144, y: 288 } },
    });

    desktop.switchWorkspace(0);
    expect(desktop.state.desktop_icon_positions).toEqual({
      'app-1': { x: 16, y: 32 },
    });

    desktop.switchWorkspace(1);
    expect(desktop.state.desktop_icon_positions).toEqual({
      'app-1': { x: 144, y: 288 },
    });
  });

  it('persists icon positions for each workspace in local storage', () => {
    const desktop = createDesktop();
    desktop.state = {
      ...desktop.state,
      activeWorkspace: 1,
      desktop_icon_positions: { 'app-2': { x: 200, y: 300 } },
    };

    desktop.savedIconPositionsByWorkspace = {
      0: { 'app-1': { x: 10, y: 20 } },
    } as any;

    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');

    desktop.persistIconPositions();

    expect(setItemSpy).toHaveBeenCalledWith(
      'desktop_icon_positions',
      JSON.stringify({
        0: { 'app-1': { x: 10, y: 20 } },
        1: { 'app-2': { x: 200, y: 300 } },
      })
    );

    setItemSpy.mockRestore();
  });
});
