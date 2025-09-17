import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InstallButton from '../components/InstallButton';

const STORAGE_KEY = 'kali-linux-portfolio.installPrompt';

type ResolveChoice = (value: { outcome: 'accepted' | 'dismissed'; platform: string }) => void;

type PromptEvent = Event & {
  prompt: jest.Mock;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  preventDefault: jest.Mock;
};

describe('InstallPrompt', () => {
  const createPromptEvent = () => {
    let resolveChoice: ResolveChoice = () => {};
    const userChoice = new Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>((resolve) => {
      resolveChoice = resolve;
    });

    const event = new Event('beforeinstallprompt') as PromptEvent;
    event.preventDefault = jest.fn();
    event.prompt = jest.fn().mockResolvedValue(undefined);
    event.userChoice = userChoice;

    return { event, resolveChoice, userChoice };
  };

  beforeEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  test('shows CTA after beforeinstallprompt and resolves acceptance', async () => {
    const now = 1700000000000;
    jest.spyOn(Date, 'now').mockReturnValue(now);
    render(<InstallButton />);

    expect(screen.queryByRole('button', { name: /install/i })).toBeNull();

    const { event, resolveChoice, userChoice } = createPromptEvent();

    await act(async () => {
      window.dispatchEvent(event);
    });

    const button = await screen.findByRole('button', { name: /install/i });
    await userEvent.click(button);
    expect(event.prompt).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveChoice({ outcome: 'accepted', platform: 'test' });
      await userChoice;
    });

    await waitFor(() => expect(screen.queryByRole('button', { name: /install/i })).toBeNull());
    expect(localStorage.getItem(STORAGE_KEY)).toContain('"accepted"');
    expect(screen.getByText(/app installed/i)).toBeInTheDocument();
  });

  test('hides CTA after dismissal and stores state', async () => {
    const now = 1800000000000;
    jest.spyOn(Date, 'now').mockReturnValue(now);
    render(<InstallButton />);

    const { event, resolveChoice, userChoice } = createPromptEvent();

    await act(async () => {
      window.dispatchEvent(event);
    });

    const button = await screen.findByRole('button', { name: /install/i });
    await userEvent.click(button);

    await act(async () => {
      resolveChoice({ outcome: 'dismissed', platform: 'test' });
      await userChoice;
    });

    await waitFor(() => expect(screen.queryByRole('button', { name: /install/i })).toBeNull());
    expect(localStorage.getItem(STORAGE_KEY)).toContain('"dismissed"');
    expect(screen.getByText(/install dismissed/i)).toBeInTheDocument();
  });

  test('suppresses CTA when dismissal is still within cooldown', async () => {
    const now = 1900000000000;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ outcome: 'dismissed', timestamp: now }),
    );
    jest.spyOn(Date, 'now').mockReturnValue(now + 1000);

    render(<InstallButton />);

    const { event } = createPromptEvent();

    await act(async () => {
      window.dispatchEvent(event);
    });

    await waitFor(() => expect(screen.queryByRole('button', { name: /install/i })).toBeNull());
    expect(screen.queryByText(/install dismissed/i)).toBeNull();
  });

  test('shows fallback messaging when install prompt is unsupported', async () => {
    render(<InstallButton />);

    const fallback = await screen.findByText(/add this app to your home screen/i);
    expect(fallback).toBeInTheDocument();
  });
});
