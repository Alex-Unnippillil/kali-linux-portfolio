import rafThrottle from '../utils/rafThrottle';

describe('rafThrottle', () => {
  let rafCb: FrameRequestCallback | null;
  beforeEach(() => {
    rafCb = null;
    (global as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
      rafCb = cb;
      return 1;
    };
    (global as any).cancelAnimationFrame = jest.fn(() => {
      rafCb = null;
    });
  });

  it('runs the callback once per frame with last args', () => {
    const fn = jest.fn();
    const throttled = rafThrottle(fn);
    throttled(1);
    throttled(2);
    expect(fn).not.toHaveBeenCalled();
    rafCb?.(0);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(2);
  });

  it('cancels a pending frame on cancel()', () => {
    const fn = jest.fn();
    const throttled = rafThrottle(fn);
    throttled();
    throttled.cancel();
    expect((global as any).cancelAnimationFrame).toHaveBeenCalled();
  });
});
