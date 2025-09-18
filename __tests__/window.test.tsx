import React, { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Window from '../components/base/window';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('react-draggable', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('../components/apps/terminal', () => ({ displayTerminal: jest.fn() }));

const originalAnimate = HTMLElement.prototype.animate;
let animateMock: jest.Mock;

type MeasureSpyControls = {
  spy: jest.SpyInstance | null;
  restore: () => void;
};

const createPerformanceEntry = (name: string): PerformanceMeasure =>
  ({
    name,
    entryType: 'measure',
    duration: 150,
    startTime: 0,
    detail: null,
    toJSON: () => ({}),
  } as unknown as PerformanceMeasure);

const setupPerformanceMeasureSpy = (): MeasureSpyControls => {
  if (typeof performance === 'undefined') {
    return { spy: null, restore: () => {} };
  }

  const hadMeasure = typeof performance.measure === 'function';
  if (!hadMeasure) {
    Object.defineProperty(performance, 'measure', {
      configurable: true,
      writable: true,
      value: () => createPerformanceEntry(''),
    });
  }

  const spy = jest.spyOn(performance as Performance, 'measure');
  return {
    spy,
    restore: () => {
      if (spy) {
        spy.mockRestore();
      }
      if (!hadMeasure) {
        delete (performance as any).measure;
      }
    },
  };
};

beforeEach(() => {
  animateMock = jest.fn(() => ({ onfinish: null, oncancel: null, cancel: jest.fn() }));
  // @ts-ignore
  HTMLElement.prototype.animate = animateMock;
  const area = document.createElement('div');
  area.id = 'window-area';
  area.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    right: 800,
    bottom: 600,
    width: 800,
    height: 600,
    x: 0,
    y: 0,
    toJSON: () => {},
  });
  document.body.appendChild(area);
  if (typeof performance !== 'undefined') {
    if (typeof performance.clearMarks === 'function') performance.clearMarks();
    if (typeof performance.clearMeasures === 'function') performance.clearMeasures();
  }
});

afterEach(() => {
  document.getElementById('window-area')?.remove();
  if (originalAnimate) {
    HTMLElement.prototype.animate = originalAnimate;
  } else {
    // @ts-ignore
    delete HTMLElement.prototype.animate;
  }
  jest.clearAllTimers();
  jest.useRealTimers();
  if (typeof performance !== 'undefined') {
    if (typeof performance.clearMarks === 'function') performance.clearMarks();
    if (typeof performance.clearMeasures === 'function') performance.clearMeasures();
  }
});

describe('Window lifecycle', () => {
  it('invokes callbacks on close', () => {
    jest.useFakeTimers();
    const closed = jest.fn();
    const hideSideBar = jest.fn();

    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={closed}
        hideSideBar={hideSideBar}
        openApp={() => {}}
        taskbarOrigin={{ x: 320, y: 720 }}
      />
    );

    const winEl = document.getElementById('test-window')!;
    winEl.style.transform = 'translate(120px, 80px)';
    winEl.getBoundingClientRect = () => ({
      left: 120,
      top: 80,
      right: 520,
      bottom: 380,
      width: 400,
      height: 300,
      x: 120,
      y: 80,
      toJSON: () => {},
    });

    act(() => {
      jest.runOnlyPendingTimers();
    });

    const closeButton = screen.getByRole('button', { name: /window close/i });
    fireEvent.click(closeButton);

    expect(hideSideBar).toHaveBeenCalledWith('test-window', false);
    expect(closed).not.toHaveBeenCalled();

    const closeAnimation = animateMock.mock.results[animateMock.mock.results.length - 1]?.value as {
      onfinish: (() => void) | null;
    };
    act(() => {
      closeAnimation?.onfinish?.();
    });

    expect(closed).toHaveBeenCalledWith('test-window');
  });
});

describe('Window animations', () => {
  it('animates open from taskbar origin within motion budget', () => {
    jest.useFakeTimers();
    const { spy: measureSpy, restore } = setupPerformanceMeasureSpy();
    if (!measureSpy) {
      throw new Error('performance.measure is not available in this environment');
    }
    measureSpy.mockImplementation((name: string) => createPerformanceEntry(name));

    try {
      render(
        <Window
          id="test-window"
          title="Test"
          screen={() => <div>content</div>}
          focus={() => {}}
          hasMinimised={() => {}}
          closed={() => {}}
          hideSideBar={() => {}}
          openApp={() => {}}
          taskbarOrigin={{ x: 320, y: 720 }}
        />
      );

      const winEl = document.getElementById('test-window')!;
      winEl.style.transform = 'translate(120px, 80px)';
      winEl.getBoundingClientRect = () => ({
        left: 120,
        top: 80,
        right: 520,
        bottom: 380,
        width: 400,
        height: 300,
        x: 120,
        y: 80,
        toJSON: () => {},
      });

      act(() => {
        jest.runOnlyPendingTimers();
      });

      expect(animateMock).toHaveBeenCalled();
      const [, options] = animateMock.mock.calls[0];
      expect(options.duration).toBeLessThanOrEqual(180);
      expect(document.getElementById('test-window')!.style.transformOrigin).toBe('200px 640px');

      const openAnimation = animateMock.mock.results[0]?.value as { onfinish: (() => void) | null };
      act(() => {
        openAnimation?.onfinish?.();
      });

      expect(measureSpy).toHaveBeenCalledWith(
        'window-open:test-window',
        'window-open-start:test-window',
        'window-open-end:test-window'
      );
      const measurement = measureSpy.mock.results[measureSpy.mock.results.length - 1]?.value as
        | PerformanceMeasure
        | undefined;
      expect(measurement).toBeDefined();
      if (measurement) {
        expect(measurement.duration).toBeLessThanOrEqual(180);
      }
    } finally {
      restore();
    }
  });

  it('records performance trace for close animation', () => {
    jest.useFakeTimers();
    const closed = jest.fn();
    const hideSideBar = jest.fn();
    const { spy: measureSpy, restore } = setupPerformanceMeasureSpy();
    if (!measureSpy) {
      throw new Error('performance.measure is not available in this environment');
    }
    measureSpy.mockImplementation((name: string) => createPerformanceEntry(name));

    try {
      render(
        <Window
          id="test-window"
          title="Test"
          screen={() => <div>content</div>}
          focus={() => {}}
          hasMinimised={() => {}}
          closed={closed}
          hideSideBar={hideSideBar}
          openApp={() => {}}
          taskbarOrigin={{ x: 320, y: 720 }}
        />
      );

      const winEl = document.getElementById('test-window')!;
      winEl.style.transform = 'translate(120px, 80px)';
      winEl.getBoundingClientRect = () => ({
        left: 120,
        top: 80,
        right: 520,
        bottom: 380,
        width: 400,
        height: 300,
        x: 120,
        y: 80,
        toJSON: () => {},
      });

      act(() => {
        jest.runOnlyPendingTimers();
      });

      const closeButton = screen.getByRole('button', { name: /window close/i });
      fireEvent.click(closeButton);
      expect(hideSideBar).toHaveBeenCalledWith('test-window', false);

      const closeAnimation = animateMock.mock.results[animateMock.mock.results.length - 1]?.value as {
        onfinish: (() => void) | null;
      };
      act(() => {
        closeAnimation?.onfinish?.();
      });

      expect(measureSpy).toHaveBeenCalledWith(
        'window-close:test-window',
        'window-close-start:test-window',
        'window-close-end:test-window'
      );
      const measurement = measureSpy.mock.results[measureSpy.mock.results.length - 1]?.value as
        | PerformanceMeasure
        | undefined;
      expect(measurement).toBeDefined();
      if (measurement) {
        expect(measurement.duration).toBeLessThanOrEqual(180);
      }
      expect(closed).toHaveBeenCalledWith('test-window');
    } finally {
      restore();
    }
  });
});

describe('Window snapping preview', () => {
  it('shows preview when dragged near left edge', () => {
    const ref = React.createRef<Window>();
    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        hideSideBar={() => {}}
        openApp={() => {}}
        ref={ref}
      />
    );

    const winEl = document.getElementById('test-window')!;
    // Simulate being near the left edge
    winEl.getBoundingClientRect = () => ({
      left: 5,
      top: 10,
      right: 105,
      bottom: 110,
      width: 100,
      height: 100,
      x: 5,
      y: 10,
      toJSON: () => {}
    });

    act(() => {
      ref.current!.handleDrag();
    });

    expect(screen.getByTestId('snap-preview')).toBeInTheDocument();
  });

  it('hides preview when away from edge', () => {
    const ref = React.createRef<Window>();
    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        hideSideBar={() => {}}
        openApp={() => {}}
        ref={ref}
      />
    );

    const winEl = document.getElementById('test-window')!;
    // Position far from edges
    winEl.getBoundingClientRect = () => ({
      left: 200,
      top: 200,
      right: 300,
      bottom: 300,
      width: 100,
      height: 100,
      x: 200,
      y: 200,
      toJSON: () => {}
    });

    act(() => {
      ref.current!.handleDrag();
    });

    expect(screen.queryByTestId('snap-preview')).toBeNull();
  });
});

describe('Window snapping finalize and release', () => {
  it('snaps window on drag stop near left edge', () => {
    const ref = React.createRef<Window>();
    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        hideSideBar={() => {}}
        openApp={() => {}}
        ref={ref}
      />
    );

    const winEl = document.getElementById('test-window')!;
    winEl.getBoundingClientRect = () => ({
      left: 5,
      top: 10,
      right: 105,
      bottom: 110,
      width: 100,
      height: 100,
      x: 5,
      y: 10,
      toJSON: () => {}
    });

    act(() => {
      ref.current!.handleDrag();
    });
    act(() => {
      ref.current!.handleStop();
    });

    expect(ref.current!.state.snapped).toBe('left');
    expect(ref.current!.state.width).toBe(50);
    expect(ref.current!.state.height).toBe(96.3);
  });

  it('releases snap with Alt+ArrowDown restoring size', () => {
    const ref = React.createRef<Window>();
    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        hideSideBar={() => {}}
        openApp={() => {}}
        ref={ref}
      />
    );

    const winEl = document.getElementById('test-window')!;
    winEl.getBoundingClientRect = () => ({
      left: 5,
      top: 10,
      right: 105,
      bottom: 110,
      width: 100,
      height: 100,
      x: 5,
      y: 10,
      toJSON: () => {}
    });

    act(() => {
      ref.current!.handleDrag();
    });
    act(() => {
      ref.current!.handleStop();
    });

    expect(ref.current!.state.snapped).toBe('left');

    act(() => {
      ref.current!.handleKeyDown({
        key: 'ArrowDown',
        altKey: true,
        preventDefault: () => {},
        stopPropagation: () => {},
      } as any);
    });

    expect(ref.current!.state.snapped).toBeNull();
    expect(ref.current!.state.width).toBe(60);
    expect(ref.current!.state.height).toBe(85);
  });

  it('releases snap when starting drag', () => {
    const ref = React.createRef<Window>();
    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        hideSideBar={() => {}}
        openApp={() => {}}
        ref={ref}
      />
    );

    const winEl = document.getElementById('test-window')!;
    winEl.getBoundingClientRect = () => ({
      left: 5,
      top: 10,
      right: 105,
      bottom: 110,
      width: 100,
      height: 100,
      x: 5,
      y: 10,
      toJSON: () => {}
    });

    act(() => {
      ref.current!.handleDrag();
    });
    act(() => {
      ref.current!.handleStop();
    });

    expect(ref.current!.state.snapped).toBe('left');

    act(() => {
      ref.current!.changeCursorToMove();
    });

    expect(ref.current!.state.snapped).toBeNull();
    expect(ref.current!.state.width).toBe(60);
    expect(ref.current!.state.height).toBe(85);
  });
});

describe('Window keyboard dragging', () => {
  it('moves window using arrow keys with grabbed state', () => {
    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        hideSideBar={() => {}}
        openApp={() => {}}
      />
    );

    const handle = screen.getByText('Test').parentElement!;

    fireEvent.keyDown(handle, { key: ' ', code: 'Space' });
    fireEvent.keyDown(handle, { key: 'ArrowRight' });

    const winEl = document.getElementById('test-window')!;
    expect(winEl.style.transform).toBe('translate(10px, 0px)');
    expect(handle).toHaveAttribute('aria-grabbed', 'true');

    fireEvent.keyDown(handle, { key: ' ', code: 'Space' });
    expect(handle).toHaveAttribute('aria-grabbed', 'false');
  });
});

describe('Edge resistance', () => {
  it('clamps drag movement near boundaries', () => {
    const ref = React.createRef<Window>();
    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        hideSideBar={() => {}}
        openApp={() => {}}
        ref={ref}
      />
    );

    const winEl = document.getElementById('test-window')!;
    winEl.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 100,
      bottom: 100,
      width: 100,
      height: 100,
      x: 0,
      y: 0,
      toJSON: () => {}
    });

    act(() => {
      ref.current!.handleDrag({}, { node: winEl, x: -100, y: -50 } as any);
    });

    expect(winEl.style.transform).toBe('translate(0px, 0px)');
  });
});

describe('Window overlay inert behaviour', () => {
  it('sets and removes inert on default __next root restoring focus', () => {
    const ref = React.createRef<Window>();
    const root = document.createElement('div');
    root.id = '__next';
    document.body.appendChild(root);

    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();

    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        hideSideBar={() => {}}
        openApp={() => {}}
        ref={ref}
      />,
      { container: root }
    );

    act(() => {
      ref.current!.activateOverlay();
    });

    expect(root).toHaveAttribute('inert');

    act(() => {
      ref.current!.closeWindow();
    });

    expect(root).not.toHaveAttribute('inert');

    document.body.removeChild(root);
    document.body.removeChild(opener);
  });

  it('respects overlayRoot prop when provided', () => {
    const ref = React.createRef<Window>();
    const root = document.createElement('div');
    root.id = 'custom-root';
    document.body.appendChild(root);

    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();

    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        hideSideBar={() => {}}
        openApp={() => {}}
        ref={ref}
        overlayRoot="custom-root"
      />,
      { container: root }
    );

    act(() => {
      ref.current!.activateOverlay();
    });

    expect(root).toHaveAttribute('inert');

    act(() => {
      ref.current!.closeWindow();
    });

    expect(root).not.toHaveAttribute('inert');

    document.body.removeChild(root);
    document.body.removeChild(opener);
  });
});
