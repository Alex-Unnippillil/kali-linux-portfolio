import React, { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Window from '../components/base/window';
import { DEFAULT_WINDOW_TOP_OFFSET } from '../utils/windowLayout';

const setViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: height });
};

type RectConfig = {
  x: number;
  y: number;
  width: number;
  height: number;
  followTransform?: boolean;
};

const mockClientRect = (element: HTMLElement, config: RectConfig) => {
  element.getBoundingClientRect = () => {
    const { followTransform, width, height } = config;
    let { x, y } = config;
    if (followTransform) {
      const match = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(element.style.transform || '');
      if (match) {
        x = parseFloat(match[1]);
        y = parseFloat(match[2]);
      }
    }
    return {
      left: x,
      top: y,
      right: x + width,
      bottom: y + height,
      width,
      height,
      x,
      y,
      toJSON: () => {},
    } as DOMRect;
  };
};

beforeEach(() => {
  setViewport(1440, 900);
});

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('react-draggable', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('../components/apps/terminal', () => ({ displayTerminal: jest.fn() }));

describe('Window lifecycle', () => {
  it('invokes callbacks on close', () => {
    jest.useFakeTimers();
    const closed = jest.fn();
  
    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={closed}
        openApp={() => {}}
      />
    );

    const closeButton = screen.getByRole('button', { name: /window close/i });
    fireEvent.click(closeButton);

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(closed).toHaveBeenCalledWith('test-window');
    jest.useRealTimers();
  });
});

describe('Window snapping preview', () => {
  it('shows preview when dragged near left edge', () => {
    setViewport(1920, 1080);
    const ref = React.createRef<Window>();
    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        openApp={() => {}}
        ref={ref}
      />
    );

    const winEl = document.getElementById('test-window')!;
    // Simulate being near the left edge
    mockClientRect(winEl, { x: 5, y: 150, width: 100, height: 100 });

    act(() => {
      ref.current!.handleDrag();
    });

    const preview = screen.getByTestId('snap-preview');
    expect(preview).toBeInTheDocument();
    expect((preview as HTMLElement).style.backdropFilter).toBe('brightness(1.2)');
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
        openApp={() => {}}
        ref={ref}
      />
    );

    const winEl = document.getElementById('test-window')!;
    // Position far from edges
    mockClientRect(winEl, { x: 200, y: 200, width: 100, height: 100 });

    act(() => {
      ref.current!.handleDrag();
    });

    expect(screen.queryByTestId('snap-preview')).toBeNull();
  });

  it('shows top preview when dragged near top edge', () => {
    setViewport(1280, 720);
    const ref = React.createRef<Window>();
    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        openApp={() => {}}
        ref={ref}
      />
    );

    const winEl = document.getElementById('test-window')!;
    mockClientRect(winEl, { x: 400, y: 5, width: 100, height: 100 });

    act(() => {
      ref.current!.handleDrag();
    });

    expect(ref.current!.state.snapPosition).toBe('top');
    const preview = screen.getByTestId('snap-preview');
    expect(preview).toHaveStyle(`height: ${window.innerHeight / 2}px`);
  });
});

describe('Window snapping finalize and release', () => {
  it('snaps window on drag stop near left edge', () => {
    setViewport(1024, 768);
    const ref = React.createRef<Window>();
    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        openApp={() => {}}
        ref={ref}
      />
    );

    const winEl = document.getElementById('test-window')!;
    mockClientRect(winEl, { x: 5, y: 120, width: 100, height: 100, followTransform: true });
    winEl.style.transform = 'translate(5px, 120px)';

    act(() => {
      ref.current!.handleDrag();
    });
    act(() => {
      ref.current!.handleStop();
    });

    expect(ref.current!.state.snapped).toBe('left');
    expect(ref.current!.state.width).toBeCloseTo(50);
    const expectedHeight = ((window.innerHeight - DEFAULT_WINDOW_TOP_OFFSET - 28) / window.innerHeight) * 100;
    expect(ref.current!.state.height).toBeCloseTo(expectedHeight, 5);
    expect(winEl.style.transform).toBe(`translate(0px, ${DEFAULT_WINDOW_TOP_OFFSET}px)`);
  });

  it('snaps window on drag stop near right edge on large viewport', () => {
    setViewport(1920, 1080);
    const ref = React.createRef<Window>();
    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        openApp={() => {}}
        ref={ref}
      />
    );

    const winEl = document.getElementById('test-window')!;
    mockClientRect(winEl, { x: 1820, y: 200, width: 100, height: 100, followTransform: true });
    winEl.style.transform = 'translate(1820px, 200px)';

    act(() => {
      ref.current!.handleDrag();
    });
    act(() => {
      ref.current!.handleStop();
    });

    expect(ref.current!.state.snapped).toBe('right');
    expect(ref.current!.state.width).toBeCloseTo(50);
    const expectedHeight = ((window.innerHeight - DEFAULT_WINDOW_TOP_OFFSET - 28) / window.innerHeight) * 100;
    expect(ref.current!.state.height).toBeCloseTo(expectedHeight, 5);
    expect(winEl.style.transform).toBe(`translate(${window.innerWidth / 2}px, ${DEFAULT_WINDOW_TOP_OFFSET}px)`);
  });

  it('snaps window on drag stop near top edge', () => {
    setViewport(1366, 768);
    const ref = React.createRef<Window>();
    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        openApp={() => {}}
        ref={ref}
      />
    );

    const winEl = document.getElementById('test-window')!;
    mockClientRect(winEl, { x: 400, y: 6, width: 100, height: 100, followTransform: true });
    winEl.style.transform = 'translate(400px, 6px)';

    act(() => {
      ref.current!.handleDrag();
    });
    act(() => {
      ref.current!.handleStop();
    });

    expect(ref.current!.state.snapped).toBe('top');
    expect(ref.current!.state.width).toBeCloseTo(100, 2);
    expect(ref.current!.state.height).toBeCloseTo(50, 2);
    expect(winEl.style.transform).toBe(`translate(0px, ${DEFAULT_WINDOW_TOP_OFFSET}px)`);
  });

  it('releases snap with Alt+ArrowDown restoring size', () => {
    setViewport(1024, 768);
    const ref = React.createRef<Window>();
    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        openApp={() => {}}
        ref={ref}
      />
    );

    const winEl = document.getElementById('test-window')!;
    mockClientRect(winEl, { x: 5, y: 120, width: 100, height: 100, followTransform: true });
    winEl.style.transform = 'translate(5px, 120px)';

    act(() => {
      ref.current!.handleDrag();
    });
    act(() => {
      ref.current!.handleStop();
    });

    expect(ref.current!.state.snapped).toBe('left');
    const snappedHeight = ((window.innerHeight - DEFAULT_WINDOW_TOP_OFFSET - 28) / window.innerHeight) * 100;
    expect(ref.current!.state.height).toBeCloseTo(snappedHeight, 5);

    const keyboardEvent = {
      key: 'ArrowDown',
      altKey: true,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn()
    } as unknown as KeyboardEvent;

    act(() => {
      ref.current!.handleKeyDown({
        key: 'ArrowDown',
        altKey: true,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      } as any);

    });

    expect(ref.current!.state.snapped).toBeNull();
    expect(ref.current!.state.width).toBe(60);
    expect(ref.current!.state.height).toBe(85);
  });

  it('releases snap when starting drag', () => {
    setViewport(1440, 900);
    const ref = React.createRef<Window>();
    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        openApp={() => {}}
        ref={ref}
      />
    );

    const winEl = document.getElementById('test-window')!;
    mockClientRect(winEl, { x: 5, y: 150, width: 100, height: 100, followTransform: true });
    winEl.style.transform = 'translate(5px, 150px)';

    act(() => {
      ref.current!.handleDrag();
    });
    act(() => {
      ref.current!.handleStop();
    });

    expect(ref.current!.state.snapped).toBe('left');
    const snappedHeight = ((window.innerHeight - DEFAULT_WINDOW_TOP_OFFSET - 28) / window.innerHeight) * 100;
    expect(ref.current!.state.height).toBeCloseTo(snappedHeight, 5);

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
        openApp={() => {}}
      />
    );

    const winEl = document.getElementById('test-window')!;
    mockClientRect(winEl, {
      x: 0,
      y: DEFAULT_WINDOW_TOP_OFFSET,
      width: 100,
      height: 100,
      followTransform: true,
    });
    winEl.style.transform = `translate(0px, ${DEFAULT_WINDOW_TOP_OFFSET}px)`;

    const handle = screen.getByText('Test').parentElement!;

    fireEvent.keyDown(handle, { key: ' ', code: 'Space' });
    fireEvent.keyDown(handle, { key: 'ArrowRight' });

    expect(winEl.style.transform).toBe(`translate(10px, ${DEFAULT_WINDOW_TOP_OFFSET}px)`);
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
        openApp={() => {}}
        ref={ref}
      />
    );

    const winEl = document.getElementById('test-window')!;
    mockClientRect(winEl, {
      x: 0,
      y: DEFAULT_WINDOW_TOP_OFFSET,
      width: 100,
      height: 100,
      followTransform: true,
    });
    winEl.style.transform = `translate(0px, ${DEFAULT_WINDOW_TOP_OFFSET}px)`;

    act(() => {
      ref.current!.handleDrag({}, { node: winEl, x: -100, y: -50 } as any);
    });

    expect(winEl.style.transform).toBe(`translate(0px, ${DEFAULT_WINDOW_TOP_OFFSET}px)`);
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
