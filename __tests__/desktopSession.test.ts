import { renderHook, waitFor } from '@testing-library/react';
import useSession from '../hooks/useSession';
import { Desktop } from '../components/screen/desktop';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));

const setViewportSize = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    writable: true,
    value: height,
  });
};

describe('desktop session bounds', () => {
  const originalWidth = window.innerWidth;
  const originalHeight = window.innerHeight;

  beforeEach(() => {
    window.localStorage.clear();
    setViewportSize(1024, 768);
  });

  afterEach(() => {
    setViewportSize(originalWidth, originalHeight);
    jest.restoreAllMocks();
  });

  it('recenters invalid coordinates when hydrating the session', async () => {
    window.localStorage.setItem(
      'desktop-session',
      JSON.stringify({
        windows: [{ id: 'recenter-me', x: null, y: null }],
        wallpaper: 'test',
        dock: [],
      }),
    );

    const { result } = renderHook(() => useSession());

    await waitFor(() => {
      expect(result.current.session.windows[0].x).toBe(512);
      expect(result.current.session.windows[0].y).toBe(384);
    });
  });

  it('centers off-screen windows before launching apps', () => {
    const desktop = new Desktop();
    desktop.props = {
      session: {
        windows: [{ id: 'outside', x: 4096, y: -240 }],
        wallpaper: 'test',
        dock: [],
      },
      setSession: jest.fn(),
      snapEnabled: false,
      clearSession: jest.fn(),
    } as any;

    const openApp = jest.spyOn(desktop, 'openApp').mockImplementation(() => {});
    jest
      .spyOn(desktop, 'setState')
      .mockImplementation((update: any, callback?: () => void) => {
        const nextState =
          typeof update === 'function' ? update(desktop.state, desktop.props) : update;
        desktop.state = { ...desktop.state, ...nextState };
        if (typeof callback === 'function') {
          callback();
        }
      });

    desktop.fetchAppsData = (callback) => {
      if (typeof callback === 'function') callback();
    };
    desktop.setContextListeners = jest.fn();
    desktop.setEventListeners = jest.fn();
    desktop.checkForNewFolders = jest.fn();
    desktop.checkForAppShortcuts = jest.fn();
    desktop.updateTrashIcon = jest.fn();

    desktop.componentDidMount();

    expect(desktop.state.window_positions.outside).toEqual({ x: 512, y: 384 });
    expect(openApp).toHaveBeenCalledWith('outside');

    desktop.componentWillUnmount();
  });
});
