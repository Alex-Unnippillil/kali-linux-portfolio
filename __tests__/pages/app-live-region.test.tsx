import React from 'react';
import { act, render } from '@testing-library/react';
import MyApp from '../../pages/_app';

jest.mock('@vercel/analytics/next', () => ({
  Analytics: () => null,
}));

jest.mock('@vercel/speed-insights/next', () => ({
  SpeedInsights: () => null,
}));

jest.mock('next/font/google', () => ({
  Ubuntu: () => ({
    className: 'ubuntu-font',
  }),
}));

describe('MyApp live region integration', () => {
  const DummyPage: React.FC = () => <div>Dummy Page</div>;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
    delete (navigator as unknown as { clipboard?: unknown }).clipboard;
    delete (window as unknown as { Notification?: unknown }).Notification;
  });

  it('announces clipboard events dispatched on window', async () => {
    const { unmount } = render(<MyApp Component={DummyPage} pageProps={{}} />);
    const liveRegion = document.getElementById('live-region');
    expect(liveRegion).not.toBeNull();

    await act(async () => {
      window.dispatchEvent(new Event('copy'));
      jest.runAllTimers();
    });
    expect(liveRegion?.textContent).toBe('Copied to clipboard');

    await act(async () => {
      window.dispatchEvent(new Event('cut'));
      jest.runAllTimers();
    });
    expect(liveRegion?.textContent).toBe('Cut to clipboard');

    await act(async () => {
      window.dispatchEvent(new Event('paste'));
      jest.runAllTimers();
    });
    expect(liveRegion?.textContent).toBe('Pasted from clipboard');

    unmount();
  });

  it('wraps clipboard polyfills and restores Notification on cleanup', async () => {
    const originalWrite = jest.fn().mockResolvedValue(undefined);
    const originalRead = jest.fn().mockResolvedValue('clipboard text');

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: originalWrite,
        readText: originalRead,
      },
    });

    const mockNotification = function MockNotification(this: unknown, title: string) {
      (this as { title: string }).title = title;
    } as unknown as typeof Notification;
    (mockNotification as unknown as { requestPermission: jest.Mock }).requestPermission = jest
      .fn()
      .mockResolvedValue('granted');
    Object.defineProperty(mockNotification, 'permission', {
      configurable: true,
      get: () => 'granted',
    });
    (mockNotification as unknown as { prototype: unknown }).prototype = {};

    window.Notification = mockNotification;

    const { unmount } = render(<MyApp Component={DummyPage} pageProps={{}} />);
    const liveRegion = document.getElementById('live-region') as HTMLElement;

    const wrappedNotification = window.Notification;
    expect(wrappedNotification).not.toBe(mockNotification);

    await act(async () => {
      const writePromise = navigator.clipboard.writeText('hello');
      jest.runAllTimers();
      await writePromise;
    });
    expect(originalWrite).toHaveBeenCalledWith('hello');
    expect(liveRegion.textContent).toBe('Copied to clipboard');

    await act(async () => {
      const readPromise = navigator.clipboard.readText();
      await readPromise;
      jest.runAllTimers();
    });
    expect(originalRead).toHaveBeenCalled();
    expect(liveRegion.textContent).toBe('Pasted from clipboard');

    await act(async () => {
      new window.Notification('Alert', { body: 'Incoming' });
      jest.runAllTimers();
    });
    expect(liveRegion.textContent).toBe('Alert Incoming');

    unmount();
    expect(window.Notification).toBe(mockNotification);
  });
});
