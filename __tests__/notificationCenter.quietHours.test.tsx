import React from 'react';
import { render, act } from '@testing-library/react';
import NotificationCenter from '../components/common/NotificationCenter';
import { useNotifications } from '../hooks/useNotifications';

const NotificationsHarness = React.forwardRef<
  ReturnType<typeof useNotifications> | null,
  Record<string, never>
>((_, ref) => {
  const ctx = useNotifications();
  React.useImperativeHandle(ref, () => ctx, [ctx]);
  return null;
});

NotificationsHarness.displayName = 'NotificationsHarness';

describe('NotificationCenter quiet hours queue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-04-01T23:15:00'));
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('releases queued notifications after quiet hours end', () => {
    const ref = React.createRef<ReturnType<typeof useNotifications>>();

    render(
      <NotificationCenter>
        <NotificationsHarness ref={ref} />
      </NotificationCenter>,
    );

    const ctx = () => {
      if (!ref.current) {
        throw new Error('Notifications context not ready');
      }
      return ref.current;
    };

    act(() => {
      ctx().setQuietHours(prev => ({ ...prev, enabled: true, start: '22:00', end: '07:00' }));
    });

    act(() => {
      ctx().pushNotification({ appId: 'queued-app', title: 'Nightly result' });
    });

    expect(ctx().notifications).toHaveLength(0);

    jest.setSystemTime(new Date('2024-04-02T07:05:00'));

    act(() => {
      jest.advanceTimersByTime(60_000);
    });

    expect(ctx().notifications).toHaveLength(1);
    expect(ctx().notifications[0]).toMatchObject({
      appId: 'queued-app',
      title: 'Nightly result',
    });
  });
});
