import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InstallButton from '../components/InstallButton';
import { initA2HS, BeforeInstallPromptEvent } from '../src/pwa/a2hs';

describe('InstallButton', () => {
  test('shows install prompt when beforeinstallprompt fires', async () => {
    render(<InstallButton />);
    initA2HS();
    expect(screen.queryByText(/install/i)).toBeNull();

    let resolveChoice: (value: { outcome: 'accepted' | 'dismissed'; platform: string }) => void = () => {};
    const userChoice = new Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>((resolve) => {
      resolveChoice = resolve;
    });

    const prompt = jest.fn().mockResolvedValue(undefined);
    const event = new Event('beforeinstallprompt') as BeforeInstallPromptEvent;
    Object.defineProperty(event, 'preventDefault', { value: jest.fn() });
    Object.defineProperty(event, 'prompt', { value: prompt });
    Object.defineProperty(event, 'userChoice', { value: userChoice });

    await act(async () => {
      window.dispatchEvent(event);
    });

    // The install prompt shouldn't trigger automatically.
    expect(prompt).not.toHaveBeenCalled();

    const button = await screen.findByText(/install/i);
    await userEvent.click(button);
    expect(prompt).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveChoice({ outcome: 'accepted', platform: 'test' });
      await userChoice;
    });

    await waitFor(() => expect(screen.queryByText(/install/i)).toBeNull());
  });

  test('can be focused via keyboard', async () => {
    render(<InstallButton />);
    initA2HS();
    const event = new Event('beforeinstallprompt') as BeforeInstallPromptEvent;
    Object.defineProperty(event, 'preventDefault', { value: jest.fn() });
    Object.defineProperty(event, 'prompt', { value: jest.fn() });
    Object.defineProperty(event, 'userChoice', {
      value: Promise.resolve({ outcome: 'dismissed', platform: '' }),
    });
    await act(async () => {
      window.dispatchEvent(event);
    });
    const button = await screen.findByRole('button', { name: /install/i });
    await userEvent.tab();
    expect(button).toHaveFocus();
  });
});
