import { renderHook, act } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../hooks/useSettings';
import { getMotionDuration } from '../utils/motion';

describe('reduced motion tokens', () => {
  let style: HTMLStyleElement;

  beforeEach(() => {
    style = document.createElement('style');
    style.innerHTML = `
      :root {
        --motion-duration-cap: 100ms;
        --motion-fast-base: 150ms;
        --motion-medium-base: 300ms;
        --motion-slow-base: 500ms;
        --motion-fast: var(--motion-fast-base);
        --motion-medium: var(--motion-medium-base);
        --motion-slow: var(--motion-slow-base);
      }
      html[data-motion='reduced'] {
        --motion-fast: 100ms;
        --motion-medium: 100ms;
        --motion-slow: 100ms;
      }
    `;
    document.head.appendChild(style);
    document.documentElement.dataset.motion = 'standard';
    const store: Record<string, string> = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key: string) => (key in store ? store[key] : null)),
        setItem: jest.fn((key: string, value: string) => {
          store[key] = value;
        }),
        removeItem: jest.fn((key: string) => {
          delete store[key];
        }),
        clear: jest.fn(() => {
          Object.keys(store).forEach((key) => delete store[key]);
        }),
      },
      configurable: true,
    });
    // @ts-ignore set up matchMedia mock
    window.matchMedia = jest.fn().mockReturnValue({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    });
  });

  afterEach(() => {
    document.head.removeChild(style);
    document.documentElement.dataset.motion = '';
  });

  test('caps motion variables when reduced motion is enabled', () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: SettingsProvider,
    });

    expect(document.documentElement.dataset.motion).toBe('standard');
    expect(getMotionDuration('--motion-medium', 300)).toBe(300);

    act(() => result.current.setReducedMotion(true));
    expect(document.documentElement.dataset.motion).toBe('reduced');
    expect(getMotionDuration('--motion-medium', 300)).toBe(100);
    expect(getMotionDuration('--motion-slow', 500)).toBe(100);

    act(() => result.current.setReducedMotion(false));
    expect(document.documentElement.dataset.motion).toBe('standard');
    expect(getMotionDuration('--motion-medium', 300)).toBe(300);
  });
});
