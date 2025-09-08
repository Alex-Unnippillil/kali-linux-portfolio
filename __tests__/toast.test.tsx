import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { toast } from '../hooks/useToast';
import ToastProvider from '../components/notifications/ToastProvider';

const setup = () => {
  render(
    <ToastProvider>
      <div />
    </ToastProvider>,
  );
};

test('shows and auto-dismisses toast', () => {
  jest.useFakeTimers();
  setup();
  act(() => {
    toast('Hello', { duration: 1000 });
  });
  const status = screen.getByRole('status');
  expect(status).toHaveAttribute('aria-live', 'polite');
  expect(status).toHaveTextContent('Hello');
  act(() => {
    jest.advanceTimersByTime(1300);
  });
  expect(screen.queryByText('Hello')).not.toBeInTheDocument();
});

test('allows manual dismissal', () => {
  jest.useFakeTimers();
  setup();
  act(() => {
    toast('Bye', { duration: 10000 });
  });
  const btn = screen.getByRole('button', { name: /dismiss/i });
  act(() => {
    btn.click();
  });
  expect(screen.queryByText('Bye')).not.toBeInTheDocument();
});
