import { Desktop } from '../components/screen/desktop';

describe('Desktop multi-display workspace management', () => {
  const createInstance = () => {
    const desktop = new Desktop({ session: {}, setSession: jest.fn(), clearSession: jest.fn() });
    desktop.setState = (updater, callback) => {
      const prevState = desktop.state;
      const partial = typeof updater === 'function' ? updater(prevState, desktop.props) : updater;
      if (!partial) return;
      desktop.state = { ...prevState, ...partial };
      if (callback) callback();
    };
    return desktop;
  };

  it('switchDisplay swaps active workspace state and taskbar windows', () => {
    const desktop = createInstance();
    const baseWorkspace = desktop.snapshotActiveWorkspace();
    const ids = Object.keys(baseWorkspace.closed_windows);
    const firstApp = ids[0];
    const secondApp = ids.find((id) => id !== firstApp) || firstApp;

    const workspaceOne = JSON.parse(JSON.stringify(baseWorkspace));
    workspaceOne.closed_windows[firstApp] = false;
    workspaceOne.focused_windows[firstApp] = true;
    workspaceOne.app_stack = [firstApp];

    const workspaceTwo = JSON.parse(JSON.stringify(baseWorkspace));
    workspaceTwo.closed_windows[firstApp] = true;
    workspaceTwo.closed_windows[secondApp] = false;
    workspaceTwo.focused_windows[secondApp] = true;
    workspaceTwo.app_stack = [secondApp];

    desktop.state = {
      ...desktop.state,
      activeDisplayId: 'display-1',
      displayOrder: ['display-1', 'display-2'],
      displayMeta: {
        'display-1': { name: 'Primary Display' },
        'display-2': { name: 'Display 2' },
      },
      displayWorkspaces: {
        'display-1': workspaceOne,
        'display-2': workspaceTwo,
      },
      focused_windows: workspaceOne.focused_windows,
      closed_windows: workspaceOne.closed_windows,
      minimized_windows: workspaceOne.minimized_windows,
      overlapped_windows: workspaceOne.overlapped_windows,
      window_positions: workspaceOne.window_positions,
    };
    desktop.app_stack = [...workspaceOne.app_stack];
    desktop.hideSideBar = jest.fn();
    desktop.saveSession = jest.fn();

    desktop.switchDisplay('display-2');

    expect(desktop.state.activeDisplayId).toBe('display-2');
    expect(desktop.state.focused_windows[secondApp]).toBe(true);
    expect(desktop.state.closed_windows[firstApp]).toBe(true);
    expect(desktop.app_stack).toEqual([secondApp]);
    expect(desktop.state.displayWorkspaces['display-1'].focused_windows[firstApp]).toBe(true);
    expect(desktop.hideSideBar).toHaveBeenCalledWith(null, false);
    expect(desktop.saveSession).toHaveBeenCalled();
  });
});
