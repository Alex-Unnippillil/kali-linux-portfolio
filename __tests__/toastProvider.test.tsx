import React, { useImperativeHandle } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { ToastProvider, useNotifications } from '../components/ui/ToastProvider';

type NotificationsApi = ReturnType<typeof useNotifications>;

const Harness = React.forwardRef<NotificationsApi | null, Record<string, never>>((_, ref) => {
  const api = useNotifications();
  useImperativeHandle(ref, () => api, [api]);
  return null;
});

Harness.displayName = 'NotificationsHarness';

describe('ToastProvider queue', () => {
  it('limits the number of visible toasts to three', async () => {
    const ref = React.createRef<NotificationsApi | null>();
    render(
      <ToastProvider>
        <Harness ref={ref} />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(ref.current).not.toBeNull();
    });

    await act(async () => {
      await ref.current!.notify({ message: 'one', duration: 20000 });
      await ref.current!.notify({ message: 'two', duration: 20000 });
      await ref.current!.notify({ message: 'three', duration: 20000 });
      await ref.current!.notify({ message: 'four', duration: 20000 });
    });

    const statuses = screen.getAllByRole('status');
    expect(statuses).toHaveLength(3);
    expect(screen.queryByText('four')).not.toBeInTheDocument();
  });

  it('merges duplicate messages', async () => {
    const ref = React.createRef<NotificationsApi | null>();
    render(
      <ToastProvider>
        <Harness ref={ref} />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(ref.current).not.toBeNull();
    });

    await act(async () => {
      await ref.current!.notify({ message: 'duplicate', duration: 20000 });
      await ref.current!.notify({ message: 'duplicate', duration: 20000 });
    });

    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByText('×2')).toBeInTheDocument();
  });

  it('promotes queued toasts when one is dismissed', async () => {
    const ref = React.createRef<NotificationsApi | null>();
    const ids: string[] = [];

    render(
      <ToastProvider>
        <Harness ref={ref} />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(ref.current).not.toBeNull();
    });

    await act(async () => {
      ids[0] = await ref.current!.notify({ message: 'alpha', duration: 20000 });
      await ref.current!.notify({ message: 'beta', duration: 20000 });
      await ref.current!.notify({ message: 'gamma', duration: 20000 });
      await ref.current!.notify({ message: 'delta', duration: 20000 });
    });

    expect(screen.queryByText('delta')).not.toBeInTheDocument();

    act(() => {
      ref.current!.dismiss(ids[0]);
    });

    expect(screen.getByText('delta')).toBeInTheDocument();
  });
});
