import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InstallButton from '../components/InstallButton';
import { initA2HS } from '@/src/pwa/a2hs';

describe('InstallButton', () => {
  test('shows install prompt when beforeinstallprompt fires', async () => {
    render(<InstallButton />);
    initA2HS();
    expect(screen.queryByRole('dialog')).toBeNull();

    let resolveChoice: (value: any) => void = () => {};
    const userChoice = new Promise((resolve) => {
      resolveChoice = resolve;
    });

    const prompt = jest.fn().mockResolvedValue(undefined);
    const event: any = new Event('beforeinstallprompt');
    event.preventDefault = jest.fn();
    event.prompt = prompt;
    event.userChoice = userChoice;

    await act(async () => {
      window.dispatchEvent(event);
    });

    // The install prompt shouldn't trigger automatically.
    expect(prompt).not.toHaveBeenCalled();

    const button = await screen.findByRole('button', { name: /install app/i });
    await userEvent.click(button);
    expect(prompt).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveChoice({ outcome: 'accepted', platform: 'test' });
      await userChoice;
    });

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  test('can be focused via keyboard', async () => {
    render(<InstallButton />);
    initA2HS();
    const event: any = new Event('beforeinstallprompt');
    event.preventDefault = jest.fn();
    event.prompt = jest.fn();
    event.userChoice = Promise.resolve({ outcome: 'dismissed' });
    await act(async () => {
      window.dispatchEvent(event);
    });
    const button = await screen.findByRole('button', { name: /install app/i });
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    expect(button).toHaveFocus();
  });

  test('dismiss action hides the prompt', async () => {
    render(<InstallButton />);
    initA2HS();
    const event: any = new Event('beforeinstallprompt');
    event.preventDefault = jest.fn();
    event.prompt = jest.fn();
    event.userChoice = Promise.resolve({ outcome: 'dismissed' });
    await act(async () => {
      window.dispatchEvent(event);
    });

    const dismissButton = await screen.findByRole('button', { name: /not now/i });
    await userEvent.click(dismissButton);

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
