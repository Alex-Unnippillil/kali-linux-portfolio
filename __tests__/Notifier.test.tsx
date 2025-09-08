import React from 'react';
import { render, screen } from '@testing-library/react';
import Notifier, { useNotifier } from '../src/components/notifications/Notifier';

const Trigger: React.FC = () => {
  const { notify } = useNotifier();
  React.useEffect(() => {
    notify('Hello world');
  }, [notify]);
  return null;
};

test('announces notifications with accessible label', () => {
  jest.useFakeTimers();
  render(
    <Notifier>
      <Trigger />
    </Notifier>
  );
  const alert = screen.getByRole('alert');
  expect(alert).toHaveAttribute('aria-label', 'Notification');
  expect(alert).toHaveAttribute('aria-live', 'assertive');
});
