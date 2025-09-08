import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InstallPrompt from '../components/pwa/InstallPrompt';

describe('InstallPrompt', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('shows banner when beforeinstallprompt fires', async () => {
    render(<InstallPrompt />);
    const prompt = jest.fn().mockResolvedValue(undefined);
    const event: any = new Event('beforeinstallprompt');
    event.preventDefault = jest.fn();
    event.prompt = prompt;
    event.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'test' });

    await act(async () => {
      window.dispatchEvent(event);
    });

    const button = await screen.findByRole('button', { name: /^install$/i });
    await userEvent.click(button);
    expect(prompt).toHaveBeenCalled();
  });

  test('dismiss stores flag and prevents future banners', async () => {
    const { unmount } = render(<InstallPrompt />);
    const event: any = new Event('beforeinstallprompt');
    event.preventDefault = jest.fn();
    event.prompt = jest.fn();
    event.userChoice = Promise.resolve({ outcome: 'dismissed', platform: 'test' });

    await act(async () => {
      window.dispatchEvent(event);
    });

    const dismiss = await screen.findByLabelText(/dismiss install banner/i);
    await userEvent.click(dismiss);
    expect(localStorage.getItem('install-banner-dismissed')).toBe('1');
    unmount();

    render(<InstallPrompt />);
    await act(async () => {
      window.dispatchEvent(event);
    });
    expect(screen.queryByText(/install this app/i)).toBeNull();
  });

  test('shows iOS instructions', () => {
    const ua = navigator.userAgent;
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'iPhone',
      configurable: true,
    });
    render(<InstallPrompt />);
    expect(
      screen.getByText(/tap Share and Add to Home Screen/i)
    ).toBeInTheDocument();
    Object.defineProperty(window.navigator, 'userAgent', {
      value: ua,
      configurable: true,
    });
  });
});

