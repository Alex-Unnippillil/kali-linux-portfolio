import { renderHook } from '@testing-library/react';
import useReducedMotion from '../hooks/useReducedMotion';
import { useSettings } from '../hooks/useSettings';

jest.mock('../hooks/useSettings');
const useSettingsMock = useSettings as jest.Mock;

const mockMatchMedia = (matches: boolean) =>
  jest.fn().mockImplementation(() => ({
    matches,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));

describe('useReducedMotion', () => {
  test('defaults to system preference', () => {
    useSettingsMock.mockReturnValue({ reducedMotion: false });
    // @ts-ignore
    window.matchMedia = mockMatchMedia(true);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  test('user toggle overrides system preference', () => {
    useSettingsMock.mockReturnValue({ reducedMotion: true });
    // @ts-ignore
    window.matchMedia = mockMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });
});
