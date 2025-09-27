import React, { useEffect } from 'react';
import { act, render, screen } from '@testing-library/react';
import { ToasterProvider, useToast } from '../components/ui/Toaster';

const QueueTrigger = () => {
  const { info } = useToast();
  useEffect(() => {
    info('First toast', { duration: 100 });
    info('Second toast', { duration: 100 });
  }, [info]);
  return null;
};

describe('Toaster queue', () => {
  it('displays queued toasts sequentially', async () => {
    jest.useFakeTimers();

    render(
      <ToasterProvider>
        <QueueTrigger />
      </ToasterProvider>,
    );

    expect(await screen.findByText('First toast')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(100);
    });

    act(() => {
      jest.advanceTimersByTime(250);
    });

    expect(screen.queryByText('First toast')).not.toBeInTheDocument();
    expect(await screen.findByText('Second toast')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(100);
    });

    act(() => {
      jest.advanceTimersByTime(250);
    });

    expect(screen.queryByText('Second toast')).not.toBeInTheDocument();

    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });
});
