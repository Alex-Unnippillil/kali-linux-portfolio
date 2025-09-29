import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InstallButton from '../components/InstallButton';

describe('InstallButton', () => {
  test('shows install prompt when beforeinstallprompt fires', async () => {
    render(<InstallButton />);
    const idleButton = screen.getByRole('button', { name: /install/i });
    expect(idleButton).toBeDisabled();
    expect(idleButton).toHaveAttribute('title');

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

    await waitFor(() => expect(screen.getByRole('button', { name: /install/i })).toBeDisabled());
  });

  test('can be focused via keyboard', async () => {
    render(<InstallButton />);
    const idleButton = screen.getByRole('button', { name: /install/i });
    expect(idleButton).toBeDisabled();
    const event: any = new Event('beforeinstallprompt');
    event.preventDefault = jest.fn();
    event.prompt = jest.fn();
    event.userChoice = Promise.resolve({ outcome: 'dismissed' });
    await act(async () => {
      window.dispatchEvent(event);
    });
    const button = await screen.findByRole('button', { name: /install/i });
    expect(button).not.toBeDisabled();
    await userEvent.tab();
    expect(button).toHaveFocus();
  });

  test('resets state when prompt is dismissed', async () => {
    render(<InstallButton />);
    const event: any = new Event('beforeinstallprompt');
    event.preventDefault = jest.fn();
    event.prompt = jest.fn().mockResolvedValue(undefined);

    let resolveChoice: (value: any) => void = () => {};
    const userChoice = new Promise((resolve) => {
      resolveChoice = resolve;
    });
    event.userChoice = userChoice;

    await act(async () => {
      window.dispatchEvent(event);
    });

    const button = await screen.findByRole('button', { name: /install/i });
    await userEvent.click(button);

    await act(async () => {
      resolveChoice({ outcome: 'dismissed', platform: 'test' });
      await userChoice;
    });

    await waitFor(() => expect(screen.getByRole('button', { name: /install/i })).toBeDisabled());
  });
});
