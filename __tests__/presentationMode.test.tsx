import { renderHook, act } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../hooks/useSettings';

test('presentation mode toggles brightness', () => {
  const { result } = renderHook(() => useSettings(), { wrapper: SettingsProvider });
  act(() => result.current.setBrightness(0.7));
  act(() => result.current.setPresentationMode(true));
  expect(result.current.brightness).toBe(1);
  act(() => result.current.setPresentationMode(false));
  expect(result.current.brightness).toBe(0.7);
});
