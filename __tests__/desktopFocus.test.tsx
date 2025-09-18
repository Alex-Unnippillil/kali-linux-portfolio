import { Desktop } from '../components/screen/desktop';

type WindowId = string;

function createDesktop(windowIds: WindowId[]) {
  const desktop = new Desktop({ snapEnabled: false });
  const focused_windows: Record<WindowId, boolean> = {};
  const closed_windows: Record<WindowId, boolean> = {};
  const minimized_windows: Record<WindowId, boolean> = {};
  const overlapped_windows: Record<WindowId, boolean> = {};
  const window_z_indexes: Record<WindowId, number> = {};

  windowIds.forEach((id) => {
    focused_windows[id] = false;
    closed_windows[id] = false;
    minimized_windows[id] = false;
    overlapped_windows[id] = false;
    window_z_indexes[id] = 0;
  });

  desktop.state = {
    ...desktop.state,
    focused_windows,
    closed_windows,
    minimized_windows,
    overlapped_windows,
    window_z_indexes,
  };

  desktop.setState = (update: any, callback?: () => void) => {
    const nextState =
      typeof update === 'function' ? update(desktop.state) : update;
    desktop.state = { ...desktop.state, ...nextState };
    if (typeof callback === 'function') {
      callback();
    }
  };

  desktop.app_stack = [...windowIds];
  return desktop;
}

describe('Desktop window z-index management', () => {
  test('mouse focus raises the active window', () => {
    const desktop = createDesktop(['app1', 'app2']);

    desktop.focus('app1');
    const firstZ = desktop.state.window_z_indexes.app1;
    expect(firstZ).toBeGreaterThan(0);

    desktop.focus('app2');
    expect(desktop.state.window_z_indexes.app2).toBeGreaterThan(firstZ);
    expect(desktop.state.focused_windows.app2).toBe(true);
    expect(desktop.state.focused_windows.app1).toBe(false);
  });

  test('keyboard cycling promotes the next non-minimized window', () => {
    const desktop = createDesktop(['app1', 'app2', 'app3']);

    desktop.focus('app1');
    const zBeforeCycle = desktop.state.window_z_indexes.app1;
    expect(zBeforeCycle).toBeGreaterThan(0);

    desktop.state.minimized_windows.app2 = true;

    desktop.cycleApps(1);

    expect(desktop.state.focused_windows.app3).toBe(true);
    expect(desktop.state.window_z_indexes.app3).toBeGreaterThan(
      desktop.state.window_z_indexes.app1
    );
  });

  test('minimize and restore keeps stacking order consistent', () => {
    const desktop = createDesktop(['app1', 'app2']);

    desktop.focus('app1');
    desktop.focus('app2');
    const zBeforeMinimize = desktop.state.window_z_indexes.app2;
    expect(zBeforeMinimize).toBeGreaterThan(
      desktop.state.window_z_indexes.app1
    );

    desktop.hasMinimised('app2');

    expect(desktop.state.minimized_windows.app2).toBe(true);
    expect(desktop.state.window_z_indexes.app2).toBe(0);
    expect(desktop.state.focused_windows.app1).toBe(true);
    expect(desktop.state.window_z_indexes.app1).toBeGreaterThan(zBeforeMinimize);

    desktop.state.minimized_windows.app2 = false;
    desktop.focus('app2');

    expect(desktop.state.focused_windows.app2).toBe(true);
    expect(desktop.state.window_z_indexes.app2).toBeGreaterThan(
      desktop.state.window_z_indexes.app1
    );
  });
});
