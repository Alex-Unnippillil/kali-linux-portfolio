import { Desktop } from '../components/screen/desktop';
import {
  clampWindowTopPosition,
  DEFAULT_WINDOW_TOP_OFFSET,
  measureWindowTopOffset,
} from '../utils/windowLayout';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));

jest.mock('../utils/windowLayout', () => {
  const actual = jest.requireActual('../utils/windowLayout');
  return {
    ...actual,
    measureWindowTopOffset: jest.fn(() => actual.DEFAULT_WINDOW_TOP_OFFSET),
  };
});

jest.mock('../components/util-components/background-image', () => () => null);

const measureWindowTopOffsetMock = measureWindowTopOffset as jest.MockedFunction<typeof measureWindowTopOffset>;

afterEach(() => {
  jest.clearAllMocks();
});

describe('Desktop session window persistence', () => {
  beforeEach(() => {
    measureWindowTopOffsetMock.mockReturnValue(DEFAULT_WINDOW_TOP_OFFSET);
  });

  it('saves window dimensions alongside positions', () => {
    const setSession = jest.fn();
    const desktop = new Desktop({});

    desktop.props = {
      setSession,
      session: { windows: [], wallpaper: 'aurora', dock: [] },
    } as any;

    desktop.state = {
      ...desktop.state,
      closed_windows: { about: false },
      minimized_windows: {},
      focused_windows: {},
      window_positions: { about: { x: 120, y: 240 } },
      window_sizes: { about: { width: 72, height: 58 } },
    };

    desktop.saveSession();

    expect(setSession).toHaveBeenCalledTimes(1);
    const payload = setSession.mock.calls[0][0];
    const expectedY = clampWindowTopPosition(240, DEFAULT_WINDOW_TOP_OFFSET);
    expect(payload.windows).toEqual([
      { id: 'about', x: 120, y: expectedY, width: 72, height: 58 },
    ]);
  });

  it('restores saved window dimensions when session windows are applied', () => {
    const desktop = new Desktop({});
    desktop.props = {
      session: {
        windows: [
          { id: 'about', x: 140, y: 220, width: 68, height: 60 },
        ],
        wallpaper: 'aurora',
        dock: [],
      },
      snapEnabled: false,
    } as any;

    desktop.openApp = jest.fn();
    desktop.setWorkspaceState = ((updater: any, callback?: () => void) => {
      const partial = typeof updater === 'function' ? updater(desktop.state) : updater;
      desktop.state = { ...desktop.state, ...partial };
      if (callback) callback();
    }) as any;

    const restored = desktop.applySessionWindows(desktop.props.session);
    expect(restored).toBe(true);
    expect(desktop.openApp).toHaveBeenCalledWith('about');

    desktop.state = {
      ...desktop.state,
      closed_windows: { about: false },
      minimized_windows: { about: false },
      focused_windows: { about: true },
    };
    desktop.workspaceStacks[desktop.state.activeWorkspace] = ['about'];

    const windows = desktop.renderWindows();
    const windowsArray = (Array.isArray(windows) ? windows : [windows]).filter(Boolean) as any[];
    expect(windowsArray.length).toBeGreaterThan(0);
    const aboutWindow = windowsArray[0];
    expect(aboutWindow.props.id).toBe('about');
    expect(aboutWindow.props.defaultWidth).toBe(68);
    expect(aboutWindow.props.defaultHeight).toBe(60);
    expect(typeof aboutWindow.props.onSizeChange).toBe('function');
  });
});
