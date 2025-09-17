import initIdleReset, {
  IDLE_WARNING_TOAST_ID,
  shouldEnableIdleReset,
} from '../../src/system/idleReset';

describe('shouldEnableIdleReset', () => {
  const originalEnv = process.env.NEXT_PUBLIC_KIOSK_MODE;

  afterEach(() => {
    process.env.NEXT_PUBLIC_KIOSK_MODE = originalEnv;
  });

  it('returns false by default', () => {
    expect(shouldEnableIdleReset()).toBe(false);
  });

  it('honors NEXT_PUBLIC_KIOSK_MODE flag', () => {
    process.env.NEXT_PUBLIC_KIOSK_MODE = 'true';
    expect(shouldEnableIdleReset()).toBe(true);
  });

  it('detects kiosk query parameters', () => {
    const stub = {
      location: {
        search: '?kiosk=1',
        hash: '',
      },
      matchMedia: jest.fn().mockReturnValue({ matches: false }),
    } as unknown as Window;
    expect(shouldEnableIdleReset(stub)).toBe(true);
  });

  it('detects kiosk hash fragments', () => {
    const stub = {
      location: {
        search: '',
        hash: '#mode=kiosk',
      },
      matchMedia: jest.fn().mockReturnValue({ matches: false }),
    } as unknown as Window;
    expect(shouldEnableIdleReset(stub)).toBe(true);
  });

  it('detects kiosk display modes', () => {
    const stub = {
      location: {
        search: '',
        hash: '',
      },
      matchMedia: jest
        .fn()
        .mockImplementation((query: string) => ({ matches: query.includes('display-mode: kiosk') })),
    } as unknown as Window;
    expect(shouldEnableIdleReset(stub)).toBe(true);
  });
});

describe('initIdleReset', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('dispatches warning and reset callbacks', () => {
    const dispatchToast = jest.fn();
    const dismissToast = jest.fn();
    const notify = jest.fn();
    const resetAction = jest.fn();
    const controller = initIdleReset({
      warningMs: 1000,
      resetMs: 1500,
      dispatchToast,
      dismissToast,
      notify,
      resetAction,
      minActivityIntervalMs: 0,
    });

    expect(dispatchToast).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1000);
    expect(dispatchToast).toHaveBeenCalledTimes(1);
    const toastDetail = dispatchToast.mock.calls[0][0];
    expect(toastDetail.id).toBe(IDLE_WARNING_TOAST_ID);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ level: 'warning' }));

    jest.advanceTimersByTime(500);
    expect(resetAction).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenLastCalledWith(expect.objectContaining({ level: 'info' }));

    controller.stop();
  });

  it('resets timers on activity', () => {
    const dispatchToast = jest.fn();
    const dismissToast = jest.fn();
    const controller = initIdleReset({
      warningMs: 1000,
      resetMs: 1500,
      dispatchToast,
      dismissToast,
      notify: jest.fn(),
      resetAction: jest.fn(),
      minActivityIntervalMs: 0,
    });

    jest.advanceTimersByTime(900);
    window.dispatchEvent(new Event('pointerdown'));
    jest.advanceTimersByTime(200);
    expect(dispatchToast).not.toHaveBeenCalled();

    jest.advanceTimersByTime(800);
    expect(dispatchToast).toHaveBeenCalledTimes(1);
    controller.stop();
  });

  it('dismisses warning when activity occurs after warning', () => {
    const dispatchToast = jest.fn();
    const dismissToast = jest.fn();
    const controller = initIdleReset({
      warningMs: 500,
      resetMs: 1500,
      dispatchToast,
      dismissToast,
      notify: jest.fn(),
      resetAction: jest.fn(),
      minActivityIntervalMs: 0,
    });

    jest.advanceTimersByTime(500);
    expect(dispatchToast).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new Event('pointerdown'));
    expect(dismissToast).toHaveBeenCalledWith(IDLE_WARNING_TOAST_ID);
    controller.stop();
  });
});
