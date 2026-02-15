import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { NotificationsProvider, useNotifications } from '../store/notifications';

describe('notifications store', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <NotificationsProvider>{children}</NotificationsProvider>
  );

  it('mutes toasts while DND active and restores on disable', () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => result.current.toggleDnd());
    act(() => result.current.push('hello'));

    expect(result.current.notifications).toHaveLength(0);
    expect(result.current.mutedCount).toBe(1);

    act(() => result.current.toggleDnd());

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.mutedCount).toBe(0);
  });
});
