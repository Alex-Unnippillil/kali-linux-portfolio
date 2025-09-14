import React, { useEffect } from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import NotificationCenter from '../components/common/NotificationCenter';
import useNotifications from '../hooks/useNotifications';

describe('NotificationCenter badge fallback', () => {
  const originalTitle = document.title;
  const nav: any = navigator;
  const originalSet = nav.setAppBadge;
  const originalClear = nav.clearAppBadge;

  beforeEach(() => {
    document.title = 'Test';
    delete nav.setAppBadge;
    delete nav.clearAppBadge;
  });

  afterEach(() => {
    document.title = originalTitle;
    if (originalSet !== undefined) nav.setAppBadge = originalSet;
    if (originalClear !== undefined) nav.clearAppBadge = originalClear;
  });

  it('updates document.title when badge API is unavailable', async () => {
    const TestComponent: React.FC = () => {
      const { pushNotification, clearNotifications } = useNotifications();
      useEffect(() => {
        pushNotification('app', 'hi');
      }, [pushNotification]);
      return <button onClick={() => clearNotifications()}>clear</button>;
    };

    const { getByText } = render(
      <NotificationCenter>
        <TestComponent />
      </NotificationCenter>
    );

    await waitFor(() => expect(document.title).toBe('(1) Test'));
    fireEvent.click(getByText('clear'));
    await waitFor(() => expect(document.title).toBe('Test'));
  });
});
