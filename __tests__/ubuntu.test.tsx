import React, { act } from 'react';
import { render, screen } from '@testing-library/react';
import Ubuntu, { VERSION_STORAGE_KEY } from '../components/ubuntu';

jest.mock('../components/screen/desktop', () => function DesktopMock() {
  return <div data-testid="desktop" />;
});
jest.mock('../components/screen/navbar', () => function NavbarMock() {
  return <div data-testid="navbar" />;
});
jest.mock('../components/screen/lock_screen', () => function LockScreenMock() {
  return <div data-testid="lock-screen" />;
});
jest.mock('../components/ui/Toast', () => function ToastMock() {
  return <div data-testid="toast" />;
});
jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));

describe('Ubuntu component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ appVersion: '2.1.0', cacheVersion: 'periodic-cache-v1' }),
    });
    (global as any).caches = {
      keys: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue(true),
    };
    localStorage.clear();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    jest.resetAllMocks();
    delete (global as any).fetch;
    delete (global as any).caches;
    localStorage.clear();
  });

  it('renders boot screen then desktop', async () => {
    await act(async () => {
      render(<Ubuntu />);
      await Promise.resolve();
    });
    const bootLogo = screen.getByAltText('Ubuntu Logo');
    const bootScreen = bootLogo.parentElement as HTMLElement;
    expect(bootScreen).toHaveClass('visible');

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(bootScreen).toHaveClass('invisible');
    expect(screen.getByTestId('desktop')).toBeInTheDocument();
  });

  it('handles lockScreen when status bar is missing', async () => {
    let instance: Ubuntu | null = null;
    await act(async () => {
      render(<Ubuntu ref={(c) => (instance = c)} />);
      await Promise.resolve();
    });
    expect(instance).not.toBeNull();
    act(() => {
      instance!.lockScreen();
      jest.advanceTimersByTime(100);
    });
    expect(instance!.state.screen_locked).toBe(true);
  });

  it('handles shutDown when status bar is missing', async () => {
    let instance: Ubuntu | null = null;
    await act(async () => {
      render(<Ubuntu ref={(c) => (instance = c)} />);
      await Promise.resolve();
    });
    expect(instance).not.toBeNull();
    act(() => {
      instance!.shutDown();
    });
    expect(instance!.state.shutDownScreen).toBe(true);
  });

  it('clears outdated caches when version changes', async () => {
    const keysMock = jest.fn().mockResolvedValue(['cache-a', 'cache-b']);
    const deleteMock = jest.fn().mockResolvedValue(true);
    (global as any).caches = {
      keys: keysMock,
      delete: deleteMock,
    };

    const firstVersion = { appVersion: '1.0.0', cacheVersion: 'cache-v1' };
    const nextVersion = { appVersion: '2.0.0', cacheVersion: 'cache-v2' };
    (global as any).fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => firstVersion })
      .mockResolvedValueOnce({ ok: true, json: async () => nextVersion });

    localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(firstVersion));

    let instance: Ubuntu | null = null;
    await act(async () => {
      render(<Ubuntu ref={(c) => (instance = c)} />);
      await Promise.resolve();
    });
    expect(instance).not.toBeNull();

    await act(async () => {
      await instance!.verifyAppVersion();
    });

    expect(keysMock).toHaveBeenCalledTimes(1);
    expect(deleteMock).toHaveBeenCalledTimes(2);
    const stored = localStorage.getItem(VERSION_STORAGE_KEY);
    expect(stored).toContain('2.0.0');
  });
});
