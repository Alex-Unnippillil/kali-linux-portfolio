import React from 'react';
import { act, fireEvent, render, renderHook, waitFor } from '@testing-library/react';
import * as hapticsModule from '../utils/haptics';
import { Desktop } from '../components/screen/desktop';
import DesktopWindow from '../components/desktop/Window';
import { SettingsProvider, useSettings } from '../hooks/useSettings';

type MediaQueryMock = {
  setMatches: (value: boolean) => void;
  restore: () => void;
};

jest.mock('../components/apps/Games/common/haptics', () => ({
  supportsVibration: jest.fn(() => true),
}));

jest.mock('react-ga4', () => ({
  event: jest.fn(),
  send: jest.fn(),
}));

const MINIMIZE_PATTERN = 12;
const MAXIMIZE_PATTERN = 18;
const LAUNCHER_PATTERN = 18;
const CONTEXT_MENU_PATTERN = 8;

describe('vibrateIfEnabled', () => {
  const originalVibrate = navigator.vibrate;

  beforeEach(() => {
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: jest.fn(),
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: originalVibrate,
    });
  });

  it('invokes navigator.vibrate when enabled and supported', () => {
    const result = hapticsModule.vibrateIfEnabled(true, 10);
    expect(result).toBe(true);
    expect(navigator.vibrate).toHaveBeenCalledWith(10);
  });

  it('skips vibration when disabled', () => {
    const result = hapticsModule.vibrateIfEnabled(false, 10);
    expect(result).toBe(false);
    expect(navigator.vibrate).not.toHaveBeenCalled();
  });
});

describe('Desktop haptic actions', () => {
  const baseProps = {
    clearSession: () => {},
    changeBackgroundImage: () => {},
  } as const;
  const originalVibrate = navigator.vibrate;
  const originalRequestAnimationFrame = window.requestAnimationFrame;

  let requestAnimationFrameMock: jest.Mock<number, [FrameRequestCallback]>;

  beforeEach(() => {
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: jest.fn(),
    });
    requestAnimationFrameMock = jest.fn((callback: FrameRequestCallback) => {
      callback(Date.now());
      return 1 as unknown as number;
    });
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      writable: true,
      value: requestAnimationFrameMock,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: originalVibrate,
    });
    if (typeof originalRequestAnimationFrame === 'function') {
      Object.defineProperty(window, 'requestAnimationFrame', {
        configurable: true,
        writable: true,
        value: originalRequestAnimationFrame,
      });
    } else {
      delete (window as Partial<typeof window>).requestAnimationFrame;
    }
  });

  it('delegates triggerHaptic to vibrateIfEnabled with the provided pattern', () => {
    const desktop = new Desktop({ ...baseProps, hapticsEnabled: true } as any);

    desktop.triggerHaptic(42);

    expect(navigator.vibrate).toHaveBeenCalledWith(42);
  });

  it('skips vibration when haptics are disabled', () => {
    const desktop = new Desktop({ ...baseProps, hapticsEnabled: false } as any);

    desktop.triggerHaptic(15);

    expect(navigator.vibrate).not.toHaveBeenCalled();
  });

  it('invokes haptics when opening the launcher overlay', () => {
    const desktop = new Desktop({ ...baseProps, hapticsEnabled: true } as any);
    const trigger = jest.spyOn(desktop, 'triggerHaptic');
    desktop.setState = jest.fn();
    desktop.openOverlay = jest.fn();
    desktop.activateAllAppsFocusTrap = jest.fn();
    desktop.focusAllAppsSearchInput = jest.fn();
    desktop.state.overlayWindows = {
      ...desktop.state.overlayWindows,
      'overlay-launcher': { open: false },
    };
    desktop.openAllAppsOverlay();

    expect(trigger).toHaveBeenCalledWith(LAUNCHER_PATTERN);
  });

  it('invokes haptics when closing the launcher overlay', () => {
    const desktop = new Desktop({ ...baseProps, hapticsEnabled: true } as any);
    const trigger = jest.spyOn(desktop, 'triggerHaptic');
    desktop.setState = jest.fn();
    desktop.closeOverlay = jest.fn();
    desktop.state.overlayWindows = {
      ...desktop.state.overlayWindows,
      'overlay-launcher': { open: true },
    };

    desktop.closeAllAppsOverlay();

    expect(trigger).toHaveBeenCalledWith(LAUNCHER_PATTERN);
  });

  it('invokes haptics for touch context-menu activation', () => {
    const desktop = new Desktop({ ...baseProps, hapticsEnabled: true } as any);
    const trigger = jest.spyOn(desktop, 'triggerHaptic');
    desktop.hideAllContextMenu = jest.fn();
    desktop.showContextMenu = jest.fn();
    desktop.lastContextPointerType = 'touch';

    const target = {
      dataset: { context: 'desktop-area', appId: null },
      closest: () => target,
    } as any;

    desktop.checkContextMenu({ preventDefault: jest.fn(), target } as any);

    expect(trigger).toHaveBeenCalledWith(CONTEXT_MENU_PATTERN);
    expect(desktop.lastContextPointerType).toBeNull();
  });
});

describe('Window haptic instrumentation', () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1440 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 900 });
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: originalInnerHeight,
    });
  });

  const renderWindow = (overrides: Partial<React.ComponentProps<typeof DesktopWindow>> = {}) => {
    const onHapticFeedback = jest.fn();
    const props = {
      id: 'test-window',
      title: 'Test window',
      screen: () => React.createElement('div', null, 'content'),
      focus: () => {},
      hasMinimised: () => {},
      closed: () => {},
      openApp: () => {},
      onHapticFeedback,
      allowMaximize: true,
      ...overrides,
    } as React.ComponentProps<typeof DesktopWindow>;

    const result = render(<DesktopWindow {...props} />);
    return { ...result, onHapticFeedback };
  };

  it('invokes haptic feedback when minimizing a window', () => {
    const { getByRole, onHapticFeedback } = renderWindow();

    const minimizeButton = getByRole('button', { name: /window minimize/i });
    fireEvent.click(minimizeButton);

    expect(onHapticFeedback).toHaveBeenCalledWith(MINIMIZE_PATTERN);
  });

  it('invokes haptic feedback when maximizing a window', () => {
    const { getByRole, onHapticFeedback } = renderWindow();
    const dialog = getByRole('dialog', { name: 'Test window' }) as HTMLElement & {
      getBoundingClientRect: () => DOMRect;
      offsetParent: Element | null;
    };

    dialog.getBoundingClientRect = () =>
      ({
        width: 640,
        height: 480,
        top: 80,
        left: 0,
        right: 640,
        bottom: 560,
        x: 0,
        y: 80,
        toJSON: () => {},
      } as DOMRect);
    Object.defineProperty(dialog, 'offsetParent', {
      configurable: true,
      get: () => null,
    });

    const maximizeButton = getByRole('button', { name: /window maximize/i });
    fireEvent.click(maximizeButton);

    expect(onHapticFeedback).toHaveBeenCalledWith(MAXIMIZE_PATTERN);
  });
});

describe('useSettings haptics', () => {
  const originalMatchMedia = window.matchMedia;

  const setupMatchMedia = (initial: boolean): MediaQueryMock => {
    let matches = initial;
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    const mock: MediaQueryList = {
      matches,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: (_event, listener) => {
        listeners.add(listener as EventListener);
      },
      removeEventListener: (_event, listener) => {
        listeners.delete(listener as EventListener);
      },
      addListener: (listener: EventListener) => {
        listeners.add(listener);
      },
      removeListener: (listener: EventListener) => {
        listeners.delete(listener);
      },
      dispatchEvent: () => false,
    };
    window.matchMedia = jest.fn(() => mock);
    return {
      setMatches: (value: boolean) => {
        matches = value;
        mock.matches = value;
        listeners.forEach((listener) => {
          if (typeof listener === 'function') {
            listener({ matches: value } as MediaQueryListEvent);
          }
        });
      },
      restore: () => {
        window.matchMedia = originalMatchMedia;
      },
    };
  };

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('locks haptics when system reduced-motion is active', async () => {
    const media = setupMatchMedia(true);
    const { result } = renderHook(() => useSettings(), {
      wrapper: SettingsProvider,
    });

    await waitFor(() => expect(result.current.prefersReducedMotion).toBe(true));
    expect(result.current.hapticsLocked).toBe(true);
    expect(result.current.haptics).toBe(false);

    media.restore();
  });

  it('locks haptics when reduced motion is enabled manually', async () => {
    setupMatchMedia(false);
    const { result } = renderHook(() => useSettings(), {
      wrapper: SettingsProvider,
    });

    await waitFor(() => expect(result.current.hapticsLocked).toBe(false));

    act(() => {
      result.current.setReducedMotion(true);
    });

    await waitFor(() => expect(result.current.hapticsLocked).toBe(true));
    expect(result.current.haptics).toBe(false);

    act(() => {
      result.current.setReducedMotion(false);
    });

    await waitFor(() => expect(result.current.hapticsLocked).toBe(false));
  });
});
