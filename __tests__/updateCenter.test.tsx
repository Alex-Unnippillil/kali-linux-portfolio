import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UpdateCenter from '../components/apps/update-center';

describe('UpdateCenter', () => {
  it('allows switching release channels and updates description', async () => {
    const user = userEvent.setup();
    render(<UpdateCenter />);

    const betaTab = screen.getByRole('tab', { name: 'Beta' });
    await user.click(betaTab);

    expect(betaTab).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByText(
        /Early preview of quarterly features. Carries faster iteration with additional telemetry hooks./i,
      ),
    ).toBeInTheDocument();
  });

  it('renders changelog entries for the selected channel', async () => {
    const user = userEvent.setup();
    render(<UpdateCenter />);

    const nightlyTab = screen.getByRole('tab', { name: 'Nightly' });
    await user.click(nightlyTab);

    const list = screen.getByRole('list', { name: /Nightly changelog/i });
    expect(
      within(list).getByText('Fuzz nightly plugin API to catch sandbox regressions'),
    ).toBeInTheDocument();
    expect(within(list).getAllByRole('listitem').length).toBeGreaterThan(0);
  });

  it('defers restart while offline and resumes once reconnected', async () => {
    const user = userEvent.setup();
    render(<UpdateCenter />);

    const originalDescriptor = Object.getOwnPropertyDescriptor(window.navigator, 'onLine');
    Object.defineProperty(window.navigator, 'onLine', {
      value: true,
      configurable: true,
    });

    const checkButton = screen.getByRole('button', { name: /Check for updates/i });
    await user.click(checkButton);

    await screen.findByText(/Update 2025\.02 ready for install\./i);

    const installButton = screen.getByRole('button', { name: /Install update/i });
    await user.click(installButton);
    await screen.findByText(/Restart required to finish/i);

    Object.defineProperty(window.navigator, 'onLine', {
      value: false,
      configurable: true,
    });

    const restartButton = screen.getByRole('button', { name: /Restart now/i });
    await user.click(restartButton);
    expect(screen.getByText(/Restart deferred until you are back online/i)).toBeInTheDocument();

    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });

    await screen.findByText(/Connection restored. Ready to restart./i);

    Object.defineProperty(window.navigator, 'onLine', {
      value: true,
      configurable: true,
    });

    await user.click(restartButton);
    await screen.findByText(/Restart complete. Running 2025\.02 on the Stable channel./i);

    if (originalDescriptor) {
      Object.defineProperty(window.navigator, 'onLine', originalDescriptor);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window.navigator as any).onLine;
    }
  });
});
