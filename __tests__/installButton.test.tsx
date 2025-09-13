import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsDrawer from '../components/SettingsDrawer';
import { initA2HS } from '@/src/pwa/a2hs';

describe('InstallButton', () => {
  test('shows install prompt when beforeinstallprompt fires', async () => {
    render(<SettingsDrawer />);
    initA2HS();
    const settings = screen.getByRole('button', { name: /settings/i });
    await userEvent.click(settings);
    expect(screen.queryByText(/install/i)).toBeNull();

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
    render(<SettingsDrawer />);
    initA2HS();
    const settings = screen.getByRole('button', { name: /settings/i });
    await userEvent.click(settings);
    const event: any = new Event('beforeinstallprompt');
    event.preventDefault = jest.fn();
    event.prompt = jest.fn();
    event.userChoice = Promise.resolve({ outcome: 'dismissed' });
    await act(async () => {
      window.dispatchEvent(event);
    });
    const button = await screen.findByRole('button', { name: /install/i });
    button.focus();
    expect(button).toHaveFocus();
  });
});
