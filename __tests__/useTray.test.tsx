import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { TrayProvider, useTray } from '../hooks/useTray';

describe('useTray', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TrayProvider>{children}</TrayProvider>
  );

  test('registers and unregisters icons', () => {
    const { result } = renderHook(() => useTray(), { wrapper });

    act(() => result.current.register({ id: 'one', legacy: '/1.svg' }));
    act(() => result.current.register({ id: 'two', legacy: '/2.svg' }));
    expect(result.current.icons.map((i) => i.id)).toEqual(['one', 'two']);

    // registering with existing id updates the icon rather than duplicating
    act(() => result.current.register({ id: 'one', legacy: '/1b.svg' }));
    expect(result.current.icons).toHaveLength(2);
    expect(result.current.icons.find((i) => i.id === 'one')?.legacy).toBe(
      '/1b.svg',
    );

    act(() => result.current.unregister('one'));
    expect(result.current.icons.map((i) => i.id)).toEqual(['two']);
  });
});
