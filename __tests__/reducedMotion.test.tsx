import { renderHook, waitFor } from '@testing-library/react';
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion';
import { SettingsProvider } from '../hooks/useSettings';

describe('prefers-reduced-motion handling', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.className = '';
  });

  test('detects system preference via media query', async () => {
    // @ts-expect-error mock matchMedia
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: query.includes('reduced-motion'),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));
    const { result } = renderHook(() => usePrefersReducedMotion(), {
      wrapper: SettingsProvider,
    });
    await waitFor(() => expect(result.current).toBe(true));
  });
});
