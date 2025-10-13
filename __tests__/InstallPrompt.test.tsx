import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InstallPrompt, {
  INSTALL_PROMPT_DISMISSED_KEY,
} from '../components/ui/InstallPrompt';

const navigatorRef = globalThis.navigator as Navigator & { standalone?: boolean };
const originalUserAgent = navigatorRef.userAgent;

const setUserAgent = (userAgent: string) => {
  Object.defineProperty(navigatorRef, 'userAgent', {
    value: userAgent,
    configurable: true,
    writable: true,
  });
};

describe('InstallPrompt', () => {
  beforeEach(() => {
    localStorage.clear();
    setUserAgent(originalUserAgent);
    Object.defineProperty(navigatorRef, 'standalone', {
      value: undefined,
      configurable: true,
      writable: true,
    });
  });

  afterAll(() => {
    setUserAgent(originalUserAgent);
    Object.defineProperty(navigatorRef, 'standalone', {
      value: undefined,
      configurable: true,
      writable: true,
    });
  });

  it('shows the install toast when beforeinstallprompt fires and persists dismissal', async () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 13; Pixel) AppleWebKit/537.36 Chrome/110 Safari/537.36');
    const user = userEvent.setup();
    render(<InstallPrompt />);

    const promptMock = jest.fn().mockResolvedValue(undefined);
    let resolveChoice!: (value: { outcome: 'accepted' | 'dismissed'; platform: string }) => void;
    const userChoice = new Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>((resolve) => {
      resolveChoice = resolve;
    });
    const event = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    };
    (event as any).prompt = promptMock;
    (event as any).userChoice = userChoice;

    await act(async () => {
      window.dispatchEvent(event);
    });

    const installButton = await screen.findByRole('button', { name: /install/i });
    expect(installButton).toBeInTheDocument();

    await user.click(installButton);
    expect(promptMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveChoice({ outcome: 'accepted', platform: 'web' });
    });

    await waitFor(() =>
      expect(localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY)).toBe('true'),
    );
    expect(
      screen.queryByText(/Install Kali Linux Portfolio for quick launch on this device./i),
    ).not.toBeInTheDocument();
  });

  it('respects stored dismissal and ignores subsequent events', async () => {
    localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, 'true');
    setUserAgent('Mozilla/5.0 (Linux; Android 13; Pixel) AppleWebKit/537.36 Chrome/110 Safari/537.36');
    const promptMock = jest.fn();
    render(<InstallPrompt />);

    const event = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    };
    (event as any).prompt = promptMock;
    (event as any).userChoice = Promise.resolve({ outcome: 'dismissed', platform: 'web' });

    await act(async () => {
      window.dispatchEvent(event);
    });

    expect(promptMock).not.toHaveBeenCalled();
    expect(
      screen.queryByText(/Install Kali Linux Portfolio for quick launch on this device./i),
    ).not.toBeInTheDocument();
  });

  it('shows guidance on iOS browsers and persists dismissal after action', async () => {
    jest.useFakeTimers();
    try {
      setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1');
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<InstallPrompt />);

      await act(async () => {
        jest.advanceTimersByTime(2500);
      });

      const message = await screen.findByText(
        /Add Kali Linux Portfolio to your Home Screen/i,
      );
      expect(message).toBeInTheDocument();

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      await user.click(dismissButton);

      await waitFor(() =>
        expect(localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY)).toBe('true'),
      );
      expect(
        screen.queryByText(/Add Kali Linux Portfolio to your Home Screen/i),
      ).not.toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });
});
