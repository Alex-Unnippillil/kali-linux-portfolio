import { scheduleMotionFrame, shouldReduceMotion } from '../utils/motion';

describe('motion utilities', () => {
  let matchMediaMatches = false;

  beforeEach(() => {
    jest.useFakeTimers();
    document.documentElement.className = '';
    matchMediaMatches = false;
    (window as any).matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: matchMediaMatches,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
    document.documentElement.className = '';
  });

  it('detects reduced motion via the root class toggle', () => {
    expect(shouldReduceMotion()).toBe(false);
    document.documentElement.classList.add('reduced-motion');
    expect(shouldReduceMotion()).toBe(true);
  });

  it('detects reduced motion via matchMedia', () => {
    matchMediaMatches = true;
    expect(shouldReduceMotion()).toBe(true);
  });

  it('uses requestAnimationFrame when motion is allowed', () => {
    const rafSpy = jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        cb(123);
        return 1;
      });
    const cancelSpy = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const callback = jest.fn();

    const handle = scheduleMotionFrame((timestamp) => {
      callback(timestamp);
    });

    expect(rafSpy).toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith(123);

    handle.cancel();
    expect(cancelSpy).toHaveBeenCalledWith(1);
  });

  it('falls back to setTimeout when motion is reduced', () => {
    document.documentElement.classList.add('reduced-motion');
    const timeoutSpy = jest.spyOn(window, 'setTimeout');
    const clearSpy = jest.spyOn(window, 'clearTimeout');
    const callback = jest.fn();

    const handle = scheduleMotionFrame(callback, { fallbackDelay: 50 });

    expect(timeoutSpy).toHaveBeenLastCalledWith(expect.any(Function), 50);

    jest.runOnlyPendingTimers();
    expect(callback).toHaveBeenCalled();

    handle.cancel();
    expect(clearSpy).toHaveBeenCalled();
  });
});
