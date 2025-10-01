import { act } from '@testing-library/react';

const mockSupport = () => {
  Object.defineProperty(window, 'onbeforeinstallprompt', {
    configurable: true,
    writable: true,
    value: null,
  });
};

const createPromptEvent = () => {
  const event: any = new Event('beforeinstallprompt');
  event.preventDefault = jest.fn();
  event.prompt = jest.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome: 'dismissed', platform: 'test' });
  return event;
};

describe('Add to Home Screen flow', () => {
  beforeEach(() => {
    jest.resetModules();
    localStorage.clear();
    mockSupport();
  });

  afterEach(() => {
    delete (window as any).onbeforeinstallprompt;
    jest.useRealTimers();
  });

  test('dispatches availability only after navigation threshold is met', async () => {
    const { initA2HS, recordNavigationEvent } = await import('@/src/pwa/a2hs');
    const listener = jest.fn();
    window.addEventListener('a2hs:available', listener);

    initA2HS({ navigationThreshold: 2 });

    const event = createPromptEvent();
    await act(async () => {
      window.dispatchEvent(event);
    });

    expect(listener).not.toHaveBeenCalled();

    recordNavigationEvent();
    expect(listener).not.toHaveBeenCalled();

    recordNavigationEvent();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test('suppresses prompts for 30 days after dismissal', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    const { initA2HS, recordNavigationEvent, dismissA2HS, isA2HSSuppressed } = await import('@/src/pwa/a2hs');
    const listener = jest.fn();
    window.addEventListener('a2hs:available', listener);

    initA2HS({ navigationThreshold: 1 });

    await act(async () => {
      window.dispatchEvent(createPromptEvent());
    });

    recordNavigationEvent();
    expect(listener).toHaveBeenCalledTimes(1);

    dismissA2HS();
    expect(isA2HSSuppressed()).toBe(true);

    listener.mockClear();

    await act(async () => {
      window.dispatchEvent(createPromptEvent());
    });

    recordNavigationEvent();
    expect(listener).not.toHaveBeenCalled();

    const thirtyOneDaysMs = 31 * 24 * 60 * 60 * 1000;
    localStorage.setItem('a2hs.dismissedAt', (Date.now() - thirtyOneDaysMs).toString());

    await act(async () => {
      window.dispatchEvent(createPromptEvent());
    });

    recordNavigationEvent();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

