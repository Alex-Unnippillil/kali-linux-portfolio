import type { ReactNode } from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InstallButton from '../components/InstallButton';
import MyApp from '../pages/_app';
import { initA2HS } from '@/src/pwa/a2hs';

jest.mock('../hooks/useSettings', () => ({
  SettingsProvider: ({ children }: { children: ReactNode }) => children,
}));

jest.mock('../components/common/NotificationCenter', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => children,
}));

jest.mock('../components/common/PipPortal', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => children,
}));

jest.mock('../components/common/ShortcutOverlay', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../components/core/ErrorBoundary', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => children,
}));

jest.mock('@vercel/analytics/next', () => ({
  Analytics: ({ children }: { children?: ReactNode }) => (children ?? null),
}));

jest.mock('@vercel/speed-insights/next', () => ({
  SpeedInsights: () => null,
}));

jest.mock('next/font/google', () => ({
  Ubuntu: () => ({ className: 'mock-ubuntu' }),
}));

describe('InstallButton', () => {
  test('shows install prompt when beforeinstallprompt fires', async () => {
    render(<InstallButton />);
    initA2HS();
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
    render(<InstallButton />);
    initA2HS();
    const event: any = new Event('beforeinstallprompt');
    event.preventDefault = jest.fn();
    event.prompt = jest.fn();
    event.userChoice = Promise.resolve({ outcome: 'dismissed' });
    await act(async () => {
      window.dispatchEvent(event);
    });
    const button = await screen.findByRole('button', { name: /install/i });
    await userEvent.tab();
    expect(button).toHaveFocus();
  });
});

describe('MyApp integration', () => {
  test('makes install button visible after dynamic import wiring', async () => {
    const addListenerSpy = jest.spyOn(window, 'addEventListener');
    const { unmount } = render(<MyApp Component={InstallButton as any} pageProps={{}} />);

    await waitFor(() =>
      expect(addListenerSpy).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function)),
    );

    const prompt = jest.fn().mockResolvedValue(undefined);
    const event: any = new Event('beforeinstallprompt');
    event.preventDefault = jest.fn();
    event.prompt = prompt;
    event.userChoice = Promise.resolve({ outcome: 'dismissed', platform: 'test' });

    await act(async () => {
      window.dispatchEvent(event);
    });

    const button = await screen.findByRole('button', { name: /install/i });
    expect(button).toBeVisible();

    unmount();
    addListenerSpy.mockRestore();
  });
});
