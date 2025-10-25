import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PushSubscribeButton from '../components/PushSubscribeButton';

describe('PushSubscribeButton', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'AAA';
  });

  afterEach(() => {
    delete (navigator as any).serviceWorker;
    jest.restoreAllMocks();
  });

  test('subscribes and posts subscription', async () => {
    const subscribe = jest.fn().mockResolvedValue({
      toJSON: () => ({ endpoint: 'https://example.com' }),
    });
    (navigator as any).serviceWorker = {
      ready: Promise.resolve({ pushManager: { subscribe } }),
    };
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true } as any);

    render(<PushSubscribeButton />);
    const button = screen.getByRole('button', { name: /enable push/i });
    await userEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText(/push notifications enabled/i)).toBeInTheDocument();
    });

    expect(subscribe).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/push/subscribe',
      expect.objectContaining({ method: 'POST' })
    );
  });

  test('shows error on failure', async () => {
    const subscribe = jest.fn().mockRejectedValue(new Error('fail'));
    (navigator as any).serviceWorker = {
      ready: Promise.resolve({ pushManager: { subscribe } }),
    };
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as any);

    render(<PushSubscribeButton />);
    const button = screen.getByRole('button', { name: /enable push/i });
    await userEvent.click(button);
    await waitFor(() => {
      expect(
        screen.getByText(/failed to enable push notifications/i)
      ).toBeInTheDocument();
    });
  });
});
