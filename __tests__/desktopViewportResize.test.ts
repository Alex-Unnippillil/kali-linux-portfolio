import { Desktop } from '../components/screen/desktop';
import { measureSafeAreaInset, measureSnapBottomInset, measureWindowTopOffset } from '../utils/windowLayout';

const setViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: height });
};

describe('Desktop viewport resize handling', () => {
  beforeEach(() => {
    setViewport(1440, 900);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('clamps saved window positions within the new viewport bounds', () => {
    setViewport(800, 600);
    const desktop = new Desktop({});
    desktop.props = desktop.props || {};
    desktop.configureTouchTargets = jest.fn();
    desktop.realignIconPositions = jest.fn();
    desktop.saveSession = jest.fn();
    desktop.commitWorkspacePartial = jest.fn();

    desktop.state = {
      closed_windows: { app1: false, app2: false },
      minimized_windows: {},
      focused_windows: {},
      window_positions: {
        app1: { x: 1400, y: 900 },
        app2: { x: -120, y: 20 },
      },
    } as any;

    const nodes: Record<string, any> = {
      app1: {
        getBoundingClientRect: () => ({
          left: 0,
          top: 0,
          right: 420,
          bottom: 320,
          width: 420,
          height: 320,
          x: 0,
          y: 0,
          toJSON: () => {},
        }),
        style: {
          getPropertyValue: jest.fn(() => ''),
          transform: '',
        },
      },
      app2: {
        getBoundingClientRect: () => ({
          left: 0,
          top: 0,
          right: 300,
          bottom: 200,
          width: 300,
          height: 200,
          x: 0,
          y: 0,
          toJSON: () => {},
        }),
        style: {
          getPropertyValue: jest.fn(() => ''),
          transform: '',
        },
      },
    };

    const getElementSpy = jest
      .spyOn(document, 'getElementById')
      .mockImplementation((id: string) => nodes[id] || null);

    const updates: any[] = [];
    desktop.setWorkspaceState = jest.fn((updater: any, callback?: () => void) => {
      let partial = updater;
      if (typeof updater === 'function') {
        partial = updater(desktop.state);
      }
      desktop.state = { ...desktop.state, ...partial };
      updates.push(partial);
      if (typeof callback === 'function') {
        callback();
      }
    });

    desktop.handleViewportResize();

    expect(updates).toHaveLength(1);
    const positions = desktop.state.window_positions;
    const topOffset = measureWindowTopOffset();
    const safeBottom = Math.max(0, measureSafeAreaInset('bottom'));
    const snapBottomInset = measureSnapBottomInset();
    const expectedApp1Y = topOffset + Math.max(600 - topOffset - snapBottomInset - safeBottom - 320, 0);
    expect(positions.app1).toEqual({ x: 380, y: expectedApp1Y });
    expect(positions.app2).toEqual({ x: 0, y: topOffset });

    getElementSpy.mockRestore();
  });
});
