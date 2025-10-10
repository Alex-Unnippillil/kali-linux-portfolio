import { Desktop } from '../components/screen/desktop';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));

describe('Desktop show desktop toggle', () => {
  let desktop;
  let focusSpy;
  let giveFocusSpy;

  beforeEach(() => {
    desktop = new Desktop({});

    desktop.validAppIds = new Set(['app1', 'app2', 'app3', 'app4']);

    desktop.state = {
      ...desktop.state,
      closed_windows: { app1: false, app2: false, app3: true },
      minimized_windows: { app1: false, app2: true, app3: false },
      focused_windows: { app1: true, app2: false, app3: false },
      showDesktopActive: false,
    };

    desktop.commitWorkspacePartial = jest.fn();
    desktop.setState = jest.fn((updater, callback) => {
      if (typeof updater === 'function') {
        const result = updater(desktop.state);
        if (result) {
          desktop.state = { ...desktop.state, ...result };
        }
      } else if (updater) {
        desktop.state = { ...desktop.state, ...updater };
      }
      if (callback) callback();
    });
    desktop.setWorkspaceState = jest.fn((updater, callback) => {
      let partial = updater;
      if (typeof updater === 'function') {
        partial = updater(desktop.state);
      }
      if (partial) {
        desktop.state = { ...desktop.state, ...partial };
      }
      if (callback) callback();
    });

    jest.spyOn(desktop, 'promoteWindowInStack').mockImplementation(() => {});
    focusSpy = jest.spyOn(desktop, 'focus');
    giveFocusSpy = jest.spyOn(desktop, 'giveFocusToLastApp').mockImplementation(() => {});
    jest.spyOn(desktop, 'saveSession').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('minimizes open windows and stores their previous state', () => {
    desktop.toggleShowDesktop();

    expect(desktop.state.minimized_windows).toEqual({
      app1: true,
      app2: true,
      app3: false,
    });
    expect(desktop.state.focused_windows).toEqual({
      app1: false,
      app2: false,
      app3: false,
    });
    expect(desktop.state.showDesktopActive).toBe(true);
    expect(desktop.showDesktopSnapshot).toEqual({
      app1: { minimized: false, focused: true },
      app2: { minimized: true, focused: false },
    });
  });

  it('restores windows on the second toggle', () => {
    desktop.toggleShowDesktop();
    focusSpy.mockClear();
    giveFocusSpy.mockClear();

    desktop.toggleShowDesktop();

    expect(desktop.state.minimized_windows).toEqual({
      app1: false,
      app2: true,
      app3: false,
    });
    expect(desktop.state.focused_windows).toEqual({
      app1: true,
      app2: false,
      app3: false,
    });
    expect(desktop.state.showDesktopActive).toBe(false);
    expect(desktop.showDesktopSnapshot).toBeNull();
    expect(focusSpy).toHaveBeenCalledWith('app1');
    expect(giveFocusSpy).not.toHaveBeenCalled();
  });

  it('keeps newly opened windows untouched when restoring', () => {
    desktop.toggleShowDesktop();

    desktop.state = {
      ...desktop.state,
      closed_windows: { ...desktop.state.closed_windows, app4: false },
      minimized_windows: { ...desktop.state.minimized_windows, app4: false },
      focused_windows: { ...desktop.state.focused_windows, app4: true },
    };

    focusSpy.mockClear();

    desktop.toggleShowDesktop();

    expect(desktop.state.minimized_windows).toEqual({
      app1: false,
      app2: true,
      app3: false,
      app4: false,
    });
    expect(desktop.state.focused_windows.app4).toBe(false);
    expect(desktop.state.showDesktopActive).toBe(false);
    expect(desktop.showDesktopSnapshot).toBeNull();
  });
});
