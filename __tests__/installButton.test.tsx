import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InstallButton from '../components/InstallButton';

describe('InstallButton', () => {
  test('shows install prompt when beforeinstallprompt fires', async () => {
    render(<InstallButton />);
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
});
