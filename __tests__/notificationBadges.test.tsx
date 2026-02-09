import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import NotificationCenter from '../components/common/NotificationCenter';
import { useNotificationBadges, useNotifications } from '../hooks/useNotifications';

const wrapper = ({ children }: { children: ReactNode }) => (
  <NotificationCenter>{children}</NotificationCenter>
);

describe('useNotificationBadges', () => {
  test('summarizes unread notifications into count badges', async () => {
    const { result } = renderHook(
      () => {
        const notifications = useNotifications();
        const badges = useNotificationBadges({ maxCount: 2 });
        return { notifications, badges };
      },
      { wrapper },
    );

    act(() => {
      result.current.notifications.pushNotification({
        appId: 'alpha',
        title: 'Low priority note',
        priority: 'low',
      });
      result.current.notifications.pushNotification({
        appId: 'alpha',
        title: 'High priority note',
        priority: 'high',
      });
      result.current.notifications.pushNotification({
        appId: 'beta',
        title: 'Normal update',
        priority: 'normal',
      });
      result.current.notifications.pushNotification({
        appId: 'alpha',
        title: 'Extra',
        priority: 'normal',
      });
    });

    await waitFor(() => {
      expect(result.current.badges.alpha).toBeDefined();
      expect(result.current.badges.beta).toBeDefined();
    });

    expect(result.current.badges.alpha.displayValue).toBe('2+');
    expect(result.current.badges.alpha.tone).toBe('warning');
    expect(result.current.badges.alpha.pulse).toBe(true);

    expect(result.current.badges.beta.displayValue).toBe('1');
    expect(result.current.badges.beta.tone).toBe('info');
    expect(result.current.badges.beta.pulse).toBe(false);
  });
});
