import React from 'react';
import { render, screen } from '@testing-library/react';
import FormError from '../components/ui/FormError';
import NotificationCard from '../components/common/notifications/NotificationCard';
import {
  createNotificationTimeFormatter,
  formatNotification,
} from '../components/common/notifications/primitives';
import type { AppNotification } from '../components/common/NotificationCenter';

describe('live region components', () => {
  it('Toast cards use polite live region', () => {
    const baseNotification: AppNotification = {
      id: 'test-toast',
      appId: 'test-suite',
      title: 'Saved',
      body: undefined,
      timestamp: Date.now(),
      read: false,
      priority: 'normal',
      hints: undefined,
      classification: {
        priority: 'normal',
        matchedRuleId: null,
        source: 'default',
      },
      channels: ['toast'],
      autoDismissMs: undefined,
    };
    const formatter = createNotificationTimeFormatter();
    const formatted = formatNotification(baseNotification, formatter);
    const { unmount } = render(
      <NotificationCard notification={formatted} mode="toast" />,
    );
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    unmount();
  });

  it('FormError announces politely', () => {
    render(<FormError>Required field</FormError>);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
  });
});
