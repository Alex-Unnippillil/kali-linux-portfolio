import { Desktop } from '../components/screen/desktop';

describe('Desktop workspace management', () => {
  const storageKey = 'desktop_workspaces';

  const createSynchronousDesktop = () => {
    const desktop = new Desktop();
    desktop.setState = ((updater, callback) => {
      const partial = typeof updater === 'function' ? updater(desktop.state, desktop.props) : updater;
      if (partial && typeof partial === 'object') {
        desktop.state = { ...desktop.state, ...partial };
      }
      if (typeof callback === 'function') {
        callback();
      }
    }) as typeof desktop.setState;
    return desktop;
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes workspaces from stored definitions', () => {
    localStorage.setItem(storageKey, JSON.stringify(['Alpha', { label: 'Beta' }]));
    const desktop = new Desktop();

    expect(desktop.state.workspaces).toEqual([
      { id: 0, label: 'Alpha' },
      { id: 1, label: 'Beta' },
    ]);
    expect(desktop.workspaceSnapshots).toHaveLength(2);
    expect(desktop.workspaceStacks).toHaveLength(2);
  });

  it('adds a workspace and persists the definitions', () => {
    const desktop = createSynchronousDesktop();
    desktop.broadcastWorkspaceState = jest.fn();

    const initialLength = desktop.state.workspaces.length;
    const newId = desktop.addWorkspace('New Space');

    expect(newId).toBe(initialLength);
    expect(desktop.state.workspaces).toHaveLength(initialLength + 1);
    expect(desktop.state.workspaces[newId]).toEqual({ id: newId, label: 'New Space' });
    expect(desktop.workspaceSnapshots).toHaveLength(initialLength + 1);
    expect(Array.isArray(desktop.workspaceStacks[newId])).toBe(true);
    expect(desktop.workspaceStacks).toHaveLength(initialLength + 1);
    expect(localStorage.getItem(storageKey)).toContain('New Space');
    expect(desktop.broadcastWorkspaceState).toHaveBeenCalled();
  });

  it('removes a workspace and restores the previous snapshot', () => {
    localStorage.setItem(storageKey, JSON.stringify(['One', 'Two', 'Three']));
    const desktop = createSynchronousDesktop();
    desktop.broadcastWorkspaceState = jest.fn();
    desktop.giveFocusToLastApp = jest.fn();

    const snapshot = (label: string) => ({
      focused_windows: { [`${label}-app`]: false },
      closed_windows: { [`${label}-app`]: false },
      minimized_windows: { [`${label}-app`]: false },
      window_positions: { [`${label}-app`]: { x: 1, y: 2 } },
    });
    desktop.workspaceSnapshots = [snapshot('one'), snapshot('two'), snapshot('three')];
    desktop.workspaceStacks = [['one-app'], ['two-app'], ['three-app']];
    desktop.state = {
      ...desktop.state,
      activeWorkspace: 1,
      focused_windows: { 'two-app': true },
      closed_windows: { 'two-app': false },
      minimized_windows: { 'two-app': false },
      window_positions: { 'two-app': { x: 4, y: 5 } },
    };

    const removed = desktop.removeWorkspace(1);

    expect(removed).toBe(true);
    expect(desktop.state.workspaces).toEqual([
      { id: 0, label: 'One' },
      { id: 1, label: 'Three' },
    ]);
    expect(desktop.state.activeWorkspace).toBe(0);
    expect(desktop.state.focused_windows).toEqual(snapshot('one').focused_windows);
    expect(desktop.workspaceSnapshots).toHaveLength(2);
    expect(desktop.workspaceStacks).toHaveLength(2);
    expect(localStorage.getItem(storageKey)).toEqual(JSON.stringify(['One', 'Three']));
    expect(desktop.broadcastWorkspaceState).toHaveBeenCalled();
    expect(desktop.giveFocusToLastApp).toHaveBeenCalled();
  });
});
