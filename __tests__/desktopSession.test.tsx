import { act, renderHook } from '@testing-library/react';
import { Desktop } from '../components/screen/desktop';
import useSession from '../hooks/useSession';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));

describe('Desktop session restore', () => {
  const createInstance = () => {
    const desktop = new Desktop({
      session: null,
      setSession: jest.fn(),
      resetSession: jest.fn(),
      requestRestore: jest.fn(),
      profileId: 'default',
      bg_image_name: 'wall-1',
    });
    desktop.setState = (update, callback) => {
      const nextState =
        typeof update === 'function'
          ? { ...desktop.state, ...update(desktop.state) }
          : { ...desktop.state, ...update };
      desktop.state = nextState;
      if (callback) callback();
    };
    return desktop;
  };

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockImplementation(() => 1700000000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('restores saved windows with sanitized positions and favorites', () => {
    const desktop = createInstance();
    desktop.state = {
      ...desktop.state,
      closed_windows: { terminal: true, notes: true },
      favourite_apps: { terminal: false, notes: false },
      minimized_windows: { terminal: false, notes: false },
      focused_windows: { terminal: false, notes: false },
      window_positions: {},
    };
    desktop.initFavourite = { terminal: false, notes: false };
    desktop.saveSession = jest.fn();
    desktop.openApp = jest.fn();

    desktop.restoreSession({
      openWindows: ['terminal', 'notes'],
      zOrder: ['notes', 'terminal'],
      positions: {
        terminal: { x: -50, y: -30 },
        notes: { x: 5000, y: 7000 },
      },
      minimized: ['notes'],
      wallpaper: 'wall-3',
      dock: ['terminal'],
      appState: {},
      focusedWindow: 'terminal',
      restoreCursor: 42,
    });

    expect(desktop.state.closed_windows).toEqual({ terminal: false, notes: false });
    expect(desktop.state.minimized_windows).toEqual({ terminal: false, notes: true });
    expect(desktop.state.focused_windows).toEqual({ terminal: true, notes: false });
    expect(desktop.state.window_positions.terminal).toEqual({ x: 0, y: 0 });
    expect(desktop.state.window_positions.notes).toEqual({ x: 844, y: 608 });
    expect(desktop.state.favourite_apps).toEqual({ terminal: true, notes: false });
    expect(desktop.initFavourite).toEqual({ terminal: true, notes: false });
    expect(desktop.app_stack).toEqual(['notes', 'terminal']);
    expect(desktop.saveSession).toHaveBeenCalledWith({ force: true });
    expect(desktop.openApp).not.toHaveBeenCalled();
    expect(desktop.lastRestoreCursor).toBe(42);
    expect(desktop.isRestoring).toBe(false);
  });

  it('opens the default app when no windows are saved', () => {
    const desktop = createInstance();
    desktop.state = {
      ...desktop.state,
      closed_windows: { terminal: true },
      favourite_apps: { terminal: false },
      minimized_windows: { terminal: false },
      focused_windows: { terminal: false },
    };
    desktop.openApp = jest.fn();
    desktop.saveSession = jest.fn();

    desktop.restoreSession({
      openWindows: [],
      zOrder: [],
      positions: {},
      minimized: [],
      wallpaper: 'wall-2',
      dock: [],
      appState: {},
      focusedWindow: null,
      restoreCursor: 0,
    });

    expect(desktop.openApp).toHaveBeenCalledWith('about-alex');
    expect(desktop.saveSession).not.toHaveBeenCalled();
    expect(desktop.app_stack).toEqual([]);
  });
});

describe('useSession integration', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.useFakeTimers().setSystemTime(new Date('2023-01-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('persists window state and bumps restore cursor on request', () => {
    const { result } = renderHook(() => useSession());

    act(() => {
      result.current.setSession((prev) => ({
        ...prev,
        openWindows: ['terminal'],
        zOrder: ['terminal'],
        positions: { terminal: { x: 10, y: 20 } },
        minimized: [],
        wallpaper: prev.wallpaper,
        dock: [],
        appState: prev.appState,
        focusedWindow: 'terminal',
        restoreCursor: prev.restoreCursor,
      }));
    });

    expect(result.current.session.openWindows).toEqual(['terminal']);
    expect(result.current.session.positions.terminal).toEqual({ x: 10, y: 20 });

    act(() => {
      jest.setSystemTime(new Date('2023-01-01T00:00:05Z'));
      result.current.requestRestore();
    });

    expect(result.current.session.restoreCursor).toBeGreaterThan(0);
  });
});
