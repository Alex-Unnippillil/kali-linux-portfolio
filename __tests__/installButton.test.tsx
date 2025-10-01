import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InstallButton from '../components/InstallButton';
import { initA2HS, recordNavigationEvent } from '@/src/pwa/a2hs';

describe('InstallButton', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'onbeforeinstallprompt', {
      configurable: true,
      writable: true,
      value: null,
    });
  });

  afterEach(() => {
    delete (window as any).onbeforeinstallprompt;
  });

  test('shows install prompt when beforeinstallprompt fires', async () => {
    render(<InstallButton />);
    initA2HS({ navigationThreshold: 1 });
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

    recordNavigationEvent();

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
    initA2HS({ navigationThreshold: 1 });
    const event: any = new Event('beforeinstallprompt');
    event.preventDefault = jest.fn();
    event.prompt = jest.fn();
    event.userChoice = Promise.resolve({ outcome: 'dismissed' });
    await act(async () => {
      window.dispatchEvent(event);
    });
    recordNavigationEvent();
    const button = await screen.findByRole('button', { name: /install/i });
    await userEvent.tab();
    expect(button).toHaveFocus();
  });
});
