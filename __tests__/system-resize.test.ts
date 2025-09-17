import {
  onWindowResize,
  onPanelResize,
  setPanelResizeTarget,
} from '../src/system/resize';

describe('resize system', () => {
  let originalRAF: typeof window.requestAnimationFrame;
  let originalCancelRAF: typeof window.cancelAnimationFrame;
  let originalResizeObserver: typeof window.ResizeObserver;
  let originalInnerWidth: number;

  beforeEach(() => {
    originalRAF = window.requestAnimationFrame;
    originalCancelRAF = window.cancelAnimationFrame;
    originalResizeObserver = window.ResizeObserver;
    originalInnerWidth = window.innerWidth;
    jest.useFakeTimers();
    window.requestAnimationFrame = ((cb: FrameRequestCallback) =>
      window.setTimeout(() => cb(Date.now()), 0)
    ) as unknown as typeof window.requestAnimationFrame;
    window.cancelAnimationFrame = ((id: number) => {
      window.clearTimeout(id);
    }) as unknown as typeof window.cancelAnimationFrame;
  });

  afterEach(() => {
    setPanelResizeTarget(null);
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    window.requestAnimationFrame = originalRAF;
    window.cancelAnimationFrame = originalCancelRAF;
    if (originalResizeObserver) {
      window.ResizeObserver = originalResizeObserver;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (window as Partial<typeof window>).ResizeObserver;
    }
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalInnerWidth,
    });
  });

  it('throttles rapid window resize events to animation frames', () => {
    const widths: number[] = [];
    const unsubscribe = onWindowResize(({ width }) => {
      widths.push(width);
    });

    expect(widths).toHaveLength(1);

    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
    window.dispatchEvent(new Event('resize'));
    Object.defineProperty(window, 'innerWidth', { value: 960, configurable: true });
    window.dispatchEvent(new Event('resize'));

    // No immediate callback; events are coalesced until the next frame.
    expect(widths).toHaveLength(1);

    jest.advanceTimersByTime(16);

    expect(widths).toHaveLength(2);
    expect(widths[1]).toBe(960);

    unsubscribe();
  });

  it('notifies panel subscribers with debounced ResizeObserver updates', () => {
    const panel = document.createElement('div');
    panel.getBoundingClientRect = () => ({
      width: 200,
      height: 32,
      top: 0,
      left: 0,
      right: 200,
      bottom: 32,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    let observers: MockResizeObserver[];

    class MockResizeObserver {
      private readonly callback: ResizeObserverCallback;

      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
        observers.push(this);
      }

      observe(): void {}

      disconnect(): void {}

      trigger(width: number, height: number) {
        this.callback([
          {
            target: panel,
            contentRect: { width, height } as DOMRectReadOnly,
            borderBoxSize: [] as unknown as ReadonlyArray<ResizeObserverSize>,
            contentBoxSize: [] as unknown as ReadonlyArray<ResizeObserverSize>,
            devicePixelContentBoxSize: [] as unknown as ReadonlyArray<ResizeObserverSize>,
          } as ResizeObserverEntry,
        ]);
      }
    }

    observers = [];

    window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

    setPanelResizeTarget(panel);

    const sizes: Array<{ width: number; height: number }> = [];
    const unsubscribe = onPanelResize(({ width, height }) => {
      sizes.push({ width, height });
    });

    expect(sizes).toHaveLength(1);
    expect(sizes[0]).toEqual({ width: 200, height: 32 });

    const observer = observers[0];
    observer.trigger(240, 40);

    jest.advanceTimersByTime(16);

    expect(sizes).toHaveLength(2);
    expect(sizes[1]).toEqual({ width: 240, height: 40 });

    unsubscribe();
  });
});
