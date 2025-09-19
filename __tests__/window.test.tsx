import React, { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Window from '../components/base/window';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('react-draggable', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('../components/apps/terminal', () => ({ displayTerminal: jest.fn() }));

const parseTranslate = (transform: string) => {
  const match = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(transform || 'translate(0px, 0px)');
  return {
    x: match ? parseFloat(match[1]) : 0,
    y: match ? parseFloat(match[2]) : 0,
  };
};

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
      />
    );

    const closeButton = screen.getByRole('button', { name: /window close/i });
    fireEvent.click(closeButton);

    expect(hideSideBar).toHaveBeenCalledWith('test-window', false);

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(closed).toHaveBeenCalledWith('test-window');
    jest.useRealTimers();
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
      ref.current!.handleKeyDown({ key: 'ArrowDown', altKey: true, preventDefault: () => {}, stopPropagation: () => {} } as any);
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

describe('Window magnet snapping', () => {
  const createRectFromTransform = (node: HTMLElement) => () => {
    const match = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(node.style.transform || 'translate(0px, 0px)');
    const left = match ? parseFloat(match[1]) : 0;
    const top = match ? parseFloat(match[2]) : 0;
    return {
      left,
      top,
      right: left + 100,
      bottom: top + 100,
      width: 100,
      height: 100,
      x: left,
      y: top,
      toJSON: () => { }
    } as DOMRect;
  };

  it('snaps toward neighbouring window edges and shows guides', () => {
    const ref = React.createRef<Window>();
    const onBoundsChange = jest.fn();
    const registry = {
      neighbour: {
        left: 200,
        top: 100,
        right: 320,
        bottom: 220,
        width: 120,
        height: 120,
      }
    };

    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => { }}
        hasMinimised={() => { }}
        closed={() => { }}
        hideSideBar={() => { }}
        openApp={() => { }}
        ref={ref}
        onBoundsChange={onBoundsChange}
        boundsRegistry={registry as any}
      />
    );

    const winEl = document.getElementById('test-window')!;
    winEl.style.transform = 'translate(0px, 0px)';
    winEl.getBoundingClientRect = createRectFromTransform(winEl);

    act(() => {
      ref.current!.handleDrag({} as any, { node: winEl, x: 192, y: 100 } as any);
    });

    const snapped = parseTranslate(winEl.style.transform);
    expect(snapped.x).toBeCloseTo(200, 4);
    expect(snapped.y).toBeCloseTo(ref.current!.state.parentSize.height, 4);
    expect(ref.current!.state.magnetGuides).not.toBeNull();
    expect(onBoundsChange).toHaveBeenCalled();
  });

  it('releases magnet when moving past the threshold or holding Alt', () => {
    const ref = React.createRef<Window>();
    const registry = {
      neighbour: {
        left: 200,
        top: 100,
        right: 320,
        bottom: 220,
        width: 120,
        height: 120,
      }
    };

    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => { }}
        hasMinimised={() => { }}
        closed={() => { }}
        hideSideBar={() => { }}
        openApp={() => { }}
        ref={ref}
        boundsRegistry={registry as any}
      />
    );

    const winEl = document.getElementById('test-window')!;
    winEl.style.transform = 'translate(0px, 0px)';
    winEl.getBoundingClientRect = createRectFromTransform(winEl);

    act(() => {
      ref.current!.handleDrag({} as any, { node: winEl, x: 192, y: 100 } as any);
    });
    const snapped = parseTranslate(winEl.style.transform);
    expect(snapped.x).toBeCloseTo(200, 4);
    expect(snapped.y).toBeCloseTo(ref.current!.state.parentSize.height, 4);

    act(() => {
      ref.current!.handleDrag({} as any, { node: winEl, x: 220, y: 100 } as any);
    });
    const released = parseTranslate(winEl.style.transform);
    expect(released.x).toBeCloseTo(224, 4);
    expect(released.y).toBeCloseTo(ref.current!.state.parentSize.height, 4);
    const guides = ref.current!.state.magnetGuides || [];
    expect(guides.find(g => g.position === registry.neighbour.left)).toBeUndefined();
    expect(guides.find(g => g.position === registry.neighbour.right)).toBeUndefined();

    act(() => {
      ref.current!.handleDrag({ altKey: true } as any, { node: winEl, x: 192, y: 100 } as any);
    });
    const alt = parseTranslate(winEl.style.transform);
    expect(alt.x).toBeCloseTo(192, 4);
    expect(alt.y).toBeCloseTo(ref.current!.state.parentSize.height, 4);
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

    const clamped = parseTranslate(winEl.style.transform);
    expect(clamped.x).toBeGreaterThanOrEqual(0);
    expect(clamped.y).toBeGreaterThanOrEqual(0);
    expect(clamped.x).toBeLessThanOrEqual(ref.current!.state.parentSize.width);
    expect(clamped.y).toBeLessThanOrEqual(ref.current!.state.parentSize.height);
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
