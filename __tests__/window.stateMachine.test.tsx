import React from 'react';
import { act, render } from '@testing-library/react';
import WindowComponent, { Window as WindowClass } from '../components/base/window';
import {
  measureSafeAreaInset,
  measureSnapBottomInset,
  measureWindowTopOffset,
} from '../utils/windowLayout';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('react-draggable', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('../components/apps/terminal', () => ({ displayTerminal: jest.fn() }));

jest.mock('../utils/windowLayout', () => {
  const actual = jest.requireActual('../utils/windowLayout');
  return {
    ...actual,
    measureSafeAreaInset: jest.fn(() => 0),
    measureWindowTopOffset: jest.fn(() => actual.DEFAULT_WINDOW_TOP_OFFSET),
    measureSnapBottomInset: jest.fn(() => actual.DEFAULT_SNAP_BOTTOM_INSET),
  };
});

type WindowInstance = InstanceType<typeof WindowClass>;

type WindowProps = React.ComponentProps<typeof WindowComponent>;

const defaultProps: WindowProps = {
  id: 'state-machine-window',
  title: 'State Machine',
  screen: () => <div>content</div>,
  focus: () => {},
  hasMinimised: () => {},
  closed: () => {},
  openApp: () => {},
};

const measureWindowTopOffsetMock = measureWindowTopOffset as jest.MockedFunction<typeof measureWindowTopOffset>;
const measureSnapBottomInsetMock = measureSnapBottomInset as jest.MockedFunction<typeof measureSnapBottomInset>;
const measureSafeAreaInsetMock = measureSafeAreaInset as jest.MockedFunction<typeof measureSafeAreaInset>;

describe('Window state transitions', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1440,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 900,
    });
    measureWindowTopOffsetMock.mockReturnValue(64);
    measureSnapBottomInsetMock.mockReturnValue(32);
    measureSafeAreaInsetMock.mockReturnValue(0);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderWindow = (overrides: Partial<WindowProps> = {}) => {
    const ref = React.createRef<WindowInstance>();
    const props = { ...defaultProps, ...overrides };
    const utils = render(<WindowComponent {...props} ref={ref} />);
    const getElement = (extra: Partial<WindowProps> = {}) => (
      <WindowComponent {...defaultProps} {...overrides} {...extra} ref={ref} />
    );
    return { ref, props, ...utils, getElement };
  };

  it('preserves metadata across minimize and restore transitions', () => {
    const { ref, rerender, getElement } = renderWindow();
    const instance = ref.current;
    expect(instance).not.toBeNull();
    if (!instance) {
      return;
    }

    const initialState = instance.state;
    expect(initialState.preMaximizeSize).toBeNull();
    expect(initialState.lastSize).toBeNull();
    expect(initialState.snapPosition).toBeNull();

    act(() => {
      instance.minimizeWindow();
    });

    expect(instance.state.preMaximizeSize).toBeNull();
    expect(instance.state.lastSize).toBeNull();
    expect(instance.state.snapPosition).toBeNull();

    act(() => {
      rerender(getElement({ minimized: true }));
    });

    expect(instance.state.preMaximizeSize).toBeNull();
    expect(instance.state.lastSize).toBeNull();
    expect(instance.state.snapPosition).toBeNull();

    act(() => {
      rerender(getElement({ minimized: false }));
    });

    expect(instance.state.preMaximizeSize).toBeNull();
    expect(instance.state.lastSize).toBeNull();
    expect(instance.state.snapPosition).toBeNull();
  });

  it('tracks last size and clears snap metadata when snapping and unsnapping', () => {
    const { ref } = renderWindow({ snapEnabled: true });
    const instance = ref.current;
    expect(instance).not.toBeNull();
    if (!instance) {
      return;
    }

    const { width: initialWidth, height: initialHeight } = instance.state;

    act(() => {
      instance.snapWindow('left');
    });

    expect(instance.state.snapped).toBe('left');
    expect(instance.state.lastSize).toEqual({ width: initialWidth, height: initialHeight });
    expect(instance.state.preMaximizeSize).toBeNull();
    expect(instance.state.snapPosition).toBeNull();

    act(() => {
      instance.unsnapWindow();
    });

    expect(instance.state.snapped).toBeNull();
    expect(instance.state.width).toBeCloseTo(initialWidth);
    expect(instance.state.height).toBeCloseTo(initialHeight);
    expect(instance.state.lastSize).toEqual({ width: initialWidth, height: initialHeight });
    expect(instance.state.preMaximizeSize).toBeNull();
    expect(instance.state.snapPosition).toBeNull();
  });

  it('restores pre-maximize size metadata after maximizing and restoring', () => {
    const { ref } = renderWindow();
    const instance = ref.current;
    expect(instance).not.toBeNull();
    if (!instance) {
      return;
    }

    const { width: initialWidth, height: initialHeight } = instance.state;

    act(() => {
      instance.maximizeWindow();
    });

    expect(instance.state.maximized).toBe(true);
    expect(instance.state.preMaximizeSize).toEqual({ width: initialWidth, height: initialHeight });
    expect(instance.state.lastSize).toBeNull();
    expect(instance.state.snapPosition).toBeNull();

    act(() => {
      instance.restoreWindow();
    });

    expect(instance.state.maximized).toBe(false);
    expect(instance.state.preMaximizeSize).toBeNull();
    expect(instance.state.width).toBeCloseTo(initialWidth);
    expect(instance.state.height).toBeCloseTo(initialHeight);
    expect(instance.state.lastSize).toBeNull();
    expect(instance.state.snapPosition).toBeNull();
  });
});
