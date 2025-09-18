import React from 'react';
import { render, screen } from '@testing-library/react';
import NotificationCenter, { NotificationsContext } from '../components/common/NotificationCenter';

const PushNotification: React.FC = () => {
  const ctx = React.useContext(NotificationsContext);
  const hasPushedRef = React.useRef(false);
  React.useEffect(() => {
    if (!ctx || hasPushedRef.current) return;
    hasPushedRef.current = true;
    ctx.pushNotification('test-app', 'Scan complete');
  }, [ctx]);
  return null;
};

describe('NotificationCenter', () => {
  it('exposes a live region for screen readers', async () => {
    render(
      <NotificationCenter>
        <PushNotification />
      </NotificationCenter>
    );
    const status = screen.getByRole('status', { name: /notification center/i });
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-atomic', 'true');
    expect(await screen.findByText('Scan complete')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /test-app notifications/i })).toBeInTheDocument();
  });
});
