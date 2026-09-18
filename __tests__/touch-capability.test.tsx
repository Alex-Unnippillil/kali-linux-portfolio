import { act, renderHook } from '@testing-library/react';
import useIsTouchDevice from '../hooks/useIsTouchDevice';
test('a hybrid laptop supports touch even when the primary pointer is a mouse', () => {
  const match = jest.spyOn(window, 'matchMedia').mockImplementation(query => ({ matches: query === '(any-pointer: coarse)', media: query, onchange: null, addListener: jest.fn(), removeListener: jest.fn(), addEventListener: jest.fn(), removeEventListener: jest.fn(), dispatchEvent: jest.fn() }));
  const { result, unmount } = renderHook(() => useIsTouchDevice());
  expect(result.current).toBe(true);
  act(() => { const event = new Event('pointerdown'); Object.defineProperty(event, 'pointerType', { value: 'mouse' }); window.dispatchEvent(event); });
  expect(result.current).toBe(true);
  unmount(); match.mockRestore();
});
