import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsProvider } from '../hooks/useSettings';
import StatusBar from '../components/layout/StatusBar';
import { STATUS_BAR_TIPS } from '../data/statusBarTips';

jest.mock('../components/util-components/status', () => ({
  __esModule: true,
  default: () => <div data-testid="network-indicator">Network</div>,
}));

jest.mock('../components/util-components/clock', () => ({
  __esModule: true,
  default: () => <div data-testid="clock">Clock</div>,
}));

const renderStatusBar = () =>
  render(
    <SettingsProvider>
      <StatusBar />
    </SettingsProvider>,
  );

describe('StatusBar', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('module visibility persists across renders', async () => {
    const user = userEvent.setup();
    const { unmount } = renderStatusBar();

    const customizeButton = await screen.findByRole('button', {
      name: /customize status bar/i,
    });
    await user.click(customizeButton);

    const networkToggle = await screen.findByRole('switch', {
      name: /network & system module/i,
    });
    expect(networkToggle).toHaveAttribute('aria-checked', 'true');

    await user.click(networkToggle);
    await waitFor(() =>
      expect(networkToggle).toHaveAttribute('aria-checked', 'false'),
    );

    unmount();

    renderStatusBar();
    const reopenedCustomize = await screen.findByRole('button', {
      name: /customize status bar/i,
    });
    await user.click(reopenedCustomize);

    const persistedToggle = await screen.findByRole('switch', {
      name: /network & system module/i,
    });
    expect(persistedToggle).toHaveAttribute('aria-checked', 'false');
  });

  test('dismissed tips stay hidden across sessions', async () => {
    const user = userEvent.setup();
    const { unmount } = renderStatusBar();

    const firstTipTitle = STATUS_BAR_TIPS[0].title;
    const nextTipTitle = STATUS_BAR_TIPS[1].title;

    await screen.findByText(firstTipTitle);
    const dismissButton = await screen.findByRole('button', { name: /dismiss/i });
    await user.click(dismissButton);

    await waitFor(() =>
      expect(screen.queryByText(firstTipTitle)).not.toBeInTheDocument(),
    );
    await screen.findByText(nextTipTitle);

    unmount();

    renderStatusBar();
    await waitFor(() =>
      expect(screen.queryByText(firstTipTitle)).not.toBeInTheDocument(),
    );
    await screen.findByText(nextTipTitle);
  });
});
